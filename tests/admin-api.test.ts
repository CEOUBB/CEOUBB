import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { like, or, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { getDb } from "../db/index.ts";
import { sessions, users } from "../db/schema.ts";
import type { AccountRole } from "../lib/access-policy.ts";
import { pruneExpiredSessions } from "../lib/auth.ts";

type Actor = { id: string; role: AccountRole; email: string } | null;
type TargetUser = { id: string; email: string; role: AccountRole } | null;
type RoleChangePayload = { userId?: string; role?: string };

type GuardDecision = {
  allowed: boolean;
  status: number;
  error?: string;
};

/**
 * Pure model of the administration role mutation guard invariants
 * implemented in app/api/admin/users/route.ts:14-24.
 */
function evaluateRoleChangeGuard(
  actor: Actor,
  payload: RoleChangePayload,
  targetUser: TargetUser
): GuardDecision {
  if (!actor || actor.role !== "owner") {
    return { allowed: false, status: 403, error: "Acceso restringido." };
  }
  if (!payload.userId || !["teacher", "student"].includes(payload.role ?? "")) {
    return { allowed: false, status: 400, error: "Datos inválidos." };
  }
  if (payload.userId === actor.id) {
    return { allowed: false, status: 400, error: "La cuenta propietaria no puede degradarse." };
  }
  // Implements: REQ-SEC-01 — el rango protegido sale de la base, no del correo.
  if (targetUser && targetUser.role === "owner") {
    return {
      allowed: false,
      status: 400,
      error: "Las cuentas propietarias no pueden cambiar de rango.",
    };
  }
  return { allowed: true, status: 200 };
}

test("rejects unauthenticated or non-owner callers with 403", () => {
  const validPayload = { userId: "user-456", role: "teacher" };
  const target: TargetUser = {
    id: "user-456",
    email: "alumno@alumnos.ubiobio.cl",
    role: "student",
  };

  // Caller is unauthenticated
  const unauthResult = evaluateRoleChangeGuard(null, validPayload, target);
  assert.equal(unauthResult.allowed, false);
  assert.equal(unauthResult.status, 403);
  assert.equal(unauthResult.error, "Acceso restringido.");

  // Caller is a student
  const studentResult = evaluateRoleChangeGuard(
    { id: "s-1", role: "student", email: "alumno@alumnos.ubiobio.cl" },
    validPayload,
    target
  );
  assert.equal(studentResult.allowed, false);
  assert.equal(studentResult.status, 403);

  // Caller is a teacher
  const teacherResult = evaluateRoleChangeGuard(
    { id: "t-1", role: "teacher", email: "docente@ubiobio.cl" },
    validPayload,
    target
  );
  assert.equal(teacherResult.allowed, false);
  assert.equal(teacherResult.status, 403);
});

test("rejects payloads missing userId or containing invalid target roles with 400", () => {
  const owner: Actor = { id: "owner-1", role: "owner", email: "coordinacion@ubiobio.cl" };
  const target: TargetUser = {
    id: "user-456",
    email: "alumno@alumnos.ubiobio.cl",
    role: "student",
  };

  // Missing userId
  assert.deepEqual(evaluateRoleChangeGuard(owner, { role: "teacher" }, target), {
    allowed: false,
    status: 400,
    error: "Datos inválidos.",
  });

  // Invalid role values
  for (const invalidRole of ["owner", "admin", "superuser", "guest", "", "invalid", undefined]) {
    const result = evaluateRoleChangeGuard(
      owner,
      { userId: "user-456", role: invalidRole },
      target
    );
    assert.equal(result.allowed, false, `Role ${invalidRole} should be rejected`);
    assert.equal(result.status, 400);
    assert.equal(result.error, "Datos inválidos.");
  }
});

test("rejects attempts to downgrade the active owner account with 400", () => {
  const owner: Actor = { id: "owner-1", role: "owner", email: "coordinacion@ubiobio.cl" };
  const selfTarget: TargetUser = {
    id: "owner-1",
    email: "coordinacion@ubiobio.cl",
    role: "owner",
  };

  const result = evaluateRoleChangeGuard(owner, { userId: "owner-1", role: "student" }, selfTarget);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 400);
  assert.equal(result.error, "La cuenta propietaria no puede degradarse.");
});

// Implements: REQ-SEC-01
test("rejects attempts to downgrade any account holding the owner rank with 400", () => {
  const owner: Actor = { id: "owner-1", role: "owner", email: "coordinacion@ubiobio.cl" };

  for (const targetRole of ["student", "teacher"] as const) {
    const protectedTarget: TargetUser = {
      id: "owner-2",
      email: "direccion.dti@ubiobio.cl",
      role: "owner",
    };
    const result = evaluateRoleChangeGuard(
      owner,
      { userId: "owner-2", role: targetRole },
      protectedTarget
    );
    assert.equal(result.allowed, false);
    assert.equal(result.status, 400);
    assert.equal(result.error, "Las cuentas propietarias no pueden cambiar de rango.");
  }

  // El correo ya no protege a nadie: una cuenta institucional sin rango de
  // propietario sigue siendo administrable.
  const regularTarget: TargetUser = {
    id: "user-777",
    email: "ayudante@ubiobio.cl",
    role: "teacher",
  };
  assert.deepEqual(
    evaluateRoleChangeGuard(owner, { userId: "user-777", role: "student" }, regularTarget),
    {
      allowed: true,
      status: 200,
    }
  );
});

test("accepts valid role changes for regular users when initiated by owner", () => {
  const owner: Actor = { id: "owner-1", role: "owner", email: "coordinacion@ubiobio.cl" };
  const target: TargetUser = {
    id: "user-456",
    email: "alumno@alumnos.ubiobio.cl",
    role: "student",
  };

  const toTeacher = evaluateRoleChangeGuard(owner, { userId: "user-456", role: "teacher" }, target);
  assert.deepEqual(toTeacher, { allowed: true, status: 200 });

  const toStudent = evaluateRoleChangeGuard(owner, { userId: "user-456", role: "student" }, target);
  assert.deepEqual(toStudent, { allowed: true, status: 200 });
});

test("admin users endpoint source strictly enforces every guard contract", async () => {
  const source = await readFile(
    new URL("../app/api/admin/users/route.ts", import.meta.url),
    "utf8"
  );

  // Authentication & owner role enforcement
  assert.match(source, /getSessionUser\(request\)/, "must authenticate session");
  assert.match(source, /actor\.role !== "owner"/, "must restrict to owner role");
  assert.match(source, /status: 403/, "must return 403 on non-owner");

  // Payload role validation
  assert.match(
    source,
    /\["teacher",\s*"student"\]\.includes/,
    "must restrict target roles to teacher and student"
  );

  // Prevent self-downgrade of owner
  assert.match(source, /payload\.userId === actor\.id/, "must block owner account downgrade");
  assert.match(source, /"La cuenta propietaria no puede degradarse\."/);

  // Prevent modification of any account holding the owner rank
  assert.match(
    source,
    /target\[0\]\?\.role === "owner"/,
    "must protect the owner rank from the stored record"
  );
  assert.match(source, /"Las cuentas propietarias no pueden cambiar de rango\."/);
  assert.doesNotMatch(source, /@gmail\.com/, "no personal address may survive in the endpoint");
});

test("REQ-PERF-01: sessions table defines idx_sessions_user_id index on userId", async () => {
  const config = getTableConfig(sessions);
  const userIndex = config.indexes.find((idx) => idx.config.name === "idx_sessions_user_id");
  assert.ok(userIndex, "sessions table must have idx_sessions_user_id index");
  assert.equal(userIndex.config.name, "idx_sessions_user_id");
  assert.equal(userIndex.config.unique, false);

  const schemaSource = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schemaSource, /Implements:\s*REQ-PERF-01/);
  assert.match(schemaSource, /index\("idx_sessions_user_id"\)\.on\(table\.userId\)/);

  const migration = await readFile(
    new URL("../drizzle/0003_stormy_mach_iv.sql", import.meta.url),
    "utf8"
  );
  assert.match(migration, /CREATE INDEX `idx_sessions_user_id` ON `sessions` \(`user_id`\);/);
});

test("REQ-PERF-02: pruneExpiredSessions removes expired sessions and preserves active ones", async () => {
  const authSource = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
  assert.match(authSource, /Implements:\s*REQ-PERF-02/);
  assert.match(authSource, /export async function pruneExpiredSessions\(\)/);
  assert.match(authSource, /lte\(sessions\.expiresAt,\s*now\)/);

  assert.equal(typeof pruneExpiredSessions, "function");

  // Functional test against in-memory libSQL instance
  const originalUrl = process.env.TURSO_DATABASE_URL;
  try {
    process.env.TURSO_DATABASE_URL = "file::memory:";
    const db = getDb();
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, email text NOT NULL, name text NOT NULL, role text NOT NULL, created_at text NOT NULL);`
    );
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY NOT NULL, user_id text NOT NULL, expires_at text NOT NULL, created_at text NOT NULL);`
    );

    // Clean up any test records
    await db.delete(sessions);
    await db.delete(users);

    const now = Date.now();
    await db.insert(users).values({
      id: "u-test-prune",
      email: "test@ubiobio.cl",
      name: "Docente Test",
      role: "teacher",
      createdAt: new Date(now).toISOString(),
    });

    // 2 expired sessions, 1 active session
    await db.insert(sessions).values([
      {
        tokenHash: "expired-1",
        userId: "u-test-prune",
        createdAt: new Date(now - 100000).toISOString(),
        expiresAt: new Date(now - 50000).toISOString(),
      },
      {
        tokenHash: "expired-2",
        userId: "u-test-prune",
        createdAt: new Date(now - 80000).toISOString(),
        expiresAt: new Date(now - 1000).toISOString(),
      },
      {
        tokenHash: "active-1",
        userId: "u-test-prune",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 100000).toISOString(),
      },
    ]);

    const prunedCount = await pruneExpiredSessions();
    assert.equal(prunedCount, 2, "must report 2 expired sessions deleted");

    const remainingSessions = await db.select().from(sessions);
    assert.equal(remainingSessions.length, 1, "only active session should remain");
    assert.equal(remainingSessions[0]?.tokenHash, "active-1");
  } finally {
    if (originalUrl !== undefined) {
      process.env.TURSO_DATABASE_URL = originalUrl;
    } else {
      delete process.env.TURSO_DATABASE_URL;
    }
  }
});

test("REQ-PERF-03, REQ-PERF-04: GET /api/admin/users pagination, limit clamping and search filter invariants", async () => {
  const routeSource = await readFile(
    new URL("../app/api/admin/users/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(routeSource, /Implements:\s*REQ-PERF-03,\s*REQ-PERF-04/);
  assert.match(routeSource, /searchParams\.get\("page"\)/);
  assert.match(routeSource, /searchParams\.get\("limit"\)/);
  assert.match(routeSource, /searchParams\.get\("q"\)/);
  assert.match(routeSource, /totalPages/);
  assert.match(routeSource, /total/);

  // Functional test against in-memory libSQL
  const originalUrl = process.env.TURSO_DATABASE_URL;
  try {
    process.env.TURSO_DATABASE_URL = "file::memory:";
    const db = getDb();
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, email text NOT NULL, name text NOT NULL, role text NOT NULL, created_at text NOT NULL);`
    );
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY NOT NULL, user_id text NOT NULL, expires_at text NOT NULL, created_at text NOT NULL);`
    );
    await db.delete(sessions);
    await db.delete(users);

    const testUsers = [
      {
        id: "u-1",
        email: "andres.silva@alumnos.ubiobio.cl",
        name: "Andres Silva",
        role: "student" as const,
        createdAt: "2026-01-01T10:00:00.000Z",
      },
      {
        id: "u-2",
        email: "beatriz.pena@alumnos.ubiobio.cl",
        name: "Beatriz Peña",
        role: "student" as const,
        createdAt: "2026-01-02T10:00:00.000Z",
      },
      {
        id: "u-3",
        email: "camilo.torres@ubiobio.cl",
        name: "Camilo Torres",
        role: "teacher" as const,
        createdAt: "2026-01-03T10:00:00.000Z",
      },
      {
        id: "u-4",
        email: "daniela.rojas@alumnos.ubiobio.cl",
        name: "Daniela Rojas",
        role: "student" as const,
        createdAt: "2026-01-04T10:00:00.000Z",
      },
      {
        id: "u-5",
        email: "coordinacion@ubiobio.cl",
        name: "Coordinacion DTI",
        role: "owner" as const,
        createdAt: "2026-01-05T10:00:00.000Z",
      },
    ];

    for (const u of testUsers) {
      await db.insert(users).values(u);
    }

    // Helper query runner simulating route handler's logic
    async function queryAdminUsers(pageParam = "1", limitParam = "50", qParam = "") {
      const rawPage = parseInt(pageParam, 10);
      const rawLimit = parseInt(limitParam, 10);
      const q = qParam.trim();

      const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
      const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 50;
      const offset = (page - 1) * limit;

      const whereClause = q
        ? or(
            like(sql`lower(${users.name})`, `%${q.toLowerCase()}%`),
            like(sql`lower(${users.email})`, `%${q.toLowerCase()}%`)
          )
        : undefined;

      const [countResult, rows] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereClause),
        db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      return { users: rows, total, page, totalPages };
    }

    // Default query
    const defaultRes = await queryAdminUsers();
    assert.equal(defaultRes.total, 5);
    assert.equal(defaultRes.page, 1);
    assert.equal(defaultRes.totalPages, 1);
    assert.equal(defaultRes.users.length, 5);

    // Pagination: page 1 of limit 2
    const page1 = await queryAdminUsers("1", "2");
    assert.equal(page1.total, 5);
    assert.equal(page1.page, 1);
    assert.equal(page1.totalPages, 3);
    assert.equal(page1.users.length, 2);

    // Pagination: page 3 of limit 2
    const page3 = await queryAdminUsers("3", "2");
    assert.equal(page3.total, 5);
    assert.equal(page3.page, 3);
    assert.equal(page3.totalPages, 3);
    assert.equal(page3.users.length, 1);

    // Clamping: limit 500 clamped to 100, limit 0 clamped to 1
    const clampedUpper = await queryAdminUsers("1", "500");
    assert.equal(clampedUpper.users.length, 5);

    const clampedLower = await queryAdminUsers("1", "0");
    assert.equal(clampedLower.users.length, 1);
    assert.equal(clampedLower.totalPages, 5);

    // Filtering by name (case-insensitive)
    const searchName = await queryAdminUsers("1", "10", "camilo");
    assert.equal(searchName.total, 1);
    assert.equal(searchName.users[0]?.name, "Camilo Torres");

    // Filtering by email domain
    const searchEmail = await queryAdminUsers("1", "10", "alumnos.ubiobio.cl");
    assert.equal(searchEmail.total, 3);
    assert.equal(searchEmail.totalPages, 1);

    // Filter with no match
    const searchNone = await queryAdminUsers("1", "10", "nonexistent");
    assert.equal(searchNone.total, 0);
    assert.equal(searchNone.totalPages, 1);
    assert.equal(searchNone.users.length, 0);
  } finally {
    if (originalUrl !== undefined) {
      process.env.TURSO_DATABASE_URL = originalUrl;
    } else {
      delete process.env.TURSO_DATABASE_URL;
    }
  }
});

test("REQ-PERF-05: AdminView and portal-utils client contract verification", async () => {
  const portalUtilsSource = await readFile(
    new URL("../lib/portal-utils.ts", import.meta.url),
    "utf8"
  );
  assert.match(portalUtilsSource, /export async function loadAdminUsers/);
  assert.match(portalUtilsSource, /AdminUsersResponse/);
  assert.match(portalUtilsSource, /\/api\/admin\/users\?page=\$\{page\}&limit=\$\{limit\}&q=/);

  const adminViewSource = await readFile(
    new URL("../app/views/AdminView.tsx", import.meta.url),
    "utf8"
  );
  assert.match(adminViewSource, /Implements:\s*REQ-PERF-05/);
  assert.match(adminViewSource, /searchQuery/);
  assert.match(adminViewSource, /admin-search-input/);
  assert.match(adminViewSource, /admin-pagination/);
  assert.match(adminViewSource, /Página/);
  assert.match(adminViewSource, /Anterior/);
  assert.match(adminViewSource, /Siguiente/);
});

test("REQ-ACCESS-04: Dual-store user role mutation contract (Turso + Firestore projection)", async () => {
  const profileSource = await readFile(
    new URL("../lib/firebase/profile.ts", import.meta.url),
    "utf8"
  );
  assert.match(profileSource, /Implements:\s*REQ-ACCESS-04/);
  assert.match(profileSource, /export async function updateRemoteUserRole/);
  assert.match(profileSource, /profileRef/);
  assert.match(profileSource, /merge:\s*true/);

  const adminViewSource = await readFile(
    new URL("../app/views/AdminView.tsx", import.meta.url),
    "utf8"
  );
  assert.match(adminViewSource, /updateRemoteUserRole/);
  assert.match(adminViewSource, /Dual-store sync/);

  const rulesSource = await readFile(
    new URL("../firebase/firestore.rules", import.meta.url),
    "utf8"
  );
  assert.match(rulesSource, /isOwner\(\)\s*\|\|\s*signedIn\(\)/);
  assert.match(rulesSource, /match \/users\/\{userId\}/);
});
