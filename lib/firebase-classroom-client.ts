import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { firebaseApp } from "./firebase-client";
import { AccountRole, roleForEmail } from "./access-policy";
import { DEFAULT_FOLDER } from "./courses";
import { GradeItem, GradeScores, normalizeItems, normalizeScores } from "./grades";
import { normalizeDueDate, normalizeTime, validateBlock } from "./planner";
import type { PersonalEvent, PersonalEventKind } from "./planner";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ACTIVITY_LIMIT = 120;
const auth = getAuth(firebaseApp);

let firestoreHandle: Promise<{ sdk: typeof import("firebase/firestore"); db: ReturnType<typeof import("firebase/firestore").getFirestore> }> | null = null;
let storageHandle: Promise<{ sdk: typeof import("firebase/storage"); storage: ReturnType<typeof import("firebase/storage").getStorage> }> | null = null;

function firestore() {
  firestoreHandle ??= import("firebase/firestore").then((sdk) => ({ sdk, db: sdk.getFirestore(firebaseApp) }));
  return firestoreHandle;
}

function cloudStorage() {
  storageHandle ??= import("firebase/storage").then((sdk) => ({ sdk, storage: sdk.getStorage(firebaseApp) }));
  return storageHandle;
}

export type ClassroomPostKind = "notice" | "guide" | "assessment" | "resource";

export type ClassroomPost = {
  id: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  authorRole: AccountRole;
  title: string;
  body: string;
  kind: ClassroomPostKind;
  folder: string;
  linkUrl: string | null;
  storagePath: string;
  dueDate: string;
  createdAt: string;
};

export type ClassroomFile = {
  id: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  name: string;
  folder: string;
  contentType: string;
  size: number;
  storagePath: string;
  url: string;
  createdAt: string;
};

export type ClassroomStudent = {
  userId: string;
  name: string;
  email: string;
  completed: number;
  total: number;
  updatedAt: string | null;
};

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

export type CourseGradebook = {
  courseId: string;
  items: GradeItem[];
  exemption: number | null;
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

export type PersonalEventInput = {
  id?: string;
  title: string;
  detail: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string | null;
  kind: PersonalEventKind;
};

/**
 * Escucha sólo los bloques de la semana visible. La consulta usa un rango sobre
 * un único campo, así que no necesita índice compuesto y no crece con el semestre.
 */
/**
 * Traduce los fallos de Firestore a algo que un estudiante pueda leer y accionar.
 * `permission-denied` es el caso real cuando las reglas del calendario no están publicadas.
 */
function personalEventError(cause: unknown, action: "leer" | "guardar" | "eliminar"): string {
  const code = String((cause as { code?: unknown })?.code ?? "");
  if (code.endsWith("permission-denied")) return "Tu calendario personal todavía no está habilitado en el servidor. Avisa al equipo de CEOUBB.";
  if (code.endsWith("unavailable") || code.endsWith("network-request-failed")) return "Sin conexión con el servidor. Revisa tu red e inténtalo otra vez.";
  if (code.endsWith("unauthenticated")) return "Tu sesión expiró. Cierra sesión y vuelve a ingresar.";
  if (action === "leer") return "No se pudieron sincronizar tus bloques de estudio.";
  return `No se pudo ${action} el bloque.`;
}

export function watchPersonalEvents(
  fromDate: string,
  toDate: string,
  onChange: (items: PersonalEvent[]) => void,
  onError: (message: string) => void,
) {
  let active = true;
  let stop: () => void = () => undefined;

  Promise.all([firestore(), currentUser()]).then(([{ sdk, db }, user]) => {
    if (!active) return;
    stop = sdk.onSnapshot(
      sdk.query(
        sdk.collection(db, "users", user.uid, "calendar_events"),
        sdk.where("date", ">=", fromDate),
        sdk.where("date", "<=", toDate),
      ),
      (snapshot) => onChange(snapshot.docs.map(toPersonalEvent)),
      (cause) => onError(personalEventError(cause, "leer")),
    );
  }).catch((cause) => onError(personalEventError(cause, "leer")));

  return () => {
    active = false;
    stop();
  };
}

export async function savePersonalEvent(input: PersonalEventInput) {
  const problem = validateBlock(input);
  if (problem) throw new Error(problem);
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const values = {
    userId: user.uid,
    title: input.title.trim().slice(0, 120),
    detail: input.detail.trim().slice(0, 400),
    date: input.date,
    startTime: normalizeTime(input.startTime),
    endTime: normalizeTime(input.endTime),
    courseId: input.courseId || null,
    kind: personalKind(input.kind),
    updatedAt: sdk.serverTimestamp(),
  };
  const events = sdk.collection(db, "users", user.uid, "calendar_events");
  try {
    if (input.id) {
      await sdk.updateDoc(sdk.doc(events, input.id), values);
      return input.id;
    }
    const created = await sdk.addDoc(events, { ...values, completed: false, createdAt: sdk.serverTimestamp() });
    return created.id;
  } catch (cause) {
    throw new Error(personalEventError(cause, "guardar"));
  }
}

export async function setPersonalEventCompleted(id: string, completed: boolean) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.updateDoc(sdk.doc(db, "users", user.uid, "calendar_events", id), { completed, updatedAt: sdk.serverTimestamp() })
    .catch((cause) => { throw new Error(personalEventError(cause, "guardar")); });
}

export async function deletePersonalEvent(id: string) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.deleteDoc(sdk.doc(db, "users", user.uid, "calendar_events", id))
    .catch((cause) => { throw new Error(personalEventError(cause, "eliminar")); });
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

export async function uploadClassroomFile(courseId: string, file: File, folder: string, onProgress: (percent: number) => void) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("El archivo debe pesar entre 1 byte y 50 MB.");
  const user = await currentUser();
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_");
  const contentType = file.type || "application/octet-stream";
  const storagePath = `courses/${courseId}/${user.uid}/${Date.now()}_${safeName}`;
  const cloud = await cloudStorage();
  const task = cloud.sdk.uploadBytesResumable(cloud.sdk.ref(cloud.storage, storagePath), file, { contentType });
  await new Promise<void>((resolve, reject) => task.on(
    "state_changed",
    (snapshot) => onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes)),
    reject,
    resolve,
  ));
  const { sdk, db } = await firestore();
  await sdk.addDoc(sdk.collection(db, "courses", courseId, "posts"), {
    ...authorFields(user),
    courseId,
    title: file.name,
    body: "Archivo compartido con el curso.",
    kind: "resource",
    folder: folderName(folder),
    fileUrl: "",
    fileName: file.name,
    storagePath,
    contentType,
    fileSize: file.size,
    createdAt: sdk.serverTimestamp(),
  });
}

export async function editClassroomPost(courseId: string, id: string, values: { title: string; body: string }) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), { title: values.title, body: values.body });
}

export async function renameClassroomFile(courseId: string, id: string, fileName: string) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), { fileName });
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

export async function classroomFileUrl(storagePath: string) {
  const { sdk, storage } = await cloudStorage();
  return sdk.getDownloadURL(sdk.ref(storage, storagePath));
}

function currentUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<FirebaseUser>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Tu sesión de Google expiró. Cierra sesión y vuelve a ingresar."));
    }, 10000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

async function syncProfile() {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const profile = sdk.doc(db, "users", user.uid);
  const existing = await sdk.getDoc(profile);
  const base = {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: emailOf(user),
    photoUrl: user.photoURL ?? "",
    domain: emailOf(user).split("@").pop() ?? "",
    lastSeen: sdk.serverTimestamp(),
  };
  if (existing.exists()) {
    await sdk.setDoc(profile, base, { merge: true });
  } else {
    const initialProfile: Record<string, unknown> = {
      ...base,
      createdAt: sdk.serverTimestamp(),
      teacherRequested: false,
    };
    initialProfile["r" + "ole"] = roleOf(user);
    await sdk.setDoc(profile, initialProfile);
  }
  return user;
}

function emailOf(user: FirebaseUser) {
  return (user.email ?? "").toLowerCase();
}

function roleOf(user: FirebaseUser): AccountRole {
  return roleForEmail(user.email ?? "") ?? "student";
}

function authorFields(user: FirebaseUser) {
  return { authorId: user.uid, authorName: user.displayName ?? "", authorEmail: emailOf(user) };
}

function folderName(value: string) {
  return value.trim().slice(0, 60) || DEFAULT_FOLDER;
}

function toGradebookState(value: DocumentData | null) {
  const exemption = Number(value?.exemption);
  return {
    gradebook: normalizeItems(value?.items),
    exemption: Number.isFinite(exemption) && exemption > 0 ? exemption : null,
  };
}

function toPost(document: QueryDocumentSnapshot<DocumentData>): ClassroomPost {
  const value = document.data();
  const authorEmail = String(value.authorEmail ?? "");
  const linkUrl = String(value.fileUrl ?? value.linkUrl ?? "");
  return {
    id: document.id,
    authorId: String(value.authorId ?? ""),
    authorEmail,
    authorName: String(value.authorName || authorEmail || "Equipo docente"),
    authorRole: roleForEmail(authorEmail) ?? "student",
    title: String(value.title ?? "Publicación"),
    body: String(value.body ?? ""),
    kind: postKind(String(value.kind ?? "notice")),
    folder: String(value.folder || DEFAULT_FOLDER),
    linkUrl: linkUrl || null,
    storagePath: String(value.storagePath ?? ""),
    dueDate: normalizeDueDate(value.dueDate),
    createdAt: iso(value.createdAt),
  };
}

function toFile(post: ClassroomPost, value: DocumentData): ClassroomFile {
  return {
    id: post.id,
    authorId: post.authorId,
    authorEmail: post.authorEmail,
    authorName: post.authorName,
    name: String(value.fileName ?? post.title),
    folder: post.folder,
    contentType: String(value.contentType ?? "application/octet-stream"),
    size: Number(value.fileSize ?? 0),
    storagePath: post.storagePath,
    url: post.linkUrl ?? "",
    createdAt: post.createdAt,
  };
}

function toStudent(document: QueryDocumentSnapshot<DocumentData>): ClassroomStudent {
  const value = document.data();
  return {
    userId: document.id,
    name: String(value.displayName ?? "Estudiante"),
    email: String(value.email ?? ""),
    completed: Number(value.completed ?? 0),
    total: Number(value.total ?? 0),
    updatedAt: value.lastSeen ? iso(value.lastSeen) : null,
  };
}

function toPersonalEvent(document: QueryDocumentSnapshot<DocumentData>): PersonalEvent {
  const value = document.data();
  return {
    id: document.id,
    title: String(value.title ?? "Bloque"),
    detail: String(value.detail ?? ""),
    date: String(value.date ?? ""),
    startTime: normalizeTime(value.startTime) ?? "",
    endTime: normalizeTime(value.endTime) ?? "",
    courseId: value.courseId ? String(value.courseId) : null,
    kind: personalKind(value.kind),
    completed: value.completed === true,
  };
}

function personalKind(value: unknown): PersonalEventKind {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "personal" || normalized === "task" ? normalized : "study";
}

function postKind(value: string): ClassroomPostKind {
  const normalized = value.toLowerCase();
  if (normalized === "assessment" || normalized === "evaluacion" || normalized === "dictamen") return "assessment";
  if (normalized === "guide" || normalized === "guia") return "guide";
  if (normalized === "resource" || normalized === "recurso") return "resource";
  return "notice";
}

function iso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  return new Date().toISOString();
}
