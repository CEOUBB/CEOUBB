PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assistant_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`user_id` text NOT NULL,
	`previous_role` text,
	`previous_status` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_assistant_assignments`("id", "section_id", "user_id", "previous_role", "previous_status", "created_by", "created_at") SELECT "id", "section_id", "user_id", "previous_role", "previous_status", "created_by", "created_at" FROM `assistant_assignments`;--> statement-breakpoint
DROP TABLE `assistant_assignments`;--> statement-breakpoint
ALTER TABLE `__new_assistant_assignments` RENAME TO `assistant_assignments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assistant_section_user` ON `assistant_assignments` (`section_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_section` ON `assistant_assignments` (`section_id`);--> statement-breakpoint
CREATE TABLE `__new_grade_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`evaluacion_id` text NOT NULL,
	`student_id` text NOT NULL,
	`actor_id` text,
	`prev_score` real,
	`new_score` real NOT NULL,
	`timestamp` text NOT NULL,
	`ip_address` text,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_grade_audit_logs`("id", "seccion_id", "evaluacion_id", "student_id", "actor_id", "prev_score", "new_score", "timestamp", "ip_address") SELECT "id", "seccion_id", "evaluacion_id", "student_id", "actor_id", "prev_score", "new_score", "timestamp", "ip_address" FROM `grade_audit_logs`;--> statement-breakpoint
DROP TABLE `grade_audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_grade_audit_logs` RENAME TO `grade_audit_logs`;--> statement-breakpoint
CREATE INDEX `idx_grade_audit_seccion_student` ON `grade_audit_logs` (`seccion_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_grade_audit_timestamp` ON `grade_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `__new_interop_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`tool_id` text,
	`target_url` text DEFAULT '' NOT NULL,
	`manifest_json` text DEFAULT '{}' NOT NULL,
	`storage_prefix` text DEFAULT '' NOT NULL,
	`fingerprint` text NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_id`) REFERENCES `interop_tools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_interop_resources`("id", "section_id", "title", "kind", "tool_id", "target_url", "manifest_json", "storage_prefix", "fingerprint", "created_by", "created_at") SELECT "id", "section_id", "title", "kind", "tool_id", "target_url", "manifest_json", "storage_prefix", "fingerprint", "created_by", "created_at" FROM `interop_resources`;--> statement-breakpoint
DROP TABLE `interop_resources`;--> statement-breakpoint
ALTER TABLE `__new_interop_resources` RENAME TO `interop_resources`;--> statement-breakpoint
CREATE INDEX `idx_interop_resources_section` ON `interop_resources` (`section_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interop_resources_fingerprint` ON `interop_resources` (`section_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `__new_interop_tools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client_id` text NOT NULL,
	`deployment_id` text NOT NULL,
	`login_url` text NOT NULL,
	`redirect_uris_json` text NOT NULL,
	`target_uris_json` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_interop_tools`("id", "name", "client_id", "deployment_id", "login_url", "redirect_uris_json", "target_uris_json", "enabled", "created_by", "created_at") SELECT "id", "name", "client_id", "deployment_id", "login_url", "redirect_uris_json", "target_uris_json", "enabled", "created_by", "created_at" FROM `interop_tools`;--> statement-breakpoint
DROP TABLE `interop_tools`;--> statement-breakpoint
ALTER TABLE `__new_interop_tools` RENAME TO `interop_tools`;--> statement-breakpoint
CREATE UNIQUE INDEX `interop_tools_client_id_unique` ON `interop_tools` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `interop_tools_deployment_id_unique` ON `interop_tools` (`deployment_id`);--> statement-breakpoint
CREATE TABLE `__new_moodle_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`actor_id` text,
	`status` text DEFAULT 'running' NOT NULL,
	`source_course_id` text DEFAULT '' NOT NULL,
	`source_course_name` text DEFAULT '' NOT NULL,
	`source_moodle_version` text DEFAULT '' NOT NULL,
	`source_file_name` text NOT NULL,
	`content_count` integer DEFAULT 0 NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`report_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_moodle_imports`("id", "seccion_id", "fingerprint", "actor_id", "status", "source_course_id", "source_course_name", "source_moodle_version", "source_file_name", "content_count", "file_count", "participant_count", "warning_count", "report_json", "created_at", "updated_at") SELECT "id", "seccion_id", "fingerprint", "actor_id", "status", "source_course_id", "source_course_name", "source_moodle_version", "source_file_name", "content_count", "file_count", "participant_count", "warning_count", "report_json", "created_at", "updated_at" FROM `moodle_imports`;--> statement-breakpoint
DROP TABLE `moodle_imports`;--> statement-breakpoint
ALTER TABLE `__new_moodle_imports` RENAME TO `moodle_imports`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_moodle_imports_section_fingerprint` ON `moodle_imports` (`seccion_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_moodle_imports_section_updated` ON `moodle_imports` (`seccion_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_solicitudes_soporte` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`email` text NOT NULL,
	`rol_declarado` text,
	`categoria` text NOT NULL,
	`asunto` text NOT NULL,
	`mensaje` text NOT NULL,
	`estado` text NOT NULL,
	`error_entrega` text,
	`ip_hash` text NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`enviado_en` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_solicitudes_soporte`("id", "nombre", "email", "rol_declarado", "categoria", "asunto", "mensaje", "estado", "error_entrega", "ip_hash", "user_id", "created_at", "enviado_en") SELECT "id", "nombre", "email", "rol_declarado", "categoria", "asunto", "mensaje", "estado", "error_entrega", "ip_hash", "user_id", "created_at", "enviado_en" FROM `solicitudes_soporte`;--> statement-breakpoint
DROP TABLE `solicitudes_soporte`;--> statement-breakpoint
ALTER TABLE `__new_solicitudes_soporte` RENAME TO `solicitudes_soporte`;--> statement-breakpoint
CREATE INDEX `idx_soporte_ip_created` ON `solicitudes_soporte` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_soporte_estado_created` ON `solicitudes_soporte` (`estado`,`created_at`);