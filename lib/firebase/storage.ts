import { cloudStorage, firestore, currentUser, authorFields } from "./sdk.ts";
import { folderName, iso } from "./mappers.ts";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Techo por entrega: un informe con imágenes cabe, un video no. */
// Implements: REQ-EVAL-01
export const MAX_SUBMISSION_BYTES = 25 * 1024 * 1024;

export type StudentSubmission = {
  id: string;
  evalId: string;
  uid: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  createdAt: string;
};

/** Deja el nombre en caracteres seguros para una ruta de Cloud Storage. */
export function safeFileName(value: string) {
  return value.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0, 120) || "entrega";
}

/** Ruta canónica de una entrega: aislada por sección, evaluación y estudiante. */
// Implements: REQ-EVAL-01
export function submissionStoragePath(
  courseId: string,
  evalId: string,
  userId: string,
  fileName: string,
  stamp: number
) {
  return `courses/${courseId}/submissions/${evalId}/${userId}/${stamp}_${safeFileName(fileName)}`;
}

export async function uploadClassroomFile(
  courseId: string,
  file: File,
  folder: string,
  onProgress: (percent: number) => void
) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES)
    throw new Error("El archivo debe pesar entre 1 byte y 50 MB.");
  const user = await currentUser();
  const safeName = safeFileName(file.name);
  const contentType = file.type || "application/octet-stream";
  const storagePath = `courses/${courseId}/${user.uid}/${Date.now()}_${safeName}`;
  const cloud = await cloudStorage();
  const task = cloud.sdk.uploadBytesResumable(cloud.sdk.ref(cloud.storage, storagePath), file, {
    contentType,
  });
  await new Promise<void>((resolve, reject) =>
    task.on(
      "state_changed",
      (snapshot) => onProgress(Math.round((100 * snapshot.bytesTransferred) / snapshot.totalBytes)),
      reject,
      resolve
    )
  );
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

/*
  Buzón de entregas del estudiante. El archivo viaja a una ruta que sólo su UID
  puede escribir y queda un comprobante en Firestore para que tanto el docente
  como el propio estudiante vean qué se entregó y cuándo.
*/
// Implements: REQ-EVAL-01
export async function uploadStudentSubmission(
  courseId: string,
  evalId: string,
  file: File,
  onProgress: (percent: number) => void
) {
  if (file.size <= 0 || file.size > MAX_SUBMISSION_BYTES)
    throw new Error("La entrega debe pesar entre 1 byte y 25 MB.");
  const user = await currentUser();
  const contentType = file.type || "application/octet-stream";
  const storagePath = submissionStoragePath(courseId, evalId, user.uid, file.name, Date.now());
  const cloud = await cloudStorage();
  const task = cloud.sdk.uploadBytesResumable(cloud.sdk.ref(cloud.storage, storagePath), file, {
    contentType,
  });
  await new Promise<void>((resolve, reject) =>
    task.on(
      "state_changed",
      (snapshot) => onProgress(Math.round((100 * snapshot.bytesTransferred) / snapshot.totalBytes)),
      reject,
      resolve
    )
  );
  const { sdk, db } = await firestore();
  await sdk.setDoc(sdk.doc(db, "courses", courseId, "submissions", `${evalId}_${user.uid}`), {
    uid: user.uid,
    courseId,
    evalId,
    authorName: user.displayName ?? "",
    fileName: file.name,
    storagePath,
    contentType,
    size: file.size,
    createdAt: sdk.serverTimestamp(),
  });
  return storagePath;
}

/** Comprobantes de entrega del propio estudiante en una sección. */
// Implements: REQ-EVAL-01
export function watchOwnSubmissions(
  courseId: string,
  onChange: (items: StudentSubmission[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  let stop: () => void = () => undefined;

  Promise.all([firestore(), currentUser()])
    .then(([{ sdk, db }, user]) => {
      if (!active) return;
      stop = sdk.onSnapshot(
        sdk.query(
          sdk.collection(db, "courses", courseId, "submissions"),
          sdk.where("uid", "==", user.uid)
        ),
        (snapshot) =>
          onChange(
            snapshot.docs.map((document) => {
              const value = document.data();
              return {
                id: document.id,
                evalId: String(value.evalId ?? ""),
                uid: String(value.uid ?? ""),
                fileName: String(value.fileName ?? "Entrega"),
                storagePath: String(value.storagePath ?? ""),
                contentType: String(value.contentType ?? "application/octet-stream"),
                size: Number(value.size ?? 0),
                createdAt: iso(value.createdAt),
              };
            })
          ),
        () => onError("No se pudieron cargar tus entregas.")
      );
    })
    .catch(() => onError("No se pudo conectar Firebase."));

  return () => {
    active = false;
    stop();
  };
}

export async function renameClassroomFile(courseId: string, id: string, fileName: string) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), { fileName });
}

export async function classroomFileUrl(storagePath: string) {
  const { sdk, storage } = await cloudStorage();
  return sdk.getDownloadURL(sdk.ref(storage, storagePath));
}
