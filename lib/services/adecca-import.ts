import { createHash, randomBytes } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import {
  adeccaImportRunItems,
  adeccaImports,
  matriculas,
  pendingAdeccaMatriculas,
  periodos,
  secciones,
  users,
} from "../../db/schema.ts";
import type {
  AdeccaImportPost,
  AdeccaImportSource,
  AdeccaRosterParticipant,
} from "../adecca/types.ts";
import { normalizeAccessEmail, roleForEmail } from "../access-policy.ts";
import type { PublicUser } from "../auth.ts";
import { stableAdeccaDocumentId } from "../adecca/ids.ts";
import { adeccaFileIsSupported } from "../adecca/file-policy.ts";
import {
  containsCredentialLikeMaterial,
  containsPersonalData,
  containsUnsafeHttpUrl,
  safeAdeccaHttpUrl,
} from "../adecca/privacy.ts";
import {
  commitFirestoreWrites,
  FIREBASE_PROJECT_ID,
  isValidPathSegment,
  projectEnrollments,
  type FirestoreWrite,
} from "./enrollment-projection.ts";

export { ADECCA_IMPORT_REQUIREMENTS } from "../adecca/types.ts";

const MAX_IMPORT_BATCH = 100;
const MAX_IMPORT_LIST = 50;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_REPORT_WARNINGS = 100;
const MAX_REPORTED_ITEMS = 20_000;
const MAX_PLANNED_PARTICIPANTS = 5_000;
const OPERATION_STALE_MS = 10 * 60 * 1000;
const POST_KINDS = ["notice", "guide", "assessment", "resource"] as const;
const PARTICIPANT_OUTCOMES = [
  "participant-matched",
  "participant-pending",
  "participant-skipped",
] as const;
const SECTION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,60}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const RUN_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const WARNING_CATEGORY_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

export type AdeccaImportPlan = {
  contentCount: number;
  fileCount: number;
  participantCount: number;
};

export type AdeccaImportWarningSummary = {
  warningCount: number;
  warningCategories: Array<{ category: string; count: number }>;
};

type AdeccaTrackingOutcome =
  "content" | "file" | "participant-matched" | "participant-pending" | "participant-skipped";

type AdeccaTrackingCounts = Record<AdeccaTrackingOutcome, number>;

type AdeccaDb = ReturnType<typeof getDb>;
type AdeccaTransaction = Parameters<Parameters<AdeccaDb["transaction"]>[0]>[0];

export class AdeccaImportServiceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AdeccaImportServiceError";
    this.code = code;
    this.status = status;
  }
}

function invalidBatch(message: string): never {
  throw new AdeccaImportServiceError(message, "INVALID_IMPORT_BATCH", 400);
}

function runConflict(message: string, code = "IMPORT_RUN_CONFLICT"): never {
  throw new AdeccaImportServiceError(message, code, 409);
}

function digestId(...parts: string[]) {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

function adeccaImportId(sectionId: string, fingerprint: string) {
  return `adecca-${digestId(sectionId, fingerprint).slice(0, 40)}`;
}

function newRunToken() {
  return randomBytes(32).toString("hex");
}

function trackingItemHash(runToken: string, kind: "content" | "file" | "participant", id: string) {
  return digestId(runToken, kind, id);
}

function trackingRowId(importId: string, runToken: string, itemHash: string) {
  return `adecca-item-${digestId(importId, runToken, itemHash)}`;
}

function emptyTrackingCounts(): AdeccaTrackingCounts {
  return {
    content: 0,
    file: 0,
    "participant-matched": 0,
    "participant-pending": 0,
    "participant-skipped": 0,
  };
}

export function validateAdeccaImportPlan(value: unknown): AdeccaImportPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalidBatch("El plan de importación no es válido.");
  }
  const plan = value as Partial<AdeccaImportPlan>;
  const keys = Object.keys(plan);
  const expectedKeys = ["contentCount", "fileCount", "participantCount"];
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
    invalidBatch("El plan de importación no es válido.");
  }
  if (
    !Number.isInteger(plan.contentCount) ||
    !Number.isInteger(plan.fileCount) ||
    !Number.isInteger(plan.participantCount) ||
    (plan.contentCount ?? -1) < 0 ||
    (plan.contentCount ?? 0) > MAX_REPORTED_ITEMS ||
    (plan.fileCount ?? -1) < 0 ||
    (plan.fileCount ?? 0) > (plan.contentCount ?? -1) ||
    (plan.participantCount ?? -1) < 0 ||
    (plan.participantCount ?? 0) > MAX_PLANNED_PARTICIPANTS
  ) {
    invalidBatch("El plan de importación supera los límites permitidos.");
  }
  return plan as AdeccaImportPlan;
}

export function adeccaImportedPostDocumentPath(
  sectionId: string,
  sourceKey: string,
  sourceId: string
) {
  if (!SECTION_ID_PATTERN.test(sectionId)) {
    invalidBatch("La sección de destino no es válida.");
  }
  if (!SHA256_PATTERN.test(sourceKey) || !sourceId || sourceId.length > 500) {
    invalidBatch("La publicación no trae identificadores ADECCA válidos.");
  }
  return `courses/${sectionId}/posts/${stableAdeccaDocumentId(sourceKey, sourceId)}`;
}

export function pendingAdeccaEnrollmentExpiry(now = new Date()) {
  return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
}

export function validateAdeccaImportSource(source: AdeccaImportSource): AdeccaImportSource {
  const value = (source ?? {}) as Partial<AdeccaImportSource>;
  const fields = [
    value.sourceKey,
    value.fingerprint,
    value.courseId,
    value.courseName,
    value.courseShortName,
    value.adeccaVersion,
    value.fileName,
  ];
  if (fields.some((field) => typeof field !== "string" || field.length > 500)) {
    invalidBatch("El origen de la importación no es válido.");
  }
  for (const field of fields.slice(2) as string[]) {
    if (
      containsPersonalData(field) ||
      containsCredentialLikeMaterial(field) ||
      containsUnsafeHttpUrl(field)
    ) {
      invalidBatch("El origen contiene datos personales o enlaces inseguros.");
    }
  }
  if (
    !SHA256_PATTERN.test(value.sourceKey ?? "") ||
    !SHA256_PATTERN.test(value.fingerprint ?? "") ||
    !value.fileName ||
    !["zip", "json", "csv"].includes(value.sourceFormat ?? "")
  ) {
    invalidBatch("Faltan identificadores del paquete ADECCA.");
  }
  return source;
}

export function validateAdeccaImportPosts(
  sectionId: string,
  posts: AdeccaImportPost[]
): AdeccaImportPost[] {
  if (!SECTION_ID_PATTERN.test(sectionId)) invalidBatch("La sección de destino no es válida.");
  if (!Array.isArray(posts) || posts.length > MAX_IMPORT_BATCH) {
    invalidBatch("Cada lote puede contener hasta 100 publicaciones.");
  }
  for (const post of posts) {
    if (
      !post ||
      typeof post.sourceId !== "string" ||
      !/^adecca-[a-f0-9]{40}$/.test(post.sourceId)
    ) {
      invalidBatch("Una publicación no trae un identificador ADECCA válido.");
    }
    if (typeof post.title !== "string" || !post.title.trim() || post.title.length > 140) {
      invalidBatch("Una publicación tiene un título inválido.");
    }
    if (typeof post.body !== "string" || post.body.length > 40_000) {
      invalidBatch("Una publicación supera el límite de contenido.");
    }
    if (!POST_KINDS.includes(post.kind)) invalidBatch("El tipo de publicación no es compatible.");
    if (typeof post.folder !== "string" || post.folder.length > 60) {
      invalidBatch("La carpeta de una publicación no es válida.");
    }
    if (
      typeof post.linkUrl !== "string" ||
      typeof post.dueDate !== "string" ||
      typeof post.storagePath !== "string" ||
      typeof post.fileName !== "string" ||
      post.fileName.length > 120 ||
      typeof post.contentType !== "string" ||
      post.contentType.length > 120 ||
      typeof post.contentHash !== "string" ||
      (post.sourceCreatedAt !== null && typeof post.sourceCreatedAt !== "string")
    ) {
      invalidBatch("Una publicación contiene metadatos incompletos.");
    }
    if (post.linkUrl && !safeAdeccaHttpUrl(post.linkUrl)) {
      invalidBatch("Una publicación contiene un enlace inseguro.");
    }
    for (const field of [post.title, post.body, post.folder, post.fileName]) {
      if (
        containsPersonalData(field) ||
        containsCredentialLikeMaterial(field) ||
        containsUnsafeHttpUrl(field)
      ) {
        invalidBatch("Una publicación contiene datos personales o enlaces inseguros.");
      }
    }
    for (const date of [post.dueDate, post.sourceCreatedAt]) {
      if (date && Number.isNaN(Date.parse(date))) invalidBatch("Una fecha importada no es válida.");
    }
    if (!Number.isInteger(post.fileSize) || post.fileSize < 0 || post.fileSize > MAX_FILE_BYTES) {
      invalidBatch("Un archivo supera el límite permitido.");
    }
    const hasFile = Boolean(
      post.storagePath || post.fileName || post.contentType || post.fileSize || post.contentHash
    );
    if (!hasFile) continue;
    const expected = `courses/${sectionId}/`;
    const rest = post.storagePath.startsWith(expected)
      ? post.storagePath.slice(expected.length).split("/")
      : [];
    if (
      rest.length !== 2 ||
      !rest.every(isValidPathSegment) ||
      !post.fileName ||
      !adeccaFileIsSupported(post.fileName, post.contentType) ||
      !SHA256_PATTERN.test(post.contentHash) ||
      post.fileSize < 1
    ) {
      invalidBatch("La ruta del archivo no pertenece a la sección de destino.");
    }
  }
  return posts;
}

async function requireOpenSection(sectionId: string) {
  if (!SECTION_ID_PATTERN.test(sectionId)) {
    throw new AdeccaImportServiceError("La sección no existe.", "SECTION_NOT_FOUND", 404);
  }
  const rows = await getDb()
    .select({ id: secciones.id, periodStatus: periodos.estado })
    .from(secciones)
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .where(eq(secciones.id, sectionId))
    .limit(1);
  const section = rows[0];
  if (!section) {
    throw new AdeccaImportServiceError("La sección no existe.", "SECTION_NOT_FOUND", 404);
  }
  if (section.periodStatus !== "abierto") {
    throw new AdeccaImportServiceError(
      "La importación sólo está disponible mientras el período académico esté abierto.",
      "SECTION_READ_ONLY",
      409
    );
  }
  return section;
}

export async function authorizeAdeccaImport(actor: PublicUser, sectionId: string) {
  const section = await requireOpenSection(sectionId);
  if (actor.role === "owner") return section;
  const enrollment = await getDb()
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.seccionId, sectionId),
        eq(matriculas.usuarioId, actor.id),
        eq(matriculas.estado, "activa"),
        or(eq(matriculas.rolSeccion, "teacher"), eq(matriculas.rolSeccion, "coordinator"))
      )
    )
    .limit(1);
  if (!enrollment[0]) {
    throw new AdeccaImportServiceError(
      "No tienes permisos docentes activos en esta sección.",
      "IMPORT_FORBIDDEN",
      403
    );
  }
  return section;
}

type AdeccaImportRow = typeof adeccaImports.$inferSelect;

function sameSource(row: AdeccaImportRow, source: AdeccaImportSource) {
  return (
    row.fingerprint === source.fingerprint &&
    row.sourceKey === source.sourceKey &&
    row.sourceCourseId === source.courseId &&
    row.sourceCourseName === source.courseName &&
    row.sourceAdeccaVersion === source.adeccaVersion &&
    row.sourceFormat === source.sourceFormat &&
    row.sourceFileName === source.fileName
  );
}

function samePlan(row: AdeccaImportRow, plan: AdeccaImportPlan) {
  return (
    row.plannedContentCount === plan.contentCount &&
    row.plannedFileCount === plan.fileCount &&
    row.plannedParticipantCount === plan.participantCount
  );
}

function importRunState(row: AdeccaImportRow, resumed = false) {
  return {
    id: row.id,
    runToken: row.runToken,
    resumed,
    status: row.status,
    plan: {
      contentCount: row.plannedContentCount,
      fileCount: row.plannedFileCount,
      participantCount: row.plannedParticipantCount,
    },
    contentImported: row.contentCount,
    filesImported: row.fileCount,
    participantCount: row.participantCount,
    participantsMatched: row.participantMatchedCount,
    participantsPending: row.participantPendingCount,
    participantsSkipped: row.participantSkippedCount,
    warningCount: row.warningCount,
    finishedAt: row.finishedAt,
  };
}

async function trackingCounts(
  tx: AdeccaTransaction,
  importId: string,
  runToken: string,
  appliedOnly: boolean
) {
  const rows = await tx
    .select({ outcome: adeccaImportRunItems.outcome, value: count() })
    .from(adeccaImportRunItems)
    .where(
      and(
        eq(adeccaImportRunItems.importId, importId),
        eq(adeccaImportRunItems.runToken, runToken),
        appliedOnly ? isNotNull(adeccaImportRunItems.appliedAt) : undefined
      )
    )
    .groupBy(adeccaImportRunItems.outcome)
    .limit(5);
  const result = emptyTrackingCounts();
  for (const row of rows) result[row.outcome] = Number(row.value);
  return result;
}

async function requireAdeccaImport(
  tx: AdeccaTransaction,
  actor: PublicUser,
  sectionId: string,
  sourceKey: string,
  fingerprint: string,
  runToken: string
) {
  if (
    !SHA256_PATTERN.test(sourceKey) ||
    !SHA256_PATTERN.test(fingerprint) ||
    !RUN_TOKEN_PATTERN.test(runToken)
  ) {
    invalidBatch("Faltan identificadores de la ejecución ADECCA.");
  }
  const rows = await tx
    .select({
      entry: adeccaImports,
      periodStatus: periodos.estado,
    })
    .from(adeccaImports)
    .innerJoin(secciones, eq(adeccaImports.seccionId, secciones.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .where(and(eq(adeccaImports.seccionId, sectionId), eq(adeccaImports.fingerprint, fingerprint)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    runConflict("La ejecución ADECCA no existe o ya no está disponible.");
  }
  if (row.periodStatus !== "abierto") {
    throw new AdeccaImportServiceError(
      "La importación sólo está disponible mientras el período académico esté abierto.",
      "SECTION_READ_ONLY",
      409
    );
  }
  if (
    row.entry.actorId !== actor.id ||
    row.entry.sourceKey !== sourceKey ||
    row.entry.runToken !== runToken
  ) {
    runConflict("La ejecución no coincide con el actor o el origen que la inició.");
  }
  if (row.entry.status !== "running") {
    runConflict("La ejecución ADECCA ya fue finalizada.", "IMPORT_NOT_RUNNING");
  }
  return row.entry;
}

async function acquireAdeccaOperation(tx: AdeccaTransaction, entry: AdeccaImportRow) {
  const now = new Date();
  const operationToken = newRunToken();
  const operationStartedAt = now.toISOString();
  if (entry.operationToken) {
    const startedAt = Date.parse(entry.operationStartedAt ?? "");
    if (!Number.isFinite(startedAt) || startedAt > now.getTime() - OPERATION_STALE_MS) {
      runConflict("Hay otro lote de esta importación en curso.", "IMPORT_BUSY");
    }
  }
  const locked = await tx
    .update(adeccaImports)
    .set({ operationToken, operationStartedAt, updatedAt: operationStartedAt })
    .where(
      and(
        eq(adeccaImports.id, entry.id),
        eq(adeccaImports.runToken, entry.runToken),
        eq(adeccaImports.status, "running"),
        entry.operationToken
          ? eq(adeccaImports.operationToken, entry.operationToken)
          : isNull(adeccaImports.operationToken)
      )
    )
    .returning({ id: adeccaImports.id });
  if (!locked[0]) runConflict("Hay otro lote de esta importación en curso.", "IMPORT_BUSY");
  return operationToken;
}

async function assertTrackingWithinPlan(tx: AdeccaTransaction, entry: AdeccaImportRow) {
  const reserved = await trackingCounts(tx, entry.id, entry.runToken, false);
  const participantCount = PARTICIPANT_OUTCOMES.reduce(
    (total, outcome) => total + reserved[outcome],
    0
  );
  if (
    reserved.content > entry.plannedContentCount ||
    reserved.file > entry.plannedFileCount ||
    participantCount > entry.plannedParticipantCount
  ) {
    invalidBatch("El lote supera el plan declarado al iniciar la importación.");
  }
}

async function updateAdeccaCounters(
  tx: AdeccaTransaction,
  entry: AdeccaImportRow,
  operationToken: string
) {
  const applied = await trackingCounts(tx, entry.id, entry.runToken, true);
  const participantCount = PARTICIPANT_OUTCOMES.reduce(
    (total, outcome) => total + applied[outcome],
    0
  );
  const updated = await tx
    .update(adeccaImports)
    .set({
      contentCount: applied.content,
      fileCount: applied.file,
      participantCount,
      participantMatchedCount: applied["participant-matched"],
      participantPendingCount: applied["participant-pending"],
      participantSkippedCount: applied["participant-skipped"],
      operationToken: null,
      operationStartedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(adeccaImports.id, entry.id),
        eq(adeccaImports.runToken, entry.runToken),
        eq(adeccaImports.status, "running"),
        eq(adeccaImports.operationToken, operationToken)
      )
    )
    .returning();
  if (!updated[0]) runConflict("La ejecución cambió mientras se procesaba el lote.");
  return importRunState(updated[0]);
}

async function releaseAdeccaOperation(importId: string, runToken: string, operationToken: string) {
  await getDb()
    .update(adeccaImports)
    .set({
      operationToken: null,
      operationStartedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(adeccaImports.id, importId),
        eq(adeccaImports.runToken, runToken),
        eq(adeccaImports.status, "running"),
        eq(adeccaImports.operationToken, operationToken)
      )
    );
}

export async function startAdeccaImport(
  actor: PublicUser,
  sectionId: string,
  source: AdeccaImportSource,
  plan: AdeccaImportPlan
) {
  await authorizeAdeccaImport(actor, sectionId);
  const validSource = validateAdeccaImportSource(source);
  const validPlan = validateAdeccaImportPlan(plan);
  const now = new Date().toISOString();
  const id = adeccaImportId(sectionId, validSource.fingerprint);
  const runToken = newRunToken();
  const db = getDb();
  const inserted = await db
    .insert(adeccaImports)
    .values({
      id,
      seccionId: sectionId,
      fingerprint: validSource.fingerprint,
      sourceKey: validSource.sourceKey,
      actorId: actor.id,
      status: "running",
      sourceCourseId: validSource.courseId,
      sourceCourseName: validSource.courseName,
      sourceAdeccaVersion: validSource.adeccaVersion,
      sourceFormat: validSource.sourceFormat,
      sourceFileName: validSource.fileName,
      runToken,
      plannedContentCount: validPlan.contentCount,
      plannedFileCount: validPlan.fileCount,
      plannedParticipantCount: validPlan.participantCount,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [adeccaImports.seccionId, adeccaImports.fingerprint] })
    .returning();
  if (inserted[0]) return importRunState(inserted[0]);

  return db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(adeccaImports)
      .where(
        and(
          eq(adeccaImports.seccionId, sectionId),
          eq(adeccaImports.fingerprint, validSource.fingerprint)
        )
      )
      .limit(1);
    const entry = current[0];
    if (!entry) runConflict("No fue posible resolver el trabajo ADECCA concurrente.");
    if (entry.status === "running") {
      if (
        entry.actorId === actor.id &&
        sameSource(entry, validSource) &&
        samePlan(entry, validPlan)
      ) {
        return importRunState(entry, true);
      }
      runConflict("Ya existe una ejecución activa con otro actor, origen o plan.");
    }

    const restarted = await tx
      .update(adeccaImports)
      .set({
        sourceKey: validSource.sourceKey,
        actorId: actor.id,
        status: "running",
        sourceCourseId: validSource.courseId,
        sourceCourseName: validSource.courseName,
        sourceAdeccaVersion: validSource.adeccaVersion,
        sourceFormat: validSource.sourceFormat,
        sourceFileName: validSource.fileName,
        runToken,
        operationToken: null,
        operationStartedAt: null,
        plannedContentCount: validPlan.contentCount,
        plannedFileCount: validPlan.fileCount,
        plannedParticipantCount: validPlan.participantCount,
        contentCount: 0,
        fileCount: 0,
        participantCount: 0,
        participantMatchedCount: 0,
        participantPendingCount: 0,
        participantSkippedCount: 0,
        warningCount: 0,
        reportJson: "{}",
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(adeccaImports.id, entry.id),
          eq(adeccaImports.runToken, entry.runToken),
          inArray(adeccaImports.status, ["completed", "partial"])
        )
      )
      .returning();
    if (restarted[0]) {
      await tx.delete(adeccaImportRunItems).where(eq(adeccaImportRunItems.importId, entry.id));
      return importRunState(restarted[0]);
    }

    const latest = await tx
      .select()
      .from(adeccaImports)
      .where(eq(adeccaImports.id, entry.id))
      .limit(1);
    if (
      latest[0]?.status === "running" &&
      latest[0].actorId === actor.id &&
      sameSource(latest[0], validSource) &&
      samePlan(latest[0], validPlan)
    ) {
      return importRunState(latest[0], true);
    }
    runConflict("Ya existe una ejecución activa con otro actor, origen o plan.");
  });
}

export async function writeAdeccaImportPosts(
  actor: PublicUser,
  sectionId: string,
  sourceKey: string,
  fingerprint: string,
  runToken: string,
  values: AdeccaImportPost[]
) {
  await authorizeAdeccaImport(actor, sectionId);
  const posts = validateAdeccaImportPosts(sectionId, values);
  const sourceIds = new Set<string>();
  for (const post of posts) {
    if (sourceIds.has(post.sourceId)) invalidBatch("El lote repite un identificador ADECCA.");
    sourceIds.add(post.sourceId);
  }
  if (posts.length === 0) {
    return getDb().transaction(async (tx) => {
      const entry = await requireAdeccaImport(
        tx,
        actor,
        sectionId,
        sourceKey,
        fingerprint,
        runToken
      );
      return { ...importRunState(entry), imported: 0 };
    });
  }
  const now = new Date().toISOString();
  const writes: FirestoreWrite[] = posts.map((post) => {
    const name = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${adeccaImportedPostDocumentPath(sectionId, sourceKey, post.sourceId)}`;
    const fields = {
      courseId: { stringValue: sectionId },
      authorId: { stringValue: actor.id.replace(/^firebase:/, "") },
      authorName: { stringValue: actor.name },
      authorEmail: { stringValue: actor.email },
      title: { stringValue: post.title.trim() },
      body: { stringValue: post.body },
      kind: { stringValue: post.kind },
      folder: { stringValue: post.folder },
      linkUrl: { stringValue: post.linkUrl },
      dueDate: { stringValue: post.dueDate },
      storagePath: { stringValue: post.storagePath },
      fileName: { stringValue: post.fileName },
      contentType: { stringValue: post.contentType },
      fileSize: { integerValue: String(post.fileSize) },
      contentHash: { stringValue: post.contentHash },
      createdAt: { timestampValue: post.sourceCreatedAt || now },
      sourceSystem: { stringValue: "adecca" },
      sourceId: { stringValue: post.sourceId },
      sourceKey: { stringValue: sourceKey },
      importFingerprint: { stringValue: fingerprint },
      notifyStudents: { booleanValue: false },
    };
    return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
  });
  const reserved = await getDb().transaction(async (tx) => {
    const entry = await requireAdeccaImport(tx, actor, sectionId, sourceKey, fingerprint, runToken);
    const operationToken = await acquireAdeccaOperation(tx, entry);
    const trackingRows: Array<typeof adeccaImportRunItems.$inferInsert> = [];
    const itemHashes: string[] = [];
    for (const post of posts) {
      const contentHash = trackingItemHash(runToken, "content", post.sourceId);
      itemHashes.push(contentHash);
      trackingRows.push({
        id: trackingRowId(entry.id, runToken, contentHash),
        importId: entry.id,
        runToken,
        itemHash: contentHash,
        outcome: "content",
        createdAt: now,
      });
      if (post.storagePath) {
        const fileHash = trackingItemHash(runToken, "file", post.sourceId);
        itemHashes.push(fileHash);
        trackingRows.push({
          id: trackingRowId(entry.id, runToken, fileHash),
          importId: entry.id,
          runToken,
          itemHash: fileHash,
          outcome: "file",
          createdAt: now,
        });
      }
    }
    await tx
      .insert(adeccaImportRunItems)
      .values(trackingRows)
      .onConflictDoNothing({
        target: [
          adeccaImportRunItems.importId,
          adeccaImportRunItems.runToken,
          adeccaImportRunItems.itemHash,
        ],
      });
    await assertTrackingWithinPlan(tx, entry);
    return { entry, operationToken, itemHashes };
  });
  try {
    await commitFirestoreWrites(writes);
    const state = await getDb().transaction(async (tx) => {
      const entry = await requireAdeccaImport(
        tx,
        actor,
        sectionId,
        sourceKey,
        fingerprint,
        runToken
      );
      if (entry.operationToken !== reserved.operationToken) {
        runConflict("La reserva del lote ADECCA ya no está activa.", "IMPORT_BUSY");
      }
      await tx
        .update(adeccaImportRunItems)
        .set({ appliedAt: new Date().toISOString() })
        .where(
          and(
            eq(adeccaImportRunItems.importId, entry.id),
            eq(adeccaImportRunItems.runToken, runToken),
            inArray(adeccaImportRunItems.itemHash, reserved.itemHashes)
          )
        );
      return updateAdeccaCounters(tx, entry, reserved.operationToken);
    });
    return { ...state, imported: writes.length };
  } catch (error) {
    await releaseAdeccaOperation(reserved.entry.id, runToken, reserved.operationToken);
    throw error;
  }
}

function normalizeRoster(values: AdeccaRosterParticipant[]) {
  if (!Array.isArray(values) || values.length > MAX_IMPORT_BATCH) {
    invalidBatch("Cada lote puede contener hasta 100 participantes.");
  }
  const unique = new Map<string, AdeccaRosterParticipant>();
  for (const participant of values) {
    if (!participant || typeof participant.email !== "string") {
      invalidBatch("La nómina contiene un correo inválido.");
    }
    const email = normalizeAccessEmail(participant?.email ?? "");
    if (
      participant?.role !== "student" ||
      typeof participant.sourceUserId !== "string" ||
      !participant.sourceUserId ||
      participant.sourceUserId.length > 500 ||
      email.length > 254 ||
      roleForEmail(email) !== "student"
    ) {
      invalidBatch("La nómina contiene un participante que no es estudiante institucional.");
    }
    unique.set(email, { ...participant, email });
  }
  return [...unique.values()];
}

export async function reconcileAdeccaRoster(
  actor: PublicUser,
  sectionId: string,
  sourceKey: string,
  fingerprint: string,
  runToken: string,
  values: AdeccaRosterParticipant[]
) {
  await authorizeAdeccaImport(actor, sectionId);
  const participants = normalizeRoster(values);
  if (participants.length === 0) {
    return getDb().transaction(async (tx) => {
      const entry = await requireAdeccaImport(
        tx,
        actor,
        sectionId,
        sourceKey,
        fingerprint,
        runToken
      );
      return { ...importRunState(entry), matched: 0, pending: 0, skipped: 0 };
    });
  }
  const db = getDb();
  const now = new Date().toISOString();
  const expiresAt = pendingAdeccaEnrollmentExpiry(new Date(now));
  const reserved = await db.transaction(async (tx) => {
    const entry = await requireAdeccaImport(tx, actor, sectionId, sourceKey, fingerprint, runToken);
    const operationToken = await acquireAdeccaOperation(tx, entry);
    const matchedUsers = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        inArray(
          users.email,
          participants.map((item) => item.email)
        )
      )
      .limit(MAX_IMPORT_BATCH);
    const byEmail = new Map(matchedUsers.map((user) => [normalizeAccessEmail(user.email), user]));
    const existingEnrollments =
      matchedUsers.length > 0
        ? await tx
            .select({ userId: matriculas.usuarioId, role: matriculas.rolSeccion })
            .from(matriculas)
            .where(
              and(
                eq(matriculas.seccionId, sectionId),
                inArray(
                  matriculas.usuarioId,
                  matchedUsers.map((user) => user.id)
                )
              )
            )
            .limit(MAX_IMPORT_BATCH)
        : [];
    const enrollmentByUserId = new Map(
      existingEnrollments.map((enrollment) => [enrollment.userId, enrollment])
    );
    const matchedValues: Array<typeof matriculas.$inferInsert> = [];
    const pendingValues: Array<typeof pendingAdeccaMatriculas.$inferInsert> = [];
    const trackingRows: Array<typeof adeccaImportRunItems.$inferInsert> = [];
    const matchedHashes: string[] = [];
    const matchedEmails: string[] = [];
    let matched = 0;
    let pending = 0;
    let skipped = 0;
    for (const participant of participants) {
      const user = byEmail.get(participant.email);
      const existingEnrollment = user ? enrollmentByUserId.get(user.id) : undefined;
      let outcome: AdeccaTrackingOutcome;
      if (user && (!existingEnrollment || existingEnrollment.role === "student")) {
        outcome = "participant-matched";
        matched += 1;
        matchedEmails.push(participant.email);
        matchedValues.push({
          id: `mat-${digestId(sectionId, user.id).slice(0, 40)}`,
          seccionId: sectionId,
          usuarioId: user.id,
          rolSeccion: "student",
          estado: "activa",
          createdAt: now,
        });
      } else if (user) {
        outcome = "participant-skipped";
        skipped += 1;
      } else {
        outcome = "participant-pending";
        pending += 1;
        pendingValues.push({
          id: `pending-adecca-${digestId(sectionId, participant.email).slice(0, 40)}`,
          seccionId: sectionId,
          email: participant.email,
          rolSeccion: "student",
          sourceImportId: entry.id,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        });
      }
      const itemHash = trackingItemHash(runToken, "participant", participant.email);
      if (outcome === "participant-matched") matchedHashes.push(itemHash);
      trackingRows.push({
        id: trackingRowId(entry.id, runToken, itemHash),
        importId: entry.id,
        runToken,
        itemHash,
        outcome,
        appliedAt: outcome === "participant-matched" ? null : now,
        createdAt: now,
      });
    }
    await tx
      .insert(adeccaImportRunItems)
      .values(trackingRows)
      .onConflictDoUpdate({
        target: [
          adeccaImportRunItems.importId,
          adeccaImportRunItems.runToken,
          adeccaImportRunItems.itemHash,
        ],
        set: {
          outcome: sql`excluded.outcome`,
          appliedAt: sql`excluded.applied_at`,
          createdAt: sql`excluded.created_at`,
        },
      });
    await assertTrackingWithinPlan(tx, entry);
    let studentUserIdsToProject: string[] = [];
    if (matchedValues.length > 0) {
      const persistedStudents = await tx
        .insert(matriculas)
        .values(matchedValues)
        .onConflictDoUpdate({
          target: [matriculas.seccionId, matriculas.usuarioId],
          set: { rolSeccion: "student", estado: "activa" },
          setWhere: eq(matriculas.rolSeccion, "student"),
        })
        .returning({ userId: matriculas.usuarioId });
      studentUserIdsToProject = persistedStudents.map((enrollment) => enrollment.userId);
    }
    if (pendingValues.length > 0) {
      await tx
        .insert(pendingAdeccaMatriculas)
        .values(pendingValues)
        .onConflictDoUpdate({
          target: [pendingAdeccaMatriculas.seccionId, pendingAdeccaMatriculas.email],
          set: { sourceImportId: entry.id, expiresAt, updatedAt: now },
        });
    }
    if (matchedEmails.length > 0) {
      await tx
        .delete(pendingAdeccaMatriculas)
        .where(
          and(
            eq(pendingAdeccaMatriculas.seccionId, sectionId),
            inArray(pendingAdeccaMatriculas.email, matchedEmails)
          )
        );
    }
    return {
      entry,
      operationToken,
      matchedHashes,
      studentUserIdsToProject,
      matched,
      pending,
      skipped,
    };
  });
  try {
    try {
      await projectEnrollments(
        reserved.studentUserIdsToProject.map((userId) => ({
          seccionId: sectionId,
          userId,
          role: "student" as const,
          status: "activa" as const,
        }))
      );
    } catch {
      throw new AdeccaImportServiceError(
        "Las matrículas se guardaron, pero Firebase no pudo proyectarlas.",
        "PROJECTION_UNAVAILABLE",
        503
      );
    }
    const state = await db.transaction(async (tx) => {
      const entry = await requireAdeccaImport(
        tx,
        actor,
        sectionId,
        sourceKey,
        fingerprint,
        runToken
      );
      if (entry.operationToken !== reserved.operationToken) {
        runConflict("La reserva del lote ADECCA ya no está activa.", "IMPORT_BUSY");
      }
      if (reserved.matchedHashes.length > 0) {
        await tx
          .update(adeccaImportRunItems)
          .set({ appliedAt: new Date().toISOString() })
          .where(
            and(
              eq(adeccaImportRunItems.importId, entry.id),
              eq(adeccaImportRunItems.runToken, runToken),
              inArray(adeccaImportRunItems.itemHash, reserved.matchedHashes)
            )
          );
      }
      return updateAdeccaCounters(tx, entry, reserved.operationToken);
    });
    return {
      ...state,
      matched: reserved.matched,
      pending: reserved.pending,
      skipped: reserved.skipped,
    };
  } catch (error) {
    await releaseAdeccaOperation(reserved.entry.id, runToken, reserved.operationToken);
    throw error;
  }
}

export async function claimPendingAdeccaEnrollments(actor: PublicUser) {
  if (roleForEmail(actor.email) !== "student") return 0;
  const db = getDb();
  const email = normalizeAccessEmail(actor.email);
  const now = new Date().toISOString();
  const pending = await db
    .select({ id: pendingAdeccaMatriculas.id, seccionId: pendingAdeccaMatriculas.seccionId })
    .from(pendingAdeccaMatriculas)
    .innerJoin(secciones, eq(pendingAdeccaMatriculas.seccionId, secciones.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .where(
      and(
        eq(pendingAdeccaMatriculas.email, email),
        gt(pendingAdeccaMatriculas.expiresAt, now),
        eq(periodos.estado, "abierto")
      )
    )
    .limit(MAX_IMPORT_BATCH);
  if (pending.length === 0) return 0;
  const existingEnrollments = await db
    .select({ sectionId: matriculas.seccionId, role: matriculas.rolSeccion })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.usuarioId, actor.id),
        inArray(
          matriculas.seccionId,
          pending.map((entry) => entry.seccionId)
        )
      )
    )
    .limit(MAX_IMPORT_BATCH);
  const enrollmentBySectionId = new Map(
    existingEnrollments.map((enrollment) => [enrollment.sectionId, enrollment])
  );
  const studentPending = pending.filter((entry) => {
    const enrollment = enrollmentBySectionId.get(entry.seccionId);
    return !enrollment || enrollment.role === "student";
  });
  const claimedValues = studentPending.map((entry) => ({
    id: `mat-${digestId(entry.seccionId, actor.id).slice(0, 40)}`,
    seccionId: entry.seccionId,
    usuarioId: actor.id,
    rolSeccion: "student" as const,
    estado: "activa" as const,
    createdAt: now,
  }));
  let studentSectionIdsToProject: string[] = [];
  if (claimedValues.length > 0) {
    const persistedStudents = await db
      .insert(matriculas)
      .values(claimedValues)
      .onConflictDoUpdate({
        target: [matriculas.seccionId, matriculas.usuarioId],
        set: { rolSeccion: "student", estado: "activa" },
        setWhere: eq(matriculas.rolSeccion, "student"),
      })
      .returning({ sectionId: matriculas.seccionId });
    studentSectionIdsToProject = persistedStudents.map((enrollment) => enrollment.sectionId);
  }
  try {
    await projectEnrollments(
      studentSectionIdsToProject.map((seccionId) => ({
        seccionId,
        userId: actor.id,
        role: "student" as const,
        status: "activa" as const,
      }))
    );
  } catch {
    throw new AdeccaImportServiceError(
      "Las matrículas se guardaron, pero Firebase no pudo proyectarlas.",
      "PROJECTION_UNAVAILABLE",
      503
    );
  }
  await db.delete(pendingAdeccaMatriculas).where(
    inArray(
      pendingAdeccaMatriculas.id,
      pending.map((item) => item.id)
    )
  );
  return pending.length;
}

export async function purgeExpiredPendingAdeccaEnrollments() {
  const db = getDb();
  const rows = await db
    .select({ id: pendingAdeccaMatriculas.id })
    .from(pendingAdeccaMatriculas)
    .where(lte(pendingAdeccaMatriculas.expiresAt, new Date().toISOString()))
    .limit(MAX_IMPORT_BATCH);
  if (rows.length > 0) {
    await db.delete(pendingAdeccaMatriculas).where(
      inArray(
        pendingAdeccaMatriculas.id,
        rows.map((item) => item.id)
      )
    );
  }
  return rows.length;
}

function validateWarningSummary(value: AdeccaImportWarningSummary) {
  const summary = (value ?? {}) as Partial<AdeccaImportWarningSummary>;
  const keys = Object.keys(summary);
  if (
    keys.length !== 2 ||
    keys.some((key) => !["warningCount", "warningCategories"].includes(key)) ||
    !Number.isInteger(summary.warningCount) ||
    (summary.warningCount ?? -1) < 0 ||
    (summary.warningCount ?? 0) > MAX_REPORTED_ITEMS ||
    !Array.isArray(summary.warningCategories) ||
    summary.warningCategories.length > MAX_REPORT_WARNINGS
  ) {
    invalidBatch("El resumen de advertencias no es válido.");
  }
  const categories = new Map<string, number>();
  for (const item of summary.warningCategories ?? []) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.keys(item).length !== 2 ||
      Object.keys(item).some((key) => !["category", "count"].includes(key)) ||
      typeof item.category !== "string" ||
      !WARNING_CATEGORY_PATTERN.test(item.category) ||
      containsPersonalData(item.category) ||
      !Number.isInteger(item.count) ||
      item.count < 1 ||
      item.count > MAX_REPORTED_ITEMS
    ) {
      invalidBatch("El resumen de advertencias no es válido.");
    }
    categories.set(item.category, (categories.get(item.category) ?? 0) + item.count);
  }
  const warningCategories = [...categories.entries()].map(([category, categoryCount]) => ({
    category,
    count: categoryCount,
  }));
  const categorizedCount = warningCategories.reduce((total, item) => total + item.count, 0);
  if (categorizedCount > (summary.warningCount ?? 0)) {
    invalidBatch("El resumen de advertencias no coincide con el total informado.");
  }
  return { warningCount: summary.warningCount ?? 0, warningCategories };
}

export async function completeAdeccaImport(
  actor: PublicUser,
  sectionId: string,
  sourceKey: string,
  fingerprint: string,
  runToken: string,
  warnings: AdeccaImportWarningSummary
) {
  await authorizeAdeccaImport(actor, sectionId);
  const validWarnings = validateWarningSummary(warnings);
  return getDb().transaction(async (tx) => {
    const entry = await requireAdeccaImport(tx, actor, sectionId, sourceKey, fingerprint, runToken);
    if (entry.operationToken) {
      runConflict("Hay un lote de esta importación todavía en curso.", "IMPORT_BUSY");
    }
    const pending = await tx
      .select({ value: count() })
      .from(adeccaImportRunItems)
      .where(
        and(
          eq(adeccaImportRunItems.importId, entry.id),
          eq(adeccaImportRunItems.runToken, runToken),
          isNull(adeccaImportRunItems.appliedAt)
        )
      )
      .limit(1);
    if (Number(pending[0]?.value ?? 0) > 0) {
      runConflict("Hay resultados del importador pendientes de confirmar.", "IMPORT_BUSY");
    }
    const applied = await trackingCounts(tx, entry.id, runToken, true);
    const participantCount = PARTICIPANT_OUTCOMES.reduce(
      (total, outcome) => total + applied[outcome],
      0
    );
    if (
      applied.content > entry.plannedContentCount ||
      applied.file > entry.plannedFileCount ||
      participantCount > entry.plannedParticipantCount
    ) {
      runConflict("Los resultados acumulados exceden el plan de la ejecución.");
    }
    const completed =
      validWarnings.warningCount === 0 &&
      applied["participant-skipped"] === 0 &&
      applied.content === entry.plannedContentCount &&
      applied.file === entry.plannedFileCount &&
      participantCount === entry.plannedParticipantCount;
    const status = completed ? "completed" : "partial";
    const finishedAt = new Date().toISOString();
    const compact = {
      status,
      contentImported: applied.content,
      filesImported: applied.file,
      participantCount,
      participantsMatched: applied["participant-matched"],
      participantsPending: applied["participant-pending"],
      participantsSkipped: applied["participant-skipped"],
      warningCount: validWarnings.warningCount,
      warningCategories: validWarnings.warningCategories,
      finishedAt,
    };
    const reportJson = JSON.stringify(compact);
    const updated = await tx
      .update(adeccaImports)
      .set({
        status,
        contentCount: compact.contentImported,
        fileCount: compact.filesImported,
        participantCount,
        participantMatchedCount: compact.participantsMatched,
        participantPendingCount: compact.participantsPending,
        participantSkippedCount: compact.participantsSkipped,
        warningCount: compact.warningCount,
        reportJson,
        finishedAt,
        updatedAt: finishedAt,
      })
      .where(
        and(
          eq(adeccaImports.id, entry.id),
          eq(adeccaImports.runToken, runToken),
          eq(adeccaImports.status, "running"),
          isNull(adeccaImports.operationToken)
        )
      )
      .returning({ id: adeccaImports.id });
    if (!updated[0]) runConflict("La ejecución cambió mientras se finalizaba.");
    return compact;
  });
}

export async function listAdeccaImports(
  actor: PublicUser,
  sectionId: string,
  limit = 20,
  before?: string
) {
  await authorizeAdeccaImport(actor, sectionId);
  const [beforeDate, beforeId, extra] = before?.split("|") ?? [];
  if (
    before &&
    (!beforeDate ||
      Number.isNaN(Date.parse(beforeDate)) ||
      !/^adecca-[a-f0-9]{40}$/.test(beforeId ?? "") ||
      extra !== undefined)
  )
    invalidBatch("El cursor de importación no es válido.");
  const requested = Number.isFinite(limit) ? Math.trunc(limit) : 20;
  const bounded = Math.min(MAX_IMPORT_LIST, Math.max(1, requested));
  return getDb()
    .select({
      id: adeccaImports.id,
      seccionId: adeccaImports.seccionId,
      fingerprint: adeccaImports.fingerprint,
      sourceKey: adeccaImports.sourceKey,
      actorId: adeccaImports.actorId,
      status: adeccaImports.status,
      sourceCourseId: adeccaImports.sourceCourseId,
      sourceCourseName: adeccaImports.sourceCourseName,
      sourceAdeccaVersion: adeccaImports.sourceAdeccaVersion,
      sourceFormat: adeccaImports.sourceFormat,
      sourceFileName: adeccaImports.sourceFileName,
      plannedContentCount: adeccaImports.plannedContentCount,
      plannedFileCount: adeccaImports.plannedFileCount,
      plannedParticipantCount: adeccaImports.plannedParticipantCount,
      contentCount: adeccaImports.contentCount,
      fileCount: adeccaImports.fileCount,
      participantCount: adeccaImports.participantCount,
      participantMatchedCount: adeccaImports.participantMatchedCount,
      participantPendingCount: adeccaImports.participantPendingCount,
      participantSkippedCount: adeccaImports.participantSkippedCount,
      warningCount: adeccaImports.warningCount,
      reportJson: adeccaImports.reportJson,
      finishedAt: adeccaImports.finishedAt,
      createdAt: adeccaImports.createdAt,
      updatedAt: adeccaImports.updatedAt,
    })
    .from(adeccaImports)
    .where(
      before
        ? and(
            eq(adeccaImports.seccionId, sectionId),
            or(
              lt(adeccaImports.updatedAt, beforeDate),
              and(eq(adeccaImports.updatedAt, beforeDate), lt(adeccaImports.id, beforeId))
            )
          )
        : eq(adeccaImports.seccionId, sectionId)
    )
    .orderBy(desc(adeccaImports.updatedAt), desc(adeccaImports.id))
    .limit(bounded);
}
