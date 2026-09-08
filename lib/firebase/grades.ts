import { cloudFunctions, firestore, currentUser, emailOf } from "./sdk.ts";
import {
  type GradeItem,
  type GradeScores,
  MAX_GRADE_FEEDBACK_LENGTH,
  normalizeItems,
  normalizeScores,
} from "../grades.ts";
import { toGradebookState } from "./mappers.ts";
import { watchableSections } from "./posts.ts";

export type CourseGradebook = {
  courseId: string;
  items: GradeItem[];
  exemption: number | null;
};

export type StudentScoreRow = {
  userId: string;
  scores: GradeScores;
};

type AuditedMutationResult = {
  changedCount: number;
};

const MAX_AUDITED_ROWS_PER_CALL = 100;
const MAX_CONCURRENT_AUDITED_CALLS = 4;

/**
 * Firestore aborta un `writeBatch` sobre 500 operaciones. Esta utilidad conserva
 * el margen histórico de 400; las mutaciones auditadas usan un techo menor.
 */
// Implements: REQ-PERF-02
export const MAX_BATCH_OPERATIONS = 400;

export function watchGradebook(
  courseId: string,
  onChange: (item: CourseGradebook) => void,
  onError: (message: string) => void
) {
  let active = true;
  let stop: (() => void) | undefined;
  firestore()
    .then(({ sdk, db }) => {
      if (!active) return;
      stop = sdk.onSnapshot(
        sdk.doc(db, "courses", courseId, "meta", "gradebook"),
        (snapshot) => {
          const state = toGradebookState(snapshot.exists() ? snapshot.data() : null);
          onChange({ courseId, items: state.gradebook, exemption: state.exemption });
        },
        () => onError("No se pudo cargar el esquema de evaluaciones.")
      );
    })
    .catch(() => onError("No se pudo conectar Firebase."));
  return () => {
    active = false;
    stop?.();
  };
}

/*
  Escucha segmentada de ponderaciones. El `collectionGroup("meta")` anterior no
  tenía límite y leía la ponderación de cada curso de la universidad al montar
  el portal; ahora se suscribe un documento por sección matriculada.
*/
// Implements: REQ-PERF-01
export function watchGradebooks(
  enrolledSectionIds: readonly string[],
  onChange: (items: CourseGradebook[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  const stops: (() => void)[] = [];
  const sections = watchableSections(enrolledSectionIds);
  const bySection = new Map<string, CourseGradebook>();

  if (sections.length === 0) {
    onChange([]);
    return () => undefined;
  }

  firestore()
    .then(({ sdk, db }) => {
      if (!active) return;
      for (const courseId of sections) {
        stops.push(
          sdk.onSnapshot(
            sdk.doc(db, "courses", courseId, "meta", "gradebook"),
            (snapshot) => {
              const state = toGradebookState(snapshot.exists() ? snapshot.data() : null);
              bySection.set(courseId, {
                courseId,
                items: state.gradebook,
                exemption: state.exemption,
              });
              onChange([...bySection.values()]);
            },
            () => onError("No se pudieron cargar las evaluaciones de los cursos.")
          )
        );
      }
    })
    .catch(() => onError("No se pudo conectar Firebase."));

  return () => {
    active = false;
    for (const stop of stops) stop();
  };
}

/*
  Presencia del estudiante en la sección. El documento vive en `progress` por
  compatibilidad con los expedientes ya escritos, pero ya no guarda avance
  declarado: sólo identifica a quien abrió el aula y cuándo. De él sale la
  nómina que el equipo docente ve en Participantes y en la bandeja de
  corrección, así que escribirlo al entrar corrige el vacío anterior, donde un
  estudiante sólo aparecía si simulaba una nota.
*/
// Implements: REQ-EVAL-04
export async function touchSectionPresence(courseId: string) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(
    sdk.doc(db, "courses", courseId, "progress", user.uid),
    {
      uid: user.uid,
      displayName: user.displayName ?? "",
      email: emailOf(user),
      lastSeen: sdk.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveSimulation(courseId: string, scores: GradeScores) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(
    sdk.doc(db, "courses", courseId, "progress", user.uid),
    {
      uid: user.uid,
      displayName: user.displayName ?? "",
      email: emailOf(user),
      simulated: normalizeScores(scores),
      lastSeen: sdk.serverTimestamp(),
    },
    { merge: true }
  );
}

function gradeMutationError(cause: unknown, mutation: string) {
  const code =
    cause && typeof cause === "object" && "code" in cause ? String(cause.code).toLowerCase() : "";
  const feedbackMutation = mutation === "saveAuditedGradeFeedback";
  if (code.endsWith("unauthenticated"))
    return new Error("Tu sesión expiró. Cierra sesión y vuelve a ingresar.");
  if (code.endsWith("permission-denied"))
    return new Error("No tienes permisos para editar notas en esta sección.");
  if (code.endsWith("failed-precondition"))
    return new Error(
      feedbackMutation
        ? "Guarda primero una nota oficial antes de agregar retroalimentación."
        : "La sección está archivada o su matrícula no está sincronizada."
    );
  if (code.endsWith("invalid-argument"))
    return new Error(
      feedbackMutation
        ? "La retroalimentación no es válida. Revisa su extensión e inténtalo de nuevo."
        : "Las notas enviadas no son válidas. Revisa sus valores e inténtalo de nuevo."
    );
  if (cause instanceof Error && cause.message) return cause;
  return new Error("No fue posible guardar el libro de notas.");
}

async function callAuditedMutation<TRequest>(name: string, data: TRequest) {
  const { sdk, functions } = await cloudFunctions();
  try {
    const callable = sdk.httpsCallable<TRequest, AuditedMutationResult>(functions, name);
    return (await callable(data)).data;
  } catch (cause) {
    throw gradeMutationError(cause, name);
  }
}

// Implements: REQ-AUDIT-07
export async function saveGradebook(
  courseId: string,
  items: GradeItem[],
  exemption: number | null
) {
  await callAuditedMutation("saveAuditedGradebook", {
    courseId,
    items: normalizeItems(items),
    exemption,
  });
}

// Implements: REQ-AUDIT-01
export async function saveStudentScores(courseId: string, userId: string, scores: GradeScores) {
  await saveSectionScores(courseId, [{ userId, scores }]);
}

export async function saveGradeFeedback(
  courseId: string,
  userId: string,
  gradeItemId: string,
  feedback: string
) {
  if (feedback.length > MAX_GRADE_FEEDBACK_LENGTH) {
    throw new Error(
      `La retroalimentación admite hasta ${MAX_GRADE_FEEDBACK_LENGTH.toLocaleString("es-CL")} caracteres.`
    );
  }
  await callAuditedMutation("saveAuditedGradeFeedback", {
    courseId,
    userId,
    gradeItemId,
    feedback: feedback.trim(),
  });
}

/** Parte una lista de operaciones en lotes que Firestore acepta de una vez. */
// Implements: REQ-PERF-02
export function chunkOperations<T>(rows: readonly T[], size = MAX_BATCH_OPERATIONS): T[][] {
  const safeSize = typeof size === "number" && !Number.isNaN(size) ? size : MAX_BATCH_OPERATIONS;
  const limit = Math.max(1, Math.trunc(safeSize));
  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += limit) {
    batches.push(rows.slice(index, index + limit));
  }
  return batches;
}

function saveAuditBatchWaves(
  courseId: string,
  batches: readonly (readonly StudentScoreRow[])[],
  offset = 0
): Promise<void> {
  const wave = batches.slice(offset, offset + MAX_CONCURRENT_AUDITED_CALLS);
  if (wave.length === 0) return Promise.resolve();
  return Promise.all(
    wave.map((group) =>
      callAuditedMutation("saveAuditedStudentScores", {
        courseId,
        rows: group.map((row) => ({ userId: row.userId, scores: normalizeScores(row.scores) })),
      })
    )
  ).then(() => saveAuditBatchWaves(courseId, batches, offset + MAX_CONCURRENT_AUDITED_CALLS));
}

/*
  Publicación masiva de notas oficiales. Una sección de plan común pasa de 300
  estudiantes: el cliente limita cada invocación y la Function procesa cada fila
  en una transacción independiente junto con sus documentos de auditoría.
*/
// Implements: REQ-PERF-02, REQ-AUDIT-01, REQ-AUDIT-06
export async function saveSectionScores(courseId: string, rows: readonly StudentScoreRow[]) {
  if (rows.length === 0) return 0;
  const batches = chunkOperations(rows, MAX_AUDITED_ROWS_PER_CALL);
  await saveAuditBatchWaves(courseId, batches);
  return batches.length;
}
