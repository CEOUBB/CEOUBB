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
import { normalizeLiveClassUrl, type LiveClassLink } from "../live-class.ts";

const ACTIVITY_LIMIT = 120;

/*
  Techo por sección: 20 publicaciones bastan para el ribbon de novedades y
  acotan la lectura inicial a `secciones x 20` documentos en vez de barrer la
  universidad entera.
*/
const ACTIVITY_LIMIT_PER_SECTION = 20;

/*
  Una escucha por sección abre un canal por sección. Un estudiante lleva 6-8
  ramos y un docente rara vez pasa de 12; 40 deja holgura para un coordinador
  sin degradar el arranque del portal.
*/
export const MAX_WATCHED_SECTIONS = 40;

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
  liveClass: LiveClassLink | null;
};

export type CourseActivity = {
  id: string;
  courseId: string;
  title: string;
  kind: ClassroomPostKind;
  dueDate: string;
  createdAt: string;
};

// Implements: REQ-LIVE-01, REQ-LIVE-05, REQ-LIVE-08
export function watchClassroom(
  courseId: string,
  teaching: boolean,
  onChange: (state: Partial<ClassroomState>) => void,
  onError: (message: string) => void
) {
  let active = true;
  const stops: (() => void)[] = [];

  firestore()
    .then(async ({ sdk, db }) => {
      const user = await syncProfile();
      if (!active) return;
      stops.push(
        sdk.onSnapshot(
          sdk.query(
            sdk.collection(db, "courses", courseId, "posts"),
            sdk.orderBy("createdAt", "desc")
          ),
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
          () => onError("No se pudieron sincronizar las publicaciones de Firebase.")
        )
      );
      stops.push(
        sdk.onSnapshot(
          sdk.doc(db, "courses", courseId, "meta", "gradebook"),
          (snapshot) => onChange(toGradebookState(snapshot.exists() ? snapshot.data() : null)),
          () => onError("No se pudo cargar la ponderación del curso.")
        )
      );
      stops.push(
        sdk.onSnapshot(
          sdk.doc(db, "courses", courseId, "meta", "live-class"),
          (snapshot) => {
            if (!snapshot.exists()) {
              onChange({ liveClass: null });
              return;
            }
            try {
              const data = snapshot.data();
              const liveClass = normalizeLiveClassUrl(String(data.url ?? ""));
              onChange({ liveClass: liveClass?.provider === data.provider ? liveClass : null });
            } catch {
              onChange({ liveClass: null });
            }
          },
          () => onError("No se pudo sincronizar la clase en vivo.")
        )
      );
      if (teaching) {
        stops.push(
          sdk.onSnapshot(
            sdk.query(
              sdk.collection(db, "courses", courseId, "progress"),
              sdk.orderBy("lastSeen", "desc")
            ),
            (snapshot) => onChange({ students: snapshot.docs.map(toStudent) }),
            () => onError("No se pudo sincronizar el progreso del curso.")
          )
        );
        stops.push(
          sdk.onSnapshot(
            sdk.collection(db, "courses", courseId, "grades"),
            (snapshot) =>
              onChange({
                classScores: Object.fromEntries(
                  snapshot.docs.map((document) => [
                    document.id,
                    normalizeScores(document.data().scores),
                  ])
                ),
              }),
            () => onError("No se pudieron sincronizar las notas del curso.")
          )
        );
      } else {
        stops.push(
          sdk.onSnapshot(
            sdk.doc(db, "courses", courseId, "progress", user.uid),
            (snapshot) =>
              onChange({
                ownProgress: snapshot.exists() ? Number(snapshot.data().completed ?? 0) : 0,
                simulation: snapshot.exists() ? normalizeScores(snapshot.data().simulated) : {},
              }),
            () => onError("No se pudo cargar tu progreso.")
          )
        );
        stops.push(
          sdk.onSnapshot(
            sdk.doc(db, "courses", courseId, "grades", user.uid),
            (snapshot) =>
              onChange({
                officialScores: snapshot.exists() ? normalizeScores(snapshot.data().scores) : {},
              }),
            () => onError("No se pudieron cargar tus notas.")
          )
        );
      }
    })
    .catch((cause) =>
      onError(cause instanceof Error ? cause.message : "No se pudo conectar Firebase.")
    );

  return () => {
    active = false;
    for (const stop of stops) stop();
  };
}

// Implements: REQ-LIVE-01, REQ-LIVE-02, REQ-LIVE-05
export async function saveLiveClassLink(courseId: string, value: string) {
  const liveClass = normalizeLiveClassUrl(value);
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const reference = sdk.doc(db, "courses", courseId, "meta", "live-class");

  try {
    if (!liveClass) {
      await sdk.deleteDoc(reference);
      return;
    }
    await sdk.setDoc(reference, {
      courseId,
      ...liveClass,
      updatedBy: user.uid,
      updatedAt: sdk.serverTimestamp(),
    });
  } catch (cause) {
    const code = typeof cause === "object" && cause && "code" in cause ? cause.code : "";
    if (code === "permission-denied") {
      throw new Error("No tienes permiso para editar esta clase en vivo.");
    }
    throw new Error("No se pudo guardar la clase en vivo. Inténtalo nuevamente.");
  }
}

/** Normaliza la lista de secciones a escuchar: sin duplicados y con techo. */
// Implements: REQ-PERF-01
export function watchableSections(enrolledSectionIds: readonly string[]): string[] {
  return [...new Set(enrolledSectionIds.filter(Boolean))].sort().slice(0, MAX_WATCHED_SECTIONS);
}

/** Une la actividad de todas las secciones y deja las más recientes arriba. */
// Implements: REQ-PERF-01
export function mergeActivity(bySection: Map<string, CourseActivity[]>): CourseActivity[] {
  return [...bySection.values()]
    .flat()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, ACTIVITY_LIMIT);
}

/*
  Escucha segmentada por matrícula. El `collectionGroup("posts")` anterior leía
  las publicaciones de toda la universidad y las novedades del propio estudiante
  quedaban desplazadas por el ruido de miles de secciones ajenas; ahora sólo se
  abre un canal por sección matriculada.
*/
// Implements: REQ-PERF-01
export function watchCourseActivity(
  enrolledSectionIds: readonly string[],
  onChange: (items: CourseActivity[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  const stops: (() => void)[] = [];
  const sections = watchableSections(enrolledSectionIds);
  const bySection = new Map<string, CourseActivity[]>();

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
            sdk.query(
              sdk.collection(db, "courses", courseId, "posts"),
              sdk.orderBy("createdAt", "desc"),
              sdk.limit(ACTIVITY_LIMIT_PER_SECTION)
            ),
            (snapshot) => {
              bySection.set(
                courseId,
                snapshot.docs.map((document) => ({
                  id: document.id,
                  courseId,
                  title: String(document.data().title ?? "Publicación"),
                  kind: postKind(String(document.data().kind ?? "notice")),
                  dueDate: normalizeDueDate(document.data().dueDate),
                  createdAt: iso(document.data().createdAt),
                }))
              );
              onChange(mergeActivity(bySection));
            },
            () => onError("No se pudo sincronizar la actividad de los cursos.")
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

export async function publishClassroomPost(
  courseId: string,
  input: {
    title: string;
    body: string;
    kind: string;
    folder: string;
    linkUrl: string;
    dueDate: string;
  }
) {
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

export async function editClassroomPost(
  courseId: string,
  id: string,
  values: { title: string; body: string }
) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), {
    title: values.title,
    body: values.body,
  });
}

export async function moveClassroomPost(courseId: string, id: string, folder: string) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), {
    folder: folderName(folder),
  });
}

export async function deleteClassroomPost(courseId: string, id: string, storagePath = "") {
  if (storagePath) {
    const cloud = await cloudStorage();
    await cloud.sdk.deleteObject(cloud.sdk.ref(cloud.storage, storagePath)).catch(() => undefined);
  }
  const { sdk, db } = await firestore();
  await sdk.deleteDoc(sdk.doc(db, "courses", courseId, "posts", id));
}
