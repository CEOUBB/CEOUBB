import {
  firestore,
  cloudStorage,
  currentUser,
  authorFields,
  isDevOrLocalEnvironment,
} from "./sdk.ts";
import { syncProfile } from "./profile.ts";
import {
  type ClassroomAttachment,
  type ClassroomFile,
  type ClassroomPost,
  type ClassroomPostKind,
  type ClassroomStudent,
  folderName,
  iso,
  postKind,
  toAttachments,
  toFile,
  toGradebookState,
  toPost,
  toStudent,
} from "./mappers.ts";
import { normalizeDueDate } from "../planner.ts";
import {
  type GradeFeedback,
  type GradeItem,
  type GradeScores,
  normalizeGradeFeedback,
  normalizeScores,
} from "../grades.ts";
import { normalizeRichTextBody, safeLinkDestination } from "../rich-text.ts";
import { normalizeLiveClassUrl, type LiveClassLink } from "../live-class.ts";

import { roleForEmail } from "../access-policy.ts";

const ACTIVITY_LIMIT = 120;

const DEV_POSTS_PREFIX = "ceoubb_dev_posts:";
const DEV_POSTS_EVENT = "ceoubb_dev_posts_change";

function devStorageKey(courseId: string): string {
  return `${DEV_POSTS_PREFIX}${courseId}`;
}

export function readDevPosts(courseId: string): ClassroomPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(devStorageKey(courseId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDevPost(courseId: string, post: ClassroomPost): void {
  if (typeof window === "undefined") return;
  try {
    const current = readDevPosts(courseId);
    const updated = [post, ...current.filter((p) => p.id !== post.id)];
    window.localStorage.setItem(devStorageKey(courseId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(DEV_POSTS_EVENT, { detail: { courseId } }));
  } catch {
    // Ignore localStorage errors
  }
}

export function updateDevPost(
  courseId: string,
  postId: string,
  updater: (p: ClassroomPost) => ClassroomPost
): void {
  if (typeof window === "undefined") return;
  try {
    const current = readDevPosts(courseId);
    const updated = current.map((p) => (p.id === postId ? updater(p) : p));
    window.localStorage.setItem(devStorageKey(courseId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(DEV_POSTS_EVENT, { detail: { courseId } }));
  } catch {
    // Ignore localStorage errors
  }
}

export function deleteDevPost(courseId: string, postId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = readDevPosts(courseId);
    const updated = current.filter((p) => p.id !== postId);
    window.localStorage.setItem(devStorageKey(courseId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(DEV_POSTS_EVENT, { detail: { courseId } }));
  } catch {
    // Ignore localStorage errors
  }
}

export function onDevPostsChanged(courseId: string, callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ courseId: string }>;
    if (!custom.detail || custom.detail.courseId === courseId) {
      callback();
    }
  };
  const storageHandler = (event: StorageEvent) => {
    if (!event.key || event.key === devStorageKey(courseId)) {
      callback();
    }
  };
  window.addEventListener(DEV_POSTS_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(DEV_POSTS_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

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
  gradebook: GradeItem[];
  exemption: number | null;
  officialScores: GradeScores;
  officialFeedback: GradeFeedback;
  simulation: GradeScores;
  classScores: Record<string, GradeScores>;
  classFeedback: Record<string, GradeFeedback>;
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

  const syncDevPosts = () => {
    if (!active) return;
    const devPosts = readDevPosts(courseId);
    if (devPosts.length > 0) {
      onChange({ posts: devPosts });
    }
  };

  if (isDevOrLocalEnvironment()) {
    syncDevPosts();
    stops.push(onDevPostsChanged(courseId, syncDevPosts));
  }

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
            if (isDevOrLocalEnvironment()) {
              const devPosts = readDevPosts(courseId);
              const merged = [...devPosts];
              for (const p of posts) {
                if (!merged.some((m) => m.id === p.id)) merged.push(p);
              }
              onChange({ posts: merged.length > 0 ? merged : posts, files });
            } else {
              onChange({ posts, files });
            }
          },
          () => {
            if (!isDevOrLocalEnvironment()) {
              onError("No se pudieron sincronizar las publicaciones de Firebase.");
            }
          }
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
            () => onError("No se pudo sincronizar la nómina del curso.")
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
                classFeedback: Object.fromEntries(
                  snapshot.docs.map((document) => [
                    document.id,
                    normalizeGradeFeedback(document.data().feedback),
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
                simulation: snapshot.exists() ? normalizeScores(snapshot.data().simulated) : {},
              }),
            () => onError("No se pudo cargar tu simulación de notas.")
          )
        );
        stops.push(
          sdk.onSnapshot(
            sdk.doc(db, "courses", courseId, "grades", user.uid),
            (snapshot) =>
              onChange({
                officialScores: snapshot.exists() ? normalizeScores(snapshot.data().scores) : {},
                officialFeedback: snapshot.exists()
                  ? normalizeGradeFeedback(snapshot.data().feedback)
                  : {},
              }),
            () => onError("No se pudieron cargar tus notas.")
          )
        );
      }
    })
    /*
      El mensaje crudo del SDK llega en inglés y en jerga de reglas
      («Missing or insufficient permissions»). Al aula sólo debe salir una
      frase en español que diga qué pasó y qué hacer.
    */
    .catch(() =>
      onError("No se pudo cargar el contenido del ramo. Revisa tu conexión y vuelve a intentarlo.")
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
      throw new Error("No tienes permiso para editar esta clase en vivo.", { cause });
    }
    throw new Error("No se pudo guardar la clase en vivo. Inténtalo nuevamente.", { cause });
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

  const syncDevActivities = () => {
    if (!active || typeof window === "undefined") return;
    for (const courseId of sections) {
      const devPosts = readDevPosts(courseId);
      if (devPosts.length > 0) {
        bySection.set(
          courseId,
          devPosts.map((post) => ({
            id: post.id,
            courseId,
            title: post.title,
            kind: post.kind,
            dueDate: post.dueDate,
            createdAt: post.createdAt,
          }))
        );
      }
    }
    onChange(mergeActivity(bySection));
  };

  if (isDevOrLocalEnvironment()) {
    syncDevActivities();
    for (const courseId of sections) {
      stops.push(onDevPostsChanged(courseId, syncDevActivities));
    }
  }

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
              const remote = snapshot.docs.map((document) => ({
                id: document.id,
                courseId,
                title: String(document.data().title ?? "Publicación"),
                kind: postKind(String(document.data().kind ?? "notice")),
                dueDate: normalizeDueDate(document.data().dueDate),
                createdAt: iso(document.data().createdAt),
              }));
              if (isDevOrLocalEnvironment()) {
                const dev = (bySection.get(courseId) ?? []).filter((item) =>
                  item.id.startsWith("dev-post-")
                );
                bySection.set(courseId, [...dev, ...remote]);
              } else {
                bySection.set(courseId, remote);
              }
              onChange(mergeActivity(bySection));
            },
            () => {
              if (!isDevOrLocalEnvironment()) {
                onError("No se pudo sincronizar la actividad de los cursos.");
              }
            }
          )
        );
      }
    })
    .catch(() => {
      if (!isDevOrLocalEnvironment()) {
        onError("No se pudo conectar Firebase.");
      }
    });

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
    notifyStudents: boolean;
    attachments?: ClassroomAttachment[];
  }
) {
  const rawLinkUrl = input.linkUrl.trim();
  const linkUrl = rawLinkUrl ? safeLinkDestination(rawLinkUrl) : "";
  if (rawLinkUrl && (!linkUrl || !/^https?:\/\//i.test(linkUrl))) {
    throw new Error("El enlace debe usar http:// o https://.");
  }
  const body = normalizeRichTextBody(input.body);
  // Implements: REQ-PUB-09
  const attachments = toAttachments(input.attachments ?? []);

  let user: { uid: string; displayName?: string | null; email?: string | null };
  try {
    user = await currentUser();
  } catch (err) {
    if (isDevOrLocalEnvironment()) {
      user = {
        uid: "dev:teacher-demo",
        displayName: "Docente Demo",
        email: "docente.demo@ubiobio.cl",
      };
    } else {
      throw err;
    }
  }

  const postFields = {
    ...authorFields(user as unknown as import("firebase/auth").User),
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
    attachments,
    notifyStudents: input.notifyStudents,
  };

  try {
    const { sdk, db } = await firestore();
    await sdk.addDoc(sdk.collection(db, "courses", courseId, "posts"), {
      ...postFields,
      createdAt: sdk.serverTimestamp(),
    });
  } catch (cause) {
    if (isDevOrLocalEnvironment()) {
      const devPost: ClassroomPost = {
        id: `dev-post-${Date.now()}`,
        authorId: user?.uid ?? "dev:teacher-demo",
        authorName: user?.displayName ?? "Docente Demo",
        authorEmail: (user?.email ?? "docente.demo@ubiobio.cl").toLowerCase(),
        authorRole: roleForEmail(user?.email ?? "docente.demo@ubiobio.cl") ?? "teacher",
        title: postFields.title,
        body: postFields.body,
        kind: postFields.kind,
        folder: postFields.folder,
        dueDate: postFields.dueDate,
        linkUrl: postFields.fileUrl || null,
        storagePath: "",
        attachments: postFields.attachments,
        createdAt: new Date().toISOString(),
      };
      saveDevPost(courseId, devPost);
      return;
    }
    throw cause;
  }
}

export async function editClassroomPost(
  courseId: string,
  id: string,
  values: { title: string; body: string }
) {
  if (isDevOrLocalEnvironment() && id.startsWith("dev-post-")) {
    updateDevPost(courseId, id, (p) => ({
      ...p,
      title: values.title.trim(),
      body: normalizeRichTextBody(values.body),
    }));
    return;
  }
  try {
    const { sdk, db } = await firestore();
    await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), {
      title: values.title.trim(),
      body: normalizeRichTextBody(values.body),
    });
  } catch (cause) {
    if (isDevOrLocalEnvironment()) {
      updateDevPost(courseId, id, (p) => ({
        ...p,
        title: values.title.trim(),
        body: normalizeRichTextBody(values.body),
      }));
      return;
    }
    throw cause;
  }
}

export async function moveClassroomPost(courseId: string, id: string, folder: string) {
  if (isDevOrLocalEnvironment() && id.startsWith("dev-post-")) {
    updateDevPost(courseId, id, (p) => ({
      ...p,
      folder: folderName(folder),
    }));
    return;
  }
  try {
    const { sdk, db } = await firestore();
    await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), {
      folder: folderName(folder),
    });
  } catch (cause) {
    if (isDevOrLocalEnvironment()) {
      updateDevPost(courseId, id, (p) => ({
        ...p,
        folder: folderName(folder),
      }));
      return;
    }
    throw cause;
  }
}

export async function deleteClassroomPost(courseId: string, id: string, storagePath = "") {
  if (isDevOrLocalEnvironment() && id.startsWith("dev-post-")) {
    deleteDevPost(courseId, id);
    return;
  }
  try {
    if (storagePath) {
      const cloud = await cloudStorage();
      await cloud.sdk
        .deleteObject(cloud.sdk.ref(cloud.storage, storagePath))
        .catch(() => undefined);
    }
    const { sdk, db } = await firestore();
    await sdk.deleteDoc(sdk.doc(db, "courses", courseId, "posts", id));
  } catch (cause) {
    if (isDevOrLocalEnvironment()) {
      deleteDevPost(courseId, id);
      return;
    }
    throw cause;
  }
}
