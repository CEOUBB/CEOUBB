CREATE TABLE `interop_grants` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`registration` text NOT NULL,
	`user_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`kind` text NOT NULL,
	`session_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`write_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `interop_resources`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `interop_grants_registration_unique` ON `interop_grants` (`registration`);
--> statement-breakpoint
CREATE INDEX `idx_interop_grants_user` ON `interop_grants` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE INDEX `idx_interop_grants_expiry` ON `interop_grants` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `interop_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `interop_resources`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interop_progress_resource_user` ON `interop_progress` (`resource_id`,`user_id`);
--> statement-breakpoint
CREATE TABLE `interop_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`tool_id` text,
	`target_url` text DEFAULT '' NOT NULL,
	`manifest_json` text DEFAULT '{}' NOT NULL,
	`storage_prefix` text DEFAULT '' NOT NULL,
	`fingerprint` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `secciones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_id`) REFERENCES `interop_tools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE INDEX `idx_interop_resources_section` ON `interop_resources` (`section_id`,`id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interop_resources_fingerprint` ON `interop_resources` (`section_id`,`fingerprint`);
--> statement-breakpoint
CREATE TABLE `interop_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`registration` text NOT NULL,
	`input_json` text NOT NULL,
	`statement_json` text NOT NULL,
	`stored_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `interop_resources`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_interop_statements_resource_user` ON `interop_statements` (`resource_id`,`user_id`,`stored_at`);
--> statement-breakpoint
CREATE TABLE `interop_tools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client_id` text NOT NULL,
	`deployment_id` text NOT NULL,
	`login_url` text NOT NULL,
	`redirect_uris_json` text NOT NULL,
	`target_uris_json` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE UNIQUE INDEX `interop_tools_client_id_unique` ON `interop_tools` (`client_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `interop_tools_deployment_id_unique` ON `interop_tools` (`deployment_id`);
