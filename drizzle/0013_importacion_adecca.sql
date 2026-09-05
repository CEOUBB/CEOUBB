CREATE TABLE `adecca_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`source_key` text NOT NULL,
	`actor_id` text,
	`status` text DEFAULT 'running' NOT NULL,
	`source_course_id` text DEFAULT '' NOT NULL,
	`source_course_name` text DEFAULT '' NOT NULL,
	`source_adecca_version` text DEFAULT '' NOT NULL,
	`source_format` text NOT NULL,
	`source_file_name` text NOT NULL,
	`run_token` text DEFAULT '' NOT NULL,
	`operation_token` text,
	`operation_started_at` text,
	`planned_content_count` integer DEFAULT 0 NOT NULL,
	`planned_file_count` integer DEFAULT 0 NOT NULL,
	`planned_participant_count` integer DEFAULT 0 NOT NULL,
	`content_count` integer DEFAULT 0 NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`participant_matched_count` integer DEFAULT 0 NOT NULL,
	`participant_pending_count` integer DEFAULT 0 NOT NULL,
	`participant_skipped_count` integer DEFAULT 0 NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`report_json` text DEFAULT '{}' NOT NULL,
	`finished_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_adecca_imports_section_fingerprint` ON `adecca_imports` (`seccion_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_adecca_imports_section_updated` ON `adecca_imports` (`seccion_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `adecca_import_run_items` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`run_token` text NOT NULL,
	`item_hash` text NOT NULL,
	`outcome` text NOT NULL,
	`applied_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `adecca_imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_adecca_run_items_run_item` ON `adecca_import_run_items` (`import_id`,`run_token`,`item_hash`);--> statement-breakpoint
CREATE INDEX `idx_adecca_run_items_run_outcome` ON `adecca_import_run_items` (`import_id`,`run_token`,`outcome`,`applied_at`);--> statement-breakpoint
CREATE TABLE `pending_adecca_matriculas` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`email` text NOT NULL,
	`rol_seccion` text DEFAULT 'student' NOT NULL,
	`source_import_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_import_id`) REFERENCES `adecca_imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pending_adecca_matriculas_section_email` ON `pending_adecca_matriculas` (`seccion_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_pending_adecca_matriculas_email` ON `pending_adecca_matriculas` (`email`);--> statement-breakpoint
CREATE INDEX `idx_pending_adecca_matriculas_expiry` ON `pending_adecca_matriculas` (`expires_at`);
