import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { secciones, users } from "./schema.ts";

export const interopTools = sqliteTable("interop_tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientId: text("client_id").notNull().unique(),
  deploymentId: text("deployment_id").notNull().unique(),
  loginUrl: text("login_url").notNull(),
  redirectUrisJson: text("redirect_uris_json").notNull(),
  targetUrisJson: text("target_uris_json").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

export const interopResources = sqliteTable(
  "interop_resources",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => secciones.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["lti", "scorm12", "scorm2004", "xapi"] }).notNull(),
    toolId: text("tool_id").references(() => interopTools.id),
    targetUrl: text("target_url").notNull().default(""),
    manifestJson: text("manifest_json").notNull().default("{}"),
    storagePrefix: text("storage_prefix").notNull().default(""),
    fingerprint: text("fingerprint").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_interop_resources_section").on(t.sectionId, t.id),
    uniqueIndex("idx_interop_resources_fingerprint").on(t.sectionId, t.fingerprint),
  ]
);

export const interopGrants = sqliteTable(
  "interop_grants",
  {
    tokenHash: text("token_hash").primaryKey(),
    registration: text("registration").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => interopResources.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["lti", "content"] }).notNull(),
    sessionHash: text("session_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    writeCount: integer("write_count").notNull().default(0),
  },
  (t) => [
    index("idx_interop_grants_user").on(t.userId, t.expiresAt),
    index("idx_interop_grants_expiry").on(t.expiresAt),
  ]
);

export const interopProgress = sqliteTable(
  "interop_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => interopResources.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(0),
    dataJson: text("data_json").notNull().default("{}"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_interop_progress_resource_user").on(t.resourceId, t.userId)]
);

export const interopStatements = sqliteTable(
  "interop_statements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => interopResources.id, { onDelete: "cascade" }),
    registration: text("registration").notNull(),
    inputJson: text("input_json").notNull(),
    statementJson: text("statement_json").notNull(),
    storedAt: text("stored_at").notNull(),
  },
  (t) => [index("idx_interop_statements_resource_user").on(t.resourceId, t.userId, t.storedAt)]
);
