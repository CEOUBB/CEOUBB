import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { sql } from "drizzle-orm";
import { ACCESS_CASES, roleForEmail } from "../lib/access-policy.ts";
import { getDb } from "../db/index.ts";
import {
  authorizeMoodleImport,
  startMoodleImport,
  writeMoodleImportPosts,
  reconcileMoodleRoster,
} from "../lib/services/moodle-import.ts";
import {
  commitOpenSectionWrites,
  invalidateCourseDownloadTokens,
} from "../lib/services/enrollment-projection.ts";
import {
  firebaseCredentialIsActive,
  revokeFirebaseAccess,
  deleteFirebaseAccountData,
} from "../lib/services/firebase-revocation.ts";
import { verifyDiscordSignature } from "../lib/discord/signature.ts";
import { verifyTurnstileToken } from "../lib/services/turnstile.ts";
import { createZip, openPackageZip } from "../lib/interop/zip.ts";
import { exportQtiBank, importQtiBank } from "../lib/interop/qti.ts";
import { parseGift } from "../lib/quizzes.ts";

const require = createRequire(import.meta.url);
const { authenticationIsActive } = require("../firebase/functions/auth-access.js");
const generatedPolicy = require("../firebase/functions/generated/access-policy.js");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "audit@example.test";
process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey
  .export({ type: "pkcs8", format: "pem" })
  .toString();
const temporaryDirectory = mkdtempSync(join(tmpdir(), "ceoubb-audit-081-"));
process.env.TURSO_DATABASE_URL = `file:${join(temporaryDirectory, "audit.db").replaceAll("\\", "/")}`;
after(() => {
  getDb().$client.close();
  // libSQL conserva handles de transacciones hasta salir del proceso en Windows.
  if (process.platform !== "win32") rmSync(temporaryDirectory, { recursive: true });
});

test("SEC-01/INV-02: Callables exigen dominio institucional y autenticación posterior al corte", () => {
  for (const entry of ACCESS_CASES)
    assert.equal(generatedPolicy.roleForEmail(entry.email), roleForEmail(entry.email));
  const auth = {
    uid: "student-1",
    token: { email: "student@alumnos.ubiobio.cl", email_verified: true, auth_time: 101 },
  };
  assert.equal(authenticationIsActive(auth, null), true);
  assert.equal(authenticationIsActive(auth, { revokedAt: 100 }), true);
  assert.equal(authenticationIsActive(auth, { revokedAt: 101 }), false);
  assert.equal(authenticationIsActive(auth, { revokedAt: 100, disabled: true }), false);
  assert.equal(authenticationIsActive(auth, {}), false);
  assert.equal(
    authenticationIsActive(
      { ...auth, token: { ...auth.token, email: "external@example.test" } },
      null
    ),
    false
  );
});

test("SEC-01: el intercambio de token rechaza credenciales revocadas y errores del proveedor", async (t) => {
  let status = 200;
  let disabled = false;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    if (String(input).includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "synthetic", expires_in: 3600 });
    return Response.json(
      { fields: { revokedAt: { integerValue: "100" }, disabled: { booleanValue: disabled } } },
      { status }
    );
  });
  const token = (authTime: number) =>
    `header.${Buffer.from(JSON.stringify({ sub: "student-1", auth_time: authTime })).toString("base64url")}.signature`;
  assert.equal(await firebaseCredentialIsActive(token(100), "student-1"), false);
  assert.equal(await firebaseCredentialIsActive(token(101), "student-1"), true);
  disabled = true;
  assert.equal(await firebaseCredentialIsActive(token(101), "student-1"), false);
  assert.equal(await firebaseCredentialIsActive(token(101), "other"), false);
  status = 503;
  await assert.rejects(firebaseCredentialIsActive(token(101), "student-1"));
});

test("SEC-01: eliminación reintentable conserva lápida y limpia proyecciones antes de identidad", async (t) => {
  const operations: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "synthetic", expires_in: 3600 });
    if (url.includes(":commit")) {
      const data = JSON.parse(String(init?.body));
      for (const write of data.writes) {
        if (write.update) {
          operations.push("block");
          assert.equal(write.update.fields.disabled.booleanValue, true);
          assert.equal(write.updateTransforms[0].fieldPath, "revokedAt");
        }
        if (write.delete) {
          operations.push("delete-profile");
          assert.ok(!write.delete.includes("authRevocations"));
        }
      }
      return Response.json({});
    }
    if (url.includes("accounts:update")) {
      operations.push("disable-auth");
      return Response.json({ error: { message: "USER_NOT_FOUND" } }, { status: 400 });
    }
    if (url.includes("accounts:delete")) {
      operations.push("delete-auth");
      return Response.json({ error: { message: "USER_NOT_FOUND" } }, { status: 400 });
    }
    operations.push("list-projections");
    return Response.json({ documents: [] });
  });
  await revokeFirebaseAccess("firebase:student-1", true);
  await deleteFirebaseAccountData("firebase:student-1");
  assert.equal(operations[0], "block");
  assert.equal(operations.at(-1), "delete-auth");
  assert.ok(operations.indexOf("list-projections") < operations.indexOf("delete-profile"));
});

test("SEC-03: matrícula docente y owner conservan lectura pero no importan en períodos archivados", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("No debe escribir en Firebase");
  });
  const db = getDb();
  for (const ddl of [
    "CREATE TABLE periodos (id TEXT PRIMARY KEY, estado TEXT)",
    "CREATE TABLE secciones (id TEXT PRIMARY KEY, periodo_id TEXT)",
    "CREATE TABLE matriculas (id TEXT, seccion_id TEXT, usuario_id TEXT, estado TEXT, rol_seccion TEXT)",
    "CREATE TABLE moodle_imports (id TEXT, seccion_id TEXT, fingerprint TEXT)",
    "INSERT INTO periodos VALUES ('period-1', 'archivado')",
    "INSERT INTO secciones VALUES ('section-1', 'period-1')",
    "INSERT INTO matriculas VALUES ('m1', 'section-1', 'teacher-1', 'activa', 'teacher')",
    "INSERT INTO moodle_imports VALUES ('import-1', 'section-1', 'fingerprint')",
  ])
    await db.run(sql.raw(ddl));
  const teacher = {
    id: "teacher-1",
    name: "Docente",
    email: "teacher@ubiobio.cl",
    role: "teacher" as const,
  };
  const source = {
    sourceKey: "source",
    fingerprint: "fingerprint",
    courseId: "1",
    courseName: "Curso",
    courseShortName: "C",
    moodleVersion: "4",
    fileName: "course.mbz",
  };
  for (const actor of [teacher, { ...teacher, role: "owner" as const }]) {
    await authorizeMoodleImport(actor, "section-1");
    await assert.rejects(authorizeMoodleImport(actor, "section-1", true), /cerrado/);
    await assert.rejects(startMoodleImport(actor, "section-1", source), /cerrado/);
    await assert.rejects(
      writeMoodleImportPosts(actor, "section-1", "source", "fingerprint", []),
      /cerrado/
    );
  }
  await assert.rejects(reconcileMoodleRoster("section-1", "fingerprint", []), /cerrado/);
  await db.run(sql`UPDATE periodos SET estado = 'abierto'`);
  await authorizeMoodleImport(teacher, "section-1", true);
  await db.run(sql`UPDATE periodos SET estado = 'archivado'`);
  await assert.rejects(
    writeMoodleImportPosts(teacher, "section-1", "source", "fingerprint", []),
    /cerrado/
  );
});

test("SEC-03: Firestore rechaza cierre entre lectura y commit y libera la transacción", async (t) => {
  let conflict = true;
  let rolledBack = false;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "synthetic", expires_in: 3600 });
    if (url.endsWith(":beginTransaction")) return Response.json({ transaction: "transaction-id" });
    if (url.includes("academicSections"))
      return Response.json({ fields: { periodoId: { stringValue: "period-1" } } });
    if (url.includes("academicPeriods"))
      return Response.json({ fields: { status: { stringValue: "abierto" } } });
    if (url.endsWith(":rollback")) {
      rolledBack = true;
      return Response.json({});
    }
    assert.equal(JSON.parse(String(init?.body)).transaction, "transaction-id");
    return Response.json({}, { status: conflict ? 409 : 200 });
  });
  await assert.rejects(commitOpenSectionWrites("section-1", []), /cambió/);
  assert.equal(rolledBack, true);
  conflict = false;
  await commitOpenSectionWrites("section-1", []);
});

test("SEC-06: revoca tokens antiguos por páginas y con precondición de versión", async (t) => {
  const patches: string[] = [];
  let conflict = false;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.hostname === "oauth2.googleapis.com")
      return Response.json({ access_token: "synthetic", expires_in: 3600 });
    if (init?.method === "PATCH") {
      assert.deepEqual(JSON.parse(String(init.body)), {
        metadata: { firebaseStorageDownloadTokens: null },
      });
      assert.equal(url.searchParams.get("ifMetagenerationMatch"), "7");
      patches.push(url.pathname);
      return Response.json({}, { status: conflict ? 412 : 200 });
    }
    assert.equal(url.searchParams.get("prefix"), "courses/section-1/");
    assert.equal(url.searchParams.get("maxResults"), "100");
    return Response.json(
      url.searchParams.has("pageToken")
        ? { items: [] }
        : {
            nextPageToken: "page-2",
            items: [
              {
                name: "courses/section-1/teacher/file.pdf",
                metageneration: "7",
                metadata: { firebaseStorageDownloadTokens: "synthetic" },
              },
            ],
          }
    );
  });
  await invalidateCourseDownloadTokens("section-1");
  assert.equal(patches.length, 1);
  conflict = true;
  await assert.rejects(invalidateCourseDownloadTokens("section-1"), /cambió/);
});

test(
  "SEC-07: QTI anidado se rechaza sin volver a serializar cadenas por nivel",
  { timeout: 5000 },
  async () => {
    const bank = exportQtiBank(parseGift("::Capital::Capital {=Santiago~Lima}").questions);
    const entries = await openPackageZip(bank);
    const files = await Promise.all(
      entries.entries.map(async ({ name }) => ({ name, bytes: await entries.read(name) }))
    );
    const item = files.find((file) => file.name.startsWith("items/"))!;
    const xml = new TextDecoder().decode(item.bytes);
    const nested =
      "<responseCondition>".repeat(36) +
      '<baseValue baseType="float">1</baseValue>' +
      "</responseCondition>".repeat(36);
    item.bytes = new TextEncoder().encode(
      xml.replace(
        /<responseProcessing>[\s\S]*?<\/responseProcessing>/,
        `<responseProcessing>${nested}</responseProcessing>`
      )
    );
    assert.notEqual(new TextDecoder().decode(item.bytes), xml);
    const result = await importQtiBank(createZip(files));
    assert.equal(result.questions.length, 0);
    assert.equal(result.warnings.length, 1);
  }
);

test("CFG-01/05: producción sin Turnstile y firmas Discord antiguas fallan cerradas", async (t) => {
  const previousEnvironment = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  t.after(() => {
    if (previousEnvironment === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previousEnvironment });
  });
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await verifyTurnstileToken(), false);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const timestamp = String(Math.floor(Date.now() / 1000) - 600);
  const signature = sign(null, Buffer.from(timestamp + "{}"), privateKey).toString("hex");
  const key = publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("hex");
  assert.equal(verifyDiscordSignature("{}", signature, timestamp, key), false);
});
