import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { firebaseApp } from "./firebase-client";
import { AccountRole, roleForEmail } from "./access-policy";

const COURSE_ID = "estatica";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
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
  linkUrl: string | null;
  storagePath: string;
  createdAt: string;
};

export type ClassroomFile = {
  id: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  name: string;
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
};

export function watchClassroom(
  teaching: boolean,
  onChange: (state: Partial<ClassroomState>) => void,
  onError: (message: string) => void,
) {
  let active = true;
  let stopPosts: () => void = () => undefined;
  let stopProgress: () => void = () => undefined;

  firestore().then(async ({ sdk, db }) => {
    const user = await syncProfile();
    if (!active) return;
    stopPosts = sdk.onSnapshot(
      sdk.query(sdk.collection(db, "courses", COURSE_ID, "posts"), sdk.orderBy("createdAt", "desc")),
      (snapshot) => {
        const entries = snapshot.docs.map((document) => ({ post: toPost(document), data: document.data() }));
        onChange({
          posts: entries.map((entry) => entry.post),
          files: entries.filter((entry) => entry.post.storagePath).map((entry) => toFile(entry.post, entry.data)),
        });
      },
      () => onError("No se pudieron sincronizar las publicaciones de Firebase."),
    );
    if (teaching) {
      stopProgress = sdk.onSnapshot(
        sdk.query(sdk.collection(db, "courses", COURSE_ID, "progress"), sdk.orderBy("lastSeen", "desc")),
        (snapshot) => onChange({ students: snapshot.docs.map(toStudent) }),
        () => onError("No se pudo sincronizar el progreso del curso."),
      );
    } else {
      sdk.getDoc(sdk.doc(db, "courses", COURSE_ID, "progress", user.uid))
        .then((snapshot) => {
          if (active) onChange({ ownProgress: snapshot.exists() ? Number(snapshot.data().completed ?? 0) : 0 });
        })
        .catch(() => onError("No se pudo cargar tu progreso."));
    }
  }).catch((cause) => onError(cause instanceof Error ? cause.message : "No se pudo conectar Firebase."));

  return () => {
    active = false;
    stopPosts();
    stopProgress();
  };
}

export async function saveClassroomProgress(completed: number, total: number) {
  const { sdk, db } = await firestore();
  const user = await currentUser();
  await sdk.setDoc(sdk.doc(db, "courses", COURSE_ID, "progress", user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: emailOf(user),
    role: roleOf(user),
    completed,
    total,
    percent: total ? Math.round(100 * completed / total) : 0,
    lastSeen: sdk.serverTimestamp(),
  }, { merge: true });
}

export async function publishClassroomPost(input: { title: string; body: string; kind: string; linkUrl: string }) {
  const { sdk, db } = await firestore();
  const user = await currentUser();
  const linkUrl = input.linkUrl.trim();
  await sdk.addDoc(sdk.collection(db, "courses", COURSE_ID, "posts"), {
    ...authorFields(user),
    courseId: COURSE_ID,
    title: input.title.trim(),
    body: input.body.trim(),
    kind: postKind(input.kind),
    fileUrl: linkUrl,
    fileName: linkUrl ? "Abrir recurso" : "",
    storagePath: "",
    contentType: "",
    fileSize: 0,
    createdAt: sdk.serverTimestamp(),
  });
}

export async function uploadClassroomFile(file: File, onProgress: (percent: number) => void) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("El archivo debe pesar entre 1 byte y 50 MB.");
  const user = await currentUser();
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_");
  const contentType = file.type || "application/octet-stream";
  const storagePath = `courses/${COURSE_ID}/${user.uid}/${Date.now()}_${safeName}`;
  const cloud = await cloudStorage();
  const task = cloud.sdk.uploadBytesResumable(cloud.sdk.ref(cloud.storage, storagePath), file, { contentType });
  await new Promise<void>((resolve, reject) => task.on(
    "state_changed",
    (snapshot) => onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes)),
    reject,
    resolve,
  ));
  const { sdk, db } = await firestore();
  await sdk.addDoc(sdk.collection(db, "courses", COURSE_ID, "posts"), {
    ...authorFields(user),
    courseId: COURSE_ID,
    title: file.name,
    body: "Archivo compartido con el curso.",
    kind: "resource",
    fileUrl: "",
    fileName: file.name,
    storagePath,
    contentType,
    fileSize: file.size,
    createdAt: sdk.serverTimestamp(),
  });
}

export async function editClassroomPost(id: string, values: { title: string; body: string }) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", COURSE_ID, "posts", id), { title: values.title, body: values.body });
}

export async function renameClassroomFile(id: string, fileName: string) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", COURSE_ID, "posts", id), { fileName });
}

export async function deleteClassroomPost(id: string, storagePath = "") {
  if (storagePath) {
    const cloud = await cloudStorage();
    await cloud.sdk.deleteObject(cloud.sdk.ref(cloud.storage, storagePath)).catch(() => undefined);
  }
  const { sdk, db } = await firestore();
  await sdk.deleteDoc(sdk.doc(db, "courses", COURSE_ID, "posts", id));
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
  const { sdk, db } = await firestore();
  const user = await currentUser();
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
  if (existing.exists()) await sdk.setDoc(profile, base, { merge: true });
  else await sdk.setDoc(profile, { ...base, role: roleOf(user), createdAt: sdk.serverTimestamp(), teacherRequested: false });
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
    linkUrl: linkUrl || null,
    storagePath: String(value.storagePath ?? ""),
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
