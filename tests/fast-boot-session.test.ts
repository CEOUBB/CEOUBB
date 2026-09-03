import assert from "node:assert/strict";
import test, { before } from "node:test";
import { sql } from "drizzle-orm";

process.env.TURSO_DATABASE_URL = "file::memory:";

const { getDb } = await import("../db/index.ts");
const { users } = await import("../db/schema.ts");
const { SESSION_COOKIE, createSession, getServerSessionState, getSessionUserFromToken } =
  await import("../lib/auth.ts");

// Implements: REQ-AUTH-01, REQ-PERF-01

before(async () => {
  const db = getDb();
  await db.run(sql`PRAGMA foreign_keys = ON;`);
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      role text NOT NULL,
      carrera text,
      photo_url text,
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
      estado text NOT NULL
    );`
  );
});

test("fast-boot: SESSION_COOKIE es constante y coincide con centro_estudio_session", () => {
  assert.equal(SESSION_COOKIE, "centro_estudio_session");
});

test("fast-boot: getServerSessionState con token nulo retorna estructura vacía sin error", async () => {
  const state = await getServerSessionState(null);
  assert.equal(state.user, null);
  assert.deepEqual(state.sectionIds, []);
  assert.deepEqual(state.memberships, []);
  assert.equal(state.sections, null);
  assert.equal(state.archivedNextCursor, null);
});

test("fast-boot: getServerSessionState con token inexistente retorna estructura vacía", async () => {
  const state = await getServerSessionState("token-inexistente-12345");
  assert.equal(state.user, null);
  assert.deepEqual(state.sectionIds, []);
});

test("fast-boot: getSessionUserFromToken y getServerSessionState resuelven sesión válida con cursos", async () => {
  const db = getDb();
  const testUserId = "user-fast-boot-1";
  const email = "estudiante.test@alumnos.ubiobio.cl";

  await db
    .insert(users)
    .values({
      id: testUserId,
      email,
      name: "Estudiante Prueba",
      role: "student",
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();

  const cookieHeader = await createSession(testUserId);
  const match = cookieHeader.match(/centro_estudio_session=([^;]+)/);
  assert.ok(match, "Debe generar cookie de sesión");
  const rawToken = match[1];

  const user = await getSessionUserFromToken(rawToken);
  assert.ok(user);
  assert.equal(user.email, email);
  assert.equal(user.role, "student");

  const state = await getServerSessionState(rawToken);
  assert.ok(state.user);
  assert.equal(state.user.id, testUserId);
  assert.ok(Array.isArray(state.sectionIds));
  assert.ok(Array.isArray(state.memberships));
});
