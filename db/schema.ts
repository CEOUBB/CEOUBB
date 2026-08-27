import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["owner", "teacher", "student"] }).notNull(),
    /*
      Foto propia subida desde Configuración. Es anulable porque ese es el
      estado de toda cuenta existente: con `NULL` el avatar cae a la foto de
      Google y, si tampoco resuelve, a las iniciales.
    */
    // Implements: REQ-CFG-02
    photoUrl: text("photo_url"),
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

export const sectionProfiles = sqliteTable("section_profiles", {
  seccionId: text("section_id")
    .primaryKey()
    .references(() => secciones.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  modality: text("modality", { enum: ["presencial", "hibrida", "remota"] })
    .notNull()
    .default("presencial"),
  room: text("room").notNull().default(""),
  tone: text("tone", { enum: ["sky", "emerald", "gold", "red", "teal", "purple"] })
    .notNull()
    .default("sky"),
  updatedAt: text("updated_at").notNull(),
});

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
    index("idx_matriculas_usuario_estado").on(table.usuarioId, table.estado),
    index("idx_matriculas_seccion_estado").on(table.seccionId, table.estado),
  ]
);

export const assistantAssignments = sqliteTable(
  "assistant_assignments",
  {
    id: text("id").primaryKey(),
    seccionId: text("section_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    usuarioId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    previousRole: text("previous_role", {
      enum: ["teacher", "student", "coordinator"],
    }),
    previousStatus: text("previous_status", {
      enum: ["activa", "retirada", "congelada"],
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_assistant_section_user").on(table.seccionId, table.usuarioId),
    index("idx_assistant_section").on(table.seccionId),
  ]
);

export const matriculasPendientes = sqliteTable(
  "matriculas_pendientes",
  {
    id: text("id").primaryKey(),
    seccionId: text("seccion_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    nombre: text("nombre").notNull(),
    importedBy: text("imported_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_matriculas_pendientes_seccion_email").on(table.seccionId, table.email),
    index("idx_matriculas_pendientes_email").on(table.email),
  ]
);

// Implements: REQ-MOODLE-05, REQ-MOODLE-08
export const moodleImports = sqliteTable(
  "moodle_imports",
  {
    id: text("id").primaryKey(),
    seccionId: text("seccion_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    status: text("status", { enum: ["running", "completed", "partial"] })
      .notNull()
      .default("running"),
    sourceCourseId: text("source_course_id").notNull().default(""),
    sourceCourseName: text("source_course_name").notNull().default(""),
    sourceMoodleVersion: text("source_moodle_version").notNull().default(""),
    sourceFileName: text("source_file_name").notNull(),
    contentCount: integer("content_count").notNull().default(0),
    fileCount: integer("file_count").notNull().default(0),
    participantCount: integer("participant_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    reportJson: text("report_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_moodle_imports_section_fingerprint").on(table.seccionId, table.fingerprint),
    index("idx_moodle_imports_section_updated").on(table.seccionId, table.updatedAt),
  ]
);

// Implements: REQ-MOODLE-06
export const pendingMatriculas = sqliteTable(
  "pending_matriculas",
  {
    id: text("id").primaryKey(),
    seccionId: text("seccion_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    rolSeccion: text("rol_seccion", { enum: ["student"] })
      .notNull()
      .default("student"),
    sourceImportId: text("source_import_id")
      .notNull()
      .references(() => moodleImports.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_pending_matriculas_section_email").on(table.seccionId, table.email),
    index("idx_pending_matriculas_email").on(table.email),
    index("idx_pending_matriculas_expiry").on(table.expiresAt),
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

/*
  Implements: REQ-SUP-05, REQ-SUP-07, REQ-SUP-10
  Solicitudes recibidas por el formulario público de /contacto. La fila se
  escribe antes de intentar la entrega, así que una caída del proveedor de
  correo degrada a ticket en cola y no a mensaje perdido.

  `ipHash` guarda SHA-256 de la dirección con un pepper del servidor. La
  dirección cruda nunca se persiste: sirve para contar envíos por origen, no
  para reconstruir quién escribió desde dónde.

  `userId` solo se completa cuando la petición trae sesión válida. El endpoint
  es público a propósito: quien no puede entrar es justamente quien más
  necesita escribir.
*/
export const solicitudesSoporte = sqliteTable(
  "solicitudes_soporte",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    email: text("email").notNull(),
    rolDeclarado: text("rol_declarado", { enum: ["owner", "teacher", "student"] }),
    categoria: text("categoria", {
      enum: ["soporte-tecnico", "sugerencia", "reporte-error", "duda-academica"],
    }).notNull(),
    asunto: text("asunto").notNull(),
    mensaje: text("mensaje").notNull(),
    estado: text("estado", { enum: ["pendiente", "enviado", "fallido"] }).notNull(),
    errorEntrega: text("error_entrega"),
    ipHash: text("ip_hash").notNull(),
    userId: text("user_id").references(() => users.id),
    createdAt: text("created_at").notNull(),
    enviadoEn: text("enviado_en"),
  },
  (table) => [
    index("idx_soporte_ip_created").on(table.ipHash, table.createdAt),
    index("idx_soporte_estado_created").on(table.estado, table.createdAt),
  ]
);
