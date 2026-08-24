import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "../../db/index.ts";
import { matriculas, matriculasPendientes, periodos, secciones, users } from "../../db/schema.ts";
import { normalizeAccessEmail } from "../access-policy.ts";
import type { PublicUser } from "../auth.ts";
import {
  EnrollmentImportError,
  buildEnrollmentMutationPlan,
  classifyEnrollmentRows,
  enrollmentImportFingerprint,
  enrollmentImportTotals,
  enrollmentPreviewPage,
  importChunks,
  parseEnrollmentCsv,
  type CurrentEnrollment,
  type EnrollmentImportPreview,
  type EnrollmentImportState,
  type RegisteredImportUser,
} from "../bulk-enrollment.ts";
import { isValidPathSegment, projectEnrollments } from "./enrollment-projection.ts";

export type EnrollmentSectionAuthorization = {
  docenteId: string;
  periodStatus: "abierto" | "cerrado" | "archivado";
  membershipRole?: "teacher" | "student" | "assistant" | "coordinator" | null;
  membershipStatus?: "activa" | "retirada" | "congelada" | null;
};

export type EnrollmentImportInput = {
  sectionId: string;
  csv: string;
  page?: number;
  fingerprint?: string;
};

export type EnrollmentImportResult = {
  applied: true;
  activated: number;
  reactivated: number;
  pending: number;
  unchanged: number;
  projected: number;
  projectionPending: boolean;
};

export function canManageEnrollmentSection(
  actor: Pick<PublicUser, "id" | "role">,
  section: EnrollmentSectionAuthorization
): boolean {
  if (section.periodStatus !== "abierto") return false;
  if (actor.role === "owner" || section.docenteId === actor.id) return true;
  return (
    section.membershipStatus === "activa" &&
    (section.membershipRole === "teacher" || section.membershipRole === "coordinator")
  );
}

export async function previewEnrollmentImport(
  actor: PublicUser,
  input: EnrollmentImportInput
): Promise<EnrollmentImportPreview> {
  const prepared = await prepareEnrollmentImport(actor, input);
  return enrollmentPreviewPage(prepared.fingerprint, prepared.rows, input.page);
}

export async function applyEnrollmentImport(
  actor: PublicUser,
  input: EnrollmentImportInput
): Promise<EnrollmentImportResult> {
  const prepared = await prepareEnrollmentImport(actor, input);
  if (!input.fingerprint || input.fingerprint !== prepared.fingerprint) {
    throw new EnrollmentImportError(
      "preview_changed",
      "El archivo cambió desde la previsualización. Vuelve a previsualizarlo.",
      409
    );
  }

  const plan = buildEnrollmentMutationPlan(prepared.rows);
  const totals = enrollmentImportTotals(prepared.rows);
  const now = new Date().toISOString();
  const db = getDb();
  const outbox = prepared.rows.map((row) => ({
    id: randomUUID(),
    seccionId: input.sectionId,
    email: row.email,
    nombre: row.name,
    importedBy: actor.id,
    createdAt: now,
  }));

  const enrollmentQueries = importChunks(plan.enrollments).map((chunk) =>
    db
      .insert(matriculas)
      .values(
        chunk.map((row) => ({
          id: randomUUID(),
          seccionId: input.sectionId,
          usuarioId: row.userId,
          rolSeccion: "student" as const,
          estado: "activa" as const,
          createdAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: [matriculas.seccionId, matriculas.usuarioId],
        set: { rolSeccion: "student", estado: "activa" },
      })
  );
  const pendingQueries = importChunks(outbox).map((chunk) =>
    db
      .insert(matriculasPendientes)
      .values(chunk)
      .onConflictDoUpdate({
        target: [matriculasPendientes.seccionId, matriculasPendientes.email],
        set: {
          nombre: sql`excluded.nombre`,
          importedBy: actor.id,
        },
      })
  );
  await runDatabaseBatch(db, [...enrollmentQueries, ...pendingQueries]);

  const projections = plan.registeredForProjection.map((row) => ({
    seccionId: input.sectionId,
    userId: row.userId,
    role: "student" as const,
    status: "activa" as const,
    updatedAt: now,
  }));
  let projectionPending = false;
  try {
    await projectEnrollments(projections);
    await deletePendingByEmail(
      input.sectionId,
      plan.registeredForProjection.map((row) => row.email)
    );
  } catch {
    projectionPending = projections.length > 0;
  }

  return {
    applied: true,
    activated: totals.activate,
    reactivated: totals.reactivate,
    pending: totals.pending,
    unchanged: totals.unchanged,
    projected: projectionPending ? 0 : projections.length,
    projectionPending,
  };
}

export async function claimPendingEnrollments(user: {
  id: string;
  email: string;
}): Promise<{ claimed: number; projectionPending: boolean }> {
  const db = getDb();
  const email = normalizeAccessEmail(user.email);
  const pending = await db
    .select({
      id: matriculasPendientes.id,
      seccionId: matriculasPendientes.seccionId,
    })
    .from(matriculasPendientes)
    .where(eq(matriculasPendientes.email, email))
    .orderBy(asc(matriculasPendientes.id))
    .limit(100);
  if (pending.length === 0) return { claimed: 0, projectionPending: false };

  const now = new Date().toISOString();
  await runDatabaseBatch(
    db,
    importChunks(pending).map((chunk) =>
      db
        .insert(matriculas)
        .values(
          chunk.map((row) => ({
            id: randomUUID(),
            seccionId: row.seccionId,
            usuarioId: user.id,
            rolSeccion: "student" as const,
            estado: "activa" as const,
            createdAt: now,
          }))
        )
        .onConflictDoUpdate({
          target: [matriculas.seccionId, matriculas.usuarioId],
          set: { rolSeccion: "student", estado: "activa" },
        })
    )
  );

  try {
    await projectEnrollments(
      pending.map((row) => ({
        seccionId: row.seccionId,
        userId: user.id,
        role: "student" as const,
        status: "activa" as const,
        updatedAt: now,
      }))
    );
    await runDatabaseBatch(
      db,
      importChunks(pending.map((row) => row.id)).map((chunk) =>
        db.delete(matriculasPendientes).where(inArray(matriculasPendientes.id, chunk))
      )
    );
    return { claimed: pending.length, projectionPending: false };
  } catch {
    return { claimed: pending.length, projectionPending: true };
  }
}

async function prepareEnrollmentImport(actor: PublicUser, input: EnrollmentImportInput) {
  await authorizeEnrollmentImport(actor, input.sectionId);
  const parsedRows = parseEnrollmentCsv(input.csv);
  const state = await loadEnrollmentImportState(input.sectionId, parsedRows);
  const rows = classifyEnrollmentRows(parsedRows, state);
  return {
    rows,
    fingerprint: enrollmentImportFingerprint(input.sectionId, parsedRows),
  };
}

async function authorizeEnrollmentImport(actor: PublicUser, sectionId: string) {
  if (!isValidPathSegment(sectionId)) {
    throw new EnrollmentImportError("invalid_request", "La sección solicitada no es válida.", 400);
  }
  const db = getDb();
  const sectionRows = await db
    .select({
      docenteId: secciones.docenteId,
      periodStatus: periodos.estado,
    })
    .from(secciones)
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .where(eq(secciones.id, sectionId))
    .limit(1);
  const section = sectionRows[0];
  if (!section) {
    throw new EnrollmentImportError("section_not_found", "La sección solicitada no existe.", 404);
  }
  if (section.periodStatus !== "abierto") {
    throw new EnrollmentImportError(
      "period_closed",
      "Las matrículas sólo pueden cargarse en un período abierto.",
      409
    );
  }
  if (actor.role === "owner" || section.docenteId === actor.id) return;

  const memberships = await db
    .select({
      membershipRole: matriculas.rolSeccion,
      membershipStatus: matriculas.estado,
    })
    .from(matriculas)
    .where(and(eq(matriculas.seccionId, sectionId), eq(matriculas.usuarioId, actor.id)))
    .limit(1);
  const membership = memberships[0];
  if (
    !canManageEnrollmentSection(actor, {
      ...section,
      membershipRole: membership?.membershipRole,
      membershipStatus: membership?.membershipStatus,
    })
  ) {
    throw new EnrollmentImportError(
      "forbidden",
      "No tienes permiso para administrar esta sección.",
      403
    );
  }
}

async function loadEnrollmentImportState(
  sectionId: string,
  rows: { email: string; error: string | null }[]
): Promise<EnrollmentImportState> {
  const emails = [...new Set(rows.flatMap((row) => (row.error ? [] : [row.email])))];
  const db = getDb();
  const emailChunks = importChunks(emails);
  const [registeredGroups, pendingGroups] = await Promise.all([
    runDatabaseBatch<RegisteredImportUser[]>(
      db,
      emailChunks.map((chunk) =>
        db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(inArray(users.email, chunk))
          .limit(chunk.length)
      )
    ),
    runDatabaseBatch<{ email: string }[]>(
      db,
      emailChunks.map((chunk) =>
        db
          .select({ email: matriculasPendientes.email })
          .from(matriculasPendientes)
          .where(
            and(
              eq(matriculasPendientes.seccionId, sectionId),
              inArray(matriculasPendientes.email, chunk)
            )
          )
          .limit(chunk.length)
      )
    ),
  ]);
  const registeredUsers = registeredGroups.flat();
  const pendingEmails = pendingGroups.flat().map((row) => row.email);

  const currentEnrollments = (
    await runDatabaseBatch<CurrentEnrollment[]>(
      db,
      importChunks(registeredUsers.map((user) => user.id)).map((chunk) =>
        db
          .select({
            userId: matriculas.usuarioId,
            role: matriculas.rolSeccion,
            status: matriculas.estado,
          })
          .from(matriculas)
          .where(and(eq(matriculas.seccionId, sectionId), inArray(matriculas.usuarioId, chunk)))
          .limit(chunk.length)
      )
    )
  ).flat();

  return { registeredUsers, currentEnrollments, pendingEmails };
}

async function deletePendingByEmail(sectionId: string, emails: string[]) {
  const db = getDb();
  await runDatabaseBatch(
    db,
    importChunks(emails).map((chunk) =>
      db
        .delete(matriculasPendientes)
        .where(
          and(
            eq(matriculasPendientes.seccionId, sectionId),
            inArray(matriculasPendientes.email, chunk)
          )
        )
    )
  );
}

async function runDatabaseBatch<T = unknown>(
  db: ReturnType<typeof getDb>,
  queries: BatchItem<"sqlite">[]
): Promise<T[]> {
  if (queries.length === 0) return [];
  return (await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]])) as T[];
}
