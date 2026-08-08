CREATE TABLE `notification_reads` (
	`user_id` text PRIMARY KEY NOT NULL,
	`read_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`target_url` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_course_created` ON `notifications` (`course_id`,`created_at`);--> statement-breakpoint
DROP INDEX `idx_users_rut`;--> statement-breakpoint
CREATE INDEX `idx_users_rut` ON `users` (`rut`);