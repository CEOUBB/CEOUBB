import assert from "node:assert/strict";
import { createPrivateKey } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import {
  asignaturas,
  departamentos,
  facultades,
  interopGrants,
  interopResources,
  matriculas,
  periodos,
  secciones,
  sessions,
  users,
} from "../db/schema.ts";
import { createSession } from "../lib/auth.ts";
import { exportPublishedQuiz } from "../lib/services/interop-qti.ts";
import { parseGift } from "../lib/quizzes.ts";
import { importQtiBank } from "../lib/interop/qti.ts";
import type { PublicUser } from "../lib/auth.ts";
import { InteropError } from "../lib/interop/errors.ts";
import { ltiRole, publicLtiKeys } from "../lib/interop/lti.ts";
import { contentHeaders, playerDocument } from "../lib/interop/player.ts";
import {
  authorizeInteropSection,
  authorizeLti,
  contentGrant,
  getXapiStatement,
  hashToken,
  insertInteropResource,
  launchInteropResource,
  linkLtiResource,
  listInteropResources,
  loadInteropProgress,
  registerTool,
  saveInteropProgress,
  saveXapiStatements,
  setToolEnabled,
} from "../lib/services/interop.ts";
import {
  GET as listRoute,
  POST as resourceRoute,
} from "../app/api/courses/[sectionId]/interop/route.ts";
import { GET as authorizeRoute } from "../app/api/interop/lti/authorize/route.ts";
import { GET as contentRoute } from "../app/api/interop/content/[grant]/[...path]/route.ts";

const owner: PublicUser = {
  id: "owner",
  role: "owner",
  email: "owner@ubiobio.cl",
  name: "Administración",
};
const teacher: PublicUser = {
  id: "teacher",
  role: "teacher",
  email: "teacher@ubiobio.cl",
  name: "Docente",
};
const student: PublicUser = {
  id: "student",
  role: "student",
  email: "student@alumnos.ubiobio.cl",
  name: "Estudiante",
};
const outsider: PublicUser = {
  id: "outsider",
  role: "teacher",
  email: "outsider@ubiobio.cl",
  name: "Docente ajeno",
};
const section = "fisica-2026-2-1";
const status = (code: number) => (error: unknown) =>
  error instanceof InteropError && error.status === code;

test("REQ-IO-01–11 servicios, contratos HTTP y migración sobre libSQL", async (t) => {
  process.env.TURSO_DATABASE_URL = "file::memory:?cache=shared";
  process.env.INTEROP_PLATFORM_ORIGIN = "https://portal.test";
  process.env.INTEROP_CONTENT_ORIGIN = "https://contenido.test";
  const db = getDb();
  for (const file of (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((p) => /^\d{4}_.+\.sql$/.test(p))
    .sort()) {
    await db.$client.executeMultiple(
      (await readFile(new URL("../drizzle/" + file, import.meta.url), "utf8")).replaceAll(
        "--> statement-breakpoint",
        ""
      )
    );
  }
  const now = new Date().toISOString();
  await db
    .insert(users)
    .values([owner, teacher, student, outsider].map((u) => ({ ...u, createdAt: now })));
  await db.insert(facultades).values({ id: "f", nombre: "Ingeniería", sede: "Concepcion" });
  await db.insert(departamentos).values({ id: "d", facultadId: "f", nombre: "Mecánica" });
  await db
    .insert(asignaturas)
    .values({ id: "a", departamentoId: "d", codigo: "F101", nombre: "Física", creditosSct: 6 });
  await db.insert(periodos).values({
    id: "p",
    nombre: "2026-2",
    fechaInicio: "2026-08-01",
    fechaFin: "2026-12-31",
    estado: "abierto",
  });
  await db.insert(secciones).values({
    id: section,
    asignaturaId: "a",
    periodoId: "p",
    docenteId: teacher.id,
    createdAt: now,
  });
  await db.insert(matriculas).values([
    {
      id: "mt",
      seccionId: section,
      usuarioId: teacher.id,
      rolSeccion: "teacher",
      estado: "activa",
      createdAt: now,
    },
    {
      id: "ms",
      seccionId: section,
      usuarioId: student.id,
      rolSeccion: "student",
      estado: "activa",
      createdAt: now,
    },
  ]);
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
  process.env.LTI_PRIVATE_JWK = JSON.stringify({
    ...(await crypto.subtle.exportKey("jwk", keyPair.privateKey)),
    kid: "test-key",
  });
  const toolInput = {
    name: "Laboratorio",
    loginUrl: "https://tool.test/login",
    redirectUris: ["https://tool.test/launch"],
    targetUris: ["https://tool.test/lab"],
  };
  const tool = await registerTool(owner, toolInput);
  const resourceId = await linkLtiResource(teacher, section, {
    title: "Laboratorio",
    toolId: tool.id,
    targetUrl: tool.targetUris[0],
  });
  const cookie = (await createSession(student.id)).split(";")[0];
  const sessionHash = await hashToken(cookie.split("=")[1]);
  const routeContext = { params: Promise.resolve({ sectionId: section }) };

  await t.test("matrícula, permisos docentes, CSRF y sección cerrada", async () => {
    await assert.rejects(() => authorizeInteropSection(student, section, true), status(403));
    await assert.rejects(() => authorizeInteropSection(outsider, section), status(403));
    assert.equal((await authorizeInteropSection(teacher, section, true)).role, "teacher");
    assert.equal(
      (
        await listRoute(
          new Request("https://portal.test/api/courses/" + section + "/interop"),
          routeContext
        )
      ).status,
      401
    );
    assert.equal(
      (
        await resourceRoute(
          new Request("https://portal.test/api/courses/" + section + "/interop", {
            method: "POST",
            headers: { cookie, origin: "https://evil.test" },
          }),
          routeContext
        )
      ).status,
      403
    );
    assert.equal(
      (
        await resourceRoute(
          new Request("https://portal.test/api/courses/" + section + "/interop", {
            method: "POST",
            headers: { cookie, origin: "https://portal.test", "content-type": "application/json" },
            body: "{}",
          }),
          routeContext
        )
      ).status,
      403
    );
    await db.update(periodos).set({ estado: "archivado" }).where(eq(periodos.id, "p"));
    await assert.rejects(() => authorizeInteropSection(owner, section, true), status(403));
    await assert.rejects(
      () => launchInteropResource(student, section, resourceId, sessionHash),
      status(403)
    );
    await db.update(periodos).set({ estado: "abierto" }).where(eq(periodos.id, "p"));
  });
  await t.test("registro owner, HTTPS y destinos exactos", async () => {
    await assert.rejects(() => registerTool(teacher, toolInput), status(403));
    await assert.rejects(() => registerTool(owner, { ...toolInput, loginUrl: "http://tool.test" }));
    await assert.rejects(() =>
      registerTool(owner, { ...toolInput, loginUrl: "https://user:password@tool.test" })
    );
    await assert.rejects(() =>
      linkLtiResource(teacher, section, {
        title: "Manipulado",
        toolId: tool.id,
        targetUrl: "https://tool.test/other",
      })
    );
    assert.equal(
      await linkLtiResource(teacher, section, {
        title: "Repetido",
        toolId: tool.id,
        targetUrl: tool.targetUris[0],
      }),
      resourceId
    );
  });
  await t.test("LTI OIDC firma verificable, nonce, rol y consumo atómico de hint", async () => {
    const start = await launchInteropResource(student, section, resourceId, sessionHash);
    const hint = new URL(start.url).searchParams.get("login_hint")!;
    const parameters = {
      client_id: tool.clientId,
      login_hint: hint,
      lti_message_hint: resourceId,
      redirect_uri: tool.redirectUris[0],
      response_type: "id_token",
      response_mode: "form_post",
      scope: "openid",
      prompt: "none",
      nonce: "nonce-from-tool",
      state: "tool-state",
    };
    await assert.rejects(
      () =>
        authorizeLti(student, sessionHash, {
          ...parameters,
          redirect_uri: "https://tool.test/launch?evil=1",
        }),
      status(400)
    );
    await assert.rejects(() => authorizeLti(student, "another-session", parameters), status(401));
    const request = () =>
      new Request(
        "https://portal.test/api/interop/lti/authorize?" + new URLSearchParams(parameters),
        { headers: { cookie } }
      );
    const responses = await Promise.all([authorizeRoute(request()), authorizeRoute(request())]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const success = responses.find((r) => r.status === 200)!;
    assert.equal(success.headers.get("cache-control"), "no-store");
    const html = await success.text();
    const jwt = html.match(/name="id_token" value="([^"]+)"/)![1];
    const [header, claims, signature] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    assert.equal(payload.nonce, parameters.nonce);
    assert.equal(payload.iss, "https://portal.test");
    assert.equal(payload.aud, tool.clientId);
    assert.equal(payload["https://purl.imsglobal.org/spec/lti/claim/context"].id, section);
    assert.deepEqual(payload["https://purl.imsglobal.org/spec/lti/claim/context"].type, [
      "http://purl.imsglobal.org/vocab/lis/v2/course#CourseSection",
    ]);
    assert.equal(ltiRole("assistant"), ltiRole("student"));
    assert.equal(
      payload["https://purl.imsglobal.org/spec/lti/claim/roles"][0],
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
    );
    assert.equal(
      payload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
      tool.deploymentId
    );
    assert.equal("email" in payload, false);
    assert.equal(
      await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        keyPair.publicKey,
        Buffer.from(signature, "base64url"),
        new TextEncoder().encode(header + "." + claims)
      ),
      true
    );
    assert.equal(payload.exp - payload.iat, 60);
    const published = publicLtiKeys();
    assert.deepEqual(Object.keys(published.keys[0]).sort(), ["alg", "e", "kid", "kty", "n", "use"]);
    await setToolEnabled(owner, tool.id, false);
    await assert.rejects(
      () => launchInteropResource(student, section, resourceId, sessionHash),
      status(404)
    );
    await setToolEnabled(owner, tool.id, true);
  });
  const manifest = {
    kind: "scorm12" as const,
    title: "Prueba",
    launchPath: "index.html",
    activityId: "",
    files: [{ name: "index.html", size: 10 }],
  };
  const packageId = await insertInteropResource({
    id: crypto.randomUUID(),
    sectionId: section,
    title: "Prueba SCORM",
    kind: "scorm12",
    manifestJson: JSON.stringify(manifest),
    fingerprint: "fake-scorm",
    storagePrefix: "interop/test/",
    createdBy: teacher.id,
    createdAt: now,
  });
  const launch = await launchInteropResource(student, section, packageId, sessionHash);
  const grantToken = new URL(launch.url).pathname.split("/")[4];
  const context = await contentGrant(grantToken, "https://contenido.test");
  await t.test(
    "origen aislado, capacidad expirada, revocación y HTML sin credenciales",
    async () => {
      await assert.rejects(() => contentGrant(grantToken, "https://portal.test"), status(403));
      const response = await contentRoute(
        new Request(launch.url.replace("https://contenido.test", "https://portal.test")),
        { params: Promise.resolve({ grant: grantToken, path: ["player"] }) }
      );
      assert.equal(response.status, 403);
      assert.match(
        contentHeaders()["Content-Security-Policy"],
        /sandbox allow-scripts allow-same-origin/
      );
      assert.match(contentHeaders()["Content-Security-Policy"], /form-action 'none'/);
      const html = playerDocument({
        manifest,
        grant: grantToken,
        actorId: "anonymous",
        registration: context.grant.registration,
        progress: {
          version: 0,
          data: { "cmi.suspend_data": "</script><script>alert(1)</script>" },
        },
      });
      assert.equal(html.includes("</script><script>alert(1)"), false);
      assert.equal(html.includes(student.email), false);
      await db.update(matriculas).set({ estado: "retirada" }).where(eq(matriculas.id, "ms"));
      await assert.rejects(() => contentGrant(grantToken, "https://contenido.test"), status(403));
      await db.update(matriculas).set({ estado: "activa" }).where(eq(matriculas.id, "ms"));
      await db
        .update(interopGrants)
        .set({ expiresAt: "2020-01-01T00:00:00.000Z" })
        .where(eq(interopGrants.tokenHash, context.grant.tokenHash));
      await assert.rejects(() => contentGrant(grantToken, "https://contenido.test"), status(401));
      await db
        .update(interopGrants)
        .set({ expiresAt: new Date(Date.now() + 3600000).toISOString() })
        .where(eq(interopGrants.tokenHash, context.grant.tokenHash));
    }
  );
  await t.test("persistencia SCORM, conflicto optimista y campos manipulados", async () => {
    assert.deepEqual(
      await saveInteropProgress(context, {
        version: 0,
        data: { "cmi.core.lesson_location": "p2", "cmi.suspend_data": "resume" },
      }),
      { version: 1 }
    );
    assert.deepEqual(await loadInteropProgress(packageId, student.id), {
      version: 1,
      data: { "cmi.core.lesson_location": "p2", "cmi.suspend_data": "resume" },
    });
    await assert.rejects(() => saveInteropProgress(context, { version: 0, data: {} }), status(409));
    await assert.rejects(
      () => saveInteropProgress(context, { version: 1, data: { "cmi.core.score.raw": "invalid" } }),
      status(400)
    );
    assert.deepEqual(await loadInteropProgress(packageId, teacher.id), { version: 0, data: {} });
  });
  await t.test("xAPI idempotencia, actor, consulta acotada y cuota", async () => {
    const xapiManifest = { ...manifest, kind: "xapi", activityId: "https://example.test/activity" };
    const xapiId = await insertInteropResource({
      id: crypto.randomUUID(),
      sectionId: section,
      title: "xAPI",
      kind: "xapi",
      manifestJson: JSON.stringify(xapiManifest),
      fingerprint: "fake-xapi",
      createdBy: teacher.id,
      createdAt: now,
    });
    const start = await launchInteropResource(student, section, xapiId, sessionHash);
    const token = new URL(start.url).pathname.split("/")[4];
    const xapi = await contentGrant(token, "https://contenido.test");
    const statement = {
      id: crypto.randomUUID(),
      actor: { account: { homePage: "https://portal.test", name: await hashToken(student.id) } },
      verb: { id: "http://adlnet.gov/expapi/verbs/completed" },
      object: { id: xapiManifest.activityId },
      result: { completion: true },
    };
    assert.deepEqual(await saveXapiStatements(xapi, statement), [statement.id]);
    assert.deepEqual(await saveXapiStatements(xapi, statement), [statement.id]);
    await assert.rejects(
      () => saveXapiStatements(xapi, { ...statement, result: { completion: false } }),
      status(409)
    );
    await assert.rejects(
      () =>
        saveXapiStatements(xapi, {
          ...statement,
          actor: { account: { homePage: "https://portal.test", name: "other" } },
        }),
      status(403)
    );
    const stored = await getXapiStatement(xapi, statement.id);
    assert.equal(typeof stored, "object");
    const count = await db
      .select()
      .from(interopGrants)
      .where(eq(interopGrants.tokenHash, xapi.grant.tokenHash))
      .limit(1);
    assert.equal(count[0].writeCount, 1);
    await db
      .update(interopGrants)
      .set({ writeCount: 1000 })
      .where(eq(interopGrants.tokenHash, xapi.grant.tokenHash));
    await assert.rejects(
      () => saveXapiStatements(xapi, { ...statement, id: crypto.randomUUID() }),
      status(429)
    );
  });
  await t.test("QTI publicado protege la pauta y conserva el banco docente", async (t) => {
    const bank = parseGift("::Vector::Magnitud vectorial {=Fuerza~Masa}").questions;
    const field = (v: unknown): unknown =>
      v === null
        ? { nullValue: null }
        : typeof v === "string"
          ? { stringValue: v }
          : typeof v === "number"
            ? { doubleValue: v }
            : Array.isArray(v)
              ? { arrayValue: { values: v.map(field) } }
              : {
                  mapValue: {
                    fields: Object.fromEntries(
                      Object.entries(v as Record<string, unknown>).map(([k, value]) => [
                        k,
                        field(value),
                      ])
                    ),
                  },
                };
    const privateBytes = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "fixture@example.test";
    process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = createPrivateKey({
      key: Buffer.from(privateBytes),
      format: "der",
      type: "pkcs8",
    })
      .export({ format: "pem", type: "pkcs8" })
      .toString();
    let requests = 0;
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
      requests++;
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token")
        return Response.json({ access_token: "fixture-token", expires_in: 3600 });
      assert.match(
        url,
        /\/courses\/fisica-2026-2-1\/(quizzes|quizKeys)\/quiz-test\?mask.fieldPaths=/
      );
      const key = url.includes("/quizKeys/") ? "answers" : "questions";
      return Response.json({
        fields: {
          [key]: field(bank.map((entry) => (key === "answers" ? entry.answer : entry.question))),
        },
      });
    });
    await assert.rejects(() => exportPublishedQuiz(student, section, "quiz-test"), status(403));
    await assert.rejects(() => exportPublishedQuiz(outsider, section, "quiz-test"), status(403));
    assert.equal(requests, 0);
    const zip = await exportPublishedQuiz(teacher, section, "quiz-test");
    const imported = await importQtiBank(zip);
    assert.deepEqual(
      imported.questions.map((e) => e.question),
      bank.map((e) => e.question)
    );
    assert.deepEqual(
      imported.questions.map((e) => e.answer),
      bank.map((e) => e.answer)
    );
    assert.equal(requests, 3);
  });
  await t.test("cierre y expiración de sesión revocan la capacidad de contenido", async () => {
    const [original] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, sessionHash))
      .limit(1);
    await db
      .update(sessions)
      .set({ expiresAt: "2000-01-01T00:00:00.000Z" })
      .where(eq(sessions.tokenHash, sessionHash));
    await assert.rejects(() => contentGrant(grantToken, "https://contenido.test"), status(401));
    await db.delete(sessions).where(eq(sessions.tokenHash, sessionHash));
    await assert.rejects(() => contentGrant(grantToken, "https://contenido.test"), status(401));
    await db.insert(sessions).values(original);
    assert.equal((await contentGrant(grantToken, "https://contenido.test")).actor.id, student.id);
  });
  await t.test("lista con cursor y límite institucional", async () => {
    const rows = Array.from({ length: 97 }, (_, i) => ({
      id: "paging-" + String(i).padStart(3, "0"),
      sectionId: section,
      title: "Recurso",
      kind: "lti" as const,
      fingerprint: "page-" + i,
      createdBy: teacher.id,
      createdAt: now,
    }));
    await db.insert(interopResources).values(rows);
    const first = await listInteropResources(student, section);
    assert.equal(first.items.length, 50);
    assert.ok(first.nextCursor);
    const second = await listInteropResources(student, section, first.nextCursor!);
    assert.equal(second.items.length, 50);
    assert.equal(new Set([...first.items, ...second.items].map((r) => r.id)).size, 100);
    await assert.rejects(
      () => insertInteropResource({ ...rows[0], id: "overflow", fingerprint: "overflow" }),
      status(429)
    );
  });
});
