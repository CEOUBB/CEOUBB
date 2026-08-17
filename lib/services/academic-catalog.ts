import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import {
  asignaturas,
  gradeAuditLogs,
  matriculas,
  periodos,
  secciones,
  users,
} from "../../db/schema.ts";

/*
  Catálogo académico institucional. Toda consulta viaja con `.limit()` y un
  cursor indexado: con >1.800 secciones activas por semestre, una consulta sin
  techo tumba la base antes que la interfaz.
*/
// Implements: REQ-ACAD-01, REQ-AUDIT-01

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

export type SectionRole = (typeof matriculas.$inferSelect)["rolSeccion"];
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
  numeroSeccion: number;
  docenteId: string;
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
  actorId: string;
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
  options: { limit?: number; cursor?: string | null } = {}
): Promise<Page<EnrolledSection>> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select({
      seccionId: secciones.id,
      asignaturaCodigo: asignaturas.codigo,
      asignaturaNombre: asignaturas.nombre,
      periodoId: periodos.id,
      periodoNombre: periodos.nombre,
      numeroSeccion: secciones.numeroSeccion,
      docenteId: secciones.docenteId,
      rolSeccion: matriculas.rolSeccion,
    })
    .from(matriculas)
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(asignaturas, eq(secciones.asignaturaId, asignaturas.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .where(
      and(
        eq(matriculas.usuarioId, usuarioId),
        eq(matriculas.estado, "activa"),
        options.cursor ? gt(secciones.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(secciones.id))
    .limit(limit + 1);
  return paginate(rows, limit, (row) => row.seccionId);
}

/** Identificadores de sección que alimentan las escuchas de Firestore. */
export async function listUserSectionIds(
  usuarioId: string,
  options: { limit?: number } = {}
): Promise<string[]> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select({ seccionId: matriculas.seccionId })
    .from(matriculas)
    .where(and(eq(matriculas.usuarioId, usuarioId), eq(matriculas.estado, "activa")))
    .orderBy(asc(matriculas.seccionId))
    .limit(limit);
  return rows.map((row) => row.seccionId);
}

/** Nómina de una sección, paginada por `usuarioId`. */
export async function listSectionRoster(
  seccionId: string,
  options: { limit?: number; cursor?: string | null } = {}
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
        options.cursor ? gt(users.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(users.id))
    .limit(limit + 1);
  return paginate(rows, limit, (row) => row.usuarioId);
}

/**
 * Registra la mutación de una nota oficial. La bitácora es de sólo inserción:
 * nunca se actualiza ni se borra una entrada existente.
 */
// Implements: REQ-AUDIT-01
export async function appendGradeAuditLog(entry: GradeAuditEntry): Promise<void> {
  await getDb().insert(gradeAuditLogs).values(entry);
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
