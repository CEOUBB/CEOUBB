import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ACCESS_CASES,
  STUDENT_DOMAIN,
  TEACHER_DOMAIN,
  roleForEmail,
} from "../lib/access-policy.ts";

/*
  Tras la migración a Capacitor la capa nativa ya no interpreta dominios (REQ-CAP-12):
  `ClassroomService.java` desapareció con el WebView artesanal y no se sustituye. Quedan
  cuatro espejos de la política — `lib/access-policy.ts`, las dos reglas de Firebase y
  `firebase.xml`, que desde SPEC-010 ya no enumera cuentas personales.
*/
const ENFORCEMENT_SURFACES = [
  "../firebase/firestore.rules",
  "../firebase/storage.rules",
  "../android/app/src/main/res/values/firebase.xml",
];

const DOMAIN_SURFACES = ["../firebase/firestore.rules", "../firebase/storage.rules"];

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
    assert.equal(
      roleForEmail(item.email),
      item.role,
      `${item.email || "(empty)"} must resolve to ${item.role}`
    );
  }
});

test("covers teacher, student and rejection", () => {
  const roles = new Set<string | null>(ACCESS_CASES.map((item) => item.role));
  for (const expected of ["teacher", "student", null]) {
    assert.ok(roles.has(expected), `the access matrix is missing a ${expected ?? "rejected"} case`);
  }
});

test("rejects lookalike and subdomain addresses", () => {
  assert.equal(roleForEmail("alumno@alumnos.ubiobio.cl.attacker.com"), null);
  assert.equal(roleForEmail("docente@notubiobio.cl"), null);
  assert.equal(roleForEmail("docente@correo.ubiobio.cl"), null);
});

// Implements: REQ-SEC-01
test("no email outside the institutional domains can ever derive a role", () => {
  for (const email of [
    "elpapijuaco325@gmail.com",
    "felipearce.2004@gmail.com",
    "ELPAPIJUACO325@GMAIL.COM",
    "  felipearce.2004@gmail.com  ",
    "cualquiera@gmail.com",
    "admin@ubiobio.cl.attacker.com",
  ]) {
    assert.equal(roleForEmail(email), null, `${email} must not derive any role`);
  }
});

// Implements: REQ-SEC-01
test("the owner role is never derived from an email address", () => {
  assert.equal(
    ACCESS_CASES.some((item) => item.role === "owner"),
    false,
    "the access matrix must not promote anyone to owner from their address"
  );
  const source = ACCESS_CASES.map((item) => item.email).join("\n");
  assert.doesNotMatch(source, /@gmail\.com"?\s*,\s*role:\s*"owner"/);
});

// Implements: REQ-SEC-01
test("no enforcement surface carries a hardcoded personal account", async () => {
  for (const path of ENFORCEMENT_SURFACES) {
    const source = await readSurface(path);
    assert.doesNotMatch(
      source,
      /[\w.+-]+@(?!alumnos\.ubiobio\.cl|ubiobio\.cl)[\w.-]+\.[a-z]{2,}/i,
      `${path} still hardcodes a personal account`
    );
  }
});

// Implements: REQ-SEC-01
test("the shipped access matrix carries no personal address at all", async () => {
  const source = await readSurface("../lib/access-policy.ts");
  assert.doesNotMatch(
    source,
    /elpapijuaco325|felipearce/i,
    "a personal address must not travel inside the browser bundle"
  );
});

test("every enforcement surface recognises the same institutional domains", async () => {
  for (const path of DOMAIN_SURFACES) {
    const source = (await readSurface(path)).replace(/\\/g, "");
    assert.ok(
      source.includes(STUDENT_DOMAIN.slice(1)),
      `${path} does not recognise ${STUDENT_DOMAIN}`
    );
    assert.ok(
      source.includes(TEACHER_DOMAIN.slice(1)),
      `${path} does not recognise ${TEACHER_DOMAIN}`
    );
  }
});

// Implements: REQ-SEC-01
test("both rule files derive the owner rank from the stored user document", async () => {
  for (const path of DOMAIN_SURFACES) {
    const source = await readSurface(path);
    assert.match(source, /function isOwner\(\)\s*\{\s*return role\(\) == 'owner';/);
  }
});

// Implements: REQ-SEC-02
test("firestore rules gate course data on an active enrollment projection", async () => {
  const source = await readSurface("../firebase/firestore.rules");
  assert.match(
    source,
    /function isEnrolled\(seccionId\)[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/enrollments\/\$\(request\.auth\.uid\)\/sections\/\$\(seccionId\)\)/
  );
  for (const collection of ["posts", "meta", "grades", "progress"]) {
    assert.match(
      source,
      new RegExp(`match /courses/\\{courseId\\}/${collection}/`),
      `the ${collection} collection is no longer guarded`
    );
  }
  assert.doesNotMatch(
    source,
    /match \/\{path=\*\*\}\//,
    "a collection-group wildcard would reopen every section of the university"
  );
  assert.match(source, /match \/courses\/\{courseId\}\/posts\/\{postId\}[\s\S]*?allow read: if isOwner\(\) \|\| isMember\(\) && isEnrolled\(courseId\)/);
  assert.match(source, /match \/courses\/\{courseId\}\/meta\/\{documentId\}[\s\S]*?allow read: if isOwner\(\) \|\| isMember\(\) && isEnrolled\(courseId\)/);
});

// Implements: REQ-SEC-02
test("the enrollment projection is read-only for every client", async () => {
  const source = await readSurface("../firebase/firestore.rules");
  assert.match(
    source,
    /match \/enrollments\/\{userId\}\/sections\/\{seccionId\}[\s\S]*?allow write: if false;/
  );
});

// Implements: REQ-EVAL-01
test("storage rules let an enrolled student submit up to 25 MB under their own uid", async () => {
  const source = await readSurface("../firebase/storage.rules");
  assert.match(source, /match \/courses\/\{courseId\}\/submissions\/\{evalId\}\/\{userId\}\/\{fileName\}/);
  assert.match(source, /request\.auth\.uid == userId && request\.resource\.size > 0 && request\.resource\.size <= 25 \* 1024 \* 1024/);
  assert.match(source, /allow create, update: if isMember\(\) && isEnrolled\(courseId\)/);
});

test("the web modules derive roles through the access policy only", async () => {
  for (const path of POLICY_CONSUMERS) {
    const source = await readSurface(path);
    assert.doesNotMatch(
      source,
      /endsWith\(\s*["'`]@/,
      `${path} re-derives a role from an email domain`
    );
  }
});
