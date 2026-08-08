import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind", { enum: ["notice", "guide", "assessment", "resource"] }).notNull(),
  linkUrl: text("link_url"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_posts_id_course").on(table.id, table.courseId),
]);

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: text("created_at").notNull(),
});

export const progress = sqliteTable("progress", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  completed: integer("completed").notNull().default(0),
  total: integer("total").notNull().default(4),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.courseId] })]);

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
