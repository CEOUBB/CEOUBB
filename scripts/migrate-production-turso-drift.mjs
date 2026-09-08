import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
  console.error("Faltan variables TURSO_DATABASE_URL o TURSO_AUTH_TOKEN.");
  process.exit(1);
}

const client = createClient({ url: databaseUrl, authToken });

async function main() {
  console.log("[Turso Drift] Iniciando reconciliacion de esquema en:", databaseUrl);

  const statements = [
    // 1. section_profiles
    `CREATE TABLE IF NOT EXISTS section_profiles (
      section_id text PRIMARY KEY NOT NULL REFERENCES secciones(id) ON DELETE cascade,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      modality text NOT NULL DEFAULT 'presencial',
      room text NOT NULL DEFAULT '',
      tone text NOT NULL DEFAULT 'sky',
      updated_at text NOT NULL
    );`,

    // 2. assistant_assignments
    `CREATE TABLE IF NOT EXISTS assistant_assignments (
      id text PRIMARY KEY NOT NULL,
      section_id text NOT NULL REFERENCES secciones(id) ON DELETE cascade,
      user_id text NOT NULL REFERENCES users(id) ON DELETE cascade,
      previous_role text,
      previous_status text,
      created_by text REFERENCES users(id) ON DELETE set null,
      created_at text NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_section_user ON assistant_assignments (section_id, user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_assistant_section ON assistant_assignments (section_id);`,

    // 3. matriculas_pendientes
    `CREATE TABLE IF NOT EXISTS matriculas_pendientes (
      id text PRIMARY KEY NOT NULL,
      seccion_id text NOT NULL REFERENCES secciones(id) ON DELETE cascade,
      email text NOT NULL,
      nombre text NOT NULL,
      imported_by text REFERENCES users(id) ON DELETE set null,
      created_at text NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_matriculas_pendientes_seccion_email ON matriculas_pendientes (seccion_id, email);`,
    `CREATE INDEX IF NOT EXISTS idx_matriculas_pendientes_email ON matriculas_pendientes (email);`,

    // 5. moodle_imports
    `CREATE TABLE IF NOT EXISTS moodle_imports (
      id text PRIMARY KEY NOT NULL,
      seccion_id text NOT NULL REFERENCES secciones(id) ON DELETE cascade,
      fingerprint text NOT NULL,
      actor_id text REFERENCES users(id) ON DELETE set null,
      status text DEFAULT 'running' NOT NULL,
      source_course_id text DEFAULT '' NOT NULL,
      source_course_name text DEFAULT '' NOT NULL,
      source_moodle_version text DEFAULT '' NOT NULL,
      source_file_name text NOT NULL,
      content_count integer DEFAULT 0 NOT NULL,
      file_count integer DEFAULT 0 NOT NULL,
      participant_count integer DEFAULT 0 NOT NULL,
      warning_count integer DEFAULT 0 NOT NULL,
      report_json text DEFAULT '{}' NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_moodle_imports_section_fingerprint ON moodle_imports (seccion_id, fingerprint);`,
    `CREATE INDEX IF NOT EXISTS idx_moodle_imports_section_updated ON moodle_imports (seccion_id, updated_at);`,

    // 6. adecca_imports & pending_adecca_matriculas
    `CREATE TABLE IF NOT EXISTS adecca_imports (
      id text PRIMARY KEY NOT NULL,
      seccion_id text NOT NULL REFERENCES secciones(id) ON DELETE cascade,
      fingerprint text NOT NULL,
      source_key text NOT NULL,
      actor_id text REFERENCES users(id) ON DELETE set null,
      status text DEFAULT 'running' NOT NULL,
      source_course_id text DEFAULT '' NOT NULL,
      source_course_name text DEFAULT '' NOT NULL,
      source_adecca_version text DEFAULT '' NOT NULL,
      source_format text NOT NULL,
      source_file_name text NOT NULL,
      run_token text DEFAULT '' NOT NULL,
      operation_token text,
      operation_started_at text,
      planned_content_count integer DEFAULT 0 NOT NULL,
      planned_file_count integer DEFAULT 0 NOT NULL,
      planned_participant_count integer DEFAULT 0 NOT NULL,
      content_count integer DEFAULT 0 NOT NULL,
      file_count integer DEFAULT 0 NOT NULL,
      participant_count integer DEFAULT 0 NOT NULL,
      participant_matched_count integer DEFAULT 0 NOT NULL,
      participant_pending_count integer DEFAULT 0 NOT NULL,
      participant_skipped_count integer DEFAULT 0 NOT NULL,
      warning_count integer DEFAULT 0 NOT NULL,
      report_json text DEFAULT '{}' NOT NULL,
      finished_at text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_adecca_imports_section_fingerprint ON adecca_imports (seccion_id, fingerprint);`,
    `CREATE INDEX IF NOT EXISTS idx_adecca_imports_section_updated ON adecca_imports (seccion_id, updated_at);`,

    `CREATE TABLE IF NOT EXISTS adecca_import_run_items (
      id text PRIMARY KEY NOT NULL,
      import_id text NOT NULL REFERENCES adecca_imports(id) ON DELETE cascade,
      run_token text NOT NULL,
      item_hash text NOT NULL,
      outcome text NOT NULL,
      applied_at text,
      created_at text NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_adecca_run_items_run_item ON adecca_import_run_items (import_id, run_token, item_hash);`,
    `CREATE INDEX IF NOT EXISTS idx_adecca_run_items_run_outcome ON adecca_import_run_items (import_id, run_token, outcome, applied_at);`,

    `CREATE TABLE IF NOT EXISTS pending_adecca_matriculas (
      id text PRIMARY KEY NOT NULL,
      seccion_id text NOT NULL REFERENCES secciones(id) ON DELETE cascade,
      email text NOT NULL,
      rol_seccion text DEFAULT 'student' NOT NULL,
      source_import_id text NOT NULL REFERENCES adecca_imports(id) ON DELETE cascade,
      expires_at text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_adecca_matriculas_section_email ON pending_adecca_matriculas (seccion_id, email);`,
    `CREATE INDEX IF NOT EXISTS idx_pending_adecca_matriculas_email ON pending_adecca_matriculas (email);`,
    `CREATE INDEX IF NOT EXISTS idx_pending_adecca_matriculas_expiry ON pending_adecca_matriculas (expires_at);`,

    // 5. Indices B-Tree en sessions
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);`,

    /*
      6. Purga de tablas residuales del modelo anterior a las secciones. La
      migracion 0002 ya las eliminaba, pero produccion se reconcilio a mano y
      nunca registro esa entrada, asi que sobrevivieron vacias y fuera de
      db/schema.ts. Los avisos, archivos y notificaciones viven hoy en
      Firestore; el avance por unidades se retiro del aula.
    */
    `DROP TABLE IF EXISTS notification_reads;`,
    `DROP TABLE IF EXISTS notifications;`,
    `DROP TABLE IF EXISTS progress;`,
    `DROP TABLE IF EXISTS posts;`,
    `DROP TABLE IF EXISTS files;`,
  ];

  for (const sql of statements) {
    console.log("Ejecutando DDL:", sql.slice(0, 50).replace(/\n/g, " "), "...");
    await client.execute(sql);
  }

  console.log("[Turso Drift] Reconciliacion completada exitosamente.");
}

main().catch((err) => {
  console.error("[Turso Drift] Error fatal:", err);
  process.exit(1);
});
