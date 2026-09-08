import { chunkAdeccaImportRecords, verifyAdeccaFileBytes } from "../adecca/parser.ts";
import type {
  AdeccaImportFile,
  AdeccaImportOmission,
  AdeccaImportPost,
  AdeccaImportReport,
  PreparedAdeccaCourseImport,
} from "../adecca/types.ts";
import { safeFileName } from "./storage.ts";
import { cloudStorage, currentUser } from "./sdk.ts";

export type AdeccaImportProgress = {
  phase: "starting" | "files" | "content" | "participants" | "complete";
  current: number;
  total: number;
  message: string;
};

type AdeccaImportApiResult = {
  runToken?: string;
  status?: "running" | "completed" | "partial";
  contentImported?: number;
  filesImported?: number;
  participantCount?: number;
  participantsMatched?: number;
  participantsPending?: number;
  participantsSkipped?: number;
  warningCount?: number;
  finishedAt?: string | null;
  matched?: number;
  pending?: number;
  skipped?: number;
};

type AdeccaServerCounters = {
  status: "running" | "completed" | "partial";
  contentImported: number;
  filesImported: number;
  participantsMatched: number;
  participantsPending: number;
  participantsSkipped: number;
};

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("La importación fue cancelada.", "AbortError");
}

async function callImportApi(sectionId: string, value: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/courses/${encodeURIComponent(sectionId)}/imports/adecca`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    signal,
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(failure.error || "La importación no pudo continuar.");
  }
  return (await response.json().catch(() => ({}))) as AdeccaImportApiResult;
}

function serverCounters(value: AdeccaImportApiResult): AdeccaServerCounters {
  const counters = [
    value.contentImported,
    value.filesImported,
    value.participantsMatched,
    value.participantsPending,
    value.participantsSkipped,
  ];
  if (
    !value.status ||
    !["running", "completed", "partial"].includes(value.status) ||
    counters.some((count) => !Number.isInteger(count) || (count ?? -1) < 0)
  ) {
    throw new Error("El servidor devolvió un estado de importación inválido.");
  }
  return {
    status: value.status,
    contentImported: value.contentImported ?? 0,
    filesImported: value.filesImported ?? 0,
    participantsMatched: value.participantsMatched ?? 0,
    participantsPending: value.participantsPending ?? 0,
    participantsSkipped: value.participantsSkipped ?? 0,
  };
}

function warningSummary(warnings: AdeccaImportOmission[]) {
  const warningCount = Math.min(20_000, warnings.length);
  const categories = new Map<string, number>();
  for (let index = 0; index < warningCount; index += 1) {
    const raw = warnings[index].category;
    const category = /^[a-z0-9][a-z0-9-]{0,79}$/.test(raw) ? raw : "other";
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }
  return {
    warningCount,
    warningCategories: [...categories.entries()]
      .slice(0, 100)
      .map(([category, count]) => ({ category, count })),
  };
}

async function uploadImportedFile(
  sectionId: string,
  prepared: PreparedAdeccaCourseImport,
  index: number,
  onBytes: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<AdeccaImportPost> {
  ensureNotAborted(signal);
  const source: AdeccaImportFile = prepared.preview.files[index];
  const bytes = new Uint8Array(await prepared.readArchiveFile(source.archivePath));
  ensureNotAborted(signal);
  await verifyAdeccaFileBytes(source, bytes);
  ensureNotAborted(signal);
  const user = await currentUser();
  ensureNotAborted(signal);
  const name = safeFileName(source.fileName);
  const storagePath = `courses/${sectionId}/${user.uid}/adecca_${prepared.preview.source.sourceKey.slice(0, 12)}_${source.contentHash.slice(0, 12)}_${name}`;
  const cloud = await cloudStorage();
  ensureNotAborted(signal);
  const reference = cloud.sdk.ref(cloud.storage, storagePath);
  let exists = false;
  try {
    const metadata = await cloud.sdk.getMetadata(reference);
    ensureNotAborted(signal);
    exists =
      metadata.size === source.fileSize &&
      metadata.customMetadata?.sourceSystem === "adecca" &&
      metadata.customMetadata.contentHash === source.contentHash;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code !== "storage/object-not-found") throw error;
  }
  if (!exists) {
    ensureNotAborted(signal);
    const task = cloud.sdk.uploadBytesResumable(reference, bytes, {
      contentType: source.contentType || "application/octet-stream",
      customMetadata: {
        sourceSystem: "adecca",
        sourceId: source.sourceId,
        contentHash: source.contentHash,
      },
    });
    await new Promise<void>((resolve, reject) => {
      const cancel = () => task.cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      task.on(
        "state_changed",
        (snapshot) => onBytes(snapshot.bytesTransferred, snapshot.totalBytes),
        (error) => {
          signal?.removeEventListener("abort", cancel);
          reject(error);
        },
        () => {
          signal?.removeEventListener("abort", cancel);
          resolve();
        }
      );
    });
  } else {
    onBytes(source.fileSize, source.fileSize);
  }
  ensureNotAborted(signal);
  return {
    sourceId: source.sourceId,
    title: source.title,
    body: source.body,
    kind: source.kind,
    folder: source.folder,
    linkUrl: source.linkUrl,
    dueDate: source.dueDate,
    storagePath,
    fileName: source.fileName,
    contentType: source.contentType,
    fileSize: source.fileSize,
    contentHash: source.contentHash,
    sourceCreatedAt: source.sourceCreatedAt,
  };
}

export async function executeAdeccaImport(
  sectionId: string,
  prepared: PreparedAdeccaCourseImport,
  includeParticipants: boolean,
  onProgress: (progress: AdeccaImportProgress) => void,
  signal?: AbortSignal
): Promise<AdeccaImportReport> {
  const { preview } = prepared;
  const expectedContentBatches = Math.ceil((preview.posts.length + preview.files.length) / 100);
  const expectedParticipantBatches = includeParticipants
    ? Math.ceil(preview.participants.length / 100)
    : 0;
  const totalSteps = 2 + preview.files.length + expectedContentBatches + expectedParticipantBatches;
  onProgress({
    phase: "starting",
    current: 0,
    total: totalSteps,
    message: "Preparando importación",
  });
  ensureNotAborted(signal);
  const plan = {
    contentCount: preview.posts.length + preview.files.length,
    fileCount: preview.files.length,
    participantCount: includeParticipants ? preview.participants.length : 0,
  };
  const started = await callImportApi(
    sectionId,
    { action: "start", source: preview.source, plan },
    signal
  );
  if (!started.runToken || !/^[a-f0-9]{64}$/.test(started.runToken)) {
    throw new Error("El servidor no entregó una ejecución ADECCA válida.");
  }
  const runToken = started.runToken;
  let counters = serverCounters(started);
  if (counters.status !== "running") {
    throw new Error("La ejecución ADECCA no quedó disponible para continuar.");
  }
  let completedSteps = 1;
  onProgress({
    phase: "starting",
    current: completedSteps,
    total: totalSteps,
    message: "Importación iniciada",
  });

  const warnings: AdeccaImportOmission[] = [...preview.omissions];
  const posts: AdeccaImportPost[] = preview.posts.map((post) => ({
    ...post,
    storagePath: "",
    fileName: "",
    contentType: "",
    fileSize: 0,
    contentHash: "",
  }));
  for (let index = 0; index < preview.files.length; index += 1) {
    const file = preview.files[index];
    onProgress({
      phase: "files",
      current: completedSteps,
      total: totalSteps,
      message: `Subiendo ${file.fileName}`,
    });
    try {
      posts.push(
        await uploadImportedFile(
          sectionId,
          prepared,
          index,
          (current, total) =>
            onProgress({
              phase: "files",
              current: completedSteps + (total ? current / total : 0),
              total: totalSteps,
              message: `Subiendo ${file.fileName}`,
            }),
          signal
        )
      );
    } catch (error) {
      ensureNotAborted(signal);
      warnings.push({
        category: "file-upload",
        title: file.fileName,
        reason: error instanceof Error ? error.message : "No fue posible subir el archivo.",
      });
    }
    completedSteps += 1;
    onProgress({
      phase: "files",
      current: completedSteps,
      total: totalSteps,
      message: `${file.fileName} procesado`,
    });
  }

  const postBatches = chunkAdeccaImportRecords(posts, 100);
  for (let index = 0; index < postBatches.length; index += 1) {
    const batch = postBatches[index].map((post) => ({ ...post, notifyStudents: false }));
    onProgress({
      phase: "content",
      current: completedSteps,
      total: totalSteps,
      message: "Publicando contenido histórico",
    });
    const result = await callImportApi(
      sectionId,
      {
        action: "content",
        sourceKey: preview.source.sourceKey,
        fingerprint: preview.source.fingerprint,
        runToken,
        posts: batch,
      },
      signal
    );
    counters = serverCounters(result);
    if (counters.status !== "running") {
      throw new Error("La ejecución ADECCA fue cerrada antes de publicar todo el contenido.");
    }
    completedSteps += 1;
    onProgress({
      phase: "content",
      current: completedSteps,
      total: totalSteps,
      message: "Contenido histórico publicado",
    });
  }

  if (includeParticipants) {
    const participantBatches = chunkAdeccaImportRecords(preview.participants, 100);
    for (let index = 0; index < participantBatches.length; index += 1) {
      onProgress({
        phase: "participants",
        current: completedSteps,
        total: totalSteps,
        message: "Vinculando estudiantes institucionales",
      });
      const result = await callImportApi(
        sectionId,
        {
          action: "roster",
          sourceKey: preview.source.sourceKey,
          fingerprint: preview.source.fingerprint,
          runToken,
          participants: participantBatches[index],
        },
        signal
      );
      counters = serverCounters(result);
      if (counters.status !== "running") {
        throw new Error("La ejecución ADECCA fue cerrada antes de completar la nómina.");
      }
      completedSteps += 1;
      onProgress({
        phase: "participants",
        current: completedSteps,
        total: totalSteps,
        message: "Estudiantes institucionales vinculados",
      });
    }
  }

  onProgress({
    phase: "complete",
    current: completedSteps,
    total: totalSteps,
    message: "Finalizando importación",
  });
  const completed = await callImportApi(
    sectionId,
    {
      action: "complete",
      sourceKey: preview.source.sourceKey,
      fingerprint: preview.source.fingerprint,
      runToken,
      ...warningSummary(warnings),
    },
    signal
  );
  counters = serverCounters(completed);
  if (
    counters.status === "running" ||
    typeof completed.finishedAt !== "string" ||
    Number.isNaN(Date.parse(completed.finishedAt))
  ) {
    throw new Error("El servidor no pudo cerrar la ejecución ADECCA.");
  }
  const report: AdeccaImportReport = {
    status: counters.status,
    source: preview.source,
    destinationSectionId: sectionId,
    contentImported: counters.contentImported,
    filesImported: counters.filesImported,
    participantsMatched: counters.participantsMatched,
    participantsPending: counters.participantsPending,
    warnings,
    finishedAt: completed.finishedAt,
  };
  onProgress({
    phase: "complete",
    current: totalSteps,
    total: totalSteps,
    message: "Importación terminada",
  });
  return report;
}
