CREATE TABLE `matriculas_pendientes` (
	`id` text PRIMARY KEY NOT NULL,
	`seccion_id` text NOT NULL,
	`email` text NOT NULL,
	`nombre` text NOT NULL,
	`imported_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_matriculas_pendientes_seccion_email` ON `matriculas_pendientes` (`seccion_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_matriculas_pendientes_email` ON `matriculas_pendientes` (`email`);