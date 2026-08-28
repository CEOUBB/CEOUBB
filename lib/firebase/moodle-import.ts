import { chunkImportRecords, verifyMoodleFileBytes } from "../moodle/parser.ts";
import type {
  MoodleImportPost,
  MoodleImportReport,
  MoodleImportOmission,
  PreparedCourseImport,
} from "../moodle/types.ts";
import { safeFileName } from "./storage.ts";
import { cloudStorage, currentUser } from "./sdk.ts";

export type MoodleImportProgress = {
  phase: "starting" | "files" | "content" | "participants" | "complete";
  current: number;
  total: number;
  message: string;
};

async function callImportApi(sectionId: string, value: unknown) {
  const response = await fetch(`/api/courses/${encodeURIComponent(sectionId)}/imports/moodle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(failure.error || "La importación no pudo continuar.");
  }
  return (await response.json().catch(() => ({}))) as {
    error?: string;
    matched?: number;
    pending?: number;
  };
}

async function uploadImportedFile(
  sectionId: string,
  prepared: PreparedCourseImport,
  index: number,
  onBytes: (current: number, total: number) => void
): Promise<MoodleImportPost> {
  const source = prepared.preview.files[index];
  const bytes = await prepared.readArchiveFile(source.archivePath);
  await verifyMoodleFileBytes(source, bytes);
  const user = await currentUser();
  const name = safeFileName(source.fileName);
  const storagePath = `courses/${sectionId}/${user.uid}/moodle_${prepared.preview.source.sourceKey.slice(0, 12)}_${source.contentHash.slice(0, 12)}_${name}`;
  const cloud = await cloudStorage();
  const reference = cloud.sdk.ref(cloud.storage, storagePath);
  let exists = false;
  try {
    const metadata = await cloud.sdk.getMetadata(reference);
    exists = metadata.size === source.fileSize;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code !== "storage/object-not-found") throw error;
  }
  if (!exists) {
    const task = cloud.sdk.uploadBytesResumable(reference, new Uint8Array(bytes), {
      contentType: source.contentType || "application/octet-stream",
      customMetadata: {
        sourceSystem: "moodle",
        sourceId: source.sourceId,
        contentHash: source.contentHash,
      },
    });
    await new Promise<void>((resolve, reject) =>
      task.on(
        "state_changed",
        (snapshot) => onBytes(snapshot.bytesTransferred, snapshot.totalBytes),
        reject,
        resolve
      )
    );
  } else {
    onBytes(source.fileSize, source.fileSize);
  }
  return {
    sourceId: source.sourceId,
    title: source.title,
    body: source.scormPackage
      ? `${source.body}\n\nPaquete SCORM preservado como archivo descargable; no se ejecuta dentro de CEOUBB.`.trim()
      : source.body,
    kind: "resource",
    folder: source.folder,
    linkUrl: "",
    dueDate: "",
    storagePath,
    fileName: source.fileName,
    contentType: source.contentType,
    fileSize: source.fileSize,
    sourceCreatedAt: source.sourceCreatedAt,
  };
}

// Implements: REQ-MOODLE-04, REQ-MOODLE-05, REQ-MOODLE-06, REQ-MOODLE-08
export async function executeMoodleImport(
  sectionId: string,
  prepared: PreparedCourseImport,
  includeParticipants: boolean,
  onProgress: (progress: MoodleImportProgress) => void
): Promise<MoodleImportReport> {
  const { preview } = prepared;
  onProgress({ phase: "starting", current: 0, total: 1, message: "Preparando importación" });
  await callImportApi(sectionId, { action: "start", source: preview.source });

  const warnings: MoodleImportOmission[] = [...preview.omissions];
  const posts: MoodleImportPost[] = preview.posts.map((post) => ({
    ...post,
    storagePath: "",
    fileName: "",
    contentType: "",
    fileSize: 0,
  }));
  let filesImported = 0;
  for (let index = 0; index < preview.files.length; index += 1) {
    const file = preview.files[index];
    onProgress({
      phase: "files",
      current: index,
      total: preview.files.length,
      message: `Subiendo ${file.fileName}`,
    });
    try {
      posts.push(
        await uploadImportedFile(sectionId, prepared, index, (current, total) =>
          onProgress({
            phase: "files",
            current: index + (total ? current / total : 0),
            total: preview.files.length,
            message: `Subiendo ${file.fileName}`,
          })
        )
      );
      filesImported += 1;
    } catch (error) {
      warnings.push({
        category: "file-upload",
        title: file.fileName,
        reason: error instanceof Error ? error.message : "No fue posible subir el archivo.",
      });
    }
  }

  // Implements: REQ-QMD-03
  const postBatches = chunkImportRecords(posts);
  let contentImported = 0;
  for (let index = 0; index < postBatches.length; index += 1) {
    const batch = postBatches[index].map((post) => ({ ...post, notifyStudents: false }));
    onProgress({
      phase: "content",
      current: index,
      total: postBatches.length,
      message: "Publicando contenido histórico",
    });
    // react-doctor-disable-next-line async-await-in-loop
    await callImportApi(sectionId, {
      action: "content",
      sourceKey: preview.source.sourceKey,
      fingerprint: preview.source.fingerprint,
      posts: batch,
    });
    contentImported += batch.length;
  }

  let participantsMatched = 0;
  let participantsPending = 0;
  if (includeParticipants) {
    const participantBatches = chunkImportRecords(preview.participants);
    for (let index = 0; index < participantBatches.length; index += 1) {
      onProgress({
        phase: "participants",
        current: index,
        total: participantBatches.length,
        message: "Vinculando participantes institucionales",
      });
      // react-doctor-disable-next-line async-await-in-loop
      const result = await callImportApi(sectionId, {
        action: "roster",
        fingerprint: preview.source.fingerprint,
        participants: participantBatches[index],
      });
      participantsMatched += result.matched ?? 0;
      participantsPending += result.pending ?? 0;
    }
  }

  const report: MoodleImportReport = {
    status: warnings.length > 0 ? "partial" : "completed",
    source: preview.source,
    destinationSectionId: sectionId,
    contentImported,
    filesImported,
    participantsMatched,
    participantsPending,
    warnings,
    finishedAt: new Date().toISOString(),
  };
  await callImportApi(sectionId, {
    action: "complete",
    report: { ...report, warnings: report.warnings.slice(0, 100) },
    warningCount: report.warnings.length,
  });
  onProgress({ phase: "complete", current: 1, total: 1, message: "Importación terminada" });
  return report;
}
