// Implements: REQ-INT-01, REQ-SEC-05, REQ-SEC-14, REQ-NET-01
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { register } from "node:module";
import test, { after, beforeEach } from "node:test";

const loaderSource = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", {
      ...context,
      parentURL: new URL("package.json", "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href,
    });
  }
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    let target = rel;
    if (!target.endsWith(".ts") && !target.endsWith(".js") && !target.endsWith(".tsx")) {
      target = target + ".ts";
    }
    const fullUrl = new URL(target, "file:///" + process.cwd().replace(/\\\\/g, "/") + "/").href;
    return nextResolve(fullUrl, context);
  }
  return nextResolve(specifier, context);
}
`;

register("data:text/javascript," + encodeURIComponent(loaderSource), import.meta.url);

const LINEAR_SECRET = "test_linear_webhook_secret_123";
const GITHUB_SECRET = "test_github_webhook_secret_456";
const DISCORD_LINEAR_URL = "https://discord.com/api/webhooks/linear-test-endpoint";
const DISCORD_GITHUB_URL = "https://discord.com/api/webhooks/github-test-endpoint";

process.env.LINEAR_WEBHOOK_SECRET = LINEAR_SECRET;
process.env.DISCORD_LINEAR_WEBHOOK_URL = DISCORD_LINEAR_URL;
process.env.GITHUB_WEBHOOK_SECRET = GITHUB_SECRET;
process.env.DISCORD_CI_WEBHOOK_URL = DISCORD_GITHUB_URL;
delete process.env.STANDUP_GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY;

const { NextRequest } = await import("next/server");
const { POST: linearPost } = await import("../app/api/webhooks/linear/route.ts");
const { POST: githubPost } = await import("../app/api/webhooks/github/route.ts");

type FetchRecord = {
  url: string;
  options?: RequestInit;
  parsedBody?: Record<string, unknown>;
};

let fetchRecords: FetchRecord[] = [];
let fetchStatus = 200;
let fetchResponseText = JSON.stringify({ ok: true });

const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchRecords = [];
  fetchStatus = 200;
  fetchResponseText = JSON.stringify({ ok: true });
  process.env.LINEAR_WEBHOOK_SECRET = LINEAR_SECRET;
  process.env.DISCORD_LINEAR_WEBHOOK_URL = DISCORD_LINEAR_URL;
  process.env.GITHUB_WEBHOOK_SECRET = GITHUB_SECRET;
  process.env.DISCORD_CI_WEBHOOK_URL = DISCORD_GITHUB_URL;

  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const urlString =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    let parsedBody: Record<string, unknown> | undefined;
    if (init?.body && typeof init.body === "string") {
      try {
        parsedBody = JSON.parse(init.body) as Record<string, unknown>;
      } catch {
        // Not a JSON body
      }
    }
    fetchRecords.push({ url: urlString, options: init, parsedBody });
    return new Response(fetchResponseText, {
      status: fetchStatus,
      headers: { "Content-Type": "application/json" },
    });
  };
});

after(() => {
  globalThis.fetch = originalFetch;
});

function signLinear(body: string, secret: string = LINEAR_SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function signGitHub(body: string, secret: string = GITHUB_SECRET): string {
  const hash = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hash}`;
}

// ---------------------------------------------------------------------------
// Suite: POST /api/webhooks/linear
// ---------------------------------------------------------------------------

test("POST /api/webhooks/linear responde 404 si LINEAR_WEBHOOK_SECRET no está definido", async () => {
  delete process.env.LINEAR_WEBHOOK_SECRET;

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    body: "{}",
  });

  const res = await linearPost(req);
  assert.equal(res.status, 404);
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/linear responde 500 si DISCORD_LINEAR_WEBHOOK_URL no está configurado", async () => {
  delete process.env.DISCORD_LINEAR_WEBHOOK_URL;

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    body: "{}",
  });

  const origError = console.error;
  console.error = () => {};
  try {
    const res = await linearPost(req);
    assert.equal(res.status, 500);
    const data = (await res.json()) as { error?: string };
    assert.equal(data.error, "Webhook not configured");
    assert.equal(fetchRecords.length, 0);
  } finally {
    console.error = origError;
  }
});

test("POST /api/webhooks/linear responde 401 si la cabecera linear-signature no coincide", async () => {
  const payload = JSON.stringify({
    action: "create",
    type: "Issue",
    webhookTimestamp: Date.now(),
    data: { id: "issue-1" },
  });

  const reqTampered = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    headers: {
      "linear-signature": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
    body: payload,
  });

  const resTampered = await linearPost(reqTampered);
  assert.equal(resTampered.status, 401);
  const dataTampered = (await resTampered.json()) as { error?: string };
  assert.equal(dataTampered.error, "Invalid signature");

  const reqMissing = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    body: payload,
  });

  const resMissing = await linearPost(reqMissing);
  assert.equal(resMissing.status, 401);
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/linear responde 400 si el payload no es un JSON válido", async () => {
  const malformedBody = "{ invalid json body: 123";
  const signature = signLinear(malformedBody);

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    headers: { "linear-signature": signature },
    body: malformedBody,
  });

  const res = await linearPost(req);
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error?: string };
  assert.equal(data.error, "El cuerpo de la petición no es un JSON válido");
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/linear responde 401 si webhookTimestamp tiene más de 60 segundos de antigüedad", async () => {
  const staleTimestamp = Date.now() - 65_000;
  const stalePayload = JSON.stringify({
    action: "create",
    type: "Issue",
    webhookTimestamp: staleTimestamp,
    data: { id: "issue-stale" },
  });

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    headers: { "linear-signature": signLinear(stalePayload) },
    body: stalePayload,
  });

  const res = await linearPost(req);
  assert.equal(res.status, 401);
  const data = (await res.json()) as { error?: string };
  assert.equal(data.error, "Stale payload");
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/linear responde 200 con { message: 'No data payload' } si falta el campo data", async () => {
  const payloadNoData = JSON.stringify({
    action: "create",
    type: "Issue",
    webhookTimestamp: Date.now(),
  });

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    headers: { "linear-signature": signLinear(payloadNoData) },
    body: payloadNoData,
  });

  const res = await linearPost(req);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { message?: string };
  assert.equal(data.message, "No data payload");
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/linear procesa evento Issue válido ('create') y notifica a Discord con código 200", async () => {
  const payload = JSON.stringify({
    action: "create",
    type: "Issue",
    webhookTimestamp: Date.now(),
    data: {
      identifier: "CEO-101",
      title: "Implementar autenticación robusta",
      state: { name: "Backlog" },
      assignee: { name: "Felipe Arce" },
      creator: { name: "Docente UBB" },
      priorityLabel: "Alta",
      url: "https://linear.app/ceoubb/issue/CEO-101",
    },
  });

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    headers: { "linear-signature": signLinear(payload) },
    body: payload,
  });

  const res = await linearPost(req);
  assert.equal(res.status, 200);
  const json = (await res.json()) as { success?: boolean };
  assert.equal(json.success, true);

  assert.equal(fetchRecords.length, 1);
  assert.equal(fetchRecords[0].url, DISCORD_LINEAR_URL);
  assert.equal(fetchRecords[0].options?.method, "POST");

  const embeds = fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(embeds));
  assert.equal(embeds.length, 1);
  assert.match(
    String(embeds[0].title),
    /🎯 Nuevo Issue: \[CEO-101\] Implementar autenticación robusta/
  );
  assert.equal(embeds[0].color, 0x5e6ad2);

  const fields = embeds[0].fields as Array<{ name: string; value: string }>;
  assert.ok(fields.some((f) => f.name === "Estado" && f.value.includes("Backlog")));
  assert.ok(fields.some((f) => f.name === "Asignado a" && f.value === "Felipe Arce"));
  assert.ok(fields.some((f) => f.name === "Creado por" && f.value === "Docente UBB"));
  assert.ok(fields.some((f) => f.name === "Prioridad" && f.value === "Alta"));
});

test("POST /api/webhooks/linear procesa actualizaciones de estado con colores y transiciones adecuadas", async () => {
  // Transición a completado (done)
  const payloadDone = JSON.stringify({
    action: "update",
    type: "Issue",
    webhookTimestamp: Date.now(),
    updatedFrom: { state: { name: "In Progress" } },
    data: {
      identifier: "CEO-102",
      title: "Optimizar base de datos Turso",
      state: { name: "Done" },
    },
  });

  const resDone = await linearPost(
    new Request("https://ceoubb.com/api/webhooks/linear", {
      method: "POST",
      headers: { "linear-signature": signLinear(payloadDone) },
      body: payloadDone,
    })
  );
  assert.equal(resDone.status, 200);
  assert.equal(fetchRecords.length, 1);
  const embedDone = (fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>)[0];
  assert.match(String(embedDone.title), /✅ Issue Completado/);
  assert.equal(embedDone.color, 0x10b981);
  const fieldsDone = embedDone.fields as Array<{ name: string; value: string }>;
  assert.ok(
    fieldsDone.some((f) => f.name === "Estado" && f.value.includes("`In Progress` ➡️ `Done`"))
  );

  // Transición a progreso (in progress)
  fetchRecords = [];
  const payloadProgress = JSON.stringify({
    action: "update",
    type: "Issue",
    webhookTimestamp: Date.now(),
    data: {
      identifier: "CEO-103",
      title: "Diseño de microinteracciones",
      state: { name: "In Progress" },
    },
  });

  const resProgress = await linearPost(
    new Request("https://ceoubb.com/api/webhooks/linear", {
      method: "POST",
      headers: { "linear-signature": signLinear(payloadProgress) },
      body: payloadProgress,
    })
  );
  assert.equal(resProgress.status, 200);
  assert.equal(fetchRecords.length, 1);
  const embedProgress = (fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>)[0];
  assert.match(String(embedProgress.title), /🚀 Issue en Progreso/);
  assert.equal(embedProgress.color, 0xf59e0b);

  // Transición a pendiente (todo)
  fetchRecords = [];
  const payloadTodo = JSON.stringify({
    action: "update",
    type: "Issue",
    webhookTimestamp: Date.now(),
    data: {
      identifier: "CEO-104",
      title: "Auditoría de dependencias",
      state: { name: "Todo" },
    },
  });

  const resTodo = await linearPost(
    new Request("https://ceoubb.com/api/webhooks/linear", {
      method: "POST",
      headers: { "linear-signature": signLinear(payloadTodo) },
      body: payloadTodo,
    })
  );
  assert.equal(resTodo.status, 200);
  assert.equal(fetchRecords.length, 1);
  const embedTodo = (fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>)[0];
  assert.match(String(embedTodo.title), /📋 Issue Movido a Pendiente/);
  assert.equal(embedTodo.color, 0x3b82f6);

  // Eliminación de issue (remove)
  fetchRecords = [];
  const payloadRemove = JSON.stringify({
    action: "remove",
    type: "Issue",
    webhookTimestamp: Date.now(),
    data: {
      identifier: "CEO-105",
      title: "Issue obsoleto",
    },
  });

  const resRemove = await linearPost(
    new Request("https://ceoubb.com/api/webhooks/linear", {
      method: "POST",
      headers: { "linear-signature": signLinear(payloadRemove) },
      body: payloadRemove,
    })
  );
  assert.equal(resRemove.status, 200);
  assert.equal(fetchRecords.length, 1);
  const embedRemove = (fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>)[0];
  assert.match(String(embedRemove.title), /🗑️ Issue Eliminado/);
  assert.equal(embedRemove.color, 0xef4444);
});

test("POST /api/webhooks/linear procesa eventos de Comment y ProjectUpdate", async () => {
  const payloadComment = JSON.stringify({
    action: "create",
    type: "Comment",
    webhookTimestamp: Date.now(),
    data: {
      issue: { identifier: "CEO-200" },
      body: "Este es un comentario importante sobre la arquitectura.",
      user: { name: "Profesor Guía" },
      url: "https://linear.app/ceoubb/issue/CEO-200#comment-1",
    },
  });

  const resComment = await linearPost(
    new Request("https://ceoubb.com/api/webhooks/linear", {
      method: "POST",
      headers: { "linear-signature": signLinear(payloadComment) },
      body: payloadComment,
    })
  );
  assert.equal(resComment.status, 200);
  assert.equal(fetchRecords.length, 1);
  const commentEmbed = (fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>)[0];
  assert.match(String(commentEmbed.title), /💬 Nuevo Comentario en \[CEO-200\]/);

  fetchRecords = [];
  const payloadProject = JSON.stringify({
    action: "create",
    type: "ProjectUpdate",
    webhookTimestamp: Date.now(),
    data: {
      project: { name: "CEOUBB v2.0" },
      body: "Hito de cobertura completado al 100%.",
    },
  });

  const resProject = await linearPost(
    new Request("https://ceoubb.com/api/webhooks/linear", {
      method: "POST",
      headers: { "linear-signature": signLinear(payloadProject) },
      body: payloadProject,
    })
  );
  assert.equal(resProject.status, 200);
  assert.equal(fetchRecords.length, 1);
  const projectEmbed = (fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>)[0];
  assert.match(String(projectEmbed.title), /📊 Actualización de Proyecto: CEOUBB v2\.0/);
});

test("POST /api/webhooks/linear propaga error HTTP si Discord falla al recibir la alerta", async () => {
  fetchStatus = 502;
  fetchResponseText = "Bad Gateway";

  const payload = JSON.stringify({
    action: "create",
    type: "Issue",
    webhookTimestamp: Date.now(),
    data: { identifier: "CEO-999", title: "Fallo temporal" },
  });

  const req = new Request("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    headers: { "linear-signature": signLinear(payload) },
    body: payload,
  });

  const origError = console.error;
  console.error = () => {};
  try {
    const res = await linearPost(req);
    assert.equal(res.status, 502);
    const data = (await res.json()) as { error?: string };
    assert.equal(data.error, "Error forwarding to notification channel");
  } finally {
    console.error = origError;
  }
});

test("POST /api/webhooks/linear responde 500 en fallo inesperado de procesamiento", async () => {
  const failingStream = new ReadableStream({
    start(controller) {
      controller.error(new Error("Stream read error"));
    },
  });
  const reqUnreadable = new NextRequest("https://ceoubb.com/api/webhooks/linear", {
    method: "POST",
    body: failingStream,
  });

  const origError = console.error;
  console.error = () => {};
  try {
    const res = await linearPost(reqUnreadable);
    assert.equal(res.status, 500);
    const data = (await res.json()) as { error?: string };
    assert.equal(data.error, "Error procesando webhook de Linear");
  } finally {
    console.error = origError;
  }
});

// ---------------------------------------------------------------------------
// Suite: POST /api/webhooks/github
// ---------------------------------------------------------------------------

test("POST /api/webhooks/github responde 404 si GITHUB_WEBHOOK_SECRET no está definido", async () => {
  delete process.env.GITHUB_WEBHOOK_SECRET;

  const req = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    body: "{}",
  });

  const res = await githubPost(req);
  assert.equal(res.status, 404);
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/github responde 401 si x-hub-signature-256 es inválida o ausente", async () => {
  const payload = JSON.stringify({
    action: "completed",
    workflow_run: { conclusion: "failure" },
  });

  const reqMissing = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    body: payload,
  });

  const resMissing = await githubPost(reqMissing);
  assert.equal(resMissing.status, 401);
  const dataMissing = (await resMissing.json()) as { error?: string };
  assert.equal(dataMissing.error, "Invalid signature");

  const reqInvalid = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: { "x-hub-signature-256": "sha256=invalidhex0123456789abcdef" },
    body: payload,
  });

  const resInvalid = await githubPost(reqInvalid);
  assert.equal(resInvalid.status, 401);
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/github responde 400 si el payload es JSON malformado", async () => {
  const malformed = "{ github malformed: true";
  const signature = signGitHub(malformed);

  const req = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: { "x-hub-signature-256": signature },
    body: malformed,
  });

  const res = await githubPost(req);
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error?: string };
  assert.equal(data.error, "El cuerpo de la petición no es un JSON válido");
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/github responde 200 ignorando eventos que no sean workflow_run completado", async () => {
  // Evento diferente a workflow_run (ej. push)
  const pushPayload = JSON.stringify({ ref: "refs/heads/main" });
  const reqPush = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signGitHub(pushPayload),
      "x-github-event": "push",
    },
    body: pushPayload,
  });

  const resPush = await githubPost(reqPush);
  assert.equal(resPush.status, 200);
  const dataPush = (await resPush.json()) as { message?: string };
  assert.equal(dataPush.message, "Event processed");
  assert.equal(fetchRecords.length, 0);

  // Evento workflow_run con action !== 'completed'
  const inProgressPayload = JSON.stringify({
    action: "in_progress",
    workflow_run: { id: 123 },
  });
  const reqInProgress = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signGitHub(inProgressPayload),
      "x-github-event": "workflow_run",
    },
    body: inProgressPayload,
  });

  const resInProgress = await githubPost(reqInProgress);
  assert.equal(resInProgress.status, 200);
  const dataInProgress = (await resInProgress.json()) as { message?: string };
  assert.equal(dataInProgress.message, "Ignored workflow_run action");
  assert.equal(fetchRecords.length, 0);

  // Evento workflow_run completado exitoso pero en rama secundaria
  const branchPayload = JSON.stringify({
    action: "completed",
    workflow_run: {
      conclusion: "success",
      head_branch: "feature/nueva-vista",
    },
  });
  const reqBranch = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signGitHub(branchPayload),
      "x-github-event": "workflow_run",
    },
    body: branchPayload,
  });

  const resBranch = await githubPost(reqBranch);
  assert.equal(resBranch.status, 200);
  const dataBranch = (await resBranch.json()) as { message?: string };
  assert.equal(dataBranch.message, "Event processed");
  assert.equal(fetchRecords.length, 0);
});

test("POST /api/webhooks/github procesa fallo de CI legítimo notificando a Discord con código 200", async () => {
  const failurePayload = JSON.stringify({
    action: "completed",
    workflow_run: {
      name: "CI Pipeline",
      head_branch: "feature/tests",
      head_commit: { message: "fix: corregir tipos\n\nDetalles del commit" },
      actor: { login: "pipe-arce" },
      conclusion: "failure",
      html_url: "https://github.com/CEOUBB/CEOUBB/actions/runs/12345678",
    },
  });

  const req = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signGitHub(failurePayload),
      "x-github-event": "workflow_run",
    },
    body: failurePayload,
  });

  const res = await githubPost(req);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { success?: boolean; status?: string };
  assert.equal(data.success, true);
  assert.equal(data.status, "failure_reported");

  assert.equal(fetchRecords.length, 1);
  assert.equal(fetchRecords[0].url, DISCORD_GITHUB_URL);
  assert.equal(fetchRecords[0].options?.method, "POST");

  const embeds = fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(embeds));
  assert.equal(embeds.length, 1);
  assert.match(String(embeds[0].title), /❌ Fallo en CI\/CD: CI Pipeline \(feature\/tests\)/);
  assert.equal(embeds[0].color, 0xef4444);
  assert.match(String(embeds[0].description), /\*\*Autor:\*\* @pipe-arce/);
  assert.match(String(embeds[0].description), /\*\*Commit:\*\* `fix: corregir tipos`/);
  assert.match(String(embeds[0].description), /git checkout feature\/tests && pnpm run typecheck/);
});

test("POST /api/webhooks/github procesa éxito de CI en rama 'main' notificando a Discord con código 200", async () => {
  const successPayload = JSON.stringify({
    action: "completed",
    workflow_run: {
      name: "Production Gate",
      head_branch: "main",
      head_commit: { message: "feat: release institucional" },
      actor: { login: "admin-ubb" },
      conclusion: "success",
      html_url: "https://github.com/CEOUBB/CEOUBB/actions/runs/87654321",
    },
  });

  const req = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signGitHub(successPayload),
      "x-github-event": "workflow_run",
    },
    body: successPayload,
  });

  const res = await githubPost(req);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { success?: boolean; status?: string };
  assert.equal(data.success, true);
  assert.equal(data.status, "success_reported");

  assert.equal(fetchRecords.length, 1);
  assert.equal(fetchRecords[0].url, DISCORD_GITHUB_URL);

  const embeds = fetchRecords[0].parsedBody?.embeds as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(embeds));
  assert.equal(embeds.length, 1);
  assert.match(String(embeds[0].title), /✅ CI\/CD Exitoso en `main`: Production Gate/);
  assert.equal(embeds[0].color, 0x10b981);
});

test("POST /api/webhooks/github responde 500 en fallo inesperado de procesamiento", async () => {
  const failingStream = new ReadableStream({
    start(controller) {
      controller.error(new Error("Stream reading failed"));
    },
  });
  const reqUnreadable = new NextRequest("https://ceoubb.com/api/webhooks/github", {
    method: "POST",
    body: failingStream,
  });

  const origError = console.error;
  console.error = () => {};
  try {
    const res = await githubPost(reqUnreadable);
    assert.equal(res.status, 500);
    const data = (await res.json()) as { error?: string };
    assert.equal(data.error, "Error procesando webhook de GitHub");
  } finally {
    console.error = origError;
  }
});
