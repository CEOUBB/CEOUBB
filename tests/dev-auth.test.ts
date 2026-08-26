import assert from "node:assert/strict";
import test, { before } from "node:test";
import { sql } from "drizzle-orm";
import { roleForEmail } from "../lib/access-policy.ts";
import { DEV_TEST_USERS, DevLoginSchema, isDevOrPreviewAuthAllowed } from "../lib/auth-dev.ts";

process.env.TURSO_DATABASE_URL = "file::memory:?cache=shared";

const { getDb } = await import("../db/index.ts");
const { POST } = await import("../app/api/auth/dev-login/route.ts");

const env = process.env as Record<string, string | undefined>;

// Implements: REQ-AUTH-04, REQ-AUTH-05, REQ-AUTH-06

before(async () => {
  const db = getDb();
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      role text NOT NULL,
      carrera text,
      created_at text NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at text NOT NULL,
      expires_at text NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS periodos (
      id text PRIMARY KEY NOT NULL,
      nombre text NOT NULL,
      estado text NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS asignaturas (
      id text PRIMARY KEY NOT NULL,
      codigo text NOT NULL UNIQUE,
      nombre text NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS secciones (
      id text PRIMARY KEY NOT NULL,
      asignatura_id text NOT NULL REFERENCES asignaturas(id),
      periodo_id text NOT NULL REFERENCES periodos(id),
      docente_id text NOT NULL REFERENCES users(id),
      numero_seccion integer NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS matriculas (
      id text PRIMARY KEY NOT NULL,
      usuario_id text NOT NULL REFERENCES users(id),
      seccion_id text NOT NULL REFERENCES secciones(id),
      rol_seccion text NOT NULL,
      estado text NOT NULL,
      created_at text NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS moodle_imports (
      id text PRIMARY KEY NOT NULL,
      seccion_id text NOT NULL REFERENCES secciones(id),
      docente_id text NOT NULL REFERENCES users(id),
      created_at text NOT NULL
    );`
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS pending_matriculas (
      id text PRIMARY KEY NOT NULL,
      seccion_id text NOT NULL REFERENCES secciones(id),
      email text NOT NULL,
      rol_seccion text NOT NULL DEFAULT 'student',
      source_import_id text NOT NULL,
      expires_at text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );`
  );
});

test("REQ-AUTH-06: Aislamiento estricto de producción en autenticación de testing", () => {
  // En producción (VERCEL_ENV=production), nunca debe permitirse el acceso rápido
  assert.equal(isDevOrPreviewAuthAllowed("production", "development"), false);
  assert.equal(isDevOrPreviewAuthAllowed("production", "production"), false);
  assert.equal(isDevOrPreviewAuthAllowed("production", undefined), false);

  // En preview de Vercel y desarrollo local sí está permitido
  assert.equal(isDevOrPreviewAuthAllowed("preview", "production"), true);
  assert.equal(isDevOrPreviewAuthAllowed("preview", "development"), true);
  assert.equal(isDevOrPreviewAuthAllowed(undefined, "development"), true);

  // Sin variables o en entornos no autorizados
  assert.equal(isDevOrPreviewAuthAllowed(undefined, "production"), false);
});

test("REQ-AUTH-05: Las cuentas de testing cumplen estrictamente con los dominios institucionales", () => {
  const student = DEV_TEST_USERS.student;
  assert.equal(student.email, "estudiante.demo@alumnos.ubiobio.cl");
  assert.equal(student.role, "student");
  assert.equal(roleForEmail(student.email), "student");

  const teacher = DEV_TEST_USERS.teacher;
  assert.equal(teacher.email, "docente.demo@ubiobio.cl");
  assert.equal(teacher.role, "teacher");
  assert.equal(roleForEmail(teacher.email), "teacher");
});

test("REQ-AUTH-04: Validación de esquema Zod para acceso rápido de testing", () => {
  const studentParsed = DevLoginSchema.safeParse({ role: "student" });
  assert.equal(studentParsed.success, true);
  if (studentParsed.success) {
    assert.equal(studentParsed.data.role, "student");
  }

  const teacherParsed = DevLoginSchema.safeParse({ role: "teacher" });
  assert.equal(teacherParsed.success, true);
  if (teacherParsed.success) {
    assert.equal(teacherParsed.data.role, "teacher");
  }

  // Rechazo de roles administrativos, no autorizados o malformados
  assert.equal(DevLoginSchema.safeParse({ role: "owner" }).success, false);
  assert.equal(DevLoginSchema.safeParse({ role: "admin" }).success, false);
  assert.equal(DevLoginSchema.safeParse({ role: "guest" }).success, false);
  assert.equal(DevLoginSchema.safeParse({}).success, false);
  assert.equal(DevLoginSchema.safeParse(null).success, false);
});

test("REQ-AUTH-06: Endpoint /api/auth/dev-login responde 404 en entorno productivo", async () => {
  const previousVercelEnv = env.VERCEL_ENV;
  const previousNodeEnv = env.NODE_ENV;

  try {
    env.VERCEL_ENV = "production";
    env.NODE_ENV = "production";

    const request = new Request("http://localhost:3000/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student" }),
    });

    const response = await POST(request);
    assert.equal(response.status, 404);
    const data = await response.json();
    assert.deepEqual(data, { error: "Not Found" });
  } finally {
    env.VERCEL_ENV = previousVercelEnv;
    env.NODE_ENV = previousNodeEnv;
  }
});

test("REQ-AUTH-04: Endpoint /api/auth/dev-login rechaza payloads inválidos con 400", async () => {
  const previousVercelEnv = env.VERCEL_ENV;
  const previousNodeEnv = env.NODE_ENV;

  try {
    env.VERCEL_ENV = "preview";
    env.NODE_ENV = "development";

    const badRequest = new Request("http://localhost:3000/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "invalid-role" }),
    });

    const response = await POST(badRequest);
    assert.equal(response.status, 400);
  } finally {
    env.VERCEL_ENV = previousVercelEnv;
    env.NODE_ENV = previousNodeEnv;
  }
});

test("REQ-AUTH-05: Inicio de sesión exitoso como estudiante en entorno de desarrollo", async () => {
  const previousVercelEnv = env.VERCEL_ENV;
  const previousNodeEnv = env.NODE_ENV;

  try {
    env.VERCEL_ENV = "preview";
    env.NODE_ENV = "development";

    const request = new Request("http://localhost:3000/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student" }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);

    const setCookie = response.headers.get("Set-Cookie");
    assert.ok(setCookie?.includes("centro_estudio_session="));
    assert.ok(setCookie?.includes("HttpOnly"));

    const data = await response.json();
    assert.equal(data.user.id, "dev:student-demo");
    assert.equal(data.user.email, "estudiante.demo@alumnos.ubiobio.cl");
    assert.equal(data.user.role, "student");
    assert.ok(Array.isArray(data.sectionIds));
    assert.ok(Array.isArray(data.memberships));
  } finally {
    env.VERCEL_ENV = previousVercelEnv;
    env.NODE_ENV = previousNodeEnv;
  }
});

test("REQ-AUTH-05: Inicio de sesión exitoso como docente en entorno de desarrollo", async () => {
  const previousVercelEnv = env.VERCEL_ENV;
  const previousNodeEnv = env.NODE_ENV;

  try {
    env.VERCEL_ENV = "preview";
    env.NODE_ENV = "development";

    const request = new Request("http://localhost:3000/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "teacher" }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);

    const setCookie = response.headers.get("Set-Cookie");
    assert.ok(setCookie?.includes("centro_estudio_session="));
    assert.ok(setCookie?.includes("HttpOnly"));

    const data = await response.json();
    assert.equal(data.user.id, "dev:teacher-demo");
    assert.equal(data.user.email, "docente.demo@ubiobio.cl");
    assert.equal(data.user.role, "teacher");
    assert.ok(Array.isArray(data.sectionIds));
    assert.ok(Array.isArray(data.memberships));
  } finally {
    env.VERCEL_ENV = previousVercelEnv;
    env.NODE_ENV = previousNodeEnv;
  }
});
