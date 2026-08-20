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
import { normalizeRichTextBody, safeLinkDestination } from "../rich-text.ts";

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
  const rawLinkUrl = input.linkUrl.trim();
  const linkUrl = rawLinkUrl ? safeLinkDestination(rawLinkUrl) : "";
  if (rawLinkUrl && (!linkUrl || !/^https?:\/\//i.test(linkUrl))) {
    throw new Error("El enlace debe usar http:// o https://.");
  }
  const body = normalizeRichTextBody(input.body);
  await sdk.addDoc(sdk.collection(db, "courses", courseId, "posts"), {
    ...authorFields(user),
    courseId,
    title: input.title.trim(),
    body,
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
    title: values.title.trim(),
    body: normalizeRichTextBody(values.body),
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
