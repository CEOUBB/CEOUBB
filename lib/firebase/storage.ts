import { cloudStorage, firestore, currentUser, authorFields } from "./sdk.ts";
import { folderName } from "./mappers.ts";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function uploadClassroomFile(
  courseId: string,
  file: File,
  folder: string,
  onProgress: (percent: number) => void
) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES)
    throw new Error("El archivo debe pesar entre 1 byte y 50 MB.");
  const user = await currentUser();
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_");
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

export async function renameClassroomFile(courseId: string, id: string, fileName: string) {
  const { sdk, db } = await firestore();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, "posts", id), { fileName });
}

export async function classroomFileUrl(storagePath: string) {
  const { sdk, storage } = await cloudStorage();
  return sdk.getDownloadURL(sdk.ref(storage, storagePath));
}
