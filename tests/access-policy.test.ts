import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACCESS_CASES, DEVELOPER_EMAILS, STUDENT_DOMAIN, TEACHER_DOMAIN, isDeveloperEmail, roleForEmail } from "../lib/access-policy.ts";

const OWNER_SURFACES = [
  "../firebase/firestore.rules",
  "../firebase/storage.rules",
  "../android/app/src/main/res/values/firebase.xml",
];

/*
  Tras la migración a Capacitor la capa nativa ya no interpreta dominios (REQ-CAP-12):
  `ClassroomService.java` desapareció con el WebView artesanal y no se sustituye. Quedan
  cuatro espejos de la política — `lib/access-policy.ts`, las dos reglas de Firebase y
  `firebase.xml`, que sigue enumerando a los owners.
*/
const DOMAIN_SURFACES = [
  "../firebase/firestore.rules",
  "../firebase/storage.rules",
];

const POLICY_CONSUMERS = [
  "../app/Portal.tsx",
  "../lib/firebase-classroom-client.ts",
  "../lib/auth.ts",
  "../app/api/auth/firebase/route.ts",
];

function readSurface(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("resolves every access case to its institutional role", () => {
  for (const item of ACCESS_CASES) {
    assert.equal(roleForEmail(item.email), item.role, `${item.email || "(empty)"} must resolve to ${item.role}`);
  }
});

test("covers owner, teacher, student and rejection", () => {
  const roles = new Set<string | null>(ACCESS_CASES.map((item) => item.role));
  for (const expected of ["owner", "teacher", "student", null]) {
    assert.ok(roles.has(expected), `the access matrix is missing a ${expected ?? "rejected"} case`);
  }
});

test("rejects lookalike and subdomain addresses", () => {
  assert.equal(roleForEmail("alumno@alumnos.ubiobio.cl.attacker.com"), null);
  assert.equal(roleForEmail("docente@notubiobio.cl"), null);
  assert.equal(roleForEmail("docente@correo.ubiobio.cl"), null);
  assert.equal(roleForEmail("elpapijuaco325@gmail.com.attacker.com"), null);
});

test("treats only the two developer addresses as owners", () => {
  assert.equal(DEVELOPER_EMAILS.size, 2);
  for (const email of DEVELOPER_EMAILS) {
    assert.equal(roleForEmail(email), "owner");
    assert.ok(isDeveloperEmail(email.toUpperCase()));
  }
  assert.equal(isDeveloperEmail("otro@gmail.com"), false);
});

test("every enforcement surface grants owner access to the same addresses", async () => {
  for (const path of OWNER_SURFACES) {
    const source = await readSurface(path);
    for (const email of DEVELOPER_EMAILS) {
      assert.ok(source.includes(email), `${path} does not grant owner access to ${email}`);
    }
  }
});

test("every enforcement surface recognises the same institutional domains", async () => {
  for (const path of DOMAIN_SURFACES) {
    const source = (await readSurface(path)).replace(/\\/g, "");
    assert.ok(source.includes(STUDENT_DOMAIN.slice(1)), `${path} does not recognise ${STUDENT_DOMAIN}`);
    assert.ok(source.includes(TEACHER_DOMAIN.slice(1)), `${path} does not recognise ${TEACHER_DOMAIN}`);
  }
});

test("the web modules derive roles through the access policy only", async () => {
  for (const path of POLICY_CONSUMERS) {
    const source = await readSurface(path);
    assert.doesNotMatch(source, /endsWith\(\s*["'`]@/, `${path} re-derives a role from an email domain`);
  }
});
