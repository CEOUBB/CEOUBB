import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEVELOPER_EMAILS, isDeveloperEmail } from "../lib/access-policy.ts";
import type { AccountRole } from "../lib/access-policy.ts";

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
  if (targetUser && isDeveloperEmail(targetUser.email)) {
    return {
      allowed: false,
      status: 400,
      error: "Las cuentas de desarrollador no pueden cambiar de rango.",
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
  const owner: Actor = { id: "owner-1", role: "owner", email: "elpapijuaco325@gmail.com" };
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
  const owner: Actor = { id: "owner-1", role: "owner", email: "elpapijuaco325@gmail.com" };
  const selfTarget: TargetUser = {
    id: "owner-1",
    email: "elpapijuaco325@gmail.com",
    role: "owner",
  };

  const result = evaluateRoleChangeGuard(owner, { userId: "owner-1", role: "student" }, selfTarget);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 400);
  assert.equal(result.error, "La cuenta propietaria no puede degradarse.");
});

test("rejects attempts to modify developer superusers with 400", () => {
  const owner: Actor = { id: "owner-1", role: "owner", email: "elpapijuaco325@gmail.com" };

  for (const devEmail of DEVELOPER_EMAILS) {
    const devTarget: TargetUser = { id: "dev-999", email: devEmail, role: "owner" };
    const result = evaluateRoleChangeGuard(
      owner,
      { userId: "dev-999", role: "student" },
      devTarget
    );
    assert.equal(result.allowed, false);
    assert.equal(result.status, 400);
    assert.equal(result.error, "Las cuentas de desarrollador no pueden cambiar de rango.");

    // Uppercase variation
    const upperTarget: TargetUser = { id: "dev-999", email: devEmail.toUpperCase(), role: "owner" };
    const upperResult = evaluateRoleChangeGuard(
      owner,
      { userId: "dev-999", role: "teacher" },
      upperTarget
    );
    assert.equal(upperResult.allowed, false);
    assert.equal(upperResult.status, 400);
  }
});

test("accepts valid role changes for regular users when initiated by owner", () => {
  const owner: Actor = { id: "owner-1", role: "owner", email: "elpapijuaco325@gmail.com" };
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

  // Prevent modification of developer emails
  assert.match(
    source,
    /isDeveloperEmail\(target\[0\]\.email\)/,
    "must use isDeveloperEmail to protect developers"
  );
  assert.match(source, /"Las cuentas de desarrollador no pueden cambiar de rango\."/);
});
