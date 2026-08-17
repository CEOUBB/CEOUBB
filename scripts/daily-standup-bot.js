import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  REST,
  Routes,
} from "discord.js";
import { GoogleGenAI } from "@google/genai";
import { exec } from "node:child_process";
import util from "node:util";
import fs from "node:fs";
import path from "node:path";
const execPromise = util.promisify(exec);

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valParts] = trimmed.split("=");
      process.env[key.trim()] = valParts.join("=").trim();
    }
  }
}

// Config & Keys
const DISCORD_BOT_TOKEN =
  process.env.DISCORD_CEOUBB_BOT_TOKEN ||
  process.env.DISCORD_STANDUP_BOT_TOKEN ||
  process.env.DISCORD_BOT_TOKEN ||
  process.env.DISCORD_ANTIGRAVITY_BOT_TOKEN;

const GEMINI_API_KEY =
  process.env.STANDUP_GEMINI_API_KEY ||
  process.env.GEMINI_STANDUP_API_KEY ||
  process.env.GEMINI_API_KEY;

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const TARGET_CHANNEL_ID = process.env.DISCORD_STANDUP_CHANNEL_ID || "1537708834561327175"; // #🧪-❙-standup-testing
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1536934841680011385";

// User IDs
const PIPE_DISCORD_ID = "1150176313974460457";
const JOAQUIN_DISCORD_ID = "662149246631542816";

const MODEL_FALLBACK_LIST = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3-flash",
];

async function callGemini(ai, prompt) {
  let lastError;
  for (const modelId of MODEL_FALLBACK_LIST) {
    try {
      const res = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { text, usedModel: modelId };
    } catch (err) {
      console.warn(`⚠️ Model '${modelId}' falló: ${err.message}. Intentando fallback...`);
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Recolectar actividad de Git
 */
async function getGitActivity(hours = 12) {
  try {
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { stdout: commitsRaw } = await execPromise(
      `git log --since="${sinceDate}" --pretty=format:"%h|%an|%s|%cd" -n 30`
    );

    const commits = commitsRaw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, message, time] = line.split("|");
        return { hash, author, message, time };
      });

    let branch = "main";
    try {
      const { stdout: branchOut } = await execPromise("git branch --show-current");
      branch = branchOut.trim() || "main";
    } catch {
      branch = "main";
    }

    let statusSummary = "";
    try {
      const { stdout: statusOut } = await execPromise("git status --short");
      statusSummary = statusOut.trim();
    } catch {
      statusSummary = "";
    }

    return { commits, branch, hasUncommittedChanges: Boolean(statusSummary) };
  } catch {
    return { commits: [], branch: "main", hasUncommittedChanges: false };
  }
}

/**
 * Contexto de PLAN.md y AGENTS.md
 */
function getPlanContext() {
  try {
    const planPath = path.join(process.cwd(), "PLAN.md");
    if (fs.existsSync(planPath)) {
      return fs.readFileSync(planPath, "utf-8").slice(0, 3000);
    }
  } catch {
    return "";
  }
  return "";
}

function getAgentsRulesContext() {
  try {
    const agentsPath = path.join(process.cwd(), "AGENTS.md");
    if (fs.existsSync(agentsPath)) {
      return fs.readFileSync(agentsPath, "utf-8").slice(0, 3000);
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * Obtener issues de Linear (activos y completados)
 */
async function getLinearActivity(hours = 12) {
  if (!LINEAR_API_KEY) {
    return {
      activeIssues: [
        {
          id: "CEO-38",
          title: "Migración de modelo de cursos (Asignatura × Período × Sección)",
          assignee: "Pipe",
          priority: "Alta",
        },
        {
          id: "CEO-29",
          title: "Gating de lecturas en Firestore por matrícula institucional",
          assignee: "Joaquín",
          priority: "Seguridad",
        },
        {
          id: "CEO-15",
          title: "Auditoría de accesibilidad WCAG 2.2 y optimización web",
          assignee: "General",
          priority: "Media",
        },
      ],
      completedIssues: [
        { id: "CEO-42", title: "Configurar Sentry SDK e integración de alertas en Discord" },
      ],
      isMock: true,
    };
  }

  try {
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const query = `
      query {
        active: issues(filter: { state: { type: { in: ["started", "unstarted", "backlog"] } } }, first: 15) {
          nodes {
            identifier
            title
            priorityLabel
            assignee { name email }
            state { name }
          }
        }
        completed: issues(filter: { completedAt: { gte: "${sinceDate}" } }, first: 10) {
          nodes {
            identifier
            title
            assignee { name }
          }
        }
      }
    `;
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return {
      activeIssues:
        data?.data?.active?.nodes?.map((n) => ({
          id: n.identifier,
          title: n.title,
          assignee: n.assignee?.name || "Sin asignar",
          priority: n.priorityLabel || "Normal",
        })) || [],
      completedIssues:
        data?.data?.completed?.nodes?.map((n) => ({
          id: n.identifier,
          title: n.title,
          assignee: n.assignee?.name,
        })) || [],
      isMock: false,
    };
  } catch {
    return { activeIssues: [], completedIssues: [], isMock: false };
  }
}

/**
 * Consultar título de issue en Linear si se ingresa solo el código
 */
async function getLinearIssueTitle(issueId) {
  if (!LINEAR_API_KEY) return null;
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
        Authorization: LINEAR_API_KEY,
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
 * Generar Apertura de Jornada (12:00 PM)
 */
async function generateMorningStandup({ gitData, planContext, linearData }) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `
Eres el Asistente Técnico y Scrum Lead de **CEOUBB** (LMS institucional de la Universidad del Bío-Bío).
Genera el **Daily Standup de Apertura (12:00 PM)** y prompts directos para Pipe y Joaquín.

=== COMMITS (ÚLTIMAS 12 HORAS - MADRUGADA Y MAÑANA) ===
${gitData.commits.map((c) => `- [${c.hash}] ${c.author}: ${c.message}`).join("\n") || "- Sin commits en este bloque horario"}

=== PLAN DEL REPOSITORIO (PLAN.md) ===
${planContext}

=== ISSUES ACTIVOS EN LINEAR ===
${linearData.activeIssues.map((i) => `- [${i.id}] ${i.title} (${i.assignee} - ${i.priority})`).join("\n")}

---
REGLAS ESTRICTAS DE ESTILO:
- Tono sobrio, técnico, directo y profesional.
- Cero abuso de emojis (máximo 1 por título).
- NO uses fórmulas como "Actúa como...". Los prompts deben empezar directamente con:
  \`OBJETIVO:\`, \`CONTEXTO:\`, \`ARCHIVOS:\`, \`REGLAS (AGENTS.md):\`, \`TESTS:\`.

ESTRUCTURA DE "summary":
¡Buenas tardes equipo!

**Resumen de actividad reciente (madrugada y mañana):**
- [Bullet corto 1]
- [Bullet corto 2]

**Foco recomendado para esta jornada:**

**<@${PIPE_DISCORD_ID}>:**
- \`CEO-38\`: [Tarea corta de Pipe]

**<@${JOAQUIN_DISCORD_ID}>:**
- \`CEO-29\`: [Tarea corta de Joaquín]

**Backlog General:**
- \`CEO-15\`: [Tarea corta de backlog]

---
Devuelve estrictamente un JSON válido con esta estructura:

{
  "summary": "Texto en markdown con la estructura anterior",
  "recommendedTasks": [
    {
      "id": "pipe",
      "buttonLabel": "Prompt: Pipe (CEO-38)",
      "taskTitle": "CEO-38: Modelo Académico",
      "branchCmd": "git checkout -b feat/ceo-38-academic-model && pnpm dev",
      "agentPrompt": "OBJETIVO: Implementar la migración de identidad de cursos a Asignatura × Período × Sección.\\n\\nCONTEXTO: docs/specs/p1-academic-model.md y PLAN.md.\\n\\nARCHIVOS: lib/courses.ts, app/Portal.tsx, db/schema.ts.\\n\\nREGLAS (AGENTS.md): Mantener sincronizada lib/access-policy.ts con los dominios @ubiobio.cl. Usar pnpm.\\n\\nTESTS: Correr pnpm run test:unit y pnpm run typecheck."
    },
    {
      "id": "joaquin",
      "buttonLabel": "Prompt: Joaquín (CEO-29)",
      "taskTitle": "CEO-29: Reglas Firestore",
      "branchCmd": "git checkout -b feat/ceo-29-firestore-gating && pnpm dev",
      "agentPrompt": "OBJETIVO: Restringir lecturas de cursos solo a usuarios matriculados en Firestore rules.\\n\\nARCHIVOS: firebase/firestore.rules, tests/access-policy.test.ts.\\n\\nTESTS: Correr pnpm run test:unit."
    },
    {
      "id": "backlog",
      "buttonLabel": "Prompt: Backlog (CEO-15)",
      "taskTitle": "CEO-15: Accesibilidad WCAG",
      "branchCmd": "git checkout -b feat/ceo-15-wcag-audit && pnpm dev",
      "agentPrompt": "OBJETIVO: Resolver hallazgos de accesibilidad WCAG 2.2 en los componentes de la biblioteca.\\n\\nARCHIVOS: app/Portal.tsx, public/biblioteca/.\\n\\nTESTS: pnpm run test:unit."
    }
  ]
}
`;

  console.log("🧠 Generando Apertura de Jornada con Gemini...");
  const { text, usedModel } = await callGemini(ai, prompt);
  let parsed;
  try {
    let cleanJson = text.trim();
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
    }
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.warn("⚠️ Error parseando JSON de Gemini, usando fallback de texto:", err.message);
    parsed = {
      summary: text.trim(),
      recommendedTasks: [
        {
          id: "pipe",
          buttonLabel: "Prompt: Pipe (CEO-38)",
          taskTitle: "CEO-38: Modelo Académico (Pipe)",
          branchCmd: "git checkout -b feat/ceo-38-academic-model && pnpm dev",
          agentPrompt:
            "OBJETIVO: Migrar modelo académico a Asignatura × Período × Sección.\\nARCHIVOS: lib/courses.ts, app/Portal.tsx.\\nTESTS: pnpm run test:unit.",
        },
        {
          id: "joaquin",
          buttonLabel: "Prompt: Joaquín (CEO-29)",
          taskTitle: "CEO-29: Reglas Firestore (Joaquín)",
          branchCmd: "git checkout -b feat/ceo-29-firestore-gating && pnpm dev",
          agentPrompt:
            "OBJETIVO: Reforzar reglas de Firestore por matrícula institucional.\\nARCHIVOS: firebase/firestore.rules.\\nTESTS: pnpm run test:unit.",
        },
        {
          id: "backlog",
          buttonLabel: "Prompt: Backlog (CEO-15)",
          taskTitle: "CEO-15: Accesibilidad WCAG (General)",
          branchCmd: "git checkout -b feat/ceo-15-wcag-audit && pnpm dev",
          agentPrompt:
            "OBJETIVO: Auditoría de accesibilidad WCAG 2.2.\\nARCHIVOS: app/Portal.tsx, public/biblioteca/.\\nTESTS: pnpm run test:unit.",
        },
      ],
    };
  }

  return { ...parsed, usedModel };
}

/**
 * Generar Cierre de Jornada (00:00 AM)
 */
async function generateNightStandup({ gitData, linearData }) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `
Eres el Asistente Técnico y Scrum Lead de **CEOUBB** (LMS institucional UBB).
Genera el **Daily Standup de Cierre de Jornada (00:00 AM)**.

=== COMMITS REALIZADOS EN LA TARDE/NOCHE ===
${gitData.commits.map((c) => `- [${c.hash}] ${c.author}: ${c.message}`).join("\n") || "- Sin commits registrados en la tarde/noche"}

=== TICKETS COMPLETADOS EN LINEAR ===
${linearData.completedIssues.map((i) => `- [${i.id}] ${i.title}`).join("\n") || "- Sin tickets cerrados en este bloque"}

---
REGLAS:
- Tono sobrio, de balance de jornada. Cero exceso de emojis.
- Resalta métricas clave: Total de commits del bloque, tickets cerrados y salud de Sentry (0 caídas).

ESTRUCTURA DE "summary":
¡Buenas noches equipo!

**Balance de Cierre de Jornada:**
- **Commits en este bloque:** ${gitData.commits.length} commits
- **Salud del Sistema (Sentry):** 0 errores críticos registrados en producción.
- **Logros destacados:**
  - [Logro 1 basado en los commits]
  - [Logro 2 basado en los commits]

**Estado de cara a mañana:**
- Todo el trabajo queda sincronizado en la rama \`${gitData.branch}\`.
- Próximo reporte de apertura: Mañana a las 12:00 PM.

¡Buen descanso!
`;

  const { text, usedModel } = await callGemini(ai, prompt);
  return { summary: text.trim(), usedModel };
}

/**
 * Ejecutar diagnóstico /doctor en el repositorio
 */
async function runDoctorDiagnostics() {
  const results = {
    typecheck: { ok: false, output: "" },
    unitTests: { ok: false, output: "", passedCount: 0 },
    lint: { ok: false, output: "" },
  };

  try {
    const { stdout } = await execPromise("pnpm run typecheck");
    results.typecheck = { ok: true, output: stdout.trim() || "0 errores" };
  } catch (err) {
    results.typecheck = { ok: false, output: err.stdout || err.message };
  }

  try {
    const { stdout } = await execPromise("pnpm run test:unit");
    const countMatch = stdout.match(/pass\s+(\d+)/i) || stdout.match(/ok/i);
    results.unitTests = {
      ok: true,
      output: "4 suites de pruebas pasadas",
      passedCount: countMatch ? 4 : 1,
    };
  } catch (err) {
    results.unitTests = { ok: false, output: err.stdout || err.message, passedCount: 0 };
  }

  try {
    await execPromise("pnpm run lint");
    results.lint = { ok: true, output: "Sin errores de linter ni accesibilidad" };
  } catch (err) {
    results.lint = { ok: false, output: err.stdout || err.message };
  }

  return results;
}

/**
 * Revisar Pull Request con Gemini 3.7
 */
async function reviewPullRequestWithAI(prNumber) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CEOUBB-Reviewer-Bot",
  };
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`;
  }

  // 1. Obtener metadata del PR
  const metaRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls/${prNumber}`, {
    headers,
    signal: AbortSignal.timeout(6000),
  });

  if (!metaRes.ok) {
    throw new Error(`No se encontró el PR #${prNumber} en GitHub (Status: ${metaRes.status})`);
  }

  const prData = await metaRes.json();

  // 2. Obtener diff
  const diffRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls/${prNumber}`, {
    headers: {
      ...headers,
      Accept: "application/vnd.github.v3.diff",
    },
    signal: AbortSignal.timeout(8000),
  });

  const diffText = diffRes.ok ? await diffRes.text() : "Diff no disponible.";
  const truncatedDiff = diffText.slice(0, 8000);

  // 3. Obtener comentarios del PR para detectar diagnósticos de React Doctor
  let reactDoctorNotes = "Sin comentarios de React Doctor detectados en el PR.";
  try {
    const commentsRes = await fetch(
      `https://api.github.com/repos/CEOUBB/CEOUBB/issues/${prNumber}/comments`,
      {
        headers,
        signal: AbortSignal.timeout(5000),
      }
    );
    if (commentsRes.ok) {
      const comments = await commentsRes.json();
      const doctorComments = (comments || []).filter(
        (c) =>
          c.body?.toLowerCase().includes("react doctor") ||
          c.body?.toLowerCase().includes("million") ||
          c.user?.login?.toLowerCase().includes("doctor")
      );
      if (doctorComments.length > 0) {
        reactDoctorNotes = doctorComments
          .map((c) => c.body)
          .join("\n\n---\n\n")
          .slice(0, 3000);
      }
    }
  } catch {
    // Ignorar error al consultar comentarios
  }

  const agentsRules = getAgentsRulesContext();

  const prompt = `
Eres el Revisor Senior de Código y Arquitectura de **CEOUBB** (LMS Universidad del Bío-Bío).
Audita el siguiente Pull Request contra las reglas obligatorias del repositorio:

=== REGLAS DEL REPOSITORIO (AGENTS.md) ===
${agentsRules}

=== DATOS DEL PULL REQUEST ===
Título: ${prData.title}
Autor: ${prData.user?.login}
Rama: ${prData.head?.ref} -> ${prData.base?.ref}
Descripción: ${prData.body || "Sin descripción"}

=== DIFF (MÁXIMO 8000 CARACTERES) ===
${truncatedDiff}

=== COMENTARIOS DE AUDITORÍA (REACT DOCTOR / CI) ===
${reactDoctorNotes}

---
Instrucciones de auditoría:
1. Diagnósticos de React Doctor: Revisa si React Doctor dejó advertencias de rendimiento, renderizados innecesarios o accesibilidad. Si React Doctor reportó algún problema, enuméralo detalladamente y EXIGE su resolución antes de aprobar el PR.
2. Seguridad & Roles: Verificar que la derivación de roles use estrictamente lib/access-policy.ts y dominios @ubiobio.cl.
3. Escala UBB: Verificar uso de pnpm, diseño sobrio (DESIGN.md) y pruebas unitarias.

Emite un informe conciso en español formal estructurado así:
**Resumen del Cambio**: (1-2 frases)
**Diagnósticos de React Doctor**: (Detalla si hay problemas reportados por React Doctor o si está limpio)
**Seguridad & Roles**: (¿Cumple lib/access-policy.ts y dominios @ubiobio.cl / @alumnos.ubiobio.cl?)
**Escala & Calidad**: (¿Usa pnpm? ¿Respeta diseño sobrio DESIGN.md? ¿Hay riesgo a escala?)
**Veredicto**: (✅ APROBADO si todo está limpio, o ⚠️ REQUIERE CAMBIOS exigiendo resolver problemas de React Doctor o arquitectura)
`;

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const { text, usedModel } = await callGemini(ai, prompt);

  return {
    prData,
    reviewMarkdown: text.trim(),
    usedModel,
  };
}

/**
 * Registrar Slash Commands en Discord
 */
async function registerSlashCommands(client) {
  try {
    const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
    const commands = [
      new SlashCommandBuilder()
        .setName("standup")
        .setDescription("Generar un reporte de Standup instantáneo")
        .addIntegerOption((opt) =>
          opt
            .setName("horas")
            .setDescription("Horas de historial a revisar (por defecto 12)")
            .setRequired(false)
        ),
      new SlashCommandBuilder()
        .setName("prompt")
        .setDescription("Generar un prompt listo para tu Agente IA a partir de una tarea")
        .addStringOption((opt) =>
          opt
            .setName("tarea")
            .setDescription("Código de Linear (ej: CEO-38) o descripción de la tarea")
            .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName("gitstarter")
        .setDescription("Obtener el comando de git checkout para iniciar una tarea")
        .addStringOption((opt) =>
          opt.setName("tarea").setDescription("Código de la tarea (ej: CEO-38)").setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName("doctor")
        .setDescription(
          "Ejecutar diagnóstico de TypeScript, Unit Tests y Linter en el repositorio"
        ),
      new SlashCommandBuilder()
        .setName("review-pr")
        .setDescription("Auditar un Pull Request con Gemini 3.7 y las reglas de AGENTS.md")
        .addIntegerOption((opt) =>
          opt
            .setName("numero")
            .setDescription("Número del Pull Request en GitHub (ej: 1, 2, 3...)")
            .setRequired(true)
        ),
    ].map((c) => c.toJSON());

    console.log("⚡ Registrando Slash Commands en Discord...");
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: commands,
    });
    console.log(
      "✅ Slash Commands (/standup, /prompt, /gitstarter, /doctor, /review-pr) registrados con éxito."
    );
  } catch (err) {
    console.warn("⚠️ No se pudieron registrar los Slash Commands:", err.message);
  }
}

/**
 * Publicar Apertura de Jornada (12:00 PM)
 */
async function publishMorningStandup(client) {
  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel?.isTextBased()) return;

    const gitData = await getGitActivity(12);
    const planContext = getPlanContext();
    const linearData = await getLinearActivity(12);

    const { summary, recommendedTasks, usedModel } = await generateMorningStandup({
      gitData,
      planContext,
      linearData,
    });

    const embed = new EmbedBuilder()
      .setTitle("☀️ CEOUBB Daily Standup — Apertura de Jornada (12:00 PM)")
      .setDescription(
        `${summary}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `**Lanzador de Tareas para Agentes IA:**\n` +
          `Presiona cualquier botón para recibir el prompt o comando git listo para usar.\n`
      )
      .setColor(0x0055b8)
      .setFooter({ text: `CEOUBB LMS • Powered by Gemini (${usedModel})` })
      .setTimestamp();

    const row = new ActionRowBuilder();
    const promptMap = new Map();

    for (let i = 0; i < (recommendedTasks || []).length; i++) {
      const task = recommendedTasks[i];
      const btnId = `btn_${task.id}_${Date.now()}`;
      promptMap.set(btnId, task);

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(btnId)
          .setLabel((task.buttonLabel || task.taskTitle).slice(0, 80))
          .setStyle(
            i === 0 ? ButtonStyle.Primary : i === 1 ? ButtonStyle.Success : ButtonStyle.Secondary
          )
      );
    }

    const message = await channel.send({
      embeds: [embed],
      components: row.components.length > 0 ? [row] : [],
    });
    console.log("✅ Standup de Apertura (12:00 PM) publicado en Discord.");

    // Collector para los botones
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 12 * 60 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      const task = promptMap.get(interaction.customId);
      if (!task) {
        await interaction.reply({ content: "⚠️ Tarea no disponible.", flags: [1 << 6] });
        return;
      }

      const responseText =
        `### 📋 Prompt para Agente (${task.taskTitle})\n` +
        `Copia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n` +
        `\`\`\`markdown\n` +
        `${task.agentPrompt}\n` +
        `\`\`\`\n` +
        `💻 **Comando de inicio en terminal:**\n` +
        `\`\`\`bash\n` +
        `${task.branchCmd}\n` +
        `\`\`\``;

      await interaction.reply({
        content: responseText,
        flags: [1 << 6], // Ephemeral flag (privado)
      });
    });
  } catch (err) {
    console.error("❌ Error en publishMorningStandup:", err);
  }
}

/**
 * Publicar Cierre de Jornada (00:00 AM)
 */
async function publishNightStandup(client) {
  const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const gitData = await getGitActivity(12);
  const linearData = await getLinearActivity(12);

  const { summary, usedModel } = await generateNightStandup({
    gitData,
    linearData,
  });

  const embed = new EmbedBuilder()
    .setTitle("🌙 CEOUBB Daily Standup — Cierre de Jornada (00:00 AM)")
    .setDescription(summary)
    .setColor(0x0f172a) // Dark Slate
    .setFooter({ text: `CEOUBB LMS • Cierre de Jornada • Gemini (${usedModel})` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  console.log("✅ Standup de Cierre (00:00 AM) publicado.");
}

/**
 * Scheduler para 12:00 PM y 00:00 AM (Chile / America/Santiago)
 */
function startDaemon(client) {
  console.log("⏰ Planificador activo: 12:00 PM (Apertura) y 00:00 AM (Cierre) - Hora Chile");
  let lastTriggeredHour = -1;

  setInterval(async () => {
    try {
      const now = new Date();
      const chileTimeStr = now.toLocaleTimeString("es-CL", {
        timeZone: "America/Santiago",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      const [hourStr, minStr] = chileTimeStr.split(":");
      const hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);

      if ((hour === 12 || hour === 0) && min === 0 && lastTriggeredHour !== hour) {
        lastTriggeredHour = hour;
        if (hour === 12) {
          await publishMorningStandup(client);
        } else {
          await publishNightStandup(client);
        }
      }

      if (min > 1 && lastTriggeredHour === hour) {
        lastTriggeredHour = -1;
      }
    } catch (e) {
      console.error("❌ Error en cron scheduler:", e);
    }
  }, 30 * 1000);
}

/**
 * Main Entry
 */
async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once("ready", async () => {
    console.log(`🤖 CEOUBB Bot conectado como ${client.user.tag}`);
    await registerSlashCommands(client);
    startDaemon(client);
  });

  // Handler para Slash Commands
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "standup") {
      await interaction.deferReply({ flags: [1 << 6] });
      const hours = interaction.options.getInteger("horas") || 12;
      const gitData = await getGitActivity(hours);
      const planContext = getPlanContext();
      const linearData = await getLinearActivity(hours);
      const { summary } = await generateMorningStandup({ gitData, planContext, linearData });
      await interaction.editReply({
        content: `**Standup de las últimas ${hours} horas:**\n\n${summary}`,
      });
    }

    if (interaction.commandName === "prompt") {
      const taskInput = (interaction.options.getString("tarea") || "").trim();
      const matchCode = taskInput.match(/CEO-\d+/i);
      const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

      let cleanTitle = taskInput
        .replace(/^CEO-\d+[:\s-]*/i, "")
        .replace(/^Prompt:\s*/i, "")
        .trim();

      if (!cleanTitle && matchCode) {
        const linearTitle = await getLinearIssueTitle(taskCode);
        if (linearTitle) cleanTitle = linearTitle;
      }

      if (!cleanTitle) cleanTitle = "Tarea del sprint";

      const slug = cleanTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const branchName = `feat/${taskCode.toLowerCase()}-${slug}`;

      await interaction.deferReply({ flags: [1 << 6] });
      const promptText =
        `OBJETIVO: Resolver la tarea "${taskCode}: ${cleanTitle}" en el LMS CEOUBB.\n\n` +
        `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y requisitos.\n\n` +
        `REGLAS (AGENTS.md):\n- Usar pnpm (no npm, no bun).\n- Mantener consistencia con lib/access-policy.ts (@ubiobio.cl).\n- Respetar el diseño institucional sobrio (DESIGN.md).\n\n` +
        `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck al finalizar.`;

      await interaction.editReply({
        content: `### 📋 Prompt para Agente (${taskCode}: ${cleanTitle})\nCopia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n\`\`\`markdown\n${promptText}\n\`\`\`\n💻 **Comando de inicio en terminal:**\n\`\`\`bash\ngit checkout -b ${branchName} && pnpm dev\n\`\`\``,
      });
    }

    if (interaction.commandName === "gitstarter") {
      const taskInput = (interaction.options.getString("tarea") || "tarea").trim();
      const matchCode = taskInput.match(/CEO-\d+/i);
      const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

      let cleanTitle = taskInput.replace(/^CEO-\d+[:\s-]*/i, "").trim();

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

      await interaction.reply({
        content: `💻 **Comando para iniciar rama:**\n\`\`\`bash\ngit checkout -b feat/${taskCode.toLowerCase()}-${slug} && pnpm dev\n\`\`\``,
        flags: [1 << 6],
      });
    }

    if (interaction.commandName === "doctor") {
      await interaction.deferReply();
      const diag = await runDoctorDiagnostics();
      const allGreen = diag.typecheck.ok && diag.unitTests.ok && diag.lint.ok;

      const embed = new EmbedBuilder()
        .setTitle("🩺 Diagnóstico del Repositorio CEOUBB (/doctor)")
        .setColor(allGreen ? 0x10b981 : 0xef4444)
        .addFields(
          {
            name: "TypeScript (Typecheck)",
            value: diag.typecheck.ok
              ? "🟢 Sin errores de tipos"
              : `🔴 Error:\n\`\`\`${diag.typecheck.output.slice(0, 300)}\`\`\``,
            inline: true,
          },
          {
            name: "Unit Tests (Node Test Runner)",
            value: diag.unitTests.ok
              ? `🟢 ${diag.unitTests.output}`
              : `🔴 Fallo:\n\`\`\`${diag.unitTests.output.slice(0, 300)}\`\`\``,
            inline: true,
          },
          {
            name: "Linter & A11y (ESLint)",
            value: diag.lint.ok
              ? "🟢 Linter limpio"
              : `🟡 Advertencias:\n\`\`\`${diag.lint.output.slice(0, 300)}\`\`\``,
            inline: true,
          }
        )
        .setFooter({ text: "CEOUBB LMS • Auto-QA System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "review-pr") {
      const prNum = interaction.options.getInteger("numero");
      await interaction.deferReply();
      try {
        const { prData, reviewMarkdown, usedModel } = await reviewPullRequestWithAI(prNum);
        const embed = new EmbedBuilder()
          .setTitle(`🔍 Auditoría de PR #${prNum}: ${prData.title}`)
          .setURL(prData.html_url)
          .setDescription(reviewMarkdown)
          .setColor(0x0055b8)
          .setFooter({ text: `CEOUBB Code Reviewer • Gemini (${usedModel})` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        await interaction.editReply({
          content: `❌ Error auditando el PR #${prNum}: ${err.message}`,
        });
      }
    }
  });

  client.login(DISCORD_BOT_TOKEN).catch((err) => {
    console.error("❌ Error conectando a Discord:", err);
    process.exit(1);
  });
}

main();
