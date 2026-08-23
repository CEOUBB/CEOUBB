CREATE TABLE `moodle_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`actor_id` text NOT NULL,
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
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_moodle_imports_section_fingerprint` ON `moodle_imports` (`seccion_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_moodle_imports_section_updated` ON `moodle_imports` (`seccion_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `pending_matriculas` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`email` text NOT NULL,
	`rol_seccion` text DEFAULT 'student' NOT NULL,
	`source_import_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_import_id`) REFERENCES `moodle_imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pending_matriculas_section_email` ON `pending_matriculas` (`seccion_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_pending_matriculas_email` ON `pending_matriculas` (`email`);--> statement-breakpoint
CREATE INDEX `idx_pending_matriculas_expiry` ON `pending_matriculas` (`expires_at`);