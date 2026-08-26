CREATE TABLE `solicitudes_soporte` (
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_soporte_ip_created` ON `solicitudes_soporte` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_soporte_estado_created` ON `solicitudes_soporte` (`estado`,`created_at`);
