import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { matriculas, moodleImports, pendingMatriculas, secciones, users } from "../../db/schema.ts";
import type { PublicUser } from "../auth.ts";
import { normalizeAccessEmail, roleForEmail } from "../access-policy.ts";
import { stableMoodleDocumentId } from "../moodle/parser.ts";
import type {
  MoodleImportPost,
  MoodleImportReport,
  MoodleImportSource,
  MoodleRosterParticipant,
} from "../moodle/types.ts";
import {
  commitFirestoreWrites,
  FIREBASE_PROJECT_ID,
  isValidPathSegment,
  projectEnrollments,
  type FirestoreWrite,
} from "./enrollment-projection.ts";

const MAX_IMPORT_BATCH = 100;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const POST_KINDS = ["notice", "guide", "assessment", "resource"] as const;
const SECTION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,60}$/;

export class MoodleImportServiceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "MoodleImportServiceError";
    this.code = code;
    this.status = status;
  }
}

// Implements: REQ-MOODLE-05
export function importedPostDocumentPath(sectionId: string, sourceKey: string, sourceId: string) {
  if (!SECTION_ID_PATTERN.test(sectionId)) {
    throw new MoodleImportServiceError(
      "La sección de destino no es válida.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  return `courses/${sectionId}/posts/${stableMoodleDocumentId(sourceKey, sourceId)}`;
}

// Implements: REQ-MOODLE-06
export function pendingEnrollmentExpiry(now = new Date()) {
  return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
}

function invalidBatch(message: string): never {
  throw new MoodleImportServiceError(message, "INVALID_IMPORT_BATCH", 400);
}

// Implements: REQ-MOODLE-05, REQ-MOODLE-07
export function validateMoodleImportPosts(
  sectionId: string,
  posts: MoodleImportPost[]
): MoodleImportPost[] {
  if (!SECTION_ID_PATTERN.test(sectionId)) invalidBatch("La sección de destino no es válida.");
  if (!Array.isArray(posts) || posts.length > MAX_IMPORT_BATCH) {
    invalidBatch("Cada lote puede contener hasta 100 publicaciones.");
  }
  for (const post of posts) {
    if (
      !post ||
      typeof post.sourceId !== "string" ||
      !post.sourceId ||
      post.sourceId.length > 500
    ) {
      invalidBatch("Una publicación no trae un identificador Moodle válido.");
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
      (post.sourceCreatedAt !== null && typeof post.sourceCreatedAt !== "string")
    ) {
      invalidBatch("Una publicación contiene metadatos incompletos.");
    }
    if (post.linkUrl) {
      let url: URL;
      try {
        url = new URL(post.linkUrl);
      } catch {
        invalidBatch("Una publicación contiene un enlace inválido.");
      }
      if (!["http:", "https:"].includes(url!.protocol)) {
        invalidBatch("Una publicación contiene un enlace inseguro.");
      }
    }
    for (const date of [post.dueDate, post.sourceCreatedAt]) {
      if (date && Number.isNaN(Date.parse(date))) invalidBatch("Una fecha importada no es válida.");
    }
    if (!Number.isInteger(post.fileSize) || post.fileSize < 0 || post.fileSize > MAX_FILE_BYTES) {
      invalidBatch("Un archivo supera el límite permitido.");
    }
    const hasFile = Boolean(post.storagePath || post.fileName || post.contentType || post.fileSize);
    if (!hasFile) continue;
    const expected = `courses/${sectionId}/`;
    const rest = post.storagePath.startsWith(expected)
      ? post.storagePath.slice(expected.length).split("/")
      : [];
    if (
      rest.length !== 2 ||
      !rest.every(isValidPathSegment) ||
      !post.fileName ||
      !post.contentType ||
      post.fileSize < 1
    ) {
      invalidBatch("La ruta del archivo no pertenece a la sección de destino.");
    }
  }
  return posts;
}

// Implements: REQ-MOODLE-07
export async function authorizeMoodleImport(actor: PublicUser, sectionId: string) {
  if (!SECTION_ID_PATTERN.test(sectionId)) {
    throw new MoodleImportServiceError("La sección no existe.", "SECTION_NOT_FOUND", 404);
  }
  const db = getDb();
  const section = await db
    .select({ id: secciones.id })
    .from(secciones)
    .where(eq(secciones.id, sectionId))
    .limit(1);
  if (!section[0]) {
    throw new MoodleImportServiceError("La sección no existe.", "SECTION_NOT_FOUND", 404);
  }
  if (actor.role === "owner") return section[0];
  const enrollment = await db
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
    throw new MoodleImportServiceError(
      "No tienes permisos docentes activos en esta sección.",
      "IMPORT_FORBIDDEN",
      403
    );
  }
  return section[0];
}

function digestId(...parts: string[]) {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

function importId(sectionId: string, fingerprint: string) {
  return `moodle-${digestId(sectionId, fingerprint).slice(0, 40)}`;
}

async function requireMoodleImport(sectionId: string, fingerprint: string) {
  const rows = await getDb()
    .select({ id: moodleImports.id })
    .from(moodleImports)
    .where(and(eq(moodleImports.seccionId, sectionId), eq(moodleImports.fingerprint, fingerprint)))
    .limit(1);
  if (!rows[0]) {
    throw new MoodleImportServiceError(
      "La importación no fue iniciada o ya no está disponible.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  return rows[0];
}

// Implements: REQ-MOODLE-08
export async function startMoodleImport(
  actor: PublicUser,
  sectionId: string,
  source: MoodleImportSource
) {
  const now = new Date().toISOString();
  const id = importId(sectionId, source.fingerprint);
  await getDb()
    .insert(moodleImports)
    .values({
      id,
      seccionId: sectionId,
      fingerprint: source.fingerprint,
      actorId: actor.id,
      status: "running",
      sourceCourseId: source.courseId,
      sourceCourseName: source.courseName,
      sourceMoodleVersion: source.moodleVersion,
      sourceFileName: source.fileName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [moodleImports.seccionId, moodleImports.fingerprint],
      set: { actorId: actor.id, status: "running", updatedAt: now },
    });
  return { id };
}

// Implements: REQ-MOODLE-05
export async function writeMoodleImportPosts(
  actor: PublicUser,
  sectionId: string,
  sourceKey: string,
  fingerprint: string,
  values: MoodleImportPost[]
) {
  await requireMoodleImport(sectionId, fingerprint);
  const posts = validateMoodleImportPosts(sectionId, values);
  const now = new Date().toISOString();
  const writes: FirestoreWrite[] = posts.map((post) => {
    const name = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${importedPostDocumentPath(sectionId, sourceKey, post.sourceId)}`;
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
      createdAt: { timestampValue: post.sourceCreatedAt || now },
      sourceSystem: { stringValue: "moodle" },
      sourceId: { stringValue: post.sourceId },
      sourceKey: { stringValue: sourceKey },
      importFingerprint: { stringValue: fingerprint },
      notifyStudents: { booleanValue: false },
    };
    return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
  });
  await commitFirestoreWrites(writes);
  return { imported: writes.length };
}

function normalizeRoster(values: MoodleRosterParticipant[]) {
  if (!Array.isArray(values) || values.length > MAX_IMPORT_BATCH) {
    invalidBatch("Cada lote puede contener hasta 100 participantes.");
  }
  const unique = new Map<string, MoodleRosterParticipant>();
  for (const participant of values) {
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

// Implements: REQ-MOODLE-06
export async function reconcileMoodleRoster(
  sectionId: string,
  fingerprint: string,
  values: MoodleRosterParticipant[]
) {
  await requireMoodleImport(sectionId, fingerprint);
  const participants = normalizeRoster(values);
  if (participants.length === 0) return { matched: 0, pending: 0 };
  const db = getDb();
  const matchedUsers = await db
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
  const now = new Date().toISOString();
  const expiresAt = pendingEnrollmentExpiry(new Date(now));
  const sourceImportId = importId(sectionId, fingerprint);
  await db.transaction(async (tx) => {
    for (const participant of participants) {
      const user = byEmail.get(participant.email);
      if (user) {
        await tx
          .insert(matriculas)
          .values({
            id: `mat-${digestId(sectionId, user.id).slice(0, 40)}`,
            seccionId: sectionId,
            usuarioId: user.id,
            rolSeccion: "student",
            estado: "activa",
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [matriculas.seccionId, matriculas.usuarioId],
            set: { rolSeccion: "student", estado: "activa" },
          });
      } else {
        await tx
          .insert(pendingMatriculas)
          .values({
            id: `pending-${digestId(sectionId, participant.email).slice(0, 40)}`,
            seccionId: sectionId,
            email: participant.email,
            rolSeccion: "student",
            sourceImportId,
            expiresAt,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [pendingMatriculas.seccionId, pendingMatriculas.email],
            set: { sourceImportId, expiresAt, updatedAt: now },
          });
      }
    }
  });
  try {
    await projectEnrollments(
      matchedUsers.map((user) => ({
        seccionId: sectionId,
        userId: user.id,
        role: "student" as const,
        status: "activa" as const,
      }))
    );
  } catch {
    throw new MoodleImportServiceError(
      "Las matrículas se guardaron, pero Firebase no pudo proyectarlas.",
      "PROJECTION_UNAVAILABLE",
      503
    );
  }
  if (matchedUsers.length > 0) {
    await db.delete(pendingMatriculas).where(
      and(
        eq(pendingMatriculas.seccionId, sectionId),
        inArray(
          pendingMatriculas.email,
          matchedUsers.map((user) => normalizeAccessEmail(user.email))
        )
      )
    );
  }
  return { matched: matchedUsers.length, pending: participants.length - matchedUsers.length };
}

// Implements: REQ-MOODLE-06
export async function claimPendingMoodleEnrollments(actor: PublicUser) {
  if (roleForEmail(actor.email) !== "student") return 0;
  const db = getDb();
  const email = normalizeAccessEmail(actor.email);
  const now = new Date().toISOString();
  const pending = await db
    .select({ id: pendingMatriculas.id, seccionId: pendingMatriculas.seccionId })
    .from(pendingMatriculas)
    .where(and(eq(pendingMatriculas.email, email), gt(pendingMatriculas.expiresAt, now)))
    .limit(MAX_IMPORT_BATCH);
  if (pending.length === 0) return 0;
  await db.transaction(async (tx) => {
    for (const entry of pending) {
      await tx
        .insert(matriculas)
        .values({
          id: `mat-${digestId(entry.seccionId, actor.id).slice(0, 40)}`,
          seccionId: entry.seccionId,
          usuarioId: actor.id,
          rolSeccion: "student",
          estado: "activa",
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: [matriculas.seccionId, matriculas.usuarioId],
          set: { rolSeccion: "student", estado: "activa" },
        });
    }
  });
  await projectEnrollments(
    pending.map((entry) => ({
      seccionId: entry.seccionId,
      userId: actor.id,
      role: "student" as const,
      status: "activa" as const,
    }))
  );
  await db.delete(pendingMatriculas).where(
    inArray(
      pendingMatriculas.id,
      pending.map((item) => item.id)
    )
  );
  return pending.length;
}

// Implements: REQ-MOODLE-06
export async function purgeExpiredPendingMoodleEnrollments() {
  const db = getDb();
  const rows = await db
    .select({ id: pendingMatriculas.id })
    .from(pendingMatriculas)
    .where(lt(pendingMatriculas.expiresAt, new Date().toISOString()))
    .limit(MAX_IMPORT_BATCH);
  if (rows.length > 0) {
    await db.delete(pendingMatriculas).where(
      inArray(
        pendingMatriculas.id,
        rows.map((item) => item.id)
      )
    );
  }
  return rows.length;
}

// Implements: REQ-MOODLE-08
export async function completeMoodleImport(
  sectionId: string,
  report: MoodleImportReport,
  reportedWarningCount = report.warnings.length
) {
  await requireMoodleImport(sectionId, report.source.fingerprint);
  const compact = {
    status: report.status,
    contentImported: report.contentImported,
    filesImported: report.filesImported,
    participantsMatched: report.participantsMatched,
    participantsPending: report.participantsPending,
    warnings: report.warnings.slice(0, 100),
    finishedAt: report.finishedAt,
  };
  await getDb()
    .update(moodleImports)
    .set({
      status: report.status,
      contentCount: report.contentImported,
      fileCount: report.filesImported,
      participantCount: report.participantsMatched + report.participantsPending,
      warningCount: Math.min(20_000, Math.max(report.warnings.length, reportedWarningCount)),
      reportJson: JSON.stringify(compact).slice(0, 40_000),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(moodleImports.seccionId, sectionId),
        eq(moodleImports.fingerprint, report.source.fingerprint)
      )
    );
  return compact;
}

// Implements: REQ-MOODLE-08, REQ-MOODLE-09
export async function listMoodleImports(sectionId: string, limit = 20, before?: string) {
  const bounded = Math.min(50, Math.max(1, Math.trunc(limit)));
  return getDb()
    .select()
    .from(moodleImports)
    .where(
      before
        ? and(eq(moodleImports.seccionId, sectionId), lt(moodleImports.updatedAt, before))
        : eq(moodleImports.seccionId, sectionId)
    )
    .orderBy(desc(moodleImports.updatedAt))
    .limit(bounded);
}
