CREATE TABLE `asignaturas` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`creditos_sct` integer DEFAULT 0 NOT NULL,
	`departamento_id` text NOT NULL,
	FOREIGN KEY (`departamento_id`) REFERENCES `departamentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_asignaturas_codigo` ON `asignaturas` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_asignaturas_departamento` ON `asignaturas` (`departamento_id`);--> statement-breakpoint
CREATE TABLE `carreras` (
	`id` text PRIMARY KEY NOT NULL,
	`departamento_id` text NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	FOREIGN KEY (`departamento_id`) REFERENCES `departamentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_carreras_codigo` ON `carreras` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_carreras_departamento` ON `carreras` (`departamento_id`);--> statement-breakpoint
CREATE TABLE `departamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`facultad_id` text NOT NULL,
	`nombre` text NOT NULL,
	FOREIGN KEY (`facultad_id`) REFERENCES `facultades`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_departamentos_facultad` ON `departamentos` (`facultad_id`);--> statement-breakpoint
CREATE TABLE `facultades` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`sede` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grade_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`evaluacion_id` text NOT NULL,
	`student_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`prev_score` real,
	`new_score` real NOT NULL,
	`timestamp` text NOT NULL,
	`ip_address` text,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_grade_audit_seccion_student` ON `grade_audit_logs` (`seccion_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_grade_audit_timestamp` ON `grade_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `matriculas` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`rol_seccion` text NOT NULL,
	`estado` text DEFAULT 'activa' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_matriculas_seccion_usuario` ON `matriculas` (`seccion_id`,`usuario_id`);--> statement-breakpoint
CREATE INDEX `idx_matriculas_usuario` ON `matriculas` (`usuario_id`);--> statement-breakpoint
CREATE INDEX `idx_matriculas_seccion_estado` ON `matriculas` (`seccion_id`,`estado`);--> statement-breakpoint
CREATE TABLE `periodos` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text NOT NULL,
	`estado` text DEFAULT 'abierto' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `secciones` (
	`id` text PRIMARY KEY NOT NULL,
	`asignatura_id` text NOT NULL,
	`periodo_id` text NOT NULL,
	`numero_seccion` integer DEFAULT 1 NOT NULL,
	`docente_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`periodo_id`) REFERENCES `periodos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`docente_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_seccion_asignatura_periodo_num` ON `secciones` (`asignatura_id`,`periodo_id`,`numero_seccion`);--> statement-breakpoint
CREATE INDEX `idx_secciones_periodo` ON `secciones` (`periodo_id`);--> statement-breakpoint
CREATE INDEX `idx_secciones_docente` ON `secciones` (`docente_id`);