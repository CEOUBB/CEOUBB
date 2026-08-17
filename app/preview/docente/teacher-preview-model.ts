import {
  formatGrade,
  isValidGrade,
  summarize,
  type GradeItem,
  type GradeScores,
} from "../../../lib/grades.ts";

export type ActivityLifecycle = "draft" | "scheduled" | "open" | "closed" | "archived";
export type SubmissionState = "missing" | "submitted" | "late" | "review_draft" | "graded";
export type SubmissionMode = "file" | "text" | "file_or_text";
export type ReviewVisibility = "draft" | "published";
export type ReviewFilter = "all" | SubmissionState;

export type TeacherSectionPreview = {
  id: string;
  code: string;
  name: string;
  section: string;
  period: string;
  studentCount: number;
};

export type TeacherActivityPreview = {
  id: string;
  sectionId: string;
  title: string;
  instructions: string;
  learningOutcome: string;
  unit: string;
  opensAt: string;
  dueAt: string;
  cutoffAt: string;
  submissionMode: SubmissionMode;
  maxAttempts: number;
  acceptedTypes: string[];
  gradeItemId: string | null;
  gradeWeight: number;
  lifecycle: ActivityLifecycle;
};

export type SubmissionPreview = {
  id: string;
  activityId: string;
  studentAlias: string;
  state: SubmissionState;
  submittedAt: string | null;
  attempt: number;
  fileName: string | null;
  text: string;
};

export type RubricPreview = {
  planteamiento: number;
  desarrollo: number;
  comunicacion: number;
};

export type ReviewHistoryEvent = {
  actor: string;
  occurredAt: string;
  previous: ReviewVisibility | "none";
  next: ReviewVisibility;
};

export type ReviewPreview = {
  submissionId: string;
  grade: number | null;
  feedback: string;
  rubric: RubricPreview;
  visibility: ReviewVisibility;
  history: ReadonlyArray<ReviewHistoryEvent>;
};

export type TeacherPreviewState = {
  section: TeacherSectionPreview;
  activities: TeacherActivityPreview[];
  submissions: SubmissionPreview[];
  reviews: Record<string, ReviewPreview>;
  selectedActivityId: string;
  selectedSubmissionId: string;
};

export type ActivityValidationErrors = Partial<
  Record<"title" | "instructions" | "opensAt" | "dueAt" | "cutoffAt" | "gradeWeight", string>
>;
export type ReviewValidationErrors = Partial<Record<"submission" | "grade" | "feedback", string>>;

export type SubmissionPage = {
  items: SubmissionPreview[];
  page: number;
  pageCount: number;
  total: number;
};

export type TeacherCounter = {
  id: "pending" | "missing" | "drafts";
  label: string;
  value: number;
  detail: string;
};

export type TeacherWorkItem = {
  id: string;
  activityId: string;
  title: string;
  detail: string;
  dueAt: string;
  kind: "review" | "deadline" | "draft";
};

export type GradebookOverview = {
  average: string;
  gradedCount: number;
  pendingCount: number;
  items: Array<{
    id: string;
    name: string;
    weight: number;
    average: string | null;
    lifecycle: ActivityLifecycle;
  }>;
};

export type TeacherPreviewAction =
  | { type: "save_activity"; activity: TeacherActivityPreview }
  | { type: "select_activity"; activityId: string }
  | { type: "select_submission"; submissionId: string }
  | {
      type: "save_review_draft";
      submissionId: string;
      grade: number | null;
      feedback: string;
      rubric: RubricPreview;
    }
  | {
      type: "publish_review";
      submissionId: string;
      grade: number;
      feedback: string;
      rubric: RubricPreview;
    };

export const SUBMISSION_STATE_LABELS: Record<SubmissionState, string> = {
  missing: "Sin entrega",
  submitted: "Entregada",
  late: "Atrasada",
  review_draft: "Corrección en borrador",
  graded: "Calificada",
};

export const ACTIVITY_LIFECYCLE_LABELS: Record<ActivityLifecycle, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  open: "Abierta",
  closed: "En corrección",
  archived: "Archivada",
};
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SECTION_FIXTURE: TeacherSectionPreview = {
  id: "estatica-2026-2-1",
  code: "MCI-210",
  name: "Estática",
  section: "Sección 1",
  period: "Segundo semestre 2026",
  studentCount: 34,
};

const ACTIVITY_FIXTURES: TeacherActivityPreview[] = [
  {
    id: "control-1",
    sectionId: SECTION_FIXTURE.id,
    title: "Control 1 · Equilibrio",
    instructions:
      "Resuelve los tres problemas justificando cada diagrama de cuerpo libre y expresa los resultados en unidades SI.",
    learningOutcome: "RA2 · Modelar sistemas mecánicos en equilibrio",
    unit: "Unidad 2 · Equilibrio de cuerpos rígidos",
    opensAt: "2026-08-10T08:00",
    dueAt: "2026-08-14T23:59",
    cutoffAt: "2026-08-15T12:00",
    submissionMode: "file",
    maxAttempts: 1,
    acceptedTypes: ["application/pdf"],
    gradeItemId: "control-1",
    gradeWeight: 20,
    lifecycle: "closed",
  },
  {
    id: "tarea-2",
    sectionId: SECTION_FIXTURE.id,
    title: "Tarea 2 · Análisis de armaduras",
    instructions:
      "Determina las fuerzas internas mediante los métodos de nodos y secciones. Compara ambos resultados.",
    learningOutcome: "RA3 · Analizar estructuras isostáticas",
    unit: "Unidad 3 · Armaduras",
    opensAt: "2026-08-12T08:00",
    dueAt: "2026-08-18T23:59",
    cutoffAt: "2026-08-19T12:00",
    submissionMode: "file_or_text",
    maxAttempts: 2,
    acceptedTypes: ["application/pdf", "image/png", "image/jpeg"],
    gradeItemId: "tarea-2",
    gradeWeight: 15,
    lifecycle: "open",
  },
  {
    id: "tarea-3",
    sectionId: SECTION_FIXTURE.id,
    title: "Tarea 3 · Centroides",
    instructions:
      "Construye el centroide de la sección compuesta y documenta las hipótesis geométricas utilizadas.",
    learningOutcome: "RA4 · Resolver propiedades geométricas de áreas",
    unit: "Unidad 4 · Centroides y momentos de inercia",
    opensAt: "2026-08-24T08:00",
    dueAt: "2026-08-31T23:59",
    cutoffAt: "2026-09-01T12:00",
    submissionMode: "file",
    maxAttempts: 2,
    acceptedTypes: ["application/pdf"],
    gradeItemId: "tarea-3",
    gradeWeight: 15,
    lifecycle: "draft",
  },
  {
    id: "guia-4",
    sectionId: SECTION_FIXTURE.id,
    title: "Guía 4 · Momento de inercia",
    instructions:
      "Material de apoyo con ejercicios originales y soluciones orientativas para preparar la próxima evaluación.",
    learningOutcome: "RA4 · Resolver propiedades geométricas de áreas",
    unit: "Unidad 4 · Centroides y momentos de inercia",
    opensAt: "2026-08-15T18:00",
    dueAt: "2026-08-27T23:59",
    cutoffAt: "2026-08-27T23:59",
    submissionMode: "text",
    maxAttempts: 1,
    acceptedTypes: [],
    gradeItemId: null,
    gradeWeight: 0,
    lifecycle: "scheduled",
  },
];

const SUBMISSION_FIXTURES: SubmissionPreview[] = [
  {
    id: "sub-01",
    activityId: "control-1",
    studentAlias: "Estudiante 01",
    state: "submitted",
    submittedAt: "2026-08-14T21:42",
    attempt: 1,
    fileName: "control_01.pdf",
    text: "",
  },
  {
    id: "sub-02",
    activityId: "control-1",
    studentAlias: "Estudiante 02",
    state: "late",
    submittedAt: "2026-08-15T08:18",
    attempt: 1,
    fileName: "control_02.pdf",
    text: "",
  },
  {
    id: "sub-03",
    activityId: "control-1",
    studentAlias: "Estudiante 03",
    state: "graded",
    submittedAt: "2026-08-14T18:05",
    attempt: 1,
    fileName: "control_03.pdf",
    text: "",
  },
  {
    id: "sub-04",
    activityId: "control-1",
    studentAlias: "Estudiante 04",
    state: "graded",
    submittedAt: "2026-08-14T16:31",
    attempt: 1,
    fileName: "control_04.pdf",
    text: "",
  },
  {
    id: "sub-05",
    activityId: "control-1",
    studentAlias: "Estudiante 05",
    state: "review_draft",
    submittedAt: "2026-08-14T15:47",
    attempt: 1,
    fileName: "control_05.pdf",
    text: "",
  },
  {
    id: "sub-06",
    activityId: "control-1",
    studentAlias: "Estudiante 06",
    state: "submitted",
    submittedAt: "2026-08-14T15:02",
    attempt: 1,
    fileName: "control_06.pdf",
    text: "",
  },
  {
    id: "sub-07",
    activityId: "control-1",
    studentAlias: "Estudiante 07",
    state: "missing",
    submittedAt: null,
    attempt: 0,
    fileName: null,
    text: "",
  },
  {
    id: "sub-08",
    activityId: "control-1",
    studentAlias: "Estudiante 08",
    state: "late",
    submittedAt: "2026-08-15T07:14",
    attempt: 1,
    fileName: "control_08.pdf",
    text: "",
  },
  {
    id: "sub-09",
    activityId: "control-1",
    studentAlias: "Estudiante 09",
    state: "submitted",
    submittedAt: "2026-08-14T13:55",
    attempt: 1,
    fileName: "control_09.pdf",
    text: "",
  },
  {
    id: "sub-10",
    activityId: "control-1",
    studentAlias: "Estudiante 10",
    state: "graded",
    submittedAt: "2026-08-14T13:11",
    attempt: 1,
    fileName: "control_10.pdf",
    text: "",
  },
  {
    id: "sub-11",
    activityId: "control-1",
    studentAlias: "Estudiante 11",
    state: "submitted",
    submittedAt: "2026-08-14T12:48",
    attempt: 1,
    fileName: "control_11.pdf",
    text: "",
  },
  {
    id: "sub-12",
    activityId: "control-1",
    studentAlias: "Estudiante 12",
    state: "review_draft",
    submittedAt: "2026-08-14T11:30",
    attempt: 1,
    fileName: "control_12.pdf",
    text: "",
  },
  {
    id: "sub-13",
    activityId: "control-1",
    studentAlias: "Estudiante 13",
    state: "missing",
    submittedAt: null,
    attempt: 0,
    fileName: null,
    text: "",
  },
  {
    id: "sub-14",
    activityId: "control-1",
    studentAlias: "Estudiante 14",
    state: "graded",
    submittedAt: "2026-08-14T10:22",
    attempt: 1,
    fileName: "control_14.pdf",
    text: "",
  },
  {
    id: "sub-15",
    activityId: "tarea-2",
    studentAlias: "Estudiante 01",
    state: "submitted",
    submittedAt: "2026-08-15T09:05",
    attempt: 1,
    fileName: "armadura_01.pdf",
    text: "",
  },
];

const REVIEW_FIXTURES: Record<string, ReviewPreview> = {
  "sub-03": {
    submissionId: "sub-03",
    grade: 5.8,
    feedback: "Buen planteamiento. Revisa el signo del momento en el segundo equilibrio.",
    rubric: { planteamiento: 2, desarrollo: 2, comunicacion: 1.8 },
    visibility: "published",
    history: [
      {
        actor: "Docente de ejemplo",
        occurredAt: "2026-08-15T10:20:00-04:00",
        previous: "none",
        next: "published",
      },
    ],
  },
  "sub-04": {
    submissionId: "sub-04",
    grade: 6.4,
    feedback: "Desarrollo claro, unidades consistentes y diagrama correctamente rotulado.",
    rubric: { planteamiento: 2.2, desarrollo: 2.2, comunicacion: 2 },
    visibility: "published",
    history: [
      {
        actor: "Docente de ejemplo",
        occurredAt: "2026-08-15T10:25:00-04:00",
        previous: "none",
        next: "published",
      },
    ],
  },
  "sub-05": {
    submissionId: "sub-05",
    grade: 4.9,
    feedback: "Falta justificar la reacción horizontal del apoyo B.",
    rubric: { planteamiento: 1.8, desarrollo: 1.6, comunicacion: 1.5 },
    visibility: "draft",
    history: [
      {
        actor: "Docente de ejemplo",
        occurredAt: "2026-08-15T10:30:00-04:00",
        previous: "none",
        next: "draft",
      },
    ],
  },
  "sub-10": {
    submissionId: "sub-10",
    grade: 5.5,
    feedback: "Resultado correcto. Mejora la legibilidad de las ecuaciones intermedias.",
    rubric: { planteamiento: 2, desarrollo: 2, comunicacion: 1.5 },
    visibility: "published",
    history: [
      {
        actor: "Docente de ejemplo",
        occurredAt: "2026-08-15T10:35:00-04:00",
        previous: "none",
        next: "published",
      },
    ],
  },
  "sub-12": {
    submissionId: "sub-12",
    grade: 5.2,
    feedback: "Revisar la descomposición de la fuerza inclinada antes de publicar.",
    rubric: { planteamiento: 1.8, desarrollo: 1.8, comunicacion: 1.6 },
    visibility: "draft",
    history: [
      {
        actor: "Docente de ejemplo",
        occurredAt: "2026-08-15T10:40:00-04:00",
        previous: "none",
        next: "draft",
      },
    ],
  },
  "sub-14": {
    submissionId: "sub-14",
    grade: 6.1,
    feedback: "Solución ordenada y consistente con las convenciones del curso.",
    rubric: { planteamiento: 2.1, desarrollo: 2.1, comunicacion: 1.9 },
    visibility: "published",
    history: [
      {
        actor: "Docente de ejemplo",
        occurredAt: "2026-08-15T10:45:00-04:00",
        previous: "none",
        next: "published",
      },
    ],
  },
};

function cloneReview(review: ReviewPreview): ReviewPreview {
  return {
    ...review,
    rubric: { ...review.rubric },
    history: review.history.map((event) => ({ ...event })),
  };
}

function syntheticTimestamp(historyLength: number) {
  return `2026-08-15T11:${String(10 + historyLength).padStart(2, "0")}:00-04:00`;
}

// Implements: REQ-DOC-02, REQ-DOC-13
export function createInitialTeacherPreviewState(): TeacherPreviewState {
  return {
    section: { ...SECTION_FIXTURE },
    activities: ACTIVITY_FIXTURES.map((activity) => ({
      ...activity,
      acceptedTypes: [...activity.acceptedTypes],
    })),
    submissions: SUBMISSION_FIXTURES.map((submission) => ({ ...submission })),
    reviews: Object.fromEntries(
      Object.entries(REVIEW_FIXTURES).map(([id, review]) => [id, cloneReview(review)])
    ),
    selectedActivityId: "control-1",
    selectedSubmissionId: "sub-01",
  };
}

// Implements: REQ-DOC-05, REQ-DOC-06
export function validateActivity(
  activity: TeacherActivityPreview,
  intent: "draft" | "publish"
): ActivityValidationErrors {
  const errors: ActivityValidationErrors = {};
  if (!activity.title.trim()) errors.title = "Escribe un título para identificar la actividad.";
  if (!activity.instructions.trim())
    errors.instructions = "Agrega instrucciones para que el curso sepa qué debe realizar.";
  if (intent === "publish") {
    const opens = Date.parse(activity.opensAt);
    const due = Date.parse(activity.dueAt);
    const cutoff = Date.parse(activity.cutoffAt);
    if (!Number.isFinite(opens)) errors.opensAt = "Indica cuándo se abrirá la actividad.";
    if (!Number.isFinite(due)) errors.dueAt = "Indica una fecha de vencimiento.";
    if (!Number.isFinite(cutoff)) errors.cutoffAt = "Indica una fecha de cierre.";
    if (!errors.opensAt && !errors.dueAt && opens > due)
      errors.dueAt = "El vencimiento debe ser posterior a la apertura.";
    if (!errors.dueAt && !errors.cutoffAt && due > cutoff)
      errors.cutoffAt = "El cierre debe ser igual o posterior al vencimiento.";
    if (
      !Number.isFinite(activity.gradeWeight) ||
      activity.gradeWeight < 0 ||
      activity.gradeWeight > 100
    )
      errors.gradeWeight = "La ponderación debe estar entre 0% y 100%.";
  }
  return errors;
}

// Implements: REQ-DOC-09, REQ-DOC-10
export function validateReview(
  submission: SubmissionPreview | undefined,
  grade: number | null,
  feedback: string
): ReviewValidationErrors {
  const errors: ReviewValidationErrors = {};
  if (!submission || submission.state === "missing")
    errors.submission = "No existe una entrega disponible para corregir.";
  if (!isValidGrade(grade)) errors.grade = "Ingresa una nota válida entre 1,0 y 7,0.";
  if (!feedback.trim()) errors.feedback = "Escribe una retroalimentación antes de publicar.";
  return errors;
}

// Implements: REQ-DOC-08
export function paginateSubmissions(
  submissions: SubmissionPreview[],
  activityId: string,
  filter: ReviewFilter,
  query: string,
  requestedPage: number,
  pageSize = 5
): SubmissionPage {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-CL");
  const filtered = submissions.filter(
    (submission) =>
      submission.activityId === activityId &&
      (filter === "all" || submission.state === filter) &&
      (!normalizedQuery ||
        submission.studentAlias.toLocaleLowerCase("es-CL").includes(normalizedQuery))
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const offset = (page - 1) * pageSize;
  return {
    items: filtered.slice(offset, offset + pageSize),
    page,
    pageCount,
    total: filtered.length,
  };
}

// Implements: REQ-DOC-07
export function teacherCounters(state: TeacherPreviewState): TeacherCounter[] {
  const pending = state.submissions.filter((submission) =>
    ["submitted", "late", "review_draft"].includes(submission.state)
  ).length;
  const missing = state.submissions.filter((submission) => submission.state === "missing").length;
  const drafts = state.activities.filter((activity) => activity.lifecycle === "draft").length;
  return [
    {
      id: "pending",
      label: "Por corregir",
      value: pending,
      detail: "Entregas que requieren revisión",
    },
    { id: "missing", label: "Sin entrega", value: missing, detail: "Estudiantes por acompañar" },
    { id: "drafts", label: "Borradores", value: drafts, detail: "Actividades aún privadas" },
  ];
}

// Implements: REQ-DOC-04, REQ-DOC-07
export function prioritizedWork(state: TeacherPreviewState): TeacherWorkItem[] {
  const pendingByActivity = new Map<string, number>();
  for (const submission of state.submissions) {
    if (["submitted", "late", "review_draft"].includes(submission.state)) {
      pendingByActivity.set(
        submission.activityId,
        (pendingByActivity.get(submission.activityId) ?? 0) + 1
      );
    }
  }
  const items: TeacherWorkItem[] = [];
  for (const activity of state.activities) {
    const pending = pendingByActivity.get(activity.id) ?? 0;
    if (pending > 0)
      items.push({
        id: `review-${activity.id}`,
        activityId: activity.id,
        title: `Corregir ${activity.title}`,
        detail: `${pending} entregas pendientes`,
        dueAt: activity.cutoffAt,
        kind: "review",
      });
    else if (activity.lifecycle === "draft")
      items.push({
        id: `draft-${activity.id}`,
        activityId: activity.id,
        title: `Completar ${activity.title}`,
        detail: "Actividad visible solo para docentes",
        dueAt: activity.opensAt,
        kind: "draft",
      });
    else if (["open", "scheduled"].includes(activity.lifecycle))
      items.push({
        id: `deadline-${activity.id}`,
        activityId: activity.id,
        title: activity.title,
        detail: `Vence ${formatDateTime(activity.dueAt)}`,
        dueAt: activity.dueAt,
        kind: "deadline",
      });
  }
  return items.sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt)).slice(0, 5);
}

// Implements: REQ-DOC-10
export function publishedStudentReview(
  state: TeacherPreviewState,
  submissionId: string
): ReviewPreview | null {
  const review = state.reviews[submissionId];
  return review?.visibility === "published" ? cloneReview(review) : null;
}

// Implements: REQ-DOC-04, REQ-DOC-10
export function gradebookOverview(state: TeacherPreviewState): GradebookOverview {
  const items: GradeItem[] = [];
  const activityById = new Map<string, TeacherActivityPreview>();
  for (const activity of state.activities) {
    activityById.set(activity.id, activity);
    if (activity.gradeItemId && activity.gradeWeight > 0)
      items.push({
        id: activity.id,
        name: activity.title,
        weight: activity.gradeWeight,
        date: activity.dueAt,
      });
  }
  const scoresByActivity = new Map<string, number[]>();
  for (const submission of state.submissions) {
    const review = state.reviews[submission.id];
    if (review?.visibility !== "published" || !isValidGrade(review.grade)) continue;
    const values = scoresByActivity.get(submission.activityId) ?? [];
    values.push(review.grade);
    scoresByActivity.set(submission.activityId, values);
  }
  const scores: GradeScores = {};
  const overviewItems = items.map((item) => {
    const values = scoresByActivity.get(item.id) ?? [];
    const average = values.length
      ? values.reduce((total, value) => total + value, 0) / values.length
      : null;
    if (average !== null) scores[item.id] = average;
    return {
      id: item.id,
      name: item.name,
      weight: item.weight,
      average: average === null ? null : formatGrade(average),
      lifecycle: activityById.get(item.id)?.lifecycle ?? "draft",
    };
  });
  const summary = summarize(items, scores);
  const gradedCount = Object.values(state.reviews).filter(
    (review) => review.visibility === "published"
  ).length;
  return {
    average: summary.average === null ? "—" : formatGrade(summary.average),
    gradedCount,
    pendingCount: state.submissions.filter((submission) =>
      ["submitted", "late", "review_draft"].includes(submission.state)
    ).length,
    items: overviewItems,
  };
}

// Implements: REQ-DOC-04, REQ-DOC-05, REQ-DOC-09, REQ-DOC-10
export function teacherPreviewReducer(
  state: TeacherPreviewState,
  action: TeacherPreviewAction
): TeacherPreviewState {
  if (action.type === "save_activity") {
    const exists = state.activities.some((activity) => activity.id === action.activity.id);
    return {
      ...state,
      activities: exists
        ? state.activities.map((activity) =>
            activity.id === action.activity.id
              ? { ...action.activity, acceptedTypes: [...action.activity.acceptedTypes] }
              : activity
          )
        : [
            ...state.activities,
            { ...action.activity, acceptedTypes: [...action.activity.acceptedTypes] },
          ],
      selectedActivityId: action.activity.id,
    };
  }
  if (action.type === "select_activity") return { ...state, selectedActivityId: action.activityId };
  if (action.type === "select_submission")
    return { ...state, selectedSubmissionId: action.submissionId };
  const previousReview = state.reviews[action.submissionId];
  const previousVisibility = previousReview?.visibility ?? "none";
  const nextVisibility: ReviewVisibility = action.type === "publish_review" ? "published" : "draft";
  const history = [
    ...(previousReview?.history ?? []),
    {
      actor: "Docente de ejemplo",
      occurredAt: syntheticTimestamp(previousReview?.history.length ?? 0),
      previous: previousVisibility,
      next: nextVisibility,
    },
  ];
  const review: ReviewPreview = {
    submissionId: action.submissionId,
    grade: action.grade,
    feedback: action.feedback,
    rubric: { ...action.rubric },
    visibility: nextVisibility,
    history,
  };
  return {
    ...state,
    submissions: state.submissions.map((submission) =>
      submission.id === action.submissionId
        ? { ...submission, state: nextVisibility === "published" ? "graded" : "review_draft" }
        : submission
    ),
    reviews: { ...state.reviews, [action.submissionId]: review },
    selectedSubmissionId: action.submissionId,
  };
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return DATE_TIME_FORMATTER.format(date);
}

export function emptyActivity(sectionId: string, sequence: number): TeacherActivityPreview {
  return {
    id: `actividad-${sequence}`,
    sectionId,
    title: "",
    instructions: "",
    learningOutcome: "RA2 · Modelar sistemas mecánicos en equilibrio",
    unit: "Unidad 2 · Equilibrio de cuerpos rígidos",
    opensAt: "2026-08-17T08:00",
    dueAt: "2026-08-24T23:59",
    cutoffAt: "2026-08-25T12:00",
    submissionMode: "file",
    maxAttempts: 1,
    acceptedTypes: ["application/pdf"],
    gradeItemId: null,
    gradeWeight: 0,
    lifecycle: "draft",
  };
}
