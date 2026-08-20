import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRole as Role } from "../lib/access-policy.ts";
import { roleLabel } from "../lib/portal-utils.ts";

test("roleLabel mapea 'owner' a 'Desarrollador'", () => {
  assert.equal(roleLabel("owner"), "Desarrollador");
});

test("roleLabel mapea 'teacher' a 'Docente'", () => {
  assert.equal(roleLabel("teacher"), "Docente");
});

test("roleLabel mapea 'student' a 'Estudiante'", () => {
  assert.equal(roleLabel("student"), "Estudiante");
});

test("roleLabel retorna 'Estudiante' para roles desconocidos o vacíos", () => {
  assert.equal(roleLabel("unknown" as Role), "Estudiante");
  assert.equal(roleLabel("" as Role), "Estudiante");
});
