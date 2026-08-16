import { getLinearIssue } from "../services/linear.ts";

/**
 * Generador y formateador de prompts y nombres de rama para agentes de IA (Antigravity, Claude Code, Codex).
 */

/**
 * Consulta el título real del issue en Linear si se proporciona solo el identificador (ej. CEO-38).
 */
export async function getLinearIssueTitle(issueId: string): Promise<string | null> {
  try {
    const issue = await getLinearIssue(issueId);
    return issue?.title || null;
  } catch {
    return null;
  }
}

/**
 * Limpia el texto de entrada eliminando prefijos como "CEO-XX:" o "Prompt:".
 */
export function sanitizeTaskTitle(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/^CEO-\d+[:\s-]*/i, "")
    .replace(/^Prompt:\s*/i, "")
    .trim();
  return cleaned || "Tarea del sprint";
}

/**
 * Normaliza y convierte un título a slug apto para ramas de git (kebab-case).
 */
export function slugifyTitle(title: string): string {
  return (title || "tarea")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Construye el nombre canónico de la rama git (ej. feat/ceo-38-modulo-calificaciones).
 */
export function buildBranchName(taskCode: string, title: string): string {
  const code = (taskCode || "CEO-TASK").toLowerCase();
  const slug = slugifyTitle(title);
  return `feat/${code}-${slug}`;
}

/**
 * Resuelve el código de tarea y el título limpio a partir del texto del usuario, consultando Linear si es necesario.
 */
export async function resolveTaskAndTitle(
  taskInput: string
): Promise<{ taskCode: string; cleanTitle: string }> {
  const input = String(taskInput || "").trim();
  const matchCode = input.match(/CEO-\d+/i);
  const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

  let cleanTitle = sanitizeTaskTitle(input);

  if ((!cleanTitle || cleanTitle === "Tarea del sprint") && matchCode) {
    const linearTitle = await getLinearIssueTitle(taskCode);
    if (linearTitle) {
      cleanTitle = linearTitle;
    }
  }

  if (!cleanTitle) {
    cleanTitle = "Tarea del sprint";
  }

  return { taskCode, cleanTitle };
}

/**
 * Construye el markdown estructurado de respuesta para invocar a un agente de codificación.
 */
export function buildAgentPromptResponse(taskCode: string, cleanTitle: string): string {
  const sanitizedTitle = sanitizeTaskTitle(cleanTitle);
  const normalizedCode = (taskCode || "CEO-TASK").toUpperCase();
  const branchName = buildBranchName(normalizedCode, sanitizedTitle);

  const promptText =
    `OBJETIVO: Resolver la tarea "${normalizedCode}: ${sanitizedTitle}" en el LMS CEOUBB.\n\n` +
    `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y reglas del repositorio.\n\n` +
    `REGLAS (AGENTS.md):\n` +
    `- Usar siempre pnpm (no npm, no bun).\n` +
    `- Mantener la consistencia estricta con lib/access-policy.ts (@ubiobio.cl).\n` +
    `- Respetar el diseño institucional sobrio y liviano (DESIGN.md).\n\n` +
    `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck antes de concluir.`;

  return (
    `### 📋 Prompt para Agente (${normalizedCode}: ${sanitizedTitle})\n` +
    `Copia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n` +
    `\`\`\`markdown\n` +
    `${promptText}\n` +
    `\`\`\`\n` +
    `💻 **Comando de inicio en terminal:**\n` +
    `\`\`\`bash\n` +
    `git checkout -b ${branchName} && pnpm dev\n` +
    `\`\`\``
  );
}
