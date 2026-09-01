import type {
  ImportedQuizQuestion,
  QuizAttempt,
  QuizDefinition,
  QuizQuestion,
  QuizQuestionKind,
  QuizResult,
} from "../quizzes.ts";
import { cloudFunctions, currentUser, firestore } from "./sdk.ts";
import { iso } from "./mappers.ts";

export const MAX_QUIZZES_PER_SECTION = 100;

export type StartQuizOutcome =
  | { status: "active"; attempt: QuizAttempt }
  | { status: "submitted"; result: QuizResult };

type PublishQuizInput = {
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  gradeItemId: string;
  questions: ImportedQuizQuestion[];
};

function quizError(cause: unknown) {
  const code =
    cause && typeof cause === "object" && "code" in cause ? String(cause.code).toLowerCase() : "";
  if (code.endsWith("unauthenticated")) {
    return new Error("Tu sesión expiró. Cierra sesión y vuelve a ingresar.");
  }
  if (code.endsWith("permission-denied")) {
    return new Error("No tienes permisos para realizar esta acción en la sección.");
  }
  if (code.endsWith("failed-precondition") || code.endsWith("not-found")) {
    const message = cause instanceof Error ? cause.message.replace(/^.*?:\s*/, "") : "";
    return new Error(message || "El cuestionario cambió o ya no está disponible.");
  }
  if (code.endsWith("invalid-argument")) {
    const message = cause instanceof Error ? cause.message.replace(/^.*?:\s*/, "") : "";
    return new Error(message || "Revisa la configuración del cuestionario.");
  }
  if (cause instanceof Error && cause.message) return cause;
  return new Error("No fue posible completar la operación con el cuestionario.");
}

function questionKind(value: unknown): QuizQuestionKind {
  if (value === "true_false" || value === "short_answer" || value === "numerical") return value;
  return "single_choice";
}

function quizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((rawQuestion) => {
    if (!rawQuestion || typeof rawQuestion !== "object") return [];
    const question = rawQuestion as Record<string, unknown>;
    const options = Array.isArray(question.options)
      ? question.options.flatMap((rawOption) => {
          if (!rawOption || typeof rawOption !== "object") return [];
          const option = rawOption as Record<string, unknown>;
          return [{ id: String(option.id ?? ""), label: String(option.label ?? "") }];
        })
      : [];
    return [
      {
        id: String(question.id ?? ""),
        title: String(question.title ?? "Pregunta"),
        prompt: String(question.prompt ?? ""),
        kind: questionKind(question.kind),
        options,
        points: Number(question.points) || 1,
      },
    ];
  });
}

function toQuiz(id: string, value: Record<string, unknown>): QuizDefinition {
  return {
    id,
    courseId: String(value.courseId ?? ""),
    title: String(value.title ?? "Cuestionario"),
    description: String(value.description ?? ""),
    durationMinutes: Number(value.durationMinutes) || 1,
    gradeItemId: String(value.gradeItemId ?? ""),
    status: "published",
    questions: quizQuestions(value.questions),
    totalPoints: Number(value.totalPoints) || 0,
    createdBy: String(value.createdBy ?? ""),
    createdAt: iso(value.createdAt),
  };
}

function toResult(value: Record<string, unknown>): QuizResult {
  const corrections = Array.isArray(value.corrections)
    ? value.corrections.flatMap((rawCorrection) => {
        if (!rawCorrection || typeof rawCorrection !== "object") return [];
        const correction = rawCorrection as Record<string, unknown>;
        return [
          {
            questionId: String(correction.questionId ?? ""),
            correct: correction.correct === true,
            earnedPoints: Number(correction.earnedPoints) || 0,
            correctAnswer: String(correction.correctAnswer ?? ""),
            feedback: String(correction.feedback ?? ""),
          },
        ];
      })
    : [];
  return {
    quizId: String(value.quizId ?? ""),
    userId: String(value.userId ?? ""),
    earnedPoints: Number(value.earnedPoints) || 0,
    totalPoints: Number(value.totalPoints) || 0,
    grade: Number(value.grade) || 1,
    corrections,
    submittedAt: iso(value.submittedAt),
  };
}

export function watchQuizzes(
  courseId: string,
  canTeach: boolean,
  onChange: (quizzes: QuizDefinition[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  let stop: (() => void) | undefined;
  firestore()
    .then(({ sdk, db }) => {
      if (!active) return;
      const collection = sdk.collection(db, "courses", courseId, "quizzes");
      const query = canTeach
        ? sdk.query(collection, sdk.limit(MAX_QUIZZES_PER_SECTION))
        : sdk.query(
            collection,
            sdk.where("status", "==", "published"),
            sdk.limit(MAX_QUIZZES_PER_SECTION)
          );
      stop = sdk.onSnapshot(
        query,
        (snapshot) => {
          const quizzes = snapshot.docs
            .map((document) => toQuiz(document.id, document.data()))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
          onChange(quizzes);
        },
        () => onError("No se pudieron cargar los cuestionarios de la sección.")
      );
    })
    .catch(() => onError("No se pudo conectar Firebase."));
  return () => {
    active = false;
    stop?.();
  };
}

async function callQuiz<TRequest, TResult>(name: string, data: TRequest): Promise<TResult> {
  const { sdk, functions } = await cloudFunctions();
  try {
    const callable = sdk.httpsCallable<TRequest, TResult>(functions, name);
    return (await callable(data)).data;
  } catch (cause) {
    throw quizError(cause);
  }
}

export async function publishQuiz(input: PublishQuizInput) {
  return callQuiz<PublishQuizInput, { quizId: string }>("publishQuiz", input);
}

export async function startQuizAttempt(courseId: string, quizId: string) {
  return callQuiz<{ courseId: string; quizId: string }, StartQuizOutcome>("startQuizAttempt", {
    courseId,
    quizId,
  });
}

export async function loadOwnQuizResult(courseId: string, quizId: string) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  try {
    const snapshot = await sdk.getDoc(
      sdk.doc(db, "courses", courseId, "quizzes", quizId, "results", user.uid)
    );
    return snapshot.exists() ? toResult(snapshot.data()) : null;
  } catch (cause) {
    throw quizError(cause);
  }
}

export async function saveQuizAnswer(
  courseId: string,
  quizId: string,
  questionId: string,
  answer: string | number
) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const draft = sdk.doc(db, "courses", courseId, "quizzes", quizId, "drafts", user.uid);
  try {
    await sdk.updateDoc(
      draft,
      new sdk.FieldPath("answers", questionId),
      answer,
      "updatedAt",
      sdk.serverTimestamp()
    );
  } catch (cause) {
    throw quizError(cause);
  }
}

export async function submitQuizAttempt(courseId: string, quizId: string) {
  return callQuiz<{ courseId: string; quizId: string }, QuizResult>("submitQuizAttempt", {
    courseId,
    quizId,
  });
}
