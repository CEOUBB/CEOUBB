import { and, asc, eq, gt, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "../../db/index.ts";
import {
  asignaturas,
  gradeAuditLogs,
  matriculas,
  periodos,
  secciones,
  users,
} from "../../db/schema.ts";
import { SECTION_ROLES, type SectionMembership, type SectionRole } from "../section-roles.ts";
import { emptyParticipantCounts, type ParticipantRoleCounts } from "../participants.ts";

/*
  Catálogo académico institucional. Toda consulta viaja con `.limit()` y un
  cursor indexado: con >1.800 secciones activas por semestre, una consulta sin
  techo tumba la base antes que la interfaz.
*/
// Implements: REQ-ACAD-01, REQ-AUDIT-01

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

export type EnrollmentStatus = (typeof matriculas.$inferSelect)["estado"];

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export type EnrolledSection = {
  seccionId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoEstado: (typeof periodos.$inferSelect)["estado"];
  numeroSeccion: number;
  docenteId: string;
  docenteNombre: string;
  rolSeccion: SectionRole;
};

export type RosterEntry = {
  usuarioId: string;
  nombre: string;
  email: string;
  rolSeccion: SectionRole;
  estado: EnrollmentStatus;
};

export type GradeAuditEntry = {
  id: string;
  seccionId: string;
  evaluacionId: string;
  studentId: string;
  actorId: string | null;
  prevScore: number | null;
  newScore: number;
  timestamp: string;
  ipAddress: string | null;
};

/** Recorta cualquier tamaño de página al rango admitido por la base. */
export function boundedLimit(value: number | undefined): number {
  if (!Number.isFinite(value ?? Number.NaN)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.trunc(value as number)));
}

function paginate<T>(rows: T[], limit: number, cursorOf: (row: T) => string): Page<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? cursorOf(last) : null,
  };
}

/** Secciones con matrícula activa del usuario, paginadas por `seccionId`. */
export async function listUserSections(
  usuarioId: string,
  options: { limit?: number; cursor?: string | null; scope?: "current" | "archived" } = {}
): Promise<Page<EnrolledSection>> {
  const limit = boundedLimit(options.limit);
  const teachers = alias(users, "teachers");
  const rows = await getDb()
    .select({
      seccionId: secciones.id,
      asignaturaCodigo: asignaturas.codigo,
      asignaturaNombre: asignaturas.nombre,
      periodoId: periodos.id,
      periodoNombre: periodos.nombre,
      periodoEstado: periodos.estado,
      numeroSeccion: secciones.numeroSeccion,
      docenteId: secciones.docenteId,
      docenteNombre: teachers.name,
      rolSeccion: matriculas.rolSeccion,
    })
    .from(matriculas)
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(asignaturas, eq(secciones.asignaturaId, asignaturas.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .innerJoin(teachers, eq(secciones.docenteId, teachers.id))
    .where(
      and(
        eq(matriculas.usuarioId, usuarioId),
        eq(matriculas.estado, "activa"),
        options.scope === "current" ? eq(periodos.estado, "abierto") : undefined,
        options.scope === "archived" ? ne(periodos.estado, "abierto") : undefined,
        options.cursor ? gt(secciones.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(secciones.id))
    .limit(limit + 1);
  return paginate(rows, limit, (row) => row.seccionId);
}

/** Identificadores de sección que alimentan las escuchas de Firestore. */
// Implements: REQ-ASST-02
export async function listUserSectionMemberships(
  usuarioId: string,
  options: { limit?: number } = {}
): Promise<SectionMembership[]> {
  const limit = boundedLimit(options.limit);
  return getDb()
    .select({ sectionId: matriculas.seccionId, role: matriculas.rolSeccion })
    .from(matriculas)
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .where(
      and(
        eq(matriculas.usuarioId, usuarioId),
        eq(matriculas.estado, "activa"),
        eq(periodos.estado, "abierto")
      )
    )
    .orderBy(asc(matriculas.seccionId))
    .limit(limit);
}

/** Identificadores de sección que alimentan las escuchas de Firestore. */
export async function listUserSectionIds(
  usuarioId: string,
  options: { limit?: number } = {}
): Promise<string[]> {
  const memberships = await listUserSectionMemberships(usuarioId, options);
  return memberships.map((membership) => membership.sectionId);
}

export async function activeSectionRoleForUser(
  usuarioId: string,
  seccionId: string
): Promise<SectionRole | null> {
  const rows = await getDb()
    .select({ role: matriculas.rolSeccion })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.usuarioId, usuarioId),
        eq(matriculas.seccionId, seccionId),
        eq(matriculas.estado, "activa")
      )
    )
    .limit(1);
  return rows[0]?.role ?? null;
}

function rosterSearchCondition(query: string | undefined) {
  const normalized = query?.trim().toLowerCase() ?? "";
  if (!normalized) return undefined;
  const escaped = normalized.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  return or(
    sql`lower(${users.name}) LIKE ${pattern} ESCAPE '\\'`,
    sql`lower(${users.email}) LIKE ${pattern} ESCAPE '\\'`
  );
}

function rosterRolesCondition(roles: readonly SectionRole[] | undefined) {
  return roles?.length ? inArray(matriculas.rolSeccion, [...roles]) : undefined;
}

/** Nómina de una sección, paginada por `usuarioId`. */
export async function listSectionRoster(
  seccionId: string,
  options: {
    limit?: number;
    cursor?: string | null;
    query?: string;
    roles?: readonly SectionRole[];
  } = {}
): Promise<Page<RosterEntry>> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select({
      usuarioId: users.id,
      nombre: users.name,
      email: users.email,
      rolSeccion: matriculas.rolSeccion,
      estado: matriculas.estado,
    })
    .from(matriculas)
    .innerJoin(users, eq(matriculas.usuarioId, users.id))
    .where(
      and(
        eq(matriculas.seccionId, seccionId),
        eq(matriculas.estado, "activa"),
        rosterSearchCondition(options.query),
        rosterRolesCondition(options.roles),
        options.cursor ? gt(users.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(users.id))
    .limit(limit + 1);
  return paginate(rows, limit, (row) => row.usuarioId);
}

export async function countSectionRosterByRole(
  seccionId: string,
  query?: string
): Promise<ParticipantRoleCounts> {
  const rows = await getDb()
    .select({ role: matriculas.rolSeccion, count: sql<number>`count(*)` })
    .from(matriculas)
    .innerJoin(users, eq(matriculas.usuarioId, users.id))
    .where(
      and(
        eq(matriculas.seccionId, seccionId),
        eq(matriculas.estado, "activa"),
        rosterSearchCondition(query)
      )
    )
    .groupBy(matriculas.rolSeccion)
    .limit(SECTION_ROLES.length);
  const counts = emptyParticipantCounts();
  for (const row of rows) counts[row.role] = Number(row.count);
  return counts;
}

/**
 * Registra la mutación de una nota oficial. La bitácora es de sólo inserción:
 * nunca se borra una entrada existente y la única actualización admitida es el
 * borrado de la IP vencida que hace `purgeAgedAuditIpAddresses`.
 */
// Implements: REQ-AUDIT-01
export async function appendGradeAuditLog(entry: GradeAuditEntry): Promise<void> {
  await getDb().insert(gradeAuditLogs).values(entry);
}

/** Meses que la política publicada promete conservar la IP de una mutación de nota. */
// Implements: REQ-PRIV-04
export const AUDIT_IP_RETENTION_MONTHS = 12;

/** Techo de entradas que una sola ejecución de la purga puede tocar. */
// Implements: REQ-PRIV-08
export const AUDIT_IP_PURGE_BATCH = MAX_PAGE_SIZE;

/** Instante ISO antes del cual una IP de bitácora ya venció. */
// Implements: REQ-PRIV-08
export function auditIpRetentionCutoff(now: Date): string {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - AUDIT_IP_RETENTION_MONTHS);
  return cutoff.toISOString();
}

/**
 * Borra la IP de las entradas vencidas y conserva el resto de la bitácora: la IP
 * identifica un dispositivo, el historial de puntajes identifica un acto académico
 * y es justamente la evidencia que la auditoría existe para preservar.
 */
// Implements: REQ-PRIV-08
export async function purgeAgedAuditIpAddresses(
  cutoff: string,
  limit: number = AUDIT_IP_PURGE_BATCH
): Promise<number> {
  const db = getDb();
  /*
    Dos sentencias en vez de un `UPDATE ... LIMIT`: SQLite sólo acepta ese límite
    si se compiló con SQLITE_ENABLE_UPDATE_DELETE_LIMIT, y libSQL no lo garantiza.
    El `select` acotado da el mismo techo con SQL que sí está garantizado.
  */
  const aged = await db
    .select({ id: gradeAuditLogs.id })
    .from(gradeAuditLogs)
    .where(and(lt(gradeAuditLogs.timestamp, cutoff), isNotNull(gradeAuditLogs.ipAddress)))
    .orderBy(asc(gradeAuditLogs.id))
    .limit(boundedLimit(limit));
  if (aged.length === 0) return 0;
  await db
    .update(gradeAuditLogs)
    .set({ ipAddress: null })
    .where(
      inArray(
        gradeAuditLogs.id,
        aged.map((row) => row.id)
      )
    );
  return aged.length;
}

/** Bitácora de una sección, paginada por `id`. */
export async function listGradeAuditLog(
  seccionId: string,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<Page<GradeAuditEntry>> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select()
    .from(gradeAuditLogs)
    .where(
      and(
        eq(gradeAuditLogs.seccionId, seccionId),
        options.cursor ? gt(gradeAuditLogs.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(gradeAuditLogs.id))
    .limit(limit + 1);
  return paginate(rows, limit, (row) => row.id);
}
