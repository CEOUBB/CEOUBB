import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { fetchDiscordChannelHistory } from "./messages.ts";
import { fetchLatestCIDiagnostics } from "./diagnostics.ts";
import { getGeminiApiKey, MODEL_FALLBACK_LIST } from "../services/gemini.ts";
import { getLinearApiKey, getLinearIssue, listActiveLinearIssues } from "../services/linear.ts";
import { getRecentCommits, listPullRequests } from "../services/github.ts";

/**
 * Carga contexto del repositorio (AGENTS.md, PLAN.md, design-ceoubb.md) para grounding del LLM.
 */
export function getProjectContext(): string {
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
export const geminiToolsDeclarations: FunctionDeclaration[] = [
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
 * Ejecutor de herramientas conectadas a Linear y GitHub
 */
export async function executeGeminiToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === "linear_get_issue") {
    const issueId = String(args.issueId || "").toUpperCase();
    if (!getLinearApiKey()) return { error: "LINEAR_API_KEY no configurada en Vercel." };

    const issue = await getLinearIssue(issueId);
    if (!issue) return { error: `No se encontró el issue ${issueId} en Linear` };
    return issue;
  }

  if (name === "linear_list_active_issues") {
    if (!getLinearApiKey()) return { error: "LINEAR_API_KEY no configurada en Vercel." };
    const limit = typeof args.limit === "number" ? Math.min(args.limit, 20) : 10;
    const issues = await listActiveLinearIssues(limit);
    return {
      count: issues.length,
      issues,
    };
  }

  if (name === "github_recent_commits") {
    const count = typeof args.count === "number" ? Math.min(args.count, 10) : 5;
    const commits = await getRecentCommits(count);
    return commits.map((c) => ({
      sha: c.sha,
      author: c.author,
      message: c.message,
    }));
  }

  if (name === "github_list_prs") {
    const state = (typeof args.state === "string" ? args.state : "open") as "open" | "closed" | "all";
    const prs = await listPullRequests(state, 5);
    return prs;
  }

  if (name === "github_ci_status") {
    return await fetchLatestCIDiagnostics();
  }

  return { error: `Herramienta desconocida: ${name}` };
}

/**
 * Ejecución de Gemini con Function Calling loop y fallbacks automáticos de modelo.
 */
export async function processGeminiQueryWithTools(
  userPrompt: string,
  userDisplayName: string,
  channelId?: string
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return "⚠️ **Error de configuración:** La variable `STANDUP_GEMINI_API_KEY` o `GEMINI_API_KEY` no está configurada en Vercel.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const [projectContext, channelHistory] = await Promise.all([
    Promise.resolve(getProjectContext()),
    fetchDiscordChannelHistory(channelId, 12),
  ]);

  const systemInstruction = `Eres el Asistente de IA Senior y Copiloto de Desarrollo de CEOUBB (Centro de Estudio UBB - LMS Universidad del Bío-Bío).
Estás interactuando en Discord con el mantenedor del proyecto (${userDisplayName}).
Tienes conocimiento profundo del proyecto CEOUBB a través de los archivos del repositorio (AGENTS.md, PLAN.md, design-ceoubb.md).
Tienes acceso a herramientas para consultar Linear (issues, sprints) y GitHub (commits, PRs, CI).
Si el usuario pregunta por temas conversados previamente en el canal o acuerdos recientes, revisa el historial reciente de conversación en este canal.

Reglas indispensables de CEOUBB:
- Stack: Next.js 16 (App Router), React 19, TypeScript, Turso/libSQL, Firebase southamerica-west1.
- Paquetes: Usar SIEMPRE pnpm (no npm, no bun).
- Auth & Roles: Gobernado estrictamente por lib/access-policy.ts (@ubiobio.cl docente, @alumnos.ubiobio.cl estudiante).
- Diseño: Paper-soft (#f4f6f9), sobrio, académico, Phosphor Icons (design-ceoubb.md).
- Idioma: Responde siempre en español formal, técnico y educado.

${projectContext}
${channelHistory}`;

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
        const validCalls = functionCalls.filter((p) => Boolean(p.functionCall));
        const toolResponseParts = await Promise.all(
          validCalls.map(async (callPart) => {
            const toolCall = callPart.functionCall!;
            const toolName = toolCall.name || "";
            const toolResult = await executeGeminiToolCall(toolName, (toolCall.args as Record<string, unknown>) || {});
            return {
              functionResponse: {
                name: toolName,
                response: typeof toolResult === "object" && toolResult !== null ? (toolResult as Record<string, unknown>) : { result: toolResult },
              },
            };
          })
        );

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
