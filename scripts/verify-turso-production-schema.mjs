import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
  console.error("Faltan credenciales de Turso.");
  process.exit(1);
}

const client = createClient({ url: databaseUrl, authToken });

async function verify() {
  const expectedTables = [
    "users",
    "sessions",
    "facultades",
    "departamentos",
    "carreras",
    "asignaturas",
    "periodos",
    "secciones",
    "section_profiles",
    "matriculas",
    "assistant_assignments",
    "matriculas_pendientes",
    "moodle_imports",
    "grade_audit_logs",
    "solicitudes_soporte",
    "interop_tools",
    "interop_resources",
    "interop_grants",
    "interop_progress",
    "interop_statements",
  ];

  /*
    Tablas del modelo anterior a las secciones. Ninguna esta en db/schema.ts y
    ningun codigo las consulta: si reaparecen es que se restauro un respaldo
    antiguo o que alguien las recreo a mano, y el esquema dejo de ser el que
    Drizzle describe.
  */
  const forbiddenTables = ["posts", "files", "progress", "notifications", "notification_reads"];

  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  const existingTables = new Set(result.rows.map((r) => r.name));

  const missingTables = expectedTables.filter((t) => !existingTables.has(t));
  if (missingTables.length > 0) {
    console.error("Tablas faltantes en Turso:", missingTables);
    process.exit(1);
  }

  const residualTables = forbiddenTables.filter((t) => existingTables.has(t));
  if (residualTables.length > 0) {
    console.error("Tablas legacy que siguen en Turso:", residualTables);
    process.exit(1);
  }

  const indexes = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sessions'"
  );
  const existingIndexes = new Set(indexes.rows.map((r) => r.name));
  if (
    !existingIndexes.has("idx_sessions_expires_at") ||
    !existingIndexes.has("idx_sessions_user_id")
  ) {
    console.error("Faltan indices en tabla sessions:", existingIndexes);
    process.exit(1);
  }

  console.log("Esquema de produccion verificado: 100% integro.");
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
