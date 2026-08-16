import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
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

// Implements: REQ-DOC-01, REQ-DOC-02, REQ-DOC-03, REQ-DOC-07, REQ-DOC-11, REQ-DOC-14
test("renders the isolated teacher preview with noindex and a bounded DOM", async () => {
  const response = await request("/preview/docente");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Vista previa/i);
  assert.match(html, /Datos de ejemplo/i);
  assert.match(html, /Buenos días, docente/i);
  assert.match(html, /Vista estudiante/i);
  assert.match(html, /name="robots" content="noindex/i);
  assert.doesNotMatch(html, /type="file"|Entregar actividad|Adjuntar entrega/i);
  assert.ok((html.match(/<[a-z][\w-]*\b/gi) ?? []).length < 1500, "the initial preview DOM must remain below 1500 elements");
});

// Implements: REQ-DOC-02, REQ-DOC-14
test("keeps Firebase, Storage and Turso out of the teacher preview bundle", async () => {
  const html = await (await request("/preview/docente")).text();
  const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"]+?\.js/g)].map((match) => match[0]))];
  assert.ok(chunks.length > 0, "the teacher preview must reference at least one client chunk");
  for (const chunk of chunks) {
    const source = await (await request(chunk)).text();
    assert.ok(!source.includes("firestore.googleapis.com"), `${chunk} ships Firestore into the isolated preview`);
    assert.ok(!source.includes("firebasestorage.googleapis.com"), `${chunk} ships Storage into the isolated preview`);
    assert.ok(!source.includes("TURSO_DATABASE_URL"), `${chunk} ships Turso configuration into the isolated preview`);
  }
});

test("serves hardening response headers", async () => {
  const response = await request("/");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

// REQ-CAP-14 — el bridge de Capacitor vive en capacitor://localhost y https://localhost.
test("admits the Capacitor bridge origins without relaxing any other directive", async () => {
  const response = await request("/");
  const directives = new Map(
    (response.headers.get("content-security-policy") ?? "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => [entry.split(/\s+/)[0], entry]),
  );
  for (const name of ["default-src", "script-src", "connect-src"]) {
    assert.match(directives.get(name) ?? "", /capacitor:\/\/localhost/, `${name} must admit the Android bridge origin`);
    assert.match(directives.get(name) ?? "", /https:\/\/localhost/, `${name} must admit the iOS bridge origin`);
  }
  const untouched = {
    "style-src": "style-src 'self' 'unsafe-inline'",
    "img-src": "img-src 'self' data: blob: https:",
    "font-src": "font-src 'self' data:",
    "frame-src": "frame-src https://*.firebaseapp.com https://apis.google.com https://accounts.google.com",
    "worker-src": "worker-src 'self' blob:",
    "manifest-src": "manifest-src 'self'",
    "object-src": "object-src 'none'",
    "base-uri": "base-uri 'self'",
    "form-action": "form-action 'self'",
    "frame-ancestors": "frame-ancestors 'none'",
  };
  for (const [name, value] of Object.entries(untouched)) {
    assert.equal(directives.get(name), value, `${name} must not differ from the pre-migration policy`);
  }
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
  assert.equal((await request("/api/auth/login", { method: "POST" })).status, 404);
  assert.equal((await request("/api/auth/register", { method: "POST" })).status, 404);
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
  assert.match(firestoreRules, /function validCourse\(courseId\) \{\s*return courseId\.matches/);
  assert.match(storageRules, /function validCourse\(courseId\) \{\s*return courseId\.matches/);
  assert.equal(firestoreRules.match(/validCourse\(courseId\)/g).length, 5, "every course write path must be guarded by validCourse");
  assert.equal(storageRules.match(/validCourse\(courseId\)/g).length, 2, "every course upload path must be guarded by validCourse");
  assert.match(firestoreRules, /match \/courses\/\{courseId\}\/grades\/\{userId\} \{[^}]*allow write: if isTeacher\(\)/);
  assert.match(firestoreRules, /match \/courses\/\{courseId\}\/meta\/\{documentId\} \{[^}]*allow write: if isTeacher\(\)/);
});

test("serves the public pages as cacheable static responses", async () => {
  for (const path of ["/", "/privacidad"]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    const cacheControl = response.headers.get("cache-control") ?? "";
    assert.doesNotMatch(cacheControl, /no-store/, `${path} must not be dynamically rendered`);
  }
  const html = await (await request("/")).text();
  assert.match(html, /https:\/\/ceoubb\.com\/opengraph-image\.jpg/);
});

test("caches the vendored library assets and keeps the service worker fresh", async () => {
  const vendor = await request("/biblioteca/assets/vendor/katex/katex.min.js");
  assert.equal(vendor.status, 200);
  assert.match(vendor.headers.get("cache-control") ?? "", /max-age=31536000/);
  assert.match(vendor.headers.get("cache-control") ?? "", /immutable/);

  const data = await request("/biblioteca/assets/data.js");
  assert.match(data.headers.get("cache-control") ?? "", /stale-while-revalidate/);
  assert.doesNotMatch(data.headers.get("cache-control") ?? "", /immutable/, "library content is not content-hashed");

  const worker = await request("/sw.js");
  assert.match(worker.headers.get("cache-control") ?? "", /no-store/);

  assert.match(vendor.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/, "security headers must survive the cache rules");
});

test("serves a non-blocking service worker", async () => {
  const response = await request("/sw.js");
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.doesNotMatch(source, /await cache\.put/, "the cache write must not block the response");
  assert.match(source, /event\.waitUntil/);
  assert.match(source, /caches\.match\("\/"\)/, "the offline navigation fallback must survive");
});

// REQ-CAP-19 — la biblioteca deja de estar duplicada: sólo el service worker la cubre sin conexión.
test("covers the library offline from the service worker alone", async () => {
  const source = await (await request("/sw.js")).text();
  assert.match(source, /"\/biblioteca\/index\.html"/, "the library entry point must be precached on install");
  assert.match(source, /biblioteca\\\/assets\\\/vendor\\\//, "the immutable library assets must be served cache-first");

  const duplicated = new URL("../android/app/src/main/assets/www/", import.meta.url);
  await assert.rejects(access(duplicated), "the duplicated Android library tree must not come back");
});

test("keeps the Firestore and Storage SDKs out of the initial page bundle", async () => {
  const html = await (await request("/")).text();
  const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"]+?\.js/g)].map((match) => match[0]))];
  assert.ok(chunks.length > 0, "the page must reference at least one client chunk");
  for (const chunk of chunks) {
    const source = await (await request(chunk)).text();
    assert.ok(!source.includes("firestore.googleapis.com"), `${chunk} still ships the Firestore SDK`);
    assert.ok(!source.includes("firebasestorage.googleapis.com"), `${chunk} still ships the Cloud Storage SDK`);
  }
});
