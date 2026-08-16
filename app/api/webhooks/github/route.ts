import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { verifyGitHubSignature } from "@/lib/github-signature";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";
const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_CI_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || "";
const TARGET_CHANNEL_ID = process.env.DISCORD_CI_CHANNEL_ID || "1536936245643579462"; // #🚨-❙-alertas

const MODEL_FALLBACK_LIST = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash",
];

async function callGemini(ai: GoogleGenAI, prompt: string) {
  let lastError;
  for (const modelId of MODEL_FALLBACK_LIST) {
    try {
      const res = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return { text, usedModel: modelId };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function sendToDiscord(embed: Record<string, unknown>) {
  if (DISCORD_WEBHOOK_URL) {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "GitHub CI/CD Inspector",
        embeds: [embed],
      }),
      signal: AbortSignal.timeout(6000),
    });
    return;
  }

  const token =
    process.env.DISCORD_CEOUBB_BOT_TOKEN ||
    process.env.DISCORD_STANDUP_BOT_TOKEN ||
    process.env.DISCORD_BOT_TOKEN;

  if (token) {
    await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
      signal: AbortSignal.timeout(6000),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (
      GITHUB_WEBHOOK_SECRET &&
      !verifyGitHubSignature(rawBody, signature, GITHUB_WEBHOOK_SECRET)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = req.headers.get("x-github-event") || "";
    const payload = JSON.parse(rawBody);

    // Evento de ejecución de CI/CD (GitHub Actions)
    if (event === "workflow_run") {
      const { action, workflow_run } = payload;
      if (action !== "completed" || !workflow_run) {
        return NextResponse.json({ message: "Ignored workflow_run action" }, { status: 200 });
      }

      const conclusion = workflow_run.conclusion; // 'success', 'failure', 'timed_out', 'cancelled'
      const workflowName = workflow_run.name || "CI";
      const branch = workflow_run.head_branch || "main";
      const commitMsg = workflow_run.head_commit?.message?.split("\n")[0] || "Sin mensaje";
      const actor = workflow_run.actor?.login || "Desarrollador";
      const runUrl = workflow_run.html_url || "";

      if (conclusion === "failure" || conclusion === "timed_out") {
        let diagnosis = "Revisa los logs en GitHub Actions para más detalles.";
        let usedModel = "rule-based";

        const geminiKey = process.env.STANDUP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (geminiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const prompt = `
Un pipeline de CI/CD de GitHub Actions acaba de fallar en el repositorio **CEOUBB**.
Workflow: ${workflowName}
Rama: ${branch}
Commit: ${commitMsg}
Autor: ${actor}

Genera un diagnóstico en 2 bullets técnicos en español formal:
1. Explicación del impacto potencial en el proyecto.
2. Comando sugerido para reproducir o corregir localmente con pnpm.
`;
            const geminiRes = await callGemini(ai, prompt);
            diagnosis = geminiRes.text.trim();
            usedModel = geminiRes.usedModel;
          } catch {
            // Fallback
          }
        }

        const embed = {
          title: `❌ Fallo en CI/CD: ${workflowName} (${branch})`,
          url: runUrl,
          description:
            `**Commit:** \`${commitMsg}\`\n` +
            `**Autor:** @${actor}\n` +
            `**Estado:** \`${conclusion.toUpperCase()}\`\n\n` +
            `**Diagnóstico y Recomendación:**\n${diagnosis}\n\n` +
            `💻 **Reproducir localmente:**\n\`\`\`bash\ngit checkout ${branch} && pnpm run typecheck && pnpm run test:unit\n\`\`\``,
          color: 0xef4444, // Red
          footer: { text: `CEOUBB CI Inspector • Gemini (${usedModel})` },
          timestamp: new Date().toISOString(),
        };

        await sendToDiscord(embed);
        return NextResponse.json({ success: true, status: "failure_reported" });
      }

      if (conclusion === "success" && branch === "main") {
        const embed = {
          title: `✅ CI/CD Exitoso en \`main\`: ${workflowName}`,
          url: runUrl,
          description: `**Commit:** ${commitMsg}\n**Autor:** @${actor}\nTodas las suites de tests y typecheck pasaron exitosamente.`,
          color: 0x10b981, // Emerald Green
          footer: { text: "CEOUBB LMS • CI/CD Gate" },
          timestamp: new Date().toISOString(),
        };

        await sendToDiscord(embed);
        return NextResponse.json({ success: true, status: "success_reported" });
      }
    }

    return NextResponse.json({ message: "Event processed" }, { status: 200 });
  } catch (error) {
    console.error("[GitHub Webhook Error]:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
