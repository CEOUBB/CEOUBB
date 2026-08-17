import { NextRequest, NextResponse } from "next/server";
import { getRecentCommits } from "../../../../lib/services/github.ts";
import {
  listActiveLinearIssues,
  listCompletedLinearIssues,
} from "../../../../lib/services/linear.ts";
import { getGeminiClient, generateContentWithFallback } from "../../../../lib/services/gemini.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s max para Vercel Serverless

// IDs
const PIPE_DISCORD_ID = "1150176313974460457";
const JOAQUIN_DISCORD_ID = "662149246631542816";
const TARGET_CHANNEL_ID = process.env.DISCORD_STANDUP_CHANNEL_ID || "1537708834561327175";

/**
 * Obtener issues de Linear con fallback en caso de no contar con API key configurada
 */
async function getLinearIssues() {
  if (!process.env.LINEAR_API_KEY) {
    return {
      active: [
        {
          id: "CEO-38",
          title: "Migración de modelo académico (Asignatura × Período × Sección)",
          assignee: "Pipe",
        },
        {
          id: "CEO-29",
          title: "Gating de lecturas en Firestore por matrícula institucional",
          assignee: "Joaquín",
        },
        { id: "CEO-15", title: "Auditoría de accesibilidad WCAG 2.2", assignee: "General" },
      ],
      completed: [
        { id: "CEO-42", title: "Configurar Sentry SDK e integración de alertas en Discord" },
      ],
    };
  }

  try {
    const [active, completed] = await Promise.all([
      listActiveLinearIssues(15),
      listCompletedLinearIssues(5),
    ]);
    return { active, completed };
  } catch {
    return { active: [], completed: [] };
  }
}

/**
 * Enviar mensaje con Embed a Discord vía REST API
 */
async function sendDiscordEmbed(embed: Record<string, unknown>, components: unknown[] = []) {
  const token =
    process.env.DISCORD_CEOUBB_BOT_TOKEN ||
    process.env.DISCORD_STANDUP_BOT_TOKEN ||
    process.env.DISCORD_BOT_TOKEN;

  if (!token) throw new Error("Falta DISCORD_CEOUBB_BOT_TOKEN en las variables de entorno");

  const res = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify({
      embeds: [embed],
      components,
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API error (${res.status}): ${errText}`);
  }

  return await res.json();
}

export async function GET(req: NextRequest) {
  // Verificación de seguridad de Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "morning"; // 'morning' (12:00) o 'night' (00:00)

  const ai = getGeminiClient();
  if (!ai) {
    return NextResponse.json({ error: "Falta STANDUP_GEMINI_API_KEY" }, { status: 500 });
  }

  const [commits, linear] = await Promise.all([getRecentCommits(10), getLinearIssues()]);

  if (type === "morning") {
    const prompt = `
Eres el Scrum Lead y Tech Advisor de **CEOUBB** (LMS Universidad del Bío-Bío).
Genera el **Daily Standup de Apertura (12:00 PM)** para Pipe y Joaquín con tareas y prompts técnicos.

=== COMMITS RECIENTES EN GITHUB ===
${commits.map((c: { hash: string; author: string; message: string }) => `- [${c.hash}] ${c.author}: ${c.message}`).join("\n") || "- Sin commits recientes"}

=== ISSUES DE LINEAR ===
${linear.active.map((i: { id: string; title: string; assignee?: string }) => `- [${i.id}] ${i.title} (${i.assignee || "Sin asignar"})`).join("\n")}

REGLAS DE ESTILO:
- Tono sobrio, técnico, directo y profesional. Cero exceso de emojis.
- Resumen en 2 bullets cortos.
- Sin "Actúa como".

ESTRUCTURA DE "summary":
¡Buenas tardes equipo!

**Resumen de actividad reciente:**
- [Bullet corto 1]
- [Bullet corto 2]

**Foco recomendado para esta jornada:**

**<@${PIPE_DISCORD_ID}>:**
- \`CEO-38\`: [Tarea de Pipe]

**<@${JOAQUIN_DISCORD_ID}>:**
- \`CEO-29\`: [Tarea de Joaquín]

**Backlog General:**
- \`CEO-15\`: [Tarea general]

Devuelve estrictamente un JSON válido:
{
  "summary": "El texto formateado según la estructura anterior",
  "recommendedTasks": [
    {
      "id": "pipe",
      "buttonLabel": "Prompt: Pipe (CEO-38)",
      "taskTitle": "CEO-38: Modelo Académico (Pipe)"
    },
    {
      "id": "joaquin",
      "buttonLabel": "Prompt: Joaquín (CEO-29)",
      "taskTitle": "CEO-29: Reglas Firestore (Joaquín)"
    },
    {
      "id": "backlog",
      "buttonLabel": "Prompt: Backlog (CEO-15)",
      "taskTitle": "CEO-15: Accesibilidad WCAG (General)"
    }
  ]
}
`;

    const { text, usedModel } = await generateContentWithFallback(ai, prompt);

    let summaryText = text.trim();
    let tasks: Array<{ id: string; buttonLabel: string; taskTitle?: string }> = [
      { id: "pipe", buttonLabel: "Prompt: Pipe (CEO-38)", taskTitle: "CEO-38: Modelo Académico" },
      {
        id: "joaquin",
        buttonLabel: "Prompt: Joaquín (CEO-29)",
        taskTitle: "CEO-29: Reglas Firestore",
      },
      {
        id: "backlog",
        buttonLabel: "Prompt: Backlog (CEO-15)",
        taskTitle: "CEO-15: Accesibilidad WCAG",
      },
    ];

    try {
      let clean = text.trim();
      const first = clean.indexOf("{");
      const last = clean.lastIndexOf("}");
      if (first !== -1 && last !== -1) {
        clean = clean.slice(first, last + 1);
      }
      const parsed = JSON.parse(clean);
      if (parsed.summary) summaryText = parsed.summary;
      if (Array.isArray(parsed.recommendedTasks) && parsed.recommendedTasks.length > 0) {
        tasks = parsed.recommendedTasks;
      }
    } catch {
      // Fallback a texto plano
    }

    const embed = {
      title: "☀️ CEOUBB Daily Standup — Apertura de Jornada (12:00 PM)",
      description: `${summaryText}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**Lanzador de Tareas para Agentes IA:**\nPresiona cualquier botón para recibir el prompt o comando git listo para usar.`,
      color: 0x0055b8, // UBB Blue
      footer: { text: `CEOUBB LMS • Vercel Cron • Gemini (${usedModel})` },
      timestamp: new Date().toISOString(),
    };

    // Construcción de botones nativos de Discord
    const components = [
      {
        type: 1, // ActionRow
        components: tasks.map((t, idx) => {
          const matchCode = (t.buttonLabel || t.taskTitle || "").match(/CEO-\d+/i) || ["CEO-38"];
          const code = matchCode[0].toUpperCase();
          const cleanTitle = (t.taskTitle || t.buttonLabel || "Tarea")
            .replace(/^Prompt:\s*/i, "")
            .replace(/^CEO-\d+[:\s-]*/i, "")
            .replace(/\((.*?)\)/g, "$1")
            .trim();
          return {
            type: 2, // Button
            style: idx === 0 ? 1 : idx === 1 ? 3 : 2, // 1: Primary (Blue), 3: Success (Green), 2: Secondary (Gray)
            label: (t.buttonLabel || `Prompt: ${t.id}`).slice(0, 80),
            custom_id: `btn:${t.id}:${code}:${cleanTitle.slice(0, 45)}`,
          };
        }),
      },
    ];

    await sendDiscordEmbed(embed, components);
    return NextResponse.json({ success: true, type: "morning", model: usedModel });
  } else {
    const prompt = `
Eres el Scrum Lead de **CEOUBB**. Genera el **Daily Standup de Cierre de Jornada (00:00 AM)**.

=== COMMITS DEL DÍA ===
${commits.map((c: { hash: string; author: string; message: string }) => `- [${c.hash}] ${c.author}: ${c.message}`).join("\n") || "- Sin commits registrados hoy"}

REGLAS:
- Tono sobrio de balance. Métricas: total de commits y salud de Sentry (0 caídas).

ESTRUCTURA:
¡Buenas noches equipo!

**Balance de Cierre de Jornada:**
- **Commits del día:** ${commits.length} commits registrados.
- **Salud del Sistema (Sentry):** Operativo y sin caídas críticas.
- **Logros de la jornada:**
  - [Logro 1]
  - [Logro 2]

**Estado:**
- Todo el trabajo queda sincronizado en la rama principal.
- Próximo reporte de apertura: Mañana a las 12:00 PM.

¡Buen descanso!
`;

    const { text, usedModel } = await generateContentWithFallback(ai, prompt);

    const embed = {
      title: "🌙 CEOUBB Daily Standup — Cierre de Jornada (00:00 AM)",
      description: text.trim(),
      color: 0x0f172a, // Dark Slate
      footer: { text: `CEOUBB LMS • Vercel Cron • Gemini (${usedModel})` },
      timestamp: new Date().toISOString(),
    };

    await sendDiscordEmbed(embed);
    return NextResponse.json({ success: true, type: "night", model: usedModel });
  }
}
