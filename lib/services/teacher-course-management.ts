import { and, asc, desc, eq, gt } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import {
  asignaturas,
  assistantAssignments,
  departamentos,
  facultades,
  matriculas,
  periodos,
  secciones,
  sectionProfiles,
  users,
} from "../../db/schema.ts";
import type { PublicUser } from "../auth.ts";
import {
  courseToneValue,
  modalityLabel,
  parseAssistantInput,
  parseCreateTeacherCourseInput,
  parseUpdateTeacherCourseInput,
  sectionIdFor,
  type AssistantInput,
  type CourseAssistant,
  type CourseModality,
  type CoursePage,
  type CourseSectionRole,
  type CourseTone,
  type CreateTeacherCourseInput,
  type ManagedCourse,
  type TeacherCourseCatalog,
  type UpdateTeacherCourseInput,
} from "../course-management.ts";
import {
  projectEnrollmentToFirestore,
  type EnrollmentStatus,
  type SectionRole,
} from "./enrollment-projection.ts";
import { boundedLimit, type Page } from "./academic-catalog.ts";

type Database = ReturnType<typeof getDb>;
type EnrollmentProjector = (
  sectionId: string,
  userId: string,
  role: SectionRole,
  status: EnrollmentStatus
) => Promise<unknown>;

export type CourseManagementDependencies = {
  db?: Database;
  now?: () => Date;
  projectEnrollment?: EnrollmentProjector;
};

export type CourseManagementErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "PROJECTION_UNAVAILABLE" | "INTERNAL";

export class CourseManagementError extends Error {
  readonly code: CourseManagementErrorCode;
  readonly status: number;

  constructor(code: CourseManagementErrorCode, status: number, message: string) {
    super(message);
    this.name = "CourseManagementError";
    this.code = code;
    this.status = status;
  }
}

type CourseRow = {
  id: string;
  assignmentName: string;
  assignmentCode: string;
  creditsSct: number;
  departmentId: string;
  periodId: string;
  periodName: string;
  sectionNumber: number;
  teacherId: string;
  teacherName: string;
  role: CourseSectionRole;
  title: string | null;
  description: string | null;
  modality: CourseModality | null;
  room: string | null;
  tone: CourseTone | null;
};

function database(dependencies: CourseManagementDependencies): Database {
  return dependencies.db ?? getDb();
}

function nowIso(dependencies: CourseManagementDependencies): string {
  return (dependencies.now?.() ?? new Date()).toISOString();
}

function projector(dependencies: CourseManagementDependencies): EnrollmentProjector {
  return dependencies.projectEnrollment ?? projectEnrollmentToFirestore;
}

function requireTeacher(actor: PublicUser): void {
  if (actor.role !== "teacher" && actor.role !== "owner") {
    throw new CourseManagementError("FORBIDDEN", 403, "Este espacio está reservado a docentes.");
  }
}

function page<T>(rows: T[], limit: number, cursorOf: (row: T) => string): Page<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? cursorOf(last) : null,
  };
}

function toCourse(row: CourseRow, managerId?: string, owner = false): ManagedCourse {
  const toneKey = row.tone ?? "sky";
  const modality = row.modality ?? "presencial";
  const title = row.title?.trim() || row.assignmentName;
  const facts = [`${row.creditsSct} créditos SCT`, modalityLabel(modality)];
  if (row.room?.trim()) facts.push(row.room.trim());
  return {
    id: row.id,
    name: title,
    code: row.assignmentCode,
    section: String(row.sectionNumber),
    teacher: row.teacherName,
    period: row.periodName,
    tone: courseToneValue(toneKey),
    eyebrow: `${row.periodName} · Sección ${row.sectionNumber}`,
    headline: title,
    summary: row.description?.trim() || "El equipo docente aún no publica una descripción.",
    facts,
    units: [],
    evaluations: [],
    role: row.role,
    modality,
    room: row.room ?? "",
    toneKey,
    creditsSct: row.creditsSct,
    departmentId: row.departmentId,
    periodId: row.periodId,
    canManage: owner || row.teacherId === managerId,
  };
}

function invalidInput(cause: unknown): never {
  const message = cause instanceof Error ? cause.message : "La ficha del ramo no es válida.";
  throw new CourseManagementError("INVALID_INPUT", 400, message);
}

function normalizedCreate(value: unknown): CreateTeacherCourseInput {
  try {
    return parseCreateTeacherCourseInput(value);
  } catch (cause) {
    return invalidInput(cause);
  }
}

function normalizedUpdate(value: unknown): UpdateTeacherCourseInput {
  try {
    return parseUpdateTeacherCourseInput(value);
  } catch (cause) {
    return invalidInput(cause);
  }
}

function normalizedAssistant(value: unknown): AssistantInput {
  try {
    return parseAssistantInput(value);
  } catch (cause) {
    return invalidInput(cause);
  }
}

async function managedSection(actor: PublicUser, sectionId: string, db: Database) {
  requireTeacher(actor);
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(sectionId)) {
    throw new CourseManagementError("NOT_FOUND", 404, "El ramo no existe.");
  }
  const rows = await db
    .select({ id: secciones.id, teacherId: secciones.docenteId })
    .from(secciones)
    .where(eq(secciones.id, sectionId))
    .limit(1);
  const section = rows[0];
  if (!section) throw new CourseManagementError("NOT_FOUND", 404, "El ramo no existe.");
  if (actor.role !== "owner" && section.teacherId !== actor.id) {
    throw new CourseManagementError(
      "FORBIDDEN",
      403,
      "Sólo el docente responsable puede administrar este ramo."
    );
  }
  return section;
}

async function courseById(
  sectionId: string,
  role: CourseSectionRole,
  actor: PublicUser,
  db: Database
): Promise<ManagedCourse> {
  const rows = await db
    .select({
      id: secciones.id,
      assignmentName: asignaturas.nombre,
      assignmentCode: asignaturas.codigo,
      creditsSct: asignaturas.creditosSct,
      departmentId: asignaturas.departamentoId,
      periodId: periodos.id,
      periodName: periodos.nombre,
      sectionNumber: secciones.numeroSeccion,
      teacherId: secciones.docenteId,
      teacherName: users.name,
      title: sectionProfiles.title,
      description: sectionProfiles.description,
      modality: sectionProfiles.modality,
      room: sectionProfiles.room,
      tone: sectionProfiles.tone,
    })
    .from(secciones)
    .innerJoin(asignaturas, eq(secciones.asignaturaId, asignaturas.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .innerJoin(users, eq(secciones.docenteId, users.id))
    .leftJoin(sectionProfiles, eq(sectionProfiles.seccionId, secciones.id))
    .where(eq(secciones.id, sectionId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new CourseManagementError("NOT_FOUND", 404, "El ramo no existe.");
  return toCourse({ ...row, role }, actor.id, actor.role === "owner");
}

export async function listUserCourses(
  userId: string,
  options: { limit?: number; cursor?: string | null } & CourseManagementDependencies = {}
): Promise<CoursePage> {
  const db = database(options);
  const limit = boundedLimit(options.limit);
  const rows = await db
    .select({
      id: secciones.id,
      assignmentName: asignaturas.nombre,
      assignmentCode: asignaturas.codigo,
      creditsSct: asignaturas.creditosSct,
      departmentId: asignaturas.departamentoId,
      periodId: periodos.id,
      periodName: periodos.nombre,
      sectionNumber: secciones.numeroSeccion,
      teacherId: secciones.docenteId,
      teacherName: users.name,
      role: matriculas.rolSeccion,
      title: sectionProfiles.title,
      description: sectionProfiles.description,
      modality: sectionProfiles.modality,
      room: sectionProfiles.room,
      tone: sectionProfiles.tone,
    })
    .from(matriculas)
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(asignaturas, eq(secciones.asignaturaId, asignaturas.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .innerJoin(users, eq(secciones.docenteId, users.id))
    .leftJoin(sectionProfiles, eq(sectionProfiles.seccionId, secciones.id))
    .where(
      and(
        eq(matriculas.usuarioId, userId),
        eq(matriculas.estado, "activa"),
        options.cursor ? gt(secciones.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(secciones.id))
    .limit(limit + 1);
  const paged = page(rows, limit, (row) => row.id);
  return {
    items: paged.items.map((row) => toCourse(row, userId)),
    nextCursor: paged.nextCursor,
  };
}

export async function listManagedCourses(
  actor: PublicUser,
  options: { limit?: number; cursor?: string | null } & CourseManagementDependencies = {}
): Promise<CoursePage> {
  requireTeacher(actor);
  const db = database(options);
  const limit = boundedLimit(options.limit);
  const rows = await db
    .select({
      id: secciones.id,
      assignmentName: asignaturas.nombre,
      assignmentCode: asignaturas.codigo,
      creditsSct: asignaturas.creditosSct,
      departmentId: asignaturas.departamentoId,
      periodId: periodos.id,
      periodName: periodos.nombre,
      sectionNumber: secciones.numeroSeccion,
      teacherId: secciones.docenteId,
      teacherName: users.name,
      title: sectionProfiles.title,
      description: sectionProfiles.description,
      modality: sectionProfiles.modality,
      room: sectionProfiles.room,
      tone: sectionProfiles.tone,
    })
    .from(secciones)
    .innerJoin(asignaturas, eq(secciones.asignaturaId, asignaturas.id))
    .innerJoin(periodos, eq(secciones.periodoId, periodos.id))
    .innerJoin(users, eq(secciones.docenteId, users.id))
    .leftJoin(sectionProfiles, eq(sectionProfiles.seccionId, secciones.id))
    .where(
      and(
        actor.role === "owner" ? undefined : eq(secciones.docenteId, actor.id),
        options.cursor ? gt(secciones.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(secciones.id))
    .limit(limit + 1);
  const paged = page(rows, limit, (row) => row.id);
  return {
    items: paged.items.map((row) =>
      toCourse({ ...row, role: "teacher" }, actor.id, actor.role === "owner")
    ),
    nextCursor: paged.nextCursor,
  };
}

export async function listTeacherCourseCatalog(
  actor: PublicUser,
  dependencies: CourseManagementDependencies = {}
): Promise<TeacherCourseCatalog> {
  requireTeacher(actor);
  const db = database(dependencies);
  const [departmentRows, periodRows] = await Promise.all([
    db
      .select({ id: departamentos.id, name: departamentos.nombre, faculty: facultades.nombre })
      .from(departamentos)
      .innerJoin(facultades, eq(departamentos.facultadId, facultades.id))
      .orderBy(asc(facultades.nombre), asc(departamentos.nombre))
      .limit(100),
    db
      .select({ id: periodos.id, name: periodos.nombre })
      .from(periodos)
      .where(eq(periodos.estado, "abierto"))
      .orderBy(desc(periodos.fechaInicio))
      .limit(20),
  ]);
  return {
    departments: departmentRows.map((row) => ({
      id: row.id,
      label: `${row.faculty} · ${row.name}`,
    })),
    periods: periodRows.map((row) => ({ id: row.id, label: row.name })),
  };
}

export async function createTeacherCourse(
  actor: PublicUser,
  value: unknown,
  dependencies: CourseManagementDependencies = {}
): Promise<ManagedCourse> {
  requireTeacher(actor);
  const input = normalizedCreate(value);
  const db = database(dependencies);
  const [departmentRows, periodRows, subjectRows] = await Promise.all([
    db
      .select({ id: departamentos.id })
      .from(departamentos)
      .where(eq(departamentos.id, input.departmentId))
      .limit(1),
    db
      .select({ id: periodos.id, name: periodos.nombre, status: periodos.estado })
      .from(periodos)
      .where(eq(periodos.id, input.periodId))
      .limit(1),
    db
      .select({ id: asignaturas.id, name: asignaturas.nombre, credits: asignaturas.creditosSct })
      .from(asignaturas)
      .where(eq(asignaturas.codigo, input.code))
      .limit(1),
  ]);
  if (!departmentRows[0]) {
    throw new CourseManagementError("NOT_FOUND", 404, "El departamento seleccionado no existe.");
  }
  const period = periodRows[0];
  if (!period || period.status !== "abierto") {
    throw new CourseManagementError(
      "INVALID_INPUT",
      400,
      "El período seleccionado no está abierto."
    );
  }
  const subject = subjectRows[0];
  const subjectId = subject?.id ?? `asig-${sectionIdFor(input.code, "catalogo", 1)}`;
  const sectionId = sectionIdFor(input.code, input.periodId, input.sectionNumber);
  const duplicate = await db
    .select({ id: secciones.id })
    .from(secciones)
    .where(
      and(
        eq(secciones.asignaturaId, subjectId),
        eq(secciones.periodoId, input.periodId),
        eq(secciones.numeroSeccion, input.sectionNumber)
      )
    )
    .limit(1);
  if (duplicate[0]) {
    throw new CourseManagementError(
      "CONFLICT",
      409,
      "Ese paralelo ya existe para el período seleccionado."
    );
  }
  const createdAt = nowIso(dependencies);
  try {
    const sectionInsert = db.insert(secciones).values({
      id: sectionId,
      asignaturaId: subjectId,
      periodoId: input.periodId,
      numeroSeccion: input.sectionNumber,
      docenteId: actor.id,
      createdAt,
    });
    const profileInsert = db.insert(sectionProfiles).values({
      seccionId: sectionId,
      title: input.name,
      description: input.summary,
      modality: input.modality,
      room: input.room,
      tone: input.tone,
      updatedAt: createdAt,
    });
    const enrollmentInsert = db.insert(matriculas).values({
      id: crypto.randomUUID(),
      seccionId: sectionId,
      usuarioId: actor.id,
      rolSeccion: "teacher",
      estado: "activa",
      createdAt,
    });
    if (subject) {
      await db.batch([sectionInsert, profileInsert, enrollmentInsert]);
    } else {
      await db.batch([
        db.insert(asignaturas).values({
          id: subjectId,
          codigo: input.code,
          nombre: input.name,
          creditosSct: input.creditsSct,
          departamentoId: input.departmentId,
        }),
        sectionInsert,
        profileInsert,
        enrollmentInsert,
      ]);
    }
  } catch (cause) {
    if (cause instanceof CourseManagementError) throw cause;
    throw new CourseManagementError(
      "CONFLICT",
      409,
      "No se pudo crear el ramo porque su sección ya existe."
    );
  }
  try {
    await projector(dependencies)(sectionId, actor.id, "teacher", "activa");
  } catch {
    await db.batch([db.delete(secciones).where(eq(secciones.id, sectionId))]);
    if (!subject) {
      const remaining = await db
        .select({ id: secciones.id })
        .from(secciones)
        .where(eq(secciones.asignaturaId, subjectId))
        .limit(1);
      if (!remaining[0]) await db.delete(asignaturas).where(eq(asignaturas.id, subjectId));
    }
    throw new CourseManagementError(
      "PROJECTION_UNAVAILABLE",
      503,
      "No se pudo habilitar el aula ahora. Intenta nuevamente en unos minutos."
    );
  }
  return courseById(sectionId, "teacher", actor, db);
}

export async function updateTeacherCourse(
  actor: PublicUser,
  sectionId: string,
  value: unknown,
  dependencies: CourseManagementDependencies = {}
): Promise<ManagedCourse> {
  const input = normalizedUpdate(value);
  const db = database(dependencies);
  await managedSection(actor, sectionId, db);
  const existingRows = await db
    .select({
      assignmentName: asignaturas.nombre,
      title: sectionProfiles.title,
      description: sectionProfiles.description,
      modality: sectionProfiles.modality,
      room: sectionProfiles.room,
      tone: sectionProfiles.tone,
    })
    .from(secciones)
    .innerJoin(asignaturas, eq(secciones.asignaturaId, asignaturas.id))
    .leftJoin(sectionProfiles, eq(sectionProfiles.seccionId, secciones.id))
    .where(eq(secciones.id, sectionId))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) throw new CourseManagementError("NOT_FOUND", 404, "El ramo no existe.");
  const values = {
    seccionId: sectionId,
    title: input.title ?? existing.title ?? existing.assignmentName,
    description: input.summary ?? existing.description ?? "",
    modality: input.modality ?? existing.modality ?? "presencial",
    room: input.room ?? existing.room ?? "",
    tone: input.tone ?? existing.tone ?? "sky",
    updatedAt: nowIso(dependencies),
  };
  await db
    .insert(sectionProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: sectionProfiles.seccionId,
      set: {
        title: values.title,
        description: values.description,
        modality: values.modality,
        room: values.room,
        tone: values.tone,
        updatedAt: values.updatedAt,
      },
    });
  return courseById(sectionId, "teacher", actor, db);
}

export async function listCourseAssistants(
  actor: PublicUser,
  sectionId: string,
  options: { limit?: number; cursor?: string | null } & CourseManagementDependencies = {}
): Promise<Page<CourseAssistant>> {
  const db = database(options);
  await managedSection(actor, sectionId, db);
  const limit = boundedLimit(options.limit);
  const rows = await db
    .select({ userId: users.id, name: users.name, email: users.email })
    .from(matriculas)
    .innerJoin(users, eq(matriculas.usuarioId, users.id))
    .where(
      and(
        eq(matriculas.seccionId, sectionId),
        eq(matriculas.rolSeccion, "assistant"),
        eq(matriculas.estado, "activa"),
        options.cursor ? gt(users.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(users.id))
    .limit(limit + 1);
  return page(rows, limit, (row) => row.userId);
}

export async function assignCourseAssistant(
  actor: PublicUser,
  sectionId: string,
  value: unknown,
  dependencies: CourseManagementDependencies = {}
): Promise<CourseAssistant> {
  const input = normalizedAssistant(value);
  const db = database(dependencies);
  await managedSection(actor, sectionId, db);
  const targetRows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  const target = targetRows[0];
  if (!target || target.role !== "student") {
    throw new CourseManagementError(
      "NOT_FOUND",
      404,
      "La cuenta estudiantil debe haber ingresado antes a CEOUBB."
    );
  }
  const [enrollmentRows, assignmentRows] = await Promise.all([
    db
      .select({
        id: matriculas.id,
        role: matriculas.rolSeccion,
        status: matriculas.estado,
        createdAt: matriculas.createdAt,
      })
      .from(matriculas)
      .where(and(eq(matriculas.seccionId, sectionId), eq(matriculas.usuarioId, target.id)))
      .limit(1),
    db
      .select()
      .from(assistantAssignments)
      .where(
        and(
          eq(assistantAssignments.seccionId, sectionId),
          eq(assistantAssignments.usuarioId, target.id)
        )
      )
      .limit(1),
  ]);
  const enrollment = enrollmentRows[0];
  if (assignmentRows[0] && enrollment?.role === "assistant" && enrollment.status === "activa") {
    return { userId: target.id, name: target.name, email: target.email };
  }
  const createdAt = nowIso(dependencies);
  const assignmentId = assignmentRows[0]?.id ?? crypto.randomUUID();
  const previousRole = enrollment && enrollment.role !== "assistant" ? enrollment.role : null;
  const previousStatus = enrollment ? enrollment.status : null;
  const assignmentWrite = db
    .insert(assistantAssignments)
    .values({
      id: assignmentId,
      seccionId: sectionId,
      usuarioId: target.id,
      previousRole,
      previousStatus,
      createdBy: actor.id,
      createdAt,
    })
    .onConflictDoUpdate({
      target: [assistantAssignments.seccionId, assistantAssignments.usuarioId],
      set: { previousRole, previousStatus, createdBy: actor.id, createdAt },
    });
  if (enrollment) {
    await db.batch([
      assignmentWrite,
      db
        .update(matriculas)
        .set({ rolSeccion: "assistant", estado: "activa" })
        .where(eq(matriculas.id, enrollment.id)),
    ]);
  } else {
    await db.batch([
      assignmentWrite,
      db.insert(matriculas).values({
        id: crypto.randomUUID(),
        seccionId: sectionId,
        usuarioId: target.id,
        rolSeccion: "assistant",
        estado: "activa",
        createdAt,
      }),
    ]);
  }
  try {
    await projector(dependencies)(sectionId, target.id, "assistant", "activa");
  } catch {
    if (enrollment) {
      await db.batch([
        db
          .update(matriculas)
          .set({ rolSeccion: enrollment.role, estado: enrollment.status })
          .where(eq(matriculas.id, enrollment.id)),
        db.delete(assistantAssignments).where(eq(assistantAssignments.id, assignmentId)),
      ]);
    } else {
      await db.batch([
        db
          .delete(matriculas)
          .where(and(eq(matriculas.seccionId, sectionId), eq(matriculas.usuarioId, target.id))),
        db.delete(assistantAssignments).where(eq(assistantAssignments.id, assignmentId)),
      ]);
    }
    throw new CourseManagementError(
      "PROJECTION_UNAVAILABLE",
      503,
      "No se pudo habilitar la ayudantía ahora. Intenta nuevamente."
    );
  }
  return { userId: target.id, name: target.name, email: target.email };
}

export async function removeCourseAssistant(
  actor: PublicUser,
  sectionId: string,
  userId: string,
  dependencies: CourseManagementDependencies = {}
): Promise<void> {
  const db = database(dependencies);
  await managedSection(actor, sectionId, db);
  if (!userId || userId.length > 1500 || /[/\s]/.test(userId)) {
    throw new CourseManagementError("NOT_FOUND", 404, "La ayudantía no existe.");
  }
  const [assignmentRows, enrollmentRows] = await Promise.all([
    db
      .select()
      .from(assistantAssignments)
      .where(
        and(
          eq(assistantAssignments.seccionId, sectionId),
          eq(assistantAssignments.usuarioId, userId)
        )
      )
      .limit(1),
    db
      .select({ id: matriculas.id, createdAt: matriculas.createdAt })
      .from(matriculas)
      .where(and(eq(matriculas.seccionId, sectionId), eq(matriculas.usuarioId, userId)))
      .limit(1),
  ]);
  const assignment = assignmentRows[0];
  const enrollment = enrollmentRows[0];
  if (!assignment || !enrollment) {
    throw new CourseManagementError("NOT_FOUND", 404, "La ayudantía no existe.");
  }
  const nextRole = assignment.previousRole ?? "student";
  const nextStatus = assignment.previousStatus ?? "retirada";
  if (assignment.previousRole && assignment.previousStatus) {
    await db.batch([
      db.delete(assistantAssignments).where(eq(assistantAssignments.id, assignment.id)),
      db
        .update(matriculas)
        .set({ rolSeccion: assignment.previousRole, estado: assignment.previousStatus })
        .where(eq(matriculas.id, enrollment.id)),
    ]);
  } else {
    await db.batch([
      db.delete(assistantAssignments).where(eq(assistantAssignments.id, assignment.id)),
      db.delete(matriculas).where(eq(matriculas.id, enrollment.id)),
    ]);
  }
  try {
    await projector(dependencies)(sectionId, userId, nextRole, nextStatus);
  } catch {
    if (assignment.previousRole && assignment.previousStatus) {
      await db.batch([
        db.insert(assistantAssignments).values(assignment),
        db
          .update(matriculas)
          .set({ rolSeccion: "assistant", estado: "activa" })
          .where(eq(matriculas.id, enrollment.id)),
      ]);
    } else {
      await db.batch([
        db.insert(assistantAssignments).values(assignment),
        db.insert(matriculas).values({
          id: enrollment.id,
          seccionId: sectionId,
          usuarioId: userId,
          rolSeccion: "assistant",
          estado: "activa",
          createdAt: enrollment.createdAt,
        }),
      ]);
    }
    throw new CourseManagementError(
      "PROJECTION_UNAVAILABLE",
      503,
      "No se pudo retirar la ayudantía ahora. Intenta nuevamente."
    );
  }
}
