--> Purga de tablas residuales anteriores al modelo académico por sección.
--> La migración 0002 ya las eliminaba, pero la base de producción se
--> reconcilió a mano y nunca registró aquella entrada, de modo que `files`,
--> `posts`, `progress`, `notifications` y `notification_reads` sobrevivieron
--> vacías fuera de `db/schema.ts`. `IF EXISTS` deja la sentencia inofensiva en
--> los entornos que sí aplicaron 0002.
DROP TABLE IF EXISTS `notification_reads`;--> statement-breakpoint
DROP TABLE IF EXISTS `notifications`;--> statement-breakpoint
DROP TABLE IF EXISTS `progress`;--> statement-breakpoint
DROP TABLE IF EXISTS `posts`;--> statement-breakpoint
DROP TABLE IF EXISTS `files`;
