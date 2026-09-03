import test from "node:test";
import assert from "node:assert/strict";
import { GoogleGenAI } from "@google/genai";
import {
  MODEL_FALLBACK_LIST,
  getGeminiApiKey,
  getGeminiClient,
  generateContentWithFallback,
  getLinearApiKey,
  getLinearIssue,
  listActiveLinearIssues,
  listCompletedLinearIssues,
  getRecentCommits,
  listPullRequests,
  getPullRequest,
  getPullRequestDiff,
  getPullRequestComments,
  getLatestWorkflowRun,
} from "../lib/services/index.ts";

test("services/gemini: MODEL_FALLBACK_LIST contiene modelos Gemini 3.x en orden prioritario", () => {
  assert.ok(Array.isArray(MODEL_FALLBACK_LIST));
  assert.ok(MODEL_FALLBACK_LIST.length >= 3);
  assert.equal(MODEL_FALLBACK_LIST[0], "gemini-3.7-flash");
  assert.ok(MODEL_FALLBACK_LIST.includes("gemini-3.6-flash"));
  assert.ok(MODEL_FALLBACK_LIST.includes("gemini-3.5-flash"));
});

test("services/gemini: getGeminiApiKey resuelve claves de entorno prioritarias", () => {
  const originalKey = process.env.STANDUP_GEMINI_API_KEY;
  try {
    process.env.STANDUP_GEMINI_API_KEY = "test-standup-key";
    assert.equal(getGeminiApiKey(), "test-standup-key");
  } finally {
    if (originalKey !== undefined) {
      process.env.STANDUP_GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.STANDUP_GEMINI_API_KEY;
    }
  }
});

test("services/gemini: getGeminiClient retorna instancia de GoogleGenAI o null", () => {
  const clientWithCustom = getGeminiClient("custom-key-123");
  assert.ok(clientWithCustom instanceof GoogleGenAI);

  const prevStandup = process.env.STANDUP_GEMINI_API_KEY;
  const prevGemini = process.env.GEMINI_STANDUP_API_KEY;
  const prevDefault = process.env.GEMINI_API_KEY;
  try {
    delete process.env.STANDUP_GEMINI_API_KEY;
    delete process.env.GEMINI_STANDUP_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const noClient = getGeminiClient();
    assert.equal(noClient, null);
  } finally {
    if (prevStandup) process.env.STANDUP_GEMINI_API_KEY = prevStandup;
    if (prevGemini) process.env.GEMINI_STANDUP_API_KEY = prevGemini;
    if (prevDefault) process.env.GEMINI_API_KEY = prevDefault;
  }
});

test("services/gemini: generateContentWithFallback retorna respuesta del primer modelo disponible", async () => {
  const mockAi = {
    models: {
      generateContent: async ({ model }: { model: string }) => {
        if (model === "gemini-3.7-flash") {
          return { text: "Respuesta exitosa 3.7" };
        }
        throw new Error("Quota exceeded");
      },
    },
  } as unknown as GoogleGenAI;

  const result = await generateContentWithFallback(mockAi, "Hola");
  assert.equal(result.text, "Respuesta exitosa 3.7");
  assert.equal(result.usedModel, "gemini-3.7-flash");
});

test("services/gemini: generateContentWithFallback realiza fallback ante fallos del primer modelo", async () => {
  const triedModels: string[] = [];
  const mockAi = {
    models: {
      generateContent: async ({ model }: { model: string }) => {
        triedModels.push(model);
        if (model === "gemini-3.7-flash") {
          throw new Error("503 Service Unavailable");
        }
        if (model === "gemini-3.6-flash") {
          return {
            candidates: [
              {
                content: {
                  parts: [{ text: "Respuesta desde 3.6 fallback" }],
                },
              },
            ],
          };
        }
        throw new Error("Other error");
      },
    },
  } as unknown as GoogleGenAI;

  const result = await generateContentWithFallback(mockAi, "Generar standup");
  assert.equal(result.text, "Respuesta desde 3.6 fallback");
  assert.equal(result.usedModel, "gemini-3.6-flash");
  assert.deepEqual(triedModels, ["gemini-3.7-flash", "gemini-3.6-flash"]);
});

test("services/gemini: generateContentWithFallback lanza excepción si todos los modelos fallan", async () => {
  const mockAi = {
    models: {
      generateContent: async () => {
        throw new Error("All quotas exhausted");
      },
    },
  } as unknown as GoogleGenAI;

  await assert.rejects(async () => {
    await generateContentWithFallback(mockAi, "Test");
  }, /All quotas exhausted/);
});

test("services/linear: getLinearApiKey retorna valor configurado o null", () => {
  const original = process.env.LINEAR_API_KEY;
  try {
    delete process.env.LINEAR_API_KEY;
    assert.equal(getLinearApiKey(), null);

    process.env.LINEAR_API_KEY = "lin_api_test_key";
    assert.equal(getLinearApiKey(), "lin_api_test_key");
  } finally {
    if (original !== undefined) {
      process.env.LINEAR_API_KEY = original;
    } else {
      delete process.env.LINEAR_API_KEY;
    }
  }
});

test("services/linear: getLinearIssue retorna null sin clave de API", async () => {
  const original = process.env.LINEAR_API_KEY;
  try {
    delete process.env.LINEAR_API_KEY;
    const issue = await getLinearIssue("CEO-38");
    assert.equal(issue, null);
  } finally {
    if (original !== undefined) {
      process.env.LINEAR_API_KEY = original;
    }
  }
});

test("services/linear: listActiveLinearIssues retorna array vacío sin clave de API", async () => {
  const original = process.env.LINEAR_API_KEY;
  try {
    delete process.env.LINEAR_API_KEY;
    const issues = await listActiveLinearIssues(10);
    assert.deepEqual(issues, []);
  } finally {
    if (original !== undefined) {
      process.env.LINEAR_API_KEY = original;
    }
  }
});

test("services/linear: listCompletedLinearIssues retorna array vacío sin clave de API", async () => {
  const original = process.env.LINEAR_API_KEY;
  try {
    delete process.env.LINEAR_API_KEY;
    const issues = await listCompletedLinearIssues(5);
    assert.deepEqual(issues, []);
  } finally {
    if (original !== undefined) {
      process.env.LINEAR_API_KEY = original;
    }
  }
});

test("services/github: helpers manejan errores de red o llamadas sin fallar ruidosamente", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers || {}) as Record<string, string>;

      if (url.includes("/commits")) {
        return new Response(
          JSON.stringify([
            {
              sha: "abcdef1234567890",
              commit: {
                message: "feat: commit institucional de prueba",
                author: { name: "Docente UBB", date: "2026-09-01T12:00:00Z" },
              },
              author: { login: "docente-ubb" },
              html_url: "https://github.com/CEOUBB/CEOUBB/commit/abcdef",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/pulls/999999")) {
        if (headers.Accept?.includes("vnd.github.v3.diff")) {
          return new Response(
            "diff --git a/test.ts b/test.ts\n--- a/test.ts\n+++ b/test.ts\n@@ -1 +1 @@\n-old\n+new\n",
            { status: 200, headers: { "Content-Type": "text/plain" } }
          );
        }
        return new Response(
          JSON.stringify({
            number: 999999,
            title: "feat: pull request de prueba",
            state: "open",
            user: { login: "docente-ubb" },
            created_at: "2026-09-01T12:00:00Z",
            html_url: "https://github.com/CEOUBB/CEOUBB/pull/999999",
            draft: false,
            mergeable: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/pulls")) {
        return new Response(
          JSON.stringify([
            {
              number: 1,
              title: "feat: primer pull request",
              state: "open",
              user: { login: "docente-ubb" },
              created_at: "2026-09-01T12:00:00Z",
              html_url: "https://github.com/CEOUBB/CEOUBB/pull/1",
              draft: false,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/comments")) {
        return new Response(
          JSON.stringify([
            {
              id: 101,
              user: { login: "docente-ubb" },
              body: "Comentario de revisión",
              created_at: "2026-09-01T12:00:00Z",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/actions/runs")) {
        return new Response(
          JSON.stringify({
            total_count: 1,
            workflow_runs: [
              {
                id: 555,
                status: "completed",
                conclusion: "success",
                head_commit: { message: "feat: workflow run" },
                actor: { login: "github-actions[bot]" },
                html_url: "https://github.com/CEOUBB/CEOUBB/actions/runs/555",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const commits = await getRecentCommits(5);
    assert.ok(Array.isArray(commits));
    assert.equal(commits.length, 1);

    const prs = await listPullRequests("open", 5);
    assert.ok(Array.isArray(prs));
    assert.equal(prs.length, 1);

    const pr = await getPullRequest(999999);
    assert.ok(pr !== null, "El PR no debe ser nulo");
    assert.equal(pr.number, 999999);

    const diff = await getPullRequestDiff(999999);
    assert.equal(typeof diff, "string");
    assert.ok(diff.includes("diff --git"));

    const comments = await getPullRequestComments(999999);
    assert.ok(Array.isArray(comments));
    assert.equal(comments.length, 1);

    const latestRun = await getLatestWorkflowRun("main");
    assert.ok(latestRun !== null, "Latest workflow run no debe ser nulo");
    assert.equal(latestRun.id, 555);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/*
  Proyección de matrículas Turso -> Firestore (REQ-ACAD-02). La escritura real
  necesita una cuenta de servicio, así que aquí se fija lo determinista: la ruta
  del marcador, la validación de entrada y el particionado en lotes.
*/

// Implements: REQ-ACAD-02
test("the enrollment marker lands at /enrollments/{uid}/sections/{seccionId}", async () => {
  const { enrollmentDocumentPath } = await import("../lib/services/enrollment-projection.ts");
  assert.equal(
    enrollmentDocumentPath("usr_soto", "440299-2026-2-1", "centro-de-estudio-ubb"),
    "projects/centro-de-estudio-ubb/databases/(default)/documents/enrollments/usr_soto/sections/440299-2026-2-1"
  );
});

// Implements: REQ-ACAD-02
test("an active enrollment writes the marker and any other state removes it", async () => {
  const { toFirestoreWrite } = await import("../lib/services/enrollment-projection.ts");

  const active = toFirestoreWrite(
    {
      seccionId: "440299-2026-2-1",
      userId: "usr_soto",
      role: "student",
      status: "activa",
      updatedAt: "2026-08-17T12:00:00.000Z",
    },
    "centro-de-estudio-ubb"
  );
  assert.ok("update" in active);
  assert.deepEqual(active.update.fields, {
    seccionId: { stringValue: "440299-2026-2-1" },
    role: { stringValue: "student" },
    status: { stringValue: "activa" },
    updatedAt: { stringValue: "2026-08-17T12:00:00.000Z" },
  });
  assert.deepEqual(active.updateMask.fieldPaths, ["seccionId", "role", "status", "updatedAt"]);

  for (const status of ["retirada", "congelada"] as const) {
    const dropped = toFirestoreWrite(
      { seccionId: "440299-2026-2-1", userId: "usr_soto", role: "student", status },
      "centro-de-estudio-ubb"
    );
    assert.ok("delete" in dropped, `a ${status} enrollment must delete its marker`);
  }
});

// Implements: REQ-ACAD-02
test("a malformed enrollment never reaches Firestore", async () => {
  const { parseEnrollmentProjection } = await import("../lib/services/enrollment-projection.ts");
  const valid = { seccionId: "s-1", userId: "u-1", role: "student", status: "activa" };

  assert.deepEqual(parseEnrollmentProjection(valid).seccionId, "s-1");
  for (const broken of [
    {},
    { ...valid, seccionId: "" },
    { ...valid, seccionId: "con/barra" },
    { ...valid, userId: "con espacio" },
    { ...valid, role: "owner" },
    { ...valid, status: "vigente" },
  ]) {
    assert.throws(() => parseEnrollmentProjection(broken), /matrícula/);
  }
});

// Implements: REQ-ACAD-02, REQ-PERF-02
test("bulk enrollment projections are partitioned below the Firestore commit limit", async () => {
  const { chunkWrites, MAX_WRITES_PER_COMMIT } =
    await import("../lib/services/enrollment-projection.ts");
  assert.equal(MAX_WRITES_PER_COMMIT, 400);

  const rows = Array.from({ length: 950 }, (_, index) => index);
  const batches = chunkWrites(rows);
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [400, 400, 150]
  );
  assert.deepEqual(batches.flat(), rows);
  assert.deepEqual(chunkWrites([]), []);
});
