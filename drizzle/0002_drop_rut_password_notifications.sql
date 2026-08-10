DROP TABLE `files`;--> statement-breakpoint
DROP TABLE `notification_reads`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
DROP TABLE `progress`;--> statement-breakpoint
DROP INDEX `idx_users_rut`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `rut`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_salt`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_hash`;