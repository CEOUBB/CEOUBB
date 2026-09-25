import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { z } from "zod";
import { createClient } from "@libsql/client";
import { createPublicKey, verify } from "node:crypto";
import { unzipSync } from "fflate";
import { resolveQaRuntime } from "../../lib/qa-runtime.ts";
import {
  QA_ANSWER,
  QA_GRADE_ITEMS,
  QA_IDS,
  QA_QUESTION,
  QA_SECTIONS,
  QA_USERS,
  type QaRole,
} from "../fixtures.ts";

type Actor = { api: APIRequestContext; token: string };
const test = base.extend<{ actor: (role: QaRole) => Promise<Actor> }>({
  actor: async ({ playwright, baseURL }, provideActor) => {
    const runtime = resolveQaRuntime();
    if (!runtime || !baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
      throw new Error("QA_API_REFUSED: API contracts require the guarded disposable runtime.");
    }
    const contexts: APIRequestContext[] = [];
    await provideActor(async (role) => {
      const api = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: { Origin: baseURL },
      });
      contexts.push(api);
      const user = QA_USERS[role];
      const authentication = await api.post(
        `${runtime.auth.origin}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=qa-local`,
        {
          data: { email: user.email, password: user.password, returnSecureToken: true },
        }
      );
      expect(authentication.status(), await authentication.text()).toBe(200);
      const { idToken } = z
        .object({ idToken: z.string().min(1) })
        .parse(await authentication.json());
      const exchange = await api.post("/api/auth/firebase", { data: { idToken } });
      expect(exchange.status(), await exchange.text()).toBe(200);
      expect(await exchange.json()).toMatchObject({
        user: { id: user.id, role: user.role, email: user.email },
      });
      return { api, token: idToken };
    });
    await Promise.all(contexts.map((context) => context.dispose()));
  },
});

test.beforeEach(async ({ baseURL }) => {
  if (
    !resolveQaRuntime() ||
    !baseURL ||
    !["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)
  ) {
    throw new Error("QA_API_REFUSED: all API checks require the guarded disposable runtime.");
  }
});

function documentsUrl(path: string) {
  const runtime = resolveQaRuntime();
  if (!runtime) throw new Error("QA_API_REFUSED: missing local runtime.");
  return `${runtime.firestore.origin}/v1/projects/${runtime.projectId}/databases/(default)/documents/${path}`;
}

async function callable(actor: Actor, name: string, data: object) {
  const runtime = resolveQaRuntime();
  if (!runtime) throw new Error("QA_API_REFUSED: missing local runtime.");
  return actor.api.post(
    `${runtime.functions.origin}/${runtime.projectId}/southamerica-west1/${name}`,
    {
      headers: { Authorization: `Bearer ${actor.token}` },
      data: { data },
    }
  );
}

// Implements: REQ-QA-03, REQ-QA-06, REQ-QA-09
for (const role of Object.keys(QA_USERS) as QaRole[]) {
  test(`api.auth.${role} @api @critical @area:auth`, async ({ actor }) => {
    const { api } = await actor(role);
    const me = await api.get("/api/auth/me?includeSections=1");
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({
      user: { id: QA_USERS[role].id, role: QA_USERS[role].role },
    });
    const enrollment = await api.get("/api/enrollments/me?limit=100");
    const memberships = z
      .object({
        sectionIds: z.array(z.string()),
        memberships: z.array(z.object({ sectionId: z.string(), role: z.string() })),
      })
      .parse(await enrollment.json());
    expect(memberships.sectionIds.sort()).toEqual(
      role === "outsider"
        ? [QA_SECTIONS.other]
        : [QA_SECTIONS.active, QA_SECTIONS.empty, QA_SECTIONS.additional].sort()
    );
    if (role !== "outsider")
      expect(memberships.memberships).toContainEqual({
        sectionId: QA_SECTIONS.active,
        role: role === "owner" ? "coordinator" : role,
      });
    const archive = await api.get("/api/enrollments/me?scope=archived&limit=100");
    const archived = z
      .object({ sections: z.array(z.object({ seccionId: z.string() })) })
      .parse(await archive.json());
    expect(archived.sections.map((section) => section.seccionId)).toEqual(
      role === "outsider" ? [] : [QA_SECTIONS.archived]
    );
    const sessions = await api.get("/api/profile/sessions");
    expect(sessions.status()).toBe(200);
    expect(await sessions.json()).toMatchObject({
      sessions: expect.arrayContaining([expect.objectContaining({ current: true })]),
    });
    expect((await api.post("/api/auth/logout")).status()).toBe(200);
    expect(await (await api.get("/api/auth/me")).json()).toEqual({ user: null });
  });
}

test("api.auth.denied @api @critical @area:auth", async ({ request, baseURL }) => {
  expect((await request.get("/api/auth/me")).status()).toBe(200);
  const contentOrigin = process.env.INTEROP_CONTENT_ORIGIN;
  expect(contentOrigin, "An isolated content host is required").toBeTruthy();
  expect(
    (await request.get(`${contentOrigin}/api/auth/me`)).status(),
    "Learning content cannot access application endpoints"
  ).toBe(404);
  const protectedPaths = [
    "/api/enrollments/me",
    "/api/courses/me",
    "/api/admin/users",
    "/api/admin/periods",
    "/api/profile/sessions",
    "/api/profile/preferences",
    "/api/teacher/courses",
    `/api/sections/${QA_SECTIONS.active}/participants`,
    `/api/teacher/courses/${QA_SECTIONS.active}/assistants`,
    `/api/courses/${QA_SECTIONS.active}/imports/moodle`,
    `/api/courses/${QA_SECTIONS.active}/imports/adecca`,
  ];
  for (const path of protectedPaths) expect((await request.get(path)).status(), path).toBe(401);
  expect(
    (
      await request.post("/api/auth/firebase", {
        data: { idToken: "invalid" },
        headers: { Origin: "https://untrusted.invalid" },
      })
    ).status()
  ).toBe(403);
  expect(
    (await request.post("/api/auth/firebase", { data: {}, headers: { Origin: baseURL! } })).status()
  ).toBe(400);
});

test("api.sections.isolation @api @critical @area:classroom", async ({ actor }) => {
  for (const role of Object.keys(QA_USERS) as QaRole[]) {
    const { api, token } = await actor(role);
    expect(
      (await api.get(`/api/sections/${QA_SECTIONS.active}/participants?limit=2`)).status(),
      role
    ).toBe(role === "outsider" ? 403 : 200);
    const read = await api.get(
      documentsUrl(`courses/${QA_SECTIONS.active}/posts/${QA_IDS.notice}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(read.status(), `${role} Firestore access`).toBe(role === "outsider" ? 403 : 200);
    const foreign = await api.get(`/api/sections/${QA_SECTIONS.other}/participants`);
    expect(foreign.status(), `${role} foreign section`).toBe(
      role === "outsider" || role === "owner" ? 200 : 403
    );
  }
});

test("api.storage.isolation @api @critical @area:files", async ({ actor }) => {
  const runtime = resolveQaRuntime()!;
  const url = `${runtime.storage.origin}/v0/b/${runtime.projectId}.firebasestorage.app/o/${encodeURIComponent(QA_IDS.filePath)}?alt=media`;
  for (const role of ["student", "teacher", "assistant", "outsider"] as const) {
    const { api, token } = await actor(role);
    const response = await api.get(url, { headers: { Authorization: `Firebase ${token}` } });
    expect(response.status(), role).toBe(role === "outsider" ? 403 : 200);
    if (response.ok()) expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
});

test("api.profile.persistence @api @area:settings", async ({ actor }) => {
  const { api } = await actor("student");
  const before = z
    .object({
      preferences: z.object({
        channels: z.record(z.string(), z.object({ web: z.boolean(), push: z.boolean() })),
        reducedMotion: z.boolean(),
      }),
    })
    .parse(await (await api.get("/api/profile/preferences")).json()).preferences;
  const preferences = { ...before, reducedMotion: !before.reducedMotion };
  try {
    expect((await api.put("/api/profile/preferences", { data: preferences })).status()).toBe(200);
    expect(await (await api.get("/api/profile/preferences")).json()).toEqual({ preferences });
    expect(
      (
        await api.put("/api/profile/preferences", { data: { ...preferences, arbitrary: true } })
      ).status()
    ).toBe(422);
    expect(
      (await api.delete("/api/profile/sessions", { data: { id: "0".repeat(64) } })).status()
    ).toBe(403);
    expect(
      (
        await api.post("/api/profile/photo", {
          data: "not-an-image",
          headers: { "Content-Type": "text/plain" },
        })
      ).status()
    ).toBe(400);
  } finally {
    expect((await api.put("/api/profile/preferences", { data: before })).status()).toBe(200);
  }
});

test("api.teacher.management @api @area:teacher", async ({ actor }) => {
  const { api } = await actor("teacher");
  const courses = await api.get("/api/teacher/courses?limit=100");
  expect(courses.status()).toBe(200);
  expect(await courses.json()).toMatchObject({
    courses: expect.arrayContaining([expect.objectContaining({ id: QA_SECTIONS.active })]),
  });
  const assistants = await api.get(`/api/teacher/courses/${QA_SECTIONS.active}/assistants`);
  expect(assistants.status()).toBe(200);
  expect(await assistants.json()).toMatchObject({
    assistants: expect.arrayContaining([
      expect.objectContaining({ email: QA_USERS.assistant.email }),
    ]),
  });
  try {
    const patch = await api.patch(`/api/teacher/courses/${QA_SECTIONS.active}`, {
      data: { room: "QA-202" },
    });
    expect(patch.status(), await patch.text()).toBe(200);
    expect(await patch.json()).toMatchObject({ course: { room: "QA-202" } });
    expect(await (await api.get("/api/teacher/courses?limit=100")).json()).toMatchObject({
      courses: expect.arrayContaining([
        expect.objectContaining({ id: QA_SECTIONS.active, room: "QA-202" }),
      ]),
    });
  } finally {
    expect(
      (
        await api.patch(`/api/teacher/courses/${QA_SECTIONS.active}`, { data: { room: "QA-101" } })
      ).status()
    ).toBe(200);
  }
  for (const role of ["student", "assistant"] as const) {
    const unauthorized = await actor(role);
    expect((await unauthorized.api.get("/api/teacher/courses")).status()).toBe(403);
    expect(
      (
        await unauthorized.api.patch(`/api/teacher/courses/${QA_SECTIONS.active}`, {
          data: { room: "DENIED" },
        })
      ).status()
    ).toBe(403);
  }
});

test("api.owner.permissions @api @critical @area:admin", async ({ actor }) => {
  const owner = await actor("owner");
  const page = await owner.api.get("/api/admin/users?limit=2&q=qa");
  expect(page.status()).toBe(200);
  expect(
    z.object({ users: z.array(z.object({ id: z.string() })) }).parse(await page.json()).users
  ).toHaveLength(2);
  expect((await owner.api.get("/api/admin/periods")).status()).toBe(200);
  expect(
    (
      await owner.api.patch("/api/admin/users", {
        data: { userId: QA_USERS.owner.id, role: "teacher" },
      })
    ).status()
  ).toBe(400);
  expect((await owner.api.delete("/api/auth/me")).status()).toBe(400);
  for (const role of ["student", "teacher", "assistant", "coordinator"] as const) {
    const { api } = await actor(role);
    expect((await api.get("/api/admin/users")).status()).toBe(403);
    expect((await api.get("/api/admin/periods")).status()).toBe(403);
  }
});

test("api.imports.validation @api @area:imports", async ({ actor }) => {
  const teacher = await actor("teacher");
  const payload = {
    sectionId: QA_SECTIONS.active,
    csv: `nombre,correo\nEstudiante QA,${QA_USERS.student.email}\nPendiente QA,qa.pending@alumnos.ubiobio.cl`,
  };
  const preview = await teacher.api.post("/api/enrollments/import/preview", { data: payload });
  expect(preview.status(), await preview.text()).toBe(200);
  expect(await preview.json()).toMatchObject({
    totalRows: 2,
    totals: { unchanged: 1, pending: 1 },
  });
  expect(
    (await teacher.api.post("/api/enrollments/import/apply", { data: payload })).status()
  ).toBe(400);
  for (const format of ["moodle", "adecca"]) {
    const url = `/api/courses/${QA_SECTIONS.active}/imports/${format}`;
    expect((await teacher.api.get(url)).status()).toBe(200);
    expect((await teacher.api.post(url, { data: {} })).status()).toBe(400);
    expect((await (await actor("student")).api.get(url)).status()).toBe(403);
  }
});

test("api.interop.validation @api @area:interop", async ({ actor }) => {
  const teacher = await actor("teacher");
  const url = `/api/courses/${QA_SECTIONS.active}/interop`;
  expect((await teacher.api.get(url)).status()).toBe(200);
  expect((await teacher.api.post(url, { data: {} })).status()).toBe(400);
  expect(
    (
      await teacher.api.post(url, { data: "invalid", headers: { "Content-Type": "text/plain" } })
    ).status()
  ).toBe(415);
  expect((await (await actor("outsider")).api.get(url)).status()).toBe(403);
  expect((await (await actor("student")).api.post(url, { data: {} })).status()).toBe(403);
});

test("api.support.persistence @api @area:public", async ({ actor }) => {
  const student = await actor("student");
  const subject = `QA API ${crypto.randomUUID()}`;
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    const submitted = await student.api.post("/api/soporte", {
      headers: { "cf-connecting-ip": "198.51.100.37" },
      data: {
        nombre: QA_USERS.student.name,
        email: QA_USERS.student.email,
        categoria: "soporte-tecnico",
        asunto: subject,
        mensaje: "Solicitud sintética para comprobar persistencia sin enviar correo real.",
        duracionMs: 4000,
      },
    });
    expect(submitted.status(), await submitted.text()).toBe(202);
    expect(await submitted.json()).toMatchObject({ estado: "recibido", entregado: false });
    const saved = await client.execute({
      sql: "SELECT email, user_id, estado FROM solicitudes_soporte WHERE asunto = ? LIMIT 1",
      args: [subject],
    });
    expect(saved.rows).toHaveLength(1);
    expect(saved.rows[0]).toMatchObject({
      email: QA_USERS.student.email,
      user_id: QA_USERS.student.id,
      estado: "pendiente",
    });
    expect((await student.api.post("/api/soporte", { data: {} })).status()).toBe(400);
  } finally {
    await client.execute({
      sql: "DELETE FROM solicitudes_soporte WHERE asunto = ?",
      args: [subject],
    });
    client.close();
  }
});

test("api.functions.quiz @api @critical @area:quizzes", async ({ actor }) => {
  const student = await actor("student");
  const data = { courseId: QA_SECTIONS.active, quizId: QA_IDS.apiQuiz };
  const draftUrl = documentsUrl(
    `courses/${QA_SECTIONS.active}/quizzes/${QA_IDS.apiQuiz}/drafts/${QA_USERS.student.uid}`
  );
  const resultUrl = documentsUrl(
    `courses/${QA_SECTIONS.active}/quizzes/${QA_IDS.apiQuiz}/results/${QA_USERS.student.uid}`
  );
  const gradeUrl = documentsUrl(`courses/${QA_SECTIONS.active}/grades/${QA_USERS.student.uid}`);
  const original = z
    .object({ fields: z.record(z.string(), z.unknown()) })
    .parse(
      await (
        await student.api.get(gradeUrl, { headers: { Authorization: `Bearer ${student.token}` } })
      ).json()
    );
  try {
    // Test-owned documents are removed between repeated runs, never the shared emulator store.
    for (const url of [draftUrl, resultUrl]) {
      const cleanup = await student.api.delete(url, { headers: { Authorization: "Bearer owner" } });
      expect([200, 404]).toContain(cleanup.status());
    }
    const started = await callable(student, "startQuizAttempt", data);
    expect(started.status(), await started.text()).toBe(200);
    expect(await started.json()).toMatchObject({ result: { status: "active" } });
    const saved = await student.api.post(
      documentsUrl("").replace(/documents\/$/, "documents:commit"),
      {
        headers: { Authorization: `Bearer ${student.token}` },
        data: {
          writes: [
            {
              update: {
                name: new URL(draftUrl).pathname.replace("/v1/", ""),
                fields: {
                  answers: {
                    mapValue: {
                      fields: { [QA_IDS.question]: { stringValue: QA_IDS.correctAnswer } },
                    },
                  },
                },
              },
              updateMask: { fieldPaths: ["answers"] },
              updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
            },
          ],
        },
      }
    );
    expect(saved.status(), await saved.text()).toBe(200);
    const submitted = await callable(student, "submitQuizAttempt", data);
    expect(submitted.status(), await submitted.text()).toBe(200);
    expect(await submitted.json()).toMatchObject({ result: { grade: 7, earnedPoints: 1 } });
    const persisted = await student.api.get(
      documentsUrl(`courses/${QA_SECTIONS.active}/grades/${QA_USERS.student.uid}`),
      { headers: { Authorization: `Bearer ${student.token}` } }
    );
    expect(await persisted.json()).toMatchObject({
      fields: {
        scores: { mapValue: { fields: { [QA_IDS.quizEvaluation]: { integerValue: "7" } } } },
      },
    });
    for (const role of ["outsider", "assistant", "teacher"] as const) {
      const denied = await callable(await actor(role), "startQuizAttempt", data);
      expect(denied.status(), role).toBe(403);
    }
  } finally {
    expect(
      (
        await student.api.patch(gradeUrl, {
          headers: { Authorization: "Bearer owner" },
          data: original,
        })
      ).status()
    ).toBe(200);
    for (const url of [draftUrl, resultUrl]) {
      expect([200, 404]).toContain(
        (await student.api.delete(url, { headers: { Authorization: "Bearer owner" } })).status()
      );
    }
  }
});

test("api.functions.grades @api @critical @area:grades", async ({ actor }) => {
  const teacher = await actor("teacher");
  const gradeUrl = documentsUrl(`courses/${QA_SECTIONS.active}/grades/${QA_USERS.student.uid}`);
  const previous = z
    .object({ fields: z.record(z.string(), z.unknown()) })
    .parse(
      await (
        await teacher.api.get(gradeUrl, { headers: { Authorization: `Bearer ${teacher.token}` } })
      ).json()
    );
  const data = {
    courseId: QA_SECTIONS.active,
    rows: [{ userId: QA_USERS.student.uid, scores: { [QA_IDS.report]: 6.2 } }],
  };
  try {
    for (const role of ["student", "assistant", "outsider"] as const) {
      const denied = await callable(await actor(role), "saveAuditedStudentScores", data);
      expect(denied.status(), role).toBe(403);
    }
    const saved = await callable(teacher, "saveAuditedStudentScores", data);
    expect(saved.status(), await saved.text()).toBe(200);
    expect(await saved.json()).toMatchObject({ result: { changedCount: 1 } });
    expect(
      await (
        await teacher.api.get(gradeUrl, { headers: { Authorization: `Bearer ${teacher.token}` } })
      ).json()
    ).toMatchObject({
      fields: { scores: { mapValue: { fields: { [QA_IDS.report]: { doubleValue: 6.2 } } } } },
    });
    const history = await teacher.api.get(
      `/api/sections/${QA_SECTIONS.active}/grade-history?studentId=${QA_USERS.student.uid}&gradeItemId=${QA_IDS.report}`
    );
    expect(history.status(), await history.text()).toBe(200);
    expect(await history.json()).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ newValue: 6.2, actorUid: QA_USERS.teacher.uid }),
      ]),
    });
    const archived = await callable(teacher, "saveAuditedStudentScores", {
      ...data,
      courseId: QA_SECTIONS.archived,
    });
    expect(archived.status()).toBe(400);
  } finally {
    expect(
      (
        await teacher.api.patch(gradeUrl, {
          headers: { Authorization: "Bearer owner" },
          data: previous,
        })
      ).status()
    ).toBe(200);
  }
});

test("api.owner.period-lifecycle @api @area:admin", async ({ actor }) => {
  const owner = await actor("owner");
  const periodId = `qa-api-period-${crypto.randomUUID()}`;
  const projectionUrl = documentsUrl(`academicPeriods/${periodId}`);
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await client.execute({
      sql: "INSERT INTO periodos (id, nombre, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?)",
      args: [periodId, "Período desechable QA", "2026-01-01", "2026-12-31", "abierto"],
    });
    for (const operation of ["sync", "archive"]) {
      const denied = await (
        await actor("teacher")
      ).api.post(`/api/admin/periods/${periodId}/${operation}`);
      expect(denied.status()).toBe(403);
      const response = await owner.api.post(`/api/admin/periods/${periodId}/${operation}`);
      expect(response.status(), await response.text()).toBe(200);
      expect(await response.json()).toMatchObject({
        period: { id: periodId, estado: operation === "sync" ? "abierto" : "archivado" },
        sectionCount: 0,
      });
      const projected = await owner.api.get(projectionUrl, {
        headers: { Authorization: "Bearer owner" },
      });
      expect(await projected.json()).toMatchObject({
        fields: { status: { stringValue: operation === "sync" ? "abierto" : "archivado" } },
      });
    }
    expect(
      await (await owner.api.post(`/api/admin/periods/${periodId}/archive`)).json()
    ).toMatchObject({ alreadyArchived: true });
    const stored = await client.execute({
      sql: "SELECT estado FROM periodos WHERE id = ? LIMIT 1",
      args: [periodId],
    });
    expect(stored.rows).toEqual([expect.objectContaining({ estado: "archivado" })]);
  } finally {
    await client.execute({ sql: "DELETE FROM periodos WHERE id = ?", args: [periodId] });
    client.close();
    expect([200, 404]).toContain(
      (
        await owner.api.delete(projectionUrl, { headers: { Authorization: "Bearer owner" } })
      ).status()
    );
  }
});

test("api.sections.reconcile @api @area:classroom", async ({ actor }) => {
  const teacher = await actor("teacher");
  const student = await actor("student");
  const endpoint = `/api/sections/${QA_SECTIONS.active}/projections/reconcile`;
  const projectionUrl = documentsUrl(
    `enrollments/${QA_USERS.student.uid}/sections/${QA_SECTIONS.active}`
  );
  const original = z
    .object({ fields: z.record(z.string(), z.unknown()) })
    .parse(
      await (
        await teacher.api.get(projectionUrl, { headers: { Authorization: "Bearer owner" } })
      ).json()
    );
  try {
    expect((await student.api.post(endpoint)).status()).toBe(403);
    expect(
      (
        await teacher.api.delete(projectionUrl, { headers: { Authorization: "Bearer owner" } })
      ).status()
    ).toBe(200);
    const reconciled = await teacher.api.post(endpoint);
    expect(reconciled.status(), await reconciled.text()).toBe(200);
    expect(await reconciled.json()).toEqual({ total: 6, reconciled: 6 });
    expect(
      await (
        await teacher.api.get(projectionUrl, { headers: { Authorization: "Bearer owner" } })
      ).json()
    ).toMatchObject({
      fields: { role: { stringValue: "student" }, seccionId: { stringValue: QA_SECTIONS.active } },
    });
    expect(
      (
        await student.api.get(
          documentsUrl(`courses/${QA_SECTIONS.active}/posts/${QA_IDS.notice}`),
          { headers: { Authorization: `Bearer ${student.token}` } }
        )
      ).status()
    ).toBe(200);
  } finally {
    expect(
      (
        await teacher.api.patch(projectionUrl, {
          headers: { Authorization: "Bearer owner" },
          data: original,
        })
      ).status()
    ).toBe(200);
  }
});

test("api.interop.lti-protocol @api @area:interop", async ({ actor, request, baseURL }) => {
  const configuration = await request.get("/api/interop/lti/configuration");
  expect(configuration.status()).toBe(200);
  expect(await configuration.json()).toMatchObject({
    issuer: baseURL,
    jwks_uri: `${baseURL}/api/interop/lti/jwks`,
  });
  const jwks = z
    .object({
      keys: z
        .array(
          z.strictObject({
            kty: z.literal("RSA"),
            n: z.string(),
            e: z.string(),
            kid: z.string(),
            alg: z.literal("RS256"),
            use: z.literal("sig"),
          })
        )
        .min(1),
    })
    .parse(await (await request.get("/api/interop/lti/jwks")).json());
  const student = await actor("student");
  const launch = await student.api.post(`/api/courses/${QA_SECTIONS.active}/interop/${QA_IDS.lti}`);
  expect(launch.status(), await launch.text()).toBe(200);
  const started = z
    .object({ kind: z.literal("lti"), url: z.string().url() })
    .parse(await launch.json());
  // The API client reads the form only; it never follows the synthetic external tool URL.
  const toolUrl = new URL(started.url);
  expect(toolUrl.origin).toBe("https://qa-tool.invalid");
  const parameters = {
    client_id: "qa-lti-client",
    login_hint: z.string().parse(toolUrl.searchParams.get("login_hint")),
    lti_message_hint: QA_IDS.lti,
    redirect_uri: "https://qa-tool.invalid/launch",
    response_type: "id_token",
    response_mode: "form_post",
    scope: "openid",
    prompt: "none",
    nonce: "qa-api-nonce",
    state: "qa-api-state",
  };
  const url = `/api/interop/lti/authorize?${new URLSearchParams(parameters)}`;
  expect((await (await actor("outsider")).api.get(url)).status()).toBe(401);
  const authorized = await student.api.get(url);
  expect(authorized.status(), await authorized.text()).toBe(200);
  const html = await authorized.text();
  expect(html).toContain('name="state" value="qa-api-state"');
  const jwt = z.string().parse(html.match(/name="id_token" value="([^"]+)"/)?.[1]);
  const [header, body, signature] = z
    .tuple([z.string(), z.string(), z.string()])
    .parse(jwt.split("."));
  const claims = z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(Buffer.from(body, "base64url").toString()));
  expect(claims).toMatchObject({
    iss: baseURL,
    aud: "qa-lti-client",
    nonce: parameters.nonce,
    "https://purl.imsglobal.org/spec/lti/claim/context": { id: QA_SECTIONS.active },
    "https://purl.imsglobal.org/spec/lti/claim/roles": [
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
    ],
  });
  expect(claims).not.toHaveProperty("email");
  expect(
    verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${body}`),
      createPublicKey({ key: jwks.keys[0], format: "jwk" }),
      Buffer.from(signature, "base64url")
    )
  ).toBe(true);
  expect(
    (await student.api.post("/api/interop/lti/authorize", { form: parameters })).status()
  ).toBe(409);
  const owner = await actor("owner");
  expect((await owner.api.get("/api/interop/tools")).status()).toBe(200);
  try {
    expect(
      (
        await owner.api.patch("/api/interop/tools", {
          data: { id: QA_IDS.ltiTool, enabled: false },
        })
      ).status()
    ).toBe(200);
    expect(
      (await student.api.post(`/api/courses/${QA_SECTIONS.active}/interop/${QA_IDS.lti}`)).status()
    ).toBe(404);
  } finally {
    expect(
      (
        await owner.api.patch("/api/interop/tools", { data: { id: QA_IDS.ltiTool, enabled: true } })
      ).status()
    ).toBe(200);
  }
});

test("api.functions.publish-and-export @api @area:quizzes", async ({ actor }) => {
  const teacher = await actor("teacher");
  const student = await actor("student");
  const data = {
    courseId: QA_SECTIONS.active,
    title: "Publicación API QA",
    description: "Cuestionario sintético desechable",
    gradeItemId: QA_IDS.team,
    durationMinutes: 10,
    questions: [{ sourceLine: 1, question: QA_QUESTION, answer: QA_ANSWER }],
  };
  let quizId: string | undefined;
  try {
    expect((await callable(student, "publishQuiz", data)).status()).toBe(403);
    const published = await callable(teacher, "publishQuiz", data);
    expect(published.status(), await published.text()).toBe(200);
    quizId = z
      .object({ result: z.object({ quizId: z.string().min(1) }) })
      .parse(await published.json()).result.quizId;
    const qtiPath = `/api/courses/${QA_SECTIONS.active}/quizzes/${quizId}/qti`;
    expect((await student.api.get(qtiPath)).status()).toBe(403);
    const qti = await teacher.api.get(qtiPath);
    expect(qti.status(), await qti.text()).toBe(200);
    expect(Object.keys(unzipSync(await qti.body()))).toContain("imsmanifest.xml");
    const key = await student.api.get(
      documentsUrl(`courses/${QA_SECTIONS.active}/quizKeys/${quizId}`),
      { headers: { Authorization: `Bearer ${student.token}` } }
    );
    expect(key.status()).toBe(403);
    expect((await callable(teacher, "publishQuiz", data)).status()).toBe(400);
  } finally {
    if (quizId)
      for (const collection of ["quizzes", "quizKeys"])
        expect(
          (
            await teacher.api.delete(
              documentsUrl(`courses/${QA_SECTIONS.active}/${collection}/${quizId}`),
              { headers: { Authorization: "Bearer owner" } }
            )
          ).status()
        ).toBe(200);
  }
});

test("api.functions.feedback-and-gradebook @api @area:grades", async ({ actor }) => {
  const teacher = await actor("teacher");
  const gradeUrl = documentsUrl(`courses/${QA_SECTIONS.active}/grades/${QA_USERS.student.uid}`);
  const bookUrl = documentsUrl(`courses/${QA_SECTIONS.active}/meta/gradebook`);
  const originals = [];
  for (const url of [gradeUrl, bookUrl])
    originals.push({
      url,
      document: z
        .object({ fields: z.record(z.string(), z.unknown()) })
        .parse(
          await (await teacher.api.get(url, { headers: { Authorization: "Bearer owner" } })).json()
        ),
    });
  try {
    const feedback = {
      courseId: QA_SECTIONS.active,
      userId: QA_USERS.student.uid,
      gradeItemId: QA_IDS.report,
      feedback: "Retroalimentación persistida por API QA.",
    };
    const book = { courseId: QA_SECTIONS.active, items: QA_GRADE_ITEMS, exemption: 4.9 };
    const student = await actor("student");
    for (const [name, data] of [
      ["saveAuditedGradeFeedback", feedback],
      ["saveAuditedGradebook", book],
    ] as const) {
      expect((await callable(student, name, data)).status()).toBe(403);
      const result = await callable(teacher, name, data);
      expect(result.status(), await result.text()).toBe(200);
      expect(await result.json()).toMatchObject({ result: { changedCount: 1 } });
    }
    expect(
      await (
        await teacher.api.get(gradeUrl, { headers: { Authorization: `Bearer ${teacher.token}` } })
      ).json()
    ).toMatchObject({
      fields: {
        feedback: { mapValue: { fields: { [QA_IDS.report]: { stringValue: feedback.feedback } } } },
      },
    });
    expect(
      await (
        await teacher.api.get(bookUrl, { headers: { Authorization: `Bearer ${teacher.token}` } })
      ).json()
    ).toMatchObject({ fields: { exemption: { doubleValue: 4.9 } } });
    const deniedDelete = await callable(student, "deleteMyAccount", {});
    expect(deniedDelete.status()).toBe(400);
    expect(await deniedDelete.json()).toMatchObject({ error: { status: "FAILED_PRECONDITION" } });
  } finally {
    for (const { url, document } of originals)
      expect(
        (
          await teacher.api.patch(url, {
            headers: { Authorization: "Bearer owner" },
            data: document,
          })
        ).status()
      ).toBe(200);
  }
});
