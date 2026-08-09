import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  rut: text("rut").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "teacher", "student"] }).notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_users_rut").on(table.rut),
  uniqueIndex("idx_users_email").on(table.email),
]);

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  actorId: text("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["notice", "file"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetUrl: text("target_url").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_notifications_course_created").on(table.courseId, table.createdAt)]);

export const notificationReads = sqliteTable("notification_reads", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  readAt: text("read_at").notNull(),
});
