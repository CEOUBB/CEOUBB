import { firestore, cloudStorage, currentUser, authorFields } from "./sdk.ts";
import { syncProfile } from "./profile.ts";
import {
  type ClassroomFile,
  type ClassroomPost,
  type ClassroomPostKind,
  type ClassroomStudent,
  folderName,
  iso,
  postKind,
  toFile,
  toGradebookState,
  toPost,
  toStudent,
} from "./mappers.ts";
import { normalizeDueDate } from "../planner.ts";
import { type GradeItem, type GradeScores, normalizeScores } from "../grades.ts";

const ACTIVITY_LIMIT = 120;

export type ClassroomState = {
  posts: ClassroomPost[];
  files: ClassroomFile[];
  students: ClassroomStudent[];
  ownProgress: number;
  gradebook: GradeItem[];
  exemption: number | null;
  officialScores: GradeScores;
  simulation: GradeScores;
  classScores: Record<string, GradeScores>;
};

export type CourseActivity = {
  id: string;
  courseId: string;
  title: string;
  kind: ClassroomPostKind;
  dueDate: string;
  createdAt: string;
};

export function watchClassroom(
  courseId: string,
  teaching: boolean,
  onChange: (state: Partial<ClassroomState>) => void,
  onError: (message: string) => void,
) {
  let active = true;
  const stops: (() => void)[] = [];

  firestore().then(async ({ sdk, db }) => {
    const user = await syncProfile();
    if (!active) return;
    stops.push(sdk.onSnapshot(
      sdk.query(sdk.collection(db, "courses", courseId, "posts"), sdk.orderBy("createdAt", "desc")),
      (snapshot) => {
        const posts: ClassroomPost[] = [];
        const files: ClassroomFile[] = [];
        for (const document of snapshot.docs) {
          const post = toPost(document);
          posts.push(post);
          if (post.storagePath) {
            files.push(toFile(post, document.data()));
          }
        }
        onChange({ posts, files });
      },
      () => onError("No se pudieron sincronizar las publicaciones de Firebase."),
    ));
    stops.push(sdk.onSnapshot(
      sdk.doc(db, "courses", courseId, "meta", "gradebook"),
      (snapshot) => onChange(toGradebookState(snapshot.exists() ? snapshot.data() : null)),
      () => onError("No se pudo cargar la ponderación del curso."),
    ));
    if (teaching) {
      stops.push(sdk.onSnapshot(
        sdk.query(sdk.collection(db, "courses", courseId, "progress"), sdk.orderBy("lastSeen", "desc")),
        (snapshot) => onChange({ students: snapshot.docs.map(toStudent) }),
        () => onError("No se pudo sincronizar el progreso del curso."),
      ));
      stops.push(sdk.onSnapshot(
        sdk.collection(db, "courses", courseId, "grades"),
        (snapshot) => onChange({ classScores: Object.fromEntries(snapshot.docs.map((document) => [document.id, normalizeScores(document.data().scores)])) }),
        () => onError("No se pudieron sincronizar las notas del curso."),
      ));
    } else {
      stops.push(sdk.onSnapshot(
        sdk.doc(db, "courses", courseId, "progress", user.uid),
        (snapshot) => onChange({
          ownProgress: snapshot.exists() ? Number(snapshot.data().completed ?? 0) : 0,
          simulation: snapshot.exists() ? normalizeScores(snapshot.data().simulated) : {},
        }),
        () => onError("No se pudo cargar tu progreso."),
      ));
      stops.push(sdk.onSnapshot(
        sdk.doc(db, "courses", courseId, "grades", user.uid),
        (snapshot) => onChange({ officialScores: snapshot.exists() ? normalizeScores(snapshot.data().scores) : {} }),
        () => onError("No se pudieron cargar tus notas."),
      ));
    }
  }).catch((cause) => onError(cause instanceof Error ? cause.message : "No se pudo conectar Firebase."));

  return () => {
    active = false;
    for (const stop of stops) stop();
  };
}

// ponytail: el planificador reutiliza este barrido para las entregas en vez de abrir un
// segundo collectionGroup. Techo: una entrega cuya publicación quede fuera de las
// ACTIVITY_LIMIT más recientes no aparece en el ribbon. Se corrige con la consulta filtrada
// por matrícula que PLAN.md ya tiene pendiente, no con otro barrido global.
export function watchCourseActivity(onChange: (items: CourseActivity[]) => void, onError: (message: string) => void) {
  let active = true;
  let stop: () => void = () => undefined;

  firestore().then(({ sdk, db }) => {
    if (!active) return;
    stop = sdk.onSnapshot(
      sdk.query(sdk.collectionGroup(db, "posts"), sdk.orderBy("createdAt", "desc"), sdk.limit(ACTIVITY_LIMIT)),
      (snapshot) => onChange(snapshot.docs.flatMap((document) => {
        const courseId = document.ref.parent.parent?.id ?? String(document.data().courseId ?? "");
        if (!courseId) return [];
        return [{
          id: document.id,
          courseId,
          title: String(document.data().title ?? "Publicación"),
          kind: postKind(String(document.data().kind ?? "notice")),
          dueDate: normalizeDueDate(document.data().dueDate),
          createdAt: iso(document.data().createdAt),
        }];
      })),
      () => onError("No se pudo sincronizar la actividad de los cursos."),
    );
  }).catch(() => onError("No se pudo conectar Firebase."));

  return () => {
    active = false;
    stop();
  };
}

export async function publishClassroomPost(courseId: string, input: { title: string; body: string; kind: string; folder: string; linkUrl: string; dueDate: string }) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const linkUrl = input.linkUrl.trim();
  await sdk.addDoc(sdk.collection(db, "courses", courseId, "posts"), {
    ...authorFields(user),
    courseId,
    title: input.title.trim(),
    body: input.body.trim(),
    kind: postKind(input.kind),
    folder: folderName(input.folder),
    dueDate: normalizeDueDate(input.dueDate),
    fileUrl: linkUrl,
    fileName: linkUrl ? "Abrir recurso" : "",
    storagePath: "",
    contentType: "",
    fileSize: 0,
    createdAt: sdk.serverTimestamp(),
  });
}

export async function editClassroomPost(courseId: string, id: string, values: { title: string; body: string }) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), { title: values.title, body: values.body });
}

export async function moveClassroomPost(courseId: string, id: string, folder: string) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), { folder: folderName(folder) });
}

export async function deleteClassroomPost(courseId: string, id: string, storagePath = "") {
  if (storagePath) {
    const cloud = await cloudStorage();
    await cloud.sdk.deleteObject(cloud.sdk.ref(cloud.storage, storagePath)).catch(() => undefined);
  }
  const { sdk, db } = await firestore();
  await sdk.deleteDoc(sdk.doc(db, "courses", courseId, "posts", id));
}
