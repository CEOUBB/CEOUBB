import {
  cloudFunctions,
  cloudStorage,
  firestore,
  currentUser,
  authorFields,
  isDevOrLocalEnvironment,
} from "./sdk.ts";
import { folderName, iso, type ClassroomAttachment } from "./mappers.ts";

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
  /*
    Huella del archivo tal como salió del computador del estudiante. Es lo que
    convierte el comprobante en prueba: dos entregas con el mismo `sha256` son
    el mismo trabajo, y una entrega alterada después del envío deja de coincidir
    con lo que quedó registrado.
  */
  // Implements: REQ-TEAM-03
  sha256: string;
  /*
    Trazabilidad de la entrega en equipo: `submittedBy` es el estudiante que
    subió la versión final y `memberIds` el equipo completo que la firma. En una
    entrega individual `submittedBy` coincide con `uid` y `memberIds` va vacío.
  */
  // Implements: REQ-TEAM-04
  submittedBy: string;
  submittedByName: string;
  teamId: string;
  memberIds: string[];
};

/** Equipo que respalda una entrega grupal, resuelto antes de subir el archivo. */
// Implements: REQ-TEAM-02
export type SubmissionTeam = {
  teamId: string;
  memberIds: string[];
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

/*
  Sube el archivo y devuelve su descriptor sin escribir en Firestore: la
  publicación que lo motiva es la que guarda el documento, de modo que el aviso
  y su pauta se crean juntos o no se crea ninguno.
*/
// Implements: REQ-PUB-09
export async function uploadPostAttachment(
  courseId: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<ClassroomAttachment> {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES)
    throw new Error("El archivo debe pesar entre 1 byte y 50 MB.");
  const contentType = file.type || "application/octet-stream";
  let userUid = "dev:teacher-demo";
  try {
    const user = await currentUser();
    userUid = user.uid;
    const storagePath = `courses/${courseId}/${userUid}/${Date.now()}_${safeFileName(file.name)}`;
    const cloud = await cloudStorage();
    const task = cloud.sdk.uploadBytesResumable(cloud.sdk.ref(cloud.storage, storagePath), file, {
      contentType,
    });
    await new Promise<void>((resolve, reject) =>
      task.on(
        "state_changed",
        (snapshot) =>
          onProgress(Math.round((100 * snapshot.bytesTransferred) / snapshot.totalBytes)),
        reject,
        resolve
      )
    );
    return { name: file.name, storagePath, contentType, size: file.size };
  } catch (cause) {
    if (isDevOrLocalEnvironment()) {
      onProgress(100);
      const storagePath = `courses/${courseId}/${userUid}/${Date.now()}_${safeFileName(file.name)}`;
      return { name: file.name, storagePath, contentType, size: file.size };
    }
    throw cause;
  }
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
  Huella SHA-256 del archivo entregado, calculada en el navegador antes de
  subirlo. `crypto.subtle` sólo existe en contextos seguros; el desarrollo local
  sobre http no es uno, así que allí el comprobante se guarda sin huella en vez
  de bloquear la entrega.
*/
// Implements: REQ-TEAM-03
export async function fileDigestSha256(file: File): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return "";
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/*
  Buzón de entregas. El archivo siempre viaja a la carpeta del estudiante que lo
  sube, porque es la única que las reglas de Storage le dejan escribir.

  Cuando la evaluación es grupal, el comprobante no lo escribe el cliente: una
  entrega de equipo necesita una fila por integrante y ningún estudiante puede
  escribir el expediente de otro. Esas filas las crea `registerTeamSubmission` en
  una sola transacción del servidor, de modo que el equipo entero queda con
  entrega o ninguno la tiene.
*/
// Implements: REQ-EVAL-01, REQ-TEAM-02, REQ-TEAM-03
export async function uploadStudentSubmission(
  courseId: string,
  evalId: string,
  file: File,
  onProgress: (percent: number) => void,
  team?: SubmissionTeam
) {
  if (file.size <= 0 || file.size > MAX_SUBMISSION_BYTES)
    throw new Error("La entrega debe pesar entre 1 byte y 25 MB.");
  /* La sesión, la huella del archivo y el SDK de Storage no dependen entre sí:
     resolverlas en serie sumaba la lectura completa del archivo al arranque. */
  const [user, sha256, cloud] = await Promise.all([
    currentUser(),
    fileDigestSha256(file),
    cloudStorage(),
  ]);
  const contentType = file.type || "application/octet-stream";
  const storagePath = submissionStoragePath(courseId, evalId, user.uid, file.name, Date.now());
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

  if (team) {
    await registerTeamSubmission({
      courseId,
      evalId,
      teamId: team.teamId,
      memberIds: team.memberIds,
      fileName: file.name,
      storagePath,
      contentType,
      size: file.size,
      sha256,
    });
    return storagePath;
  }

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
    sha256,
    submittedBy: user.uid,
    submittedByName: user.displayName ?? "",
    teamId: "",
    memberIds: [],
    createdAt: sdk.serverTimestamp(),
  });
  return storagePath;
}

// Implements: REQ-TEAM-02
async function registerTeamSubmission(payload: {
  courseId: string;
  evalId: string;
  teamId: string;
  memberIds: string[];
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  sha256: string;
}) {
  const { sdk, functions } = await cloudFunctions();
  try {
    await sdk.httpsCallable(functions, "registerTeamSubmission")(payload);
  } catch (cause) {
    const message =
      cause && typeof cause === "object" && "message" in cause
        ? String((cause as { message: unknown }).message)
        : "";
    throw new Error(message || "No se pudo registrar la entrega del equipo.", { cause });
  }
}

function toStudentSubmission(id: string, value: Record<string, unknown>): StudentSubmission {
  const memberIds = Array.isArray(value.memberIds)
    ? value.memberIds.filter((member): member is string => typeof member === "string")
    : [];
  const uid = String(value.uid ?? "");
  return {
    id,
    evalId: String(value.evalId ?? ""),
    uid,
    fileName: String(value.fileName ?? "Entrega"),
    storagePath: String(value.storagePath ?? ""),
    contentType: String(value.contentType ?? "application/octet-stream"),
    size: Number(value.size ?? 0),
    createdAt: iso(value.createdAt),
    sha256: String(value.sha256 ?? ""),
    submittedBy: String(value.submittedBy ?? uid),
    submittedByName: String(value.submittedByName ?? value.authorName ?? ""),
    teamId: String(value.teamId ?? ""),
    memberIds,
  };
}

/** Comprobantes de entrega del propio estudiante en una sección. */
// Implements: REQ-EVAL-01
// Implements: REQ-EVAL-01, REQ-SEC-08, REQ-QMD-02
// Authorization is strictly enforced in firestore.rules (resource.data.uid == request.auth.uid)
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
            snapshot.docs.map((document) => toStudentSubmission(document.id, document.data()))
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

/*
  Techo de una escucha de corrección: una sección de la universidad no supera
  este número de matriculados, y el límite evita que un error de datos abra una
  consulta sin fondo sobre la colección de entregas.
*/
// Implements: REQ-REV-04
export const MAX_SECTION_SUBMISSIONS = 500;

/*
  Cola de entregas de una evaluación para el docente de la sección. La lectura
  completa la autorizan las reglas vigentes (`teachesSection`); aquí sólo se
  acota el tamaño de la escucha, porque el orden de la cola lo decide la
  bandeja al cruzar los comprobantes con la nómina del curso.
*/
// Implements: REQ-REV-04
// Authorization is strictly enforced in firestore.rules (teachesSection(courseId))
export function watchSectionSubmissions(
  courseId: string,
  evalId: string,
  onChange: (items: StudentSubmission[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  let stop: () => void = () => undefined;

  firestore()
    .then(({ sdk, db }) => {
      if (!active) return;
      stop = sdk.onSnapshot(
        sdk.query(
          sdk.collection(db, "courses", courseId, "submissions"),
          sdk.where("evalId", "==", evalId),
          sdk.limit(MAX_SECTION_SUBMISSIONS)
        ),
        (snapshot) =>
          onChange(
            snapshot.docs.map((document) => toStudentSubmission(document.id, document.data()))
          ),
        () => onError("No se pudieron cargar las entregas de la evaluación.")
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
  try {
    const { sdk, storage } = await cloudStorage();
    return await sdk.getDownloadURL(sdk.ref(storage, storagePath));
  } catch (cause) {
    if (isDevOrLocalEnvironment()) {
      return "#";
    }
    throw cause;
  }
}
