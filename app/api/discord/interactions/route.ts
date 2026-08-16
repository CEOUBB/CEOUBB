import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifyDiscordRequestSignature } from "../../../../lib/discord/signature";
import { updateOriginalDiscordMessage } from "../../../../lib/discord/messages";
import {
  resolveTaskAndTitle,
  buildAgentPromptResponse,
  buildBranchName,
  sanitizeTaskTitle,
} from "../../../../lib/discord/agent-prompt";
import { fetchLatestCIDiagnostics } from "../../../../lib/discord/diagnostics";
import { reviewPullRequest } from "../../../../lib/discord/pr-reviewer";
import { processGeminiQueryWithTools } from "../../../../lib/discord/gemini-copilot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DiscordInteractionBody {
  type: number;
  application_id?: string;
  token?: string;
  channel_id?: string;
  channel?: { id?: string };
  data?: {
    custom_id?: string;
    name?: string;
    options?: Array<{ name: string; value: string | number | boolean }>;
  };
  member?: { user?: { username: string; id: string; global_name?: string } };
  user?: { username: string; id: string; global_name?: string };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";

  // 1. Validar firma criptográfica de Discord
  if (!verifyDiscordRequestSignature(rawBody, signature, timestamp)) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  let body: DiscordInteractionBody;
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
  const channelId = body.channel_id || body.channel?.id || "";
  const discordUser = body.member?.user || body.user;
  const userDisplayName = discordUser?.global_name || discordUser?.username || "Mantenedor";

  // 3. Manejo de Slash Commands (Type 2: APPLICATION_COMMAND)
  if (body.type === 2 && body.data?.name) {
    const commandName = body.data.name;
    const options = body.data.options || [];
    const getOpt = (name: string) => options.find((o) => o.name === name)?.value;

    // COMANDO: /gemini o /consultar o /ask (Respuesta diferida Type 5)
    if (commandName === "gemini" || commandName === "consultar" || commandName === "ask") {
      const userPrompt = String(getOpt("pregunta") || "").trim();
      const isPrivate = Boolean(getOpt("privado"));

      if (!userPrompt) {
        return NextResponse.json({
          type: 4,
          data: { content: "⚠️ Por favor escribe una pregunta para Gemini.", flags: 64 },
        });
      }

      if (applicationId && interactionToken) {
        waitUntil(
          (async () => {
            try {
              const aiResponse = await processGeminiQueryWithTools(
                userPrompt,
                userDisplayName,
                channelId
              );
              const header = `> **Consulta:** ${userPrompt}\n\n`;
              await updateOriginalDiscordMessage(
                applicationId,
                interactionToken,
                `${header}${aiResponse}`
              );
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

        return NextResponse.json({
          type: 5,
          data: { flags: isPrivate ? 64 : 0 },
        });
      }

      const aiResponse = await processGeminiQueryWithTools(userPrompt, userDisplayName, channelId);
      return NextResponse.json({
        type: 4,
        data: { content: aiResponse, flags: isPrivate ? 64 : 0 },
      });
    }

    // COMANDO: /prompt (Generación de prompt estructurado para agentes)
    if (commandName === "prompt") {
      const { taskCode, cleanTitle } = await resolveTaskAndTitle(String(getOpt("tarea") || ""));
      const responseMarkdown = buildAgentPromptResponse(taskCode, cleanTitle);

      return NextResponse.json({
        type: 4,
        data: { content: responseMarkdown, flags: 64 },
      });
    }

    // COMANDO: /gitstarter (Comando git checkout para nueva rama de tarea)
    if (commandName === "gitstarter") {
      const { taskCode, cleanTitle } = await resolveTaskAndTitle(
        String(getOpt("tarea") || "tarea")
      );
      const branchName = buildBranchName(taskCode, cleanTitle);

      return NextResponse.json({
        type: 4,
        data: {
          content: `💻 **Comando para iniciar rama:**\n\`\`\`bash\ngit checkout -b ${branchName} && pnpm dev\n\`\`\``,
          flags: 64,
        },
      });
    }

    // COMANDO: /doctor (Diagnóstico en vivo de CI/CD GitHub Actions en main)
    if (commandName === "doctor") {
      const liveDiagnostics = await fetchLatestCIDiagnostics();
      return NextResponse.json({
        type: 4,
        data: { content: liveDiagnostics },
      });
    }

    // COMANDO: /review-pr (Auditoría de Pull Request con Gemini y React Doctor)
    if (commandName === "review-pr") {
      const prNum = getOpt("numero");
      if (!prNum) {
        return NextResponse.json({
          type: 4,
          data: {
            content: "⚠️ Debes ingresar el número de un PR (ej: `/review-pr numero:10`).",
            flags: 64,
          },
        });
      }

      const { content, isError } = await reviewPullRequest(String(prNum));
      return NextResponse.json({
        type: 4,
        data: { content, ...(isError ? { flags: 64 } : {}) },
      });
    }

    // COMANDO: /standup (Información y enlace a los canales de standup)
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
    const cleanTitle = sanitizeTaskTitle(rawTitle);
    const responseMarkdown = buildAgentPromptResponse(taskCode, cleanTitle);

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
