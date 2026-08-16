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
  const commits = await getRecentCommits(5);
  assert.ok(Array.isArray(commits));

  const prs = await listPullRequests("open", 5);
  assert.ok(Array.isArray(prs));

  const pr = await getPullRequest(999999);
  assert.equal(typeof pr === "object", true);

  const diff = await getPullRequestDiff(999999);
  assert.equal(typeof diff, "string");

  const comments = await getPullRequestComments(999999);
  assert.ok(Array.isArray(comments));

  const latestRun = await getLatestWorkflowRun("main");
  assert.equal(typeof latestRun === "object", true);
});
