import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { createClient } from "@libsql/client";

const PORT = 3123;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SESSION_COOKIE = "centro_estudio_session";

const OWNER = { id: "firebase:test-owner", email: "felipearce.2004@gmail.com", name: "Owner De Prueba", role: "owner" };
const TEACHER = { id: "firebase:test-teacher", email: "docente@ubiobio.cl", name: "Docente De Prueba", role: "teacher" };
const STUDENT = { id: "firebase:test-student", email: "estudiante@alumnos.ubiobio.cl", name: "Estudiante De Prueba", role: "student" };

let server;
let workspace;
let db;

async function migrate(client) {
  const folder = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, folder), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim().replace(/;$/, "");
      if (trimmed) await client.execute(trimmed);
    }
  }
}

async function seedUser(user) {
  await db.execute({
    sql: "INSERT INTO users (id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [user.id, user.email, user.name, user.role, new Date().toISOString()],
  });
}

async function signIn(user, { expiresAt } = {}) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.execute({
    sql: "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    args: [
      createHash("sha256").update(token).digest("hex"),
      user.id,
      expiresAt ?? new Date(now.getTime() + 60_000).toISOString(),
      now.toISOString(),
    ],
  });
  return `${SESSION_COOKIE}=${token}`;
}

function request(path, { cookie, ...init } = {}) {
  return fetch(`${ORIGIN}${path}`, {
    ...init,
    headers: { accept: "text/html", ...(cookie ? { cookie } : {}), ...init.headers },
  });
}

before(async () => {
  workspace = await mkdtemp(join(tmpdir(), "ceoubb-test-"));
  const url = `file:${join(workspace, "test.db").replace(/\\/g, "/")}`;
  db = createClient({ url });
  await migrate(db);
  for (const user of [OWNER, TEACHER, STUDENT]) await seedUser(user);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url),
    stdio: "ignore",
    env: { ...process.env, TURSO_DATABASE_URL: url },
  });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      await fetch(ORIGIN, { method: "HEAD" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("next start did not become reachable");
});

after(async () => {
  db?.close();
  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await stopped;
  }
  if (workspace) await rm(workspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

test("renders Centro de Estudio UBB", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Centro de Estudio UBB/i);
  assert.match(html, /Ingeniería Mecánica/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("serves hardening response headers", async () => {
  const response = await request("/");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("serves a sitemap", async () => {
  const response = await request("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<urlset/);
});

test("does not expose the account deletion page", async () => {
  assert.equal((await request("/eliminar-cuenta")).status, 404);
});

test("treats a missing session as an anonymous visitor", async () => {
  const response = await request("/api/auth/me");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: null });
});

test("returns the signed-in account without RUT or credential fields", async () => {
  const response = await request("/api/auth/me", { cookie: await signIn(STUDENT) });
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.deepEqual(user, { id: STUDENT.id, email: STUDENT.email, name: STUDENT.name, role: STUDENT.role });
});

test("ignores an expired session", async () => {
  const cookie = await signIn(OWNER, { expiresAt: "2020-01-01T00:00:00.000Z" });
  assert.deepEqual(await (await request("/api/auth/me", { cookie })).json(), { user: null });
});

test("ignores a forged session token", async () => {
  const cookie = `${SESSION_COOKIE}=${randomBytes(32).toString("base64url")}`;
  assert.deepEqual(await (await request("/api/auth/me", { cookie })).json(), { user: null });
});

test("logout destroys the session server side", async () => {
  const cookie = await signIn(TEACHER);
  const response = await request("/api/auth/logout", { method: "POST", cookie });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /Max-Age=0/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Secure/, "next start runs in production mode, so the cookie must be Secure");
  assert.deepEqual(await (await request("/api/auth/me", { cookie })).json(), { user: null });
});

test("restricts account administration to the owner role", async () => {
  assert.equal((await request("/api/admin/users")).status, 403);
  assert.equal((await request("/api/admin/users", { cookie: await signIn(STUDENT) })).status, 403);
  assert.equal((await request("/api/admin/users", { cookie: await signIn(TEACHER) })).status, 403);

  const response = await request("/api/admin/users", { cookie: await signIn(OWNER) });
  assert.equal(response.status, 200);
  const { users } = await response.json();
  assert.ok(users.some((item) => item.email === STUDENT.email));
  assert.ok(users.every((item) => !("rut" in item)));
});

test("refuses to change the rank of a developer account", async () => {
  const cookie = await signIn(OWNER);
  const patch = (body) => request("/api/admin/users", {
    method: "PATCH",
    cookie,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal((await patch({ userId: OWNER.id, role: "student" })).status, 400);
  assert.equal((await patch({ userId: STUDENT.id, role: "owner" })).status, 400);
  assert.equal((await patch({ userId: STUDENT.id, role: "teacher" })).status, 200);
  assert.equal((await patch({ userId: STUDENT.id, role: "student" })).status, 200);
});

test("password login and self-registration stay retired", async () => {
  assert.equal((await request("/api/auth/login", { method: "POST" })).status, 410);
  assert.equal((await request("/api/auth/register", { method: "POST" })).status, 410);
});

test("the notification bell is gone", async () => {
  assert.equal((await request("/api/notifications")).status, 404);
});

test("keeps the store badges as non-clickable placeholders", async () => {
  const source = await readFile(new URL("../app/Portal.tsx", import.meta.url), "utf8");
  assert.match(source, /app-store-badge-es\.webp/i);
  assert.match(source, /google-play-badge-es\.webp/i);
  assert.doesNotMatch(source, /store-badge[^>]*href=/i);
});

test("uses the Google sign-in popup, never a redirect", async () => {
  const source = await readFile(new URL("../lib/firebase-client.ts", import.meta.url), "utf8");
  assert.match(source, /signInWithPopup/);
  assert.doesNotMatch(source, /signInWithRedirect|getRedirectResult/);
});

test("does not persist Firebase Storage download URLs", async () => {
  const source = await readFile(new URL("../lib/firebase-classroom-client.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /const fileUrl = await getDownloadURL/);
  assert.match(source, /export async function classroomFileUrl/);
});

test("keeps profile deletion and course paths locked down", async () => {
  const firestoreRules = await readFile(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  const storageRules = await readFile(new URL("../firebase/storage.rules", import.meta.url), "utf8");
  assert.match(firestoreRules, /allow delete: if isOwner\(\);/);
  assert.doesNotMatch(firestoreRules, /match \/courses\/\{courseId\}/);
  assert.doesNotMatch(storageRules, /match \/courses\/\{courseId\}/);
});
