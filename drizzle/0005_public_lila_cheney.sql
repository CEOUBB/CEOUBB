CREATE TABLE `assistant_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`user_id` text NOT NULL,
	`previous_role` text,
	`previous_status` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assistant_section_user` ON `assistant_assignments` (`section_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_assistant_section` ON `assistant_assignments` (`section_id`);--> statement-breakpoint
CREATE TABLE `section_profiles` (
	`section_id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`modality` text DEFAULT 'presencial' NOT NULL,
	`room` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'sky' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT OR IGNORE INTO `facultades` (`id`, `nombre`, `sede`) VALUES ('fac-ceoubb-general', 'Facultad por definir', 'Concepcion');--> statement-breakpoint
INSERT OR IGNORE INTO `departamentos` (`id`, `facultad_id`, `nombre`) VALUES ('dep-ceoubb-general', 'fac-ceoubb-general', 'Docencia general CEOUBB');--> statement-breakpoint
INSERT OR IGNORE INTO `periodos` (`id`, `nombre`, `fecha_inicio`, `fecha_fin`, `estado`) VALUES ('2026-2', 'Segundo semestre 2026', '2026-08-03', '2026-12-31', 'abierto');
