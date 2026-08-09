import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getFirestore, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { firebaseApp } from "./firebase-client";

const COURSE_ID = "estatica";
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export type ClassroomPostRecord = {
  id: string;
  title: string;
  body: string;
  kind: string;
  fileUrl: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  fileSize: number;
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
};

export type ClassroomProgressRecord = {
  uid: string;
  displayName: string;
  email: string;
  completed: number;
  total: number;
  lastSeen: string | null;
};

function roleFor(emailValue: string | null) {
  const email = (emailValue ?? "").toLowerCase();
  if (email === "elpapijuaco325@gmail.com") return "owner";
  if (email.endsWith("@ubiobio.cl")) return "teacher";
  return "student";
}

function iso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  return new Date().toISOString();
}

export function waitForFirebaseUser() {
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

export async function syncFirebaseProfile() {
  const user = await waitForFirebaseUser();
  const profile = doc(db, "users", user.uid);
  const existing = await getDoc(profile);
  const base = {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: (user.email ?? "").toLowerCase(),
    photoUrl: user.photoURL ?? "",
    domain: (user.email ?? "").split("@").pop()?.toLowerCase() ?? "",
    lastSeen: serverTimestamp()
  };
  if (existing.exists()) await setDoc(profile, base, { merge: true });
  else await setDoc(profile, { ...base, role: roleFor(user.email), createdAt: serverTimestamp(), teacherRequested: false });
  return user;
}

export function watchClassroomPosts(onItems: (items: ClassroomPostRecord[]) => void, onError: (message: string) => void) {
  const source = query(collection(db, "courses", COURSE_ID, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(source, (snapshot) => onItems(snapshot.docs.map((item) => {
    const value = item.data();
    return {
      id: item.id,
      title: String(value.title ?? "Publicación"),
      body: String(value.body ?? ""),
      kind: String(value.kind ?? "notice"),
      fileUrl: String(value.fileUrl ?? value.linkUrl ?? ""),
      fileName: String(value.fileName ?? ""),
      storagePath: String(value.storagePath ?? ""),
      contentType: String(value.contentType ?? "application/octet-stream"),
      fileSize: Number(value.fileSize ?? 0),
      authorId: String(value.authorId ?? ""),
      authorName: String(value.authorName ?? value.authorEmail ?? "Equipo docente"),
      authorEmail: String(value.authorEmail ?? ""),
      createdAt: iso(value.createdAt)
    };
  })), () => onError("No se pudieron sincronizar las publicaciones de Firebase."));
}

export function watchClassroomProgress(onItems: (items: ClassroomProgressRecord[]) => void, onError: (message: string) => void) {
  const source = query(collection(db, "courses", COURSE_ID, "progress"), orderBy("lastSeen", "desc"));
  return onSnapshot(source, (snapshot) => onItems(snapshot.docs.map((item) => {
    const value = item.data();
    return {
      uid: item.id,
      displayName: String(value.displayName ?? "Estudiante"),
      email: String(value.email ?? ""),
      completed: Number(value.completed ?? 0),
      total: Number(value.total ?? 0),
      lastSeen: value.lastSeen ? iso(value.lastSeen) : null
    };
  })), () => onError("No se pudo sincronizar el progreso del curso."));
}

export async function loadOwnClassroomProgress() {
  const user = await syncFirebaseProfile();
  const snapshot = await getDoc(doc(db, "courses", COURSE_ID, "progress", user.uid));
  return snapshot.exists() ? Number(snapshot.data().completed ?? 0) : 0;
}

export async function saveClassroomProgress(completed: number, total: number) {
  const user = await syncFirebaseProfile();
  await setDoc(doc(db, "courses", COURSE_ID, "progress", user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: (user.email ?? "").toLowerCase(),
    role: roleFor(user.email),
    completed,
    total,
    percent: total ? Math.round(100 * completed / total) : 0,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

export async function publishClassroomPost(input: { title: string; body: string; kind: string; linkUrl: string }) {
  const user = await syncFirebaseProfile();
  await addDoc(collection(db, "courses", COURSE_ID, "posts"), {
    courseId: COURSE_ID,
    title: input.title.trim(),
    body: input.body.trim(),
    kind: input.kind || "notice",
    fileUrl: input.linkUrl.trim(),
    fileName: input.linkUrl.trim() ? "Abrir recurso" : "",
    storagePath: "",
    contentType: "",
    fileSize: 0,
    authorId: user.uid,
    authorName: user.displayName ?? "",
    authorEmail: (user.email ?? "").toLowerCase(),
    createdAt: serverTimestamp()
  });
}

export async function uploadClassroomFile(file: File, onProgress: (percent: number) => void) {
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) throw new Error("El archivo debe pesar entre 1 byte y 50 MB.");
  const user = await syncFirebaseProfile();
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_");
  const storagePath = `courses/${COURSE_ID}/${user.uid}/${Date.now()}_${safeName}`;
  const reference = ref(storage, storagePath);
  const task = uploadBytesResumable(reference, file, { contentType: file.type || "application/octet-stream" });
  await new Promise<void>((resolve, reject) => task.on("state_changed", (snapshot) => onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes)), reject, resolve));
  const fileUrl = await getDownloadURL(reference);
  await addDoc(collection(db, "courses", COURSE_ID, "posts"), {
    courseId: COURSE_ID,
    title: file.name,
    body: "Archivo compartido con el curso.",
    kind: "resource",
    fileUrl,
    fileName: file.name,
    storagePath,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
    authorId: user.uid,
    authorName: user.displayName ?? "",
    authorEmail: (user.email ?? "").toLowerCase(),
    createdAt: serverTimestamp()
  });
}

export async function updateClassroomPost(id: string, values: Record<string, string>) {
  await updateDoc(doc(db, "courses", COURSE_ID, "posts", id), values);
}

export async function deleteClassroomPost(id: string, storagePath = "") {
  if (storagePath) await deleteObject(ref(storage, storagePath)).catch(() => undefined);
  await deleteDoc(doc(db, "courses", COURSE_ID, "posts", id));
}
