import type {
  ClassroomPost,
  ClassroomStudent,
  StudentSubmission,
} from "../../../lib/firebase-classroom-client.ts";
import {
  MAX_GRADE,
  MIN_GRADE,
  type GradeFeedback,
  type GradeScores,
  isValidGrade,
} from "../../../lib/grades.ts";
import { normalizeSearchText } from "./classroom-utils.ts";

/*
  Estados del ciclo de vida de una entrega vistos desde la bandeja docente.
  `review_draft` no es un almacén aparte: describe la corrección empezada, es
  decir la que ya tiene retroalimentación privada escrita pero todavía no una
  nota oficial en el libro auditado.
*/
// Implements: REQ-REV-04
export type SubmissionState = "submitted" | "late" | "missing" | "review_draft" | "graded";

export type ReviewFilter = "all" | SubmissionState;

export type ReviewRow = {
  userId: string;
  name: string;
  email: string;
  state: SubmissionState;
  submittedAt: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  grade: number | null;
  feedback: string;
  /*
    Trazabilidad de la entrega en equipo. `teamSize` es 1 en una entrega
    individual, de modo que la bandeja distingue el trabajo grupal sin consultar
    de nuevo la modalidad de la evaluación, y `submittedByName` responde la
    pregunta que un docente hace siempre al corregir en grupo: quién subió la
    versión que está leyendo.
  */
  // Implements: REQ-TEAM-04
  teamSize: number;
  submittedByName: string;
  sha256: string;
};

export const SUBMISSION_STATE_LABELS: Record<SubmissionState, string> = {
  submitted: "Entregada",
  late: "Atrasada",
  missing: "Sin entrega",
  review_draft: "Corrección empezada",
  graded: "Calificada",
};

export const REVIEW_FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "submitted", label: "Entregadas" },
  { value: "late", label: "Atrasadas" },
  { value: "review_draft", label: "Corrección empezada" },
  { value: "graded", label: "Calificadas" },
  { value: "missing", label: "Sin entrega" },
];

/** Máximo de pautas ofrecidas en el panel de referencia de una evaluación. */
// Implements: REQ-REV-05
export const MAX_GUIDE_POSTS = 20;

function submissionState(
  submission: StudentSubmission | undefined,
  grade: number | null,
  feedback: string,
  dueDate: string
): SubmissionState {
  if (grade !== null) return "graded";
  if (!submission) return "missing";
  if (feedback.trim()) return "review_draft";
  const due = dueDate ? Date.parse(dueDate) : Number.NaN;
  const sent = submission.createdAt ? Date.parse(submission.createdAt) : Number.NaN;
  if (Number.isFinite(due) && Number.isFinite(sent) && sent > due) return "late";
  return "submitted";
}

/*
  Cruza la nómina de la sección con los comprobantes de la evaluación: la cola
  cubre a cada estudiante matriculado, entregue o no, porque corregir también
  significa ver quién falta.
*/
// Implements: REQ-REV-04
export function buildReviewQueue(
  students: readonly ClassroomStudent[],
  submissions: readonly StudentSubmission[],
  {
    itemId,
    dueDate,
    classScores,
    classFeedback,
  }: {
    itemId: string;
    dueDate: string;
    classScores: Record<string, GradeScores>;
    classFeedback: Record<string, GradeFeedback>;
  }
): ReviewRow[] {
  const latest = new Map<string, StudentSubmission>();
  for (const submission of submissions) {
    if (submission.evalId !== itemId || !submission.uid) continue;
    const current = latest.get(submission.uid);
    if (!current || Date.parse(submission.createdAt) > Date.parse(current.createdAt)) {
      latest.set(submission.uid, submission);
    }
  }

  return students.map((student) => {
    const submission = latest.get(student.userId);
    const score = classScores[student.userId]?.[itemId];
    const grade = isValidGrade(score) ? score : null;
    const feedback = classFeedback[student.userId]?.[itemId] ?? "";
    return {
      userId: student.userId,
      name: student.name,
      email: student.email,
      state: submissionState(submission, grade, feedback, dueDate),
      submittedAt: submission?.createdAt ?? "",
      fileName: submission?.fileName ?? "",
      storagePath: submission?.storagePath ?? "",
      contentType: submission?.contentType ?? "",
      size: submission?.size ?? 0,
      grade,
      feedback,
      teamSize: Math.max(1, submission?.memberIds.length ?? 1),
      submittedByName: submission?.submittedByName ?? "",
      sha256: submission?.sha256 ?? "",
    };
  });
}

// Implements: REQ-REV-04
export function filterReviewQueue(
  rows: readonly ReviewRow[],
  filter: ReviewFilter,
  query: string
): ReviewRow[] {
  const needle = normalizeSearchText(query.trim());
  return rows.filter(
    (row) =>
      (filter === "all" || row.state === filter) &&
      (!needle ||
        normalizeSearchText(row.name).includes(needle) ||
        normalizeSearchText(row.email).includes(needle))
  );
}

export function reviewProgress(rows: readonly ReviewRow[]) {
  const graded = rows.filter((row) => row.state === "graded").length;
  const delivered = rows.filter((row) => row.state !== "missing").length;
  return { graded, delivered, total: rows.length };
}

/*
  Traduce lo tecleado en el campo de nota. La coma decimal chilena se acepta tal
  como la escribe el docente y el campo vacío significa retirar la nota, no un
  error de validación.
*/
// Implements: REQ-REV-02
export function parseGradeDraft(value: string): { score: number | null; error: string } {
  const text = value.trim().replace(",", ".");
  if (!text) return { score: null, error: "" };
  const score = Number(text);
  if (!Number.isFinite(score))
    return { score: null, error: "Escribe la nota en cifras, por ejemplo 5,8." };
  if (!isValidGrade(score))
    return {
      score: null,
      error: `La nota debe estar entre ${MIN_GRADE.toFixed(1).replace(".", ",")} y ${MAX_GRADE.toFixed(1).replace(".", ",")}.`,
    };
  return { score: Math.round(score * 10) / 10, error: "" };
}

/*
  Retardo de guardado de la retroalimentación. Suficiente para no llamar a la
  función auditada en cada tecla, y corto para que cambiar de alumno no se
  sienta como perder lo escrito.
*/
// Implements: REQ-REV-02
export const FEEDBACK_DEBOUNCE_MS = 700;

/*
  Guardado diferido con vaciado explícito: la bandeja programa mientras el
  docente escribe y vacía cuando el campo pierde el foco o el panel se desmonta
  al pasar al siguiente alumno.
*/
// Implements: REQ-REV-02
export function createDeferredSave(
  save: (value: string) => void,
  delayMs: number = FEEDBACK_DEBOUNCE_MS
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: string | null = null;

  const run = () => {
    timer = null;
    if (pending === null) return;
    const value = pending;
    pending = null;
    save(value);
  };

  return {
    schedule(value: string) {
      pending = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, delayMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      run();
    },
    hasPending() {
      return pending !== null;
    },
  };
}

/*
  Los atajos de navegación se suprimen sin excepción mientras el foco está en un
  campo editable: el docente que escribe una retroalimentación nunca debe saltar
  de alumno por pulsar una tecla.
*/
// Implements: REQ-REV-03
export function isTypingTarget(
  target: EventTarget | { tagName?: unknown; isContentEditable?: unknown } | null
): boolean {
  if (!target || typeof target !== "object" || !("tagName" in target)) return false;
  const { tagName, isContentEditable } = target as {
    tagName?: unknown;
    isContentEditable?: unknown;
  };
  const tag = typeof tagName === "string" ? tagName.toUpperCase() : "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isContentEditable === true;
}

/** Avanza o retrocede en la cola sin dar la vuelta ni salirse de los extremos. */
// Implements: REQ-REV-03
export function stepIndex(index: number, total: number, step: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, index + step));
}

export function isPdfSubmission(row: Pick<ReviewRow, "contentType" | "fileName">): boolean {
  return (
    row.contentType.toLowerCase().startsWith("application/pdf") ||
    row.fileName.toLowerCase().endsWith(".pdf")
  );
}

/*
  Pautas disponibles para consultar mientras se corrige: las publicaciones de la
  sección que son certamen o guía, de la más reciente a la más antigua.
*/
// Implements: REQ-REV-05
export function guidePosts(posts: readonly ClassroomPost[]): ClassroomPost[] {
  return posts
    .filter((post) => post.kind === "assessment" || post.kind === "guide")
    .slice(0, MAX_GUIDE_POSTS);
}
