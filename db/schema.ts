import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["owner", "teacher", "student"] }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("idx_users_email").on(table.email)]
);

// Implements: REQ-PERF-01
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_sessions_user_id").on(table.userId)]
);

/*
  Estructura académica institucional. Turso es el sistema de registro: una
  sección es la identidad real de un "curso" (asignatura x periodo x número), y
  Firestore sólo recibe la proyección de matrícula que consumen las reglas.
*/
// Implements: REQ-ACAD-01, REQ-AUDIT-01
export const facultades = sqliteTable("facultades", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  sede: text("sede", { enum: ["Concepcion", "Chillan"] }).notNull(),
});

// Implements: REQ-ACAD-01
export const departamentos = sqliteTable(
  "departamentos",
  {
    id: text("id").primaryKey(),
    facultadId: text("facultad_id")
      .notNull()
      .references(() => facultades.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
  },
  (table) => [index("idx_departamentos_facultad").on(table.facultadId)]
);

// Implements: REQ-ACAD-01
export const carreras = sqliteTable(
  "carreras",
  {
    id: text("id").primaryKey(),
    departamentoId: text("departamento_id")
      .notNull()
      .references(() => departamentos.id, { onDelete: "cascade" }),
    codigo: text("codigo").notNull(),
    nombre: text("nombre").notNull(),
  },
  (table) => [
    uniqueIndex("idx_carreras_codigo").on(table.codigo),
    index("idx_carreras_departamento").on(table.departamentoId),
  ]
);

// Implements: REQ-ACAD-01
export const asignaturas = sqliteTable(
  "asignaturas",
  {
    id: text("id").primaryKey(),
    codigo: text("codigo").notNull(),
    nombre: text("nombre").notNull(),
    creditosSct: integer("creditos_sct").notNull().default(0),
    departamentoId: text("departamento_id")
      .notNull()
      .references(() => departamentos.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_asignaturas_codigo").on(table.codigo),
    index("idx_asignaturas_departamento").on(table.departamentoId),
  ]
);

// Implements: REQ-ACAD-01
export const periodos = sqliteTable("periodos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin").notNull(),
  estado: text("estado", { enum: ["abierto", "cerrado", "archivado"] })
    .notNull()
    .default("abierto"),
});

// Implements: REQ-ACAD-01
export const secciones = sqliteTable(
  "secciones",
  {
    id: text("id").primaryKey(),
    asignaturaId: text("asignatura_id")
      .notNull()
      .references(() => asignaturas.id, { onDelete: "cascade" }),
    periodoId: text("periodo_id")
      .notNull()
      .references(() => periodos.id, { onDelete: "cascade" }),
    numeroSeccion: integer("numero_seccion").notNull().default(1),
    docenteId: text("docente_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_seccion_asignatura_periodo_num").on(
      table.asignaturaId,
      table.periodoId,
      table.numeroSeccion
    ),
    index("idx_secciones_periodo").on(table.periodoId),
    index("idx_secciones_docente").on(table.docenteId),
  ]
);

// Implements: REQ-ACAD-01, REQ-ACAD-02
export const matriculas = sqliteTable(
  "matriculas",
  {
    id: text("id").primaryKey(),
    seccionId: text("seccion_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rolSeccion: text("rol_seccion", {
      enum: ["teacher", "student", "assistant", "coordinator"],
    }).notNull(),
    estado: text("estado", { enum: ["activa", "retirada", "congelada"] })
      .notNull()
      .default("activa"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_matriculas_seccion_usuario").on(table.seccionId, table.usuarioId),
    index("idx_matriculas_usuario").on(table.usuarioId),
    index("idx_matriculas_seccion_estado").on(table.seccionId, table.estado),
  ]
);

/*
  Bitácora inmutable de notas: sólo se inserta. Cada corrección de una nota
  oficial deja el valor previo, el actor y la IP para auditoría institucional.
*/
// Implements: REQ-AUDIT-01
export const gradeAuditLogs = sqliteTable(
  "grade_audit_logs",
  {
    id: text("id").primaryKey(),
    seccionId: text("seccion_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    evaluacionId: text("evaluacion_id").notNull(),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    prevScore: real("prev_score"),
    newScore: real("new_score").notNull(),
    timestamp: text("timestamp").notNull(),
    ipAddress: text("ip_address"),
  },
  (table) => [
    index("idx_grade_audit_seccion_student").on(table.seccionId, table.studentId),
    index("idx_grade_audit_timestamp").on(table.timestamp),
  ]
);
