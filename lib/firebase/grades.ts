import { firestore, currentUser, emailOf } from "./sdk.ts";
import { type GradeItem, type GradeScores, normalizeItems, normalizeScores } from "../grades.ts";
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

/**
 * Firestore aborta un `writeBatch` sobre 500 operaciones. 400 deja margen para
 * el documento de bitácora que acompaña cada tanda y para un reintento parcial.
 */
// Implements: REQ-PERF-02
export const MAX_BATCH_OPERATIONS = 400;

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

export async function saveClassroomProgress(courseId: string, completed: number, total: number) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(
    sdk.doc(db, "courses", courseId, "progress", user.uid),
    {
      uid: user.uid,
      displayName: user.displayName ?? "",
      email: emailOf(user),
      completed,
      total,
      percent: total ? Math.round((100 * completed) / total) : 0,
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

export async function saveGradebook(
  courseId: string,
  items: GradeItem[],
  exemption: number | null
) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(sdk.doc(db, "courses", courseId, "meta", "gradebook"), {
    courseId,
    items: normalizeItems(items),
    exemption,
    updatedBy: user.uid,
    updatedAt: sdk.serverTimestamp(),
  });
}

export async function saveStudentScores(courseId: string, userId: string, scores: GradeScores) {
  await saveSectionScores(courseId, [{ userId, scores }]);
}

/** Parte una lista de operaciones en lotes que Firestore acepta de una vez. */
// Implements: REQ-PERF-02
export function chunkOperations<T>(rows: readonly T[], size = MAX_BATCH_OPERATIONS): T[][] {
  const limit = Math.max(1, Math.trunc(size));
  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += limit) {
    batches.push(rows.slice(index, index + limit));
  }
  return batches;
}

/*
  Publicación masiva de notas oficiales. Una sección de plan común pasa de 300
  estudiantes: un único `writeBatch` reventaría el techo de 500 operaciones de
  Firestore, así que la matriz se escribe en tandas secuenciales de 400.
*/
// Implements: REQ-PERF-02
export async function saveSectionScores(courseId: string, rows: readonly StudentScoreRow[]) {
  if (rows.length === 0) return 0;
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const batches = chunkOperations(rows);
  for (const group of batches) {
    const batch = sdk.writeBatch(db);
    for (const row of group) {
      batch.set(sdk.doc(db, "courses", courseId, "grades", row.userId), {
        uid: row.userId,
        courseId,
        scores: normalizeScores(row.scores),
        updatedBy: user.uid,
        updatedAt: sdk.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return batches.length;
}
