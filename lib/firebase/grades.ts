import { firestore, currentUser, emailOf } from "./sdk.ts";
import { type GradeItem, type GradeScores, normalizeItems, normalizeScores } from "../grades.ts";
import { toGradebookState } from "./mappers.ts";

export type CourseGradebook = {
  courseId: string;
  items: GradeItem[];
  exemption: number | null;
};

export function watchGradebooks(onChange: (items: CourseGradebook[]) => void, onError: (message: string) => void) {
  let active = true;
  let stop: () => void = () => undefined;

  firestore().then(({ sdk, db }) => {
    if (!active) return;
    stop = sdk.onSnapshot(
      sdk.query(sdk.collectionGroup(db, "meta")),
      (snapshot) => onChange(snapshot.docs.flatMap((document) => {
        const courseId = document.ref.parent.parent?.id ?? "";
        if (!courseId) return [];
        const state = toGradebookState(document.data());
        return [{ courseId, items: state.gradebook, exemption: state.exemption }];
      })),
      () => onError("No se pudieron cargar las evaluaciones de los cursos."),
    );
  }).catch(() => onError("No se pudo conectar Firebase."));

  return () => {
    active = false;
    stop();
  };
}

export async function saveClassroomProgress(courseId: string, completed: number, total: number) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(sdk.doc(db, "courses", courseId, "progress", user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: emailOf(user),
    completed,
    total,
    percent: total ? Math.round(100 * completed / total) : 0,
    lastSeen: sdk.serverTimestamp(),
  }, { merge: true });
}

export async function saveSimulation(courseId: string, scores: GradeScores) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(sdk.doc(db, "courses", courseId, "progress", user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: emailOf(user),
    simulated: normalizeScores(scores),
    lastSeen: sdk.serverTimestamp(),
  }, { merge: true });
}

export async function saveGradebook(courseId: string, items: GradeItem[], exemption: number | null) {
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
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.setDoc(sdk.doc(db, "courses", courseId, "grades", userId), {
    uid: userId,
    courseId,
    scores: normalizeScores(scores),
    updatedBy: user.uid,
    updatedAt: sdk.serverTimestamp(),
  });
}
