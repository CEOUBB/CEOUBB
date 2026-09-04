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

    // 4. moodle_imports
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

    // 5. Indices B-Tree en sessions
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);`,
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
