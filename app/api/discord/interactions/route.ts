import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { waitUntil } from "@vercel/functions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Discord Public Key (de Discord Developer Portal -> General Information)
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "";

const MODEL_FALLBACK_LIST = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash",
];

/**
 * Obtener clave API de Gemini
 */
function getGeminiApiKey(): string | null {
  return (
    process.env.STANDUP_GEMINI_API_KEY ||
    process.env.GEMINI_STANDUP_API_KEY ||
    process.env.GEMINI_API_KEY ||
    null
  );
}

/**
 * Cargar contexto del repositorio (AGENTS.md, PLAN.md, design-ceoubb.md)
 */
function getProjectContext(): string {
  let context = "";
  try {
    const agentsPath = path.join(process.cwd(), "AGENTS.md");
    if (fs.existsSync(agentsPath)) {
      context += `\n--- REPOSITORY RULES & SPECS (AGENTS.md) ---\n${fs.readFileSync(agentsPath, "utf-8").slice(0, 3500)}\n`;
    }

    const planPath = path.join(process.cwd(), "PLAN.md");
    if (fs.existsSync(planPath)) {
      context += `\n--- ACTIVE PLAN & SPRINT (PLAN.md) ---\n${fs.readFileSync(planPath, "utf-8").slice(0, 3500)}\n`;
    }

    const designPath = path.join(process.cwd(), "design-ceoubb.md");
    if (fs.existsSync(designPath)) {
      context += `\n--- DESIGN SYSTEM RULES (design-ceoubb.md) ---\n${fs.readFileSync(designPath, "utf-8").slice(0, 1500)}\n`;
    }
  } catch (err) {
    console.warn("⚠️ Error leyendo archivos de contexto del proyecto:", err);
  }
  return context;
}

/**
 * Declaraciones de herramientas para Function Calling con Gemini
 */
const geminiToolsDeclarations: FunctionDeclaration[] = [
  {
    name: "linear_get_issue",
    description: "Obtener información detallada de un issue o tarea de Linear mediante su identificador (ej: CEO-38)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueId: { type: Type.STRING, description: "Identificador del issue (ej: CEO-38)" },
      },
      required: ["issueId"],
    },
  },
  {
    name: "linear_list_active_issues",
    description: "Listar los issues activos y pendientes del sprint en Linear",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: "Cantidad máxima de issues a retornar (por defecto 10)" },
      },
    },
  },
  {
    name: "github_recent_commits",
    description: "Consultar los commits recientes de la rama main en GitHub",
    parameters: {
      type: Type.OBJECT,
      properties: {
        count: { type: Type.NUMBER, description: "Cantidad de commits a obtener (por defecto 5)" },
      },
    },
  },
  {
    name: "github_list_prs",
    description: "Consultar Pull Requests abiertos o recientes en el repositorio CEOUBB",
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: { type: Type.STRING, description: "Estado de los PRs: open, closed o all (por defecto open)" },
      },
    },
  },
  {
    name: "github_ci_status",
    description: "Consultar el estado del último pipeline de CI/CD (GitHub Actions) en la rama main",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

/**
 * Ejecutor de herramientas (Tools)
 */
async function executeGeminiToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const linearApiKey = process.env.LINEAR_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (name === "linear_get_issue") {
    const issueId = String(args.issueId || "").toUpperCase();
    if (!linearApiKey) return { error: "LINEAR_API_KEY no configurada en Vercel." };

    try {
      const query = `
        query GetIssue($id: String!) {
          issue(id: $id) {
            identifier
            title
            description
            url
            priority
            state { name type }
            assignee { name }
          }
        }
      `;
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: linearApiKey },
        body: JSON.stringify({ query, variables: { id: issueId } }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { error: `Error HTTP ${res.status} al consultar Linear` };
      const data = await res.json();
      const issue = data?.data?.issue;
      if (!issue) return { error: `No se encontró el issue ${issueId} en Linear` };
      return {
        id: issue.identifier,
        title: issue.title,
        status: issue.state?.name,
        assignee: issue.assignee?.name || "Sin asignar",
        priority: issue.priority,
        url: issue.url,
        description: issue.description ? issue.description.slice(0, 500) : "Sin descripción",
      };
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (name === "linear_list_active_issues") {
    if (!linearApiKey) return { error: "LINEAR_API_KEY no configurada en Vercel." };
    const limit = typeof args.limit === "number" ? Math.min(args.limit, 20) : 10;
    try {
      const query = `
        query GetActiveIssues($limit: Int!) {
          issues(filter: { state: { type: { in: ["started", "unstarted", "backlog"] } } }, first: $limit) {
            nodes {
              identifier
              title
              state { name }
              assignee { name }
            }
          }
        }
      `;
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: linearApiKey },
        body: JSON.stringify({ query, variables: { limit } }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { error: `Error HTTP ${res.status} al consultar Linear` };
      const data = await res.json();
      const issues = data?.data?.issues?.nodes || [];
      return {
        count: issues.length,
        issues: issues.map((i: { identifier: string; title: string; state?: { name: string }; assignee?: { name: string } }) => ({
          id: i.identifier,
          title: i.title,
          status: i.state?.name || "Pendiente",
          assignee: i.assignee?.name || "Sin asignar",
        })),
      };
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (name === "github_recent_commits") {
    const count = typeof args.count === "number" ? Math.min(args.count, 10) : 5;
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CEOUBB-Discord-Interactions",
      };
      if (githubToken) headers.Authorization = `token ${githubToken}`;

      const res = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/commits?per_page=${count}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { error: `Error consultando GitHub API (${res.status})` };
      const data = await res.json();
      return (data || []).map((c: { sha: string; commit: { author: { name: string }; message: string } }) => ({
        sha: c.sha?.slice(0, 7),
        author: c.commit?.author?.name,
        message: c.commit?.message?.split("\n")[0],
      }));
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (name === "github_list_prs") {
    const state = typeof args.state === "string" ? args.state : "open";
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CEOUBB-Discord-Interactions",
      };
      if (githubToken) headers.Authorization = `token ${githubToken}`;

      const res = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls?state=${state}&per_page=5`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { error: `Error consultando PRs en GitHub (${res.status})` };
      const data = await res.json();
      return (data || []).map((p: { number: number; title: string; user?: { login: string }; state: string; html_url: string; head?: { ref: string } }) => ({
        number: p.number,
        title: p.title,
        author: p.user?.login,
        branch: p.head?.ref,
        state: p.state,
        url: p.html_url,
      }));
    } catch (err) {
      return { error: String(err) };
    }
  }

  if (name === "github_ci_status") {
    return await fetchLatestCIDiagnostics();
  }

  return { error: `Herramienta desconocida: ${name}` };
}

/**
 * Ejecución de Gemini con Function Calling loop y fallbacks
 */
async function processGeminiQueryWithTools(userPrompt: string, userDisplayName: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return "⚠️ **Error de configuración:** La variable `STANDUP_GEMINI_API_KEY` o `GEMINI_API_KEY` no está configurada en Vercel.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const projectContext = getProjectContext();

  const systemInstruction = `Eres el Asistente de IA Senior y Copiloto de Desarrollo de CEOUBB (Centro de Estudio UBB - LMS Universidad del Bío-Bío).
Estás interactuando en Discord con el mantenedor del proyecto (${userDisplayName}).
Tienes conocimiento profundo del proyecto CEOUBB a través de los archivos del repositorio (AGENTS.md, PLAN.md, design-ceoubb.md).
Tienes acceso a herramientas para consultar Linear (issues, sprints) y GitHub (commits, PRs, CI).

Reglas indispensables de CEOUBB:
- Stack: Next.js 16 (App Router), React 19, TypeScript, Turso/libSQL, Firebase southamerica-west1.
- Paquetes: Usar SIEMPRE pnpm (no npm, no bun).
- Auth & Roles: Gobernado estrictamente por lib/access-policy.ts (@ubiobio.cl docente, @alumnos.ubiobio.cl estudiante).
- Diseño: Paper-soft (#f4f6f9), sobrio, académico, Phosphor Icons (design-ceoubb.md).
- Idioma: Responde siempre en español formal, técnico y educado.

${projectContext}`;

  let lastError: unknown;

  for (const modelId of MODEL_FALLBACK_LIST) {
    try {
      const firstRes = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: geminiToolsDeclarations }],
        },
      });

      const candidates = firstRes.candidates || [];
      const firstCandidateContent = candidates[0]?.content;
      const functionCalls = firstCandidateContent?.parts?.filter((p) => p.functionCall) || [];

      if (functionCalls.length > 0 && firstCandidateContent) {
        const toolResponseParts = [];
        for (const callPart of functionCalls) {
          if (!callPart.functionCall) continue;
          const toolCall = callPart.functionCall;
          const toolName = toolCall.name || "";
          const toolResult = await executeGeminiToolCall(toolName, (toolCall.args as Record<string, unknown>) || {});
          toolResponseParts.push({
            functionResponse: {
              name: toolName,
              response: typeof toolResult === "object" && toolResult !== null ? (toolResult as Record<string, unknown>) : { result: toolResult },
            },
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const followUpContents: any[] = [
          { role: "user", parts: [{ text: userPrompt }] },
          firstCandidateContent,
          { role: "user", parts: toolResponseParts },
        ];

        const followUpRes = await ai.models.generateContent({
          model: modelId,
          contents: followUpContents,
          config: { systemInstruction },
        });

        const followUpText = followUpRes.text || followUpRes.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (followUpText) return followUpText.trim();
      }

      const directText = firstRes.text || firstCandidateContent?.parts?.[0]?.text || "";
      if (directText) return directText.trim();
    } catch (err) {
      console.warn(`⚠️ Error en modelo '${modelId}' en Vercel:`, err);
      lastError = err;
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  return `⚠️ No se pudo obtener respuesta de Gemini: ${errMsg}`;
}

/**
 * Consultar diagnóstico real en tiempo real de GitHub Actions CI en main
 */
async function fetchLatestCIDiagnostics(): Promise<string> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CEOUBB-Discord-Interactions",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const runsRes = await fetch("https://api.github.com/repos/CEOUBB/CEOUBB/actions/runs?branch=main&per_page=1", {
      headers,
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 },
    });

    if (!runsRes.ok) {
      return "⚠️ No se pudo consultar la API de GitHub Actions.";
    }

    const runsData = await runsRes.json();
    const latestRun = runsData?.workflow_runs?.[0];

    if (!latestRun) {
      return "ℹ️ No hay ejecuciones de CI registradas en `main`.";
    }

    let stepsDetail = "";
    if (latestRun.jobs_url) {
      const jobsRes = await fetch(latestRun.jobs_url, {
        headers,
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 0 },
      });

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const verifyJob = jobsData?.jobs?.[0];
        const relevantSteps = (verifyJob?.steps || []).filter((s: { name: string }) =>
          ["Check Firebase Functions syntax", "TypeScript typecheck", "Lint code", "Run test suite"].includes(s.name)
        );

        stepsDetail = relevantSteps
          .map((s: { name: string; status: string; conclusion: string | null }) => {
            const icon =
              s.conclusion === "success"
                ? "🟢"
                : s.conclusion === "failure"
                ? "🔴"
                : s.status === "in_progress"
                ? "🟡 (En ejecución)"
                : "⚪ (Pendiente)";
            return `• **${s.name}:** ${icon}`;
          })
          .join("\n");
      }
    }

    const runStatusIcon =
      latestRun.conclusion === "success"
        ? "🟢 Exitoso"
        : latestRun.conclusion === "failure"
        ? "🔴 Falló"
        : `🟡 ${latestRun.status}`;

    const sha = latestRun.head_sha?.slice(0, 7) || "commit";
    const commitMsg = latestRun.head_commit?.message?.split("\n")[0] || "Sin mensaje";
    const actor = latestRun.actor?.login || "Desarrollador";

    return (
      `### 🩺 Diagnóstico Real de CI/CD (/doctor)\n\n` +
      `**Último commit en \`main\`:** [\`${sha}\`](${latestRun.html_url}) — *"${commitMsg}"* (por @${actor})\n` +
      `**Estado General del Pipeline:** ${runStatusIcon}\n\n` +
      `**Detalle de verificaciones en GitHub Actions:**\n` +
      `${stepsDetail || "• Verificaciones automáticas completas"}\n\n` +
      `🔗 **[Ver ejecución completa en GitHub Actions](${latestRun.html_url})**`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `⚠️ Error consultando diagnóstico en vivo: ${msg}`;
  }
}

/**
 * Consultar título real del issue en Linear si se proporciona solo el código (ej. CEO-38)
 */
async function getLinearIssueTitle(issueId: string): Promise<string | null> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return null;

  try {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          title
        }
      }
    `;
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { id: issueId.toUpperCase() } }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.issue?.title || null;
  } catch {
    return null;
  }
}

/**
 * Valida la firma criptográfica Ed25519 requerida por Discord
 */
function verifyDiscordSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(publicKey, "hex"),
    ]);
    const key = crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Actualizar mensaje original de Discord diferido (Deferred Interaction Type 5)
 */
async function updateOriginalDiscordMessage(
  applicationId: string,
  interactionToken: string,
  content: string
): Promise<void> {
  try {
    const safeContent = content.length > 1950 ? `${content.slice(0, 1920)}\n\n_...(respuesta recortada por límite de Discord)_` : content;

    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: safeContent }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`❌ Error al actualizar mensaje diferido en Discord (${res.status}):`, await res.text());
    }
  } catch (err) {
    console.error("❌ Error en updateOriginalDiscordMessage:", err);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";

  // 1. Validar firma de Discord (si DISCORD_PUBLIC_KEY está configurada)
  if (DISCORD_PUBLIC_KEY) {
    const isValid = verifyDiscordSignature(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new NextResponse("Invalid request signature", { status: 401 });
    }
  }

  let body: {
    type: number;
    application_id?: string;
    token?: string;
    data?: {
      custom_id?: string;
      name?: string;
      options?: Array<{ name: string; value: string | number | boolean }>;
    };
    member?: { user?: { username: string; id: string; global_name?: string } };
    user?: { username: string; id: string; global_name?: string };
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // 2. Discord PING verification (Type 1)
  if (body.type === 1) {
    return NextResponse.json({ type: 1 }); // PONG
  }

  const applicationId = body.application_id || "";
  const interactionToken = body.token || "";
  const discordUser = body.member?.user || body.user;
  const userDisplayName = discordUser?.global_name || discordUser?.username || "Mantenedor";

  // 3. Manejo de Slash Commands (Type 2: APPLICATION_COMMAND)
  if (body.type === 2 && body.data?.name) {
    const commandName = body.data.name;
    const options = body.data.options || [];
    const getOpt = (name: string) => options.find((o) => o.name === name)?.value;

    // COMANDO 1: /gemini o /consultar (con respuesta diferida Type 5 para IA)
    if (commandName === "gemini" || commandName === "consultar" || commandName === "ask") {
      const userPrompt = String(getOpt("pregunta") || "").trim();
      const isPrivate = Boolean(getOpt("privado"));

      if (!userPrompt) {
        return NextResponse.json({
          type: 4,
          data: { content: "⚠️ Por favor escribe una pregunta para Gemini.", flags: 64 },
        });
      }

      // Si tenemos application_id e interactionToken, usamos el flujo diferido asíncrono
      if (applicationId && interactionToken) {
        waitUntil(
          (async () => {
            try {
              const aiResponse = await processGeminiQueryWithTools(userPrompt, userDisplayName);
              const header = `> **Consulta:** ${userPrompt}\n\n`;
              await updateOriginalDiscordMessage(applicationId, interactionToken, `${header}${aiResponse}`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              await updateOriginalDiscordMessage(
                applicationId,
                interactionToken,
                `❌ Error procesando consulta con Gemini: ${msg}`
              );
            }
          })()
        );

        // Devolver inmediatamente Type 5 (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE)
        return NextResponse.json({
          type: 5,
          data: { flags: isPrivate ? 64 : 0 },
        });
      }

      // Fallback síncrono si no hay token diferido
      const aiResponse = await processGeminiQueryWithTools(userPrompt, userDisplayName);
      return NextResponse.json({
        type: 4,
        data: { content: aiResponse, flags: isPrivate ? 64 : 0 },
      });
    }

    if (commandName === "prompt") {
      const taskInput = String(getOpt("tarea") || "").trim();
      const matchCode = taskInput.match(/CEO-\d+/i);
      const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

      let cleanTitle = taskInput
        .replace(/^CEO-\d+[:\s-]*/i, "")
        .replace(/^Prompt:\s*/i, "")
        .trim();

      if (!cleanTitle && matchCode) {
        const linearTitle = await getLinearIssueTitle(taskCode);
        if (linearTitle) {
          cleanTitle = linearTitle;
        }
      }

      if (!cleanTitle) {
        cleanTitle = "Tarea del sprint";
      }

      const slug = cleanTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const branchName = `feat/${taskCode.toLowerCase()}-${slug}`;

      const promptText =
        `OBJETIVO: Resolver la tarea "${taskCode}: ${cleanTitle}" en el LMS CEOUBB.\n\n` +
        `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y reglas del repositorio.\n\n` +
        `REGLAS (AGENTS.md):\n` +
        `- Usar siempre pnpm (no npm, no bun).\n` +
        `- Mantener la consistencia estricta con lib/access-policy.ts (@ubiobio.cl).\n` +
        `- Respetar el diseño institucional sobrio y liviano (design-ceoubb.md).\n\n` +
        `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck antes de concluir.`;

      const responseMarkdown =
        `### 📋 Prompt para Agente (${taskCode}: ${cleanTitle})\n` +
        `Copia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n` +
        `\`\`\`markdown\n` +
        `${promptText}\n` +
        `\`\`\`\n` +
        `💻 **Comando de inicio en terminal:**\n` +
        `\`\`\`bash\n` +
        `git checkout -b ${branchName} && pnpm dev\n` +
        `\`\`\``;

      return NextResponse.json({
        type: 4,
        data: { content: responseMarkdown, flags: 64 },
      });
    }

    if (commandName === "gitstarter") {
      const taskInput = String(getOpt("tarea") || "tarea").trim();
      const matchCode = taskInput.match(/CEO-\d+/i);
      const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

      let cleanTitle = taskInput
        .replace(/^CEO-\d+[:\s-]*/i, "")
        .trim();

      if (!cleanTitle && matchCode) {
        const linearTitle = await getLinearIssueTitle(taskCode);
        if (linearTitle) cleanTitle = linearTitle;
      }

      const slug = (cleanTitle || "tarea")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      return NextResponse.json({
        type: 4,
        data: {
          content: `💻 **Comando para iniciar rama:**\n\`\`\`bash\ngit checkout -b feat/${taskCode.toLowerCase()}-${slug} && pnpm dev\n\`\`\``,
          flags: 64,
        },
      });
    }

    if (commandName === "doctor") {
      const liveDiagnostics = await fetchLatestCIDiagnostics();
      return NextResponse.json({
        type: 4,
        data: { content: liveDiagnostics },
      });
    }

    if (commandName === "review-pr") {
      const prNum = getOpt("numero");
      if (!prNum) {
        return NextResponse.json({
          type: 4,
          data: { content: "⚠️ Debes ingresar el número de un PR (ej: `/review-pr numero:10`).", flags: 64 },
        });
      }

      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CEOUBB-Discord-Interactions",
        };
        if (process.env.GITHUB_TOKEN) {
          headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
        }

        const prRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls/${prNum}`, {
          headers,
          signal: AbortSignal.timeout(6000),
        });

        if (!prRes.ok) {
          return NextResponse.json({
            type: 4,
            data: { content: `⚠️ No se encontró el PR #${prNum} en el repositorio CEOUBB/CEOUBB.`, flags: 64 },
          });
        }

        const prData = await prRes.json();

        const diffRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls/${prNum}`, {
          headers: { ...headers, Accept: "application/vnd.github.v3.diff" },
          signal: AbortSignal.timeout(8000),
        });

        const diffText = diffRes.ok ? await diffRes.text() : "";
        const truncatedDiff = diffText.slice(0, 6000);

        let reactDoctorNotes = "Sin comentarios de React Doctor detectados en el PR.";
        try {
          const commentsRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/issues/${prNum}/comments`, {
            headers,
            signal: AbortSignal.timeout(5000),
          });
          if (commentsRes.ok) {
            const comments = await commentsRes.json();
            const doctorComments = (comments || []).filter((c: { body?: string; user?: { login?: string } }) =>
              c.body?.toLowerCase().includes("react doctor") ||
              c.body?.toLowerCase().includes("million") ||
              c.user?.login?.toLowerCase().includes("doctor")
            );
            if (doctorComments.length > 0) {
              reactDoctorNotes = doctorComments.map((c: { body?: string }) => c.body).join("\n\n---\n\n").slice(0, 3000);
            }
          }
        } catch {
          // Ignorar error al consultar comentarios
        }

        const prompt = `
Eres el Revisor Senior de Código y Arquitectura de CEOUBB (LMS Universidad del Bío-Bío).
Audita el Pull Request #${prNum}: "${prData.title}" (${prData.head?.ref} -> ${prData.base?.ref})

=== DIFF DE CÓDIGO ===
${truncatedDiff}

=== COMENTARIOS DE AUDITORÍA (REACT DOCTOR / CI) ===
${reactDoctorNotes}

---
Instrucciones de auditoría:
1. Diagnósticos de React Doctor: Revisa si React Doctor dejó advertencias de rendimiento, renderizados innecesarios o accesibilidad. Si React Doctor reportó algún problema, enuméralo detalladamente y EXIGE su resolución antes de aprobar el PR.
2. Seguridad & Roles: Verificar que la derivación de roles use estrictamente lib/access-policy.ts y dominios @ubiobio.cl.
3. Escala UBB: Verificar uso de pnpm, diseño sobrio (design-ceoubb.md) y pruebas unitarias.

Emite un informe conciso en español formal con este formato:
**Resumen**: (1 frase de lo que hace el PR)
**Diagnósticos de React Doctor**: (Detalla si hay problemas reportados por React Doctor o si está completamente limpio)
**Seguridad & Roles**: (Verificar @ubiobio.cl / lib/access-policy.ts)
**Escala UBB**: (Verificar uso de pnpm, diseño sobrio y estabilidad)
**Veredicto**: (✅ APROBADO si todo está limpio y sin problemas de React Doctor, o ⚠️ REQUIERE CAMBIOS indicando qué corregir)
`;

        const apiKey = getGeminiApiKey();
        let review = "API Key de Gemini no configurada.";
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          for (const modelId of MODEL_FALLBACK_LIST) {
            try {
              const res = await ai.models.generateContent({
                model: modelId,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
              });
              const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                review = text.trim();
                break;
              }
            } catch {
              // Probar siguiente modelo
            }
          }
        }

        const responseMarkdown =
          `### 🔍 Auditoría de PR #${prNum}: [${prData.title}](${prData.html_url})\n\n` +
          `${review}`;

        return NextResponse.json({
          type: 4,
          data: { content: responseMarkdown },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          type: 4,
          data: { content: `❌ Error auditando PR #${prNum}: ${msg}`, flags: 64 },
        });
      }
    }

    if (commandName === "standup") {
      const markdown =
        `### ☀️ CEOUBB Standup Instantáneo\n\n` +
        `Para ver el reporte completo y lanzar tareas, usa los botones del Standup en <#1537708834561327175> o <#1538027564503933039>.`;
      return NextResponse.json({
        type: 4,
        data: { content: markdown },
      });
    }
  }

  // 4. Manejo de clics en Botones (Type 3: MESSAGE_COMPONENT)
  if (body.type === 3 && body.data?.custom_id) {
    const customId = body.data.custom_id;
    const parts = customId.split(":");
    const taskCode = parts[2] || "CEO-TASK";
    const rawTitle = parts[3] || "Tarea del sprint";
    const cleanTitle = rawTitle
      .replace(/^CEO-\d+[:\s-]*/i, "")
      .replace(/^Prompt:\s*/i, "")
      .trim() || "Tarea del sprint";

    const slug = cleanTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const branchName = `feat/${taskCode.toLowerCase()}-${slug}`;

    const promptText =
      `OBJETIVO: Resolver la tarea "${taskCode}: ${cleanTitle}" en el LMS CEOUBB.\n\n` +
      `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y reglas del repositorio.\n\n` +
      `REGLAS (AGENTS.md):\n` +
      `- Usar siempre pnpm (no npm, no bun).\n` +
      `- Mantener la consistencia estricta con lib/access-policy.ts (@ubiobio.cl).\n` +
      `- Respetar el diseño institucional sobrio y liviano (design-ceoubb.md).\n\n` +
      `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck antes de concluir.`;

    const responseMarkdown =
      `### 📋 Prompt para Agente (${taskCode}: ${cleanTitle})\n` +
      `Copia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n` +
      `\`\`\`markdown\n` +
      `${promptText}\n` +
      `\`\`\`\n` +
      `💻 **Comando de inicio en terminal:**\n` +
      `\`\`\`bash\n` +
      `git checkout -b ${branchName} && pnpm dev\n` +
      `\`\`\``;

    return NextResponse.json({
      type: 4,
      data: {
        content: responseMarkdown,
        flags: 64,
      },
    });
  }

  return NextResponse.json({ type: 4, data: { content: "Acción procesada.", flags: 64 } });
}
