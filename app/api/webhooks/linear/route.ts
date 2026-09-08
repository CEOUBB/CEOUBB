import { NextResponse } from "next/server";

import { isFreshTimestamp, verifyLinearSignature } from "@/lib/linear-signature";

export async function POST(request: Request) {
  try {
    // Implements: REQ-INT-01
    const linearWebhookSecret = process.env.LINEAR_WEBHOOK_SECRET;
    if (!linearWebhookSecret) {
      return new Response(null, { status: 404 });
    }

    const discordWebhookUrl = process.env.DISCORD_LINEAR_WEBHOOK_URL;
    if (!discordWebhookUrl) {
      console.error("[Linear Webhook] DISCORD_LINEAR_WEBHOOK_URL is not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const rawBody = await request.text();
    if (
      !verifyLinearSignature(rawBody, request.headers.get("linear-signature"), linearWebhookSecret)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: ReturnType<typeof JSON.parse>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es un JSON válido" },
        { status: 400 }
      );
    }

    if (!isFreshTimestamp(payload.webhookTimestamp, Date.now())) {
      return NextResponse.json({ error: "Stale payload" }, { status: 401 });
    }

    const { action, type, data, url } = payload;

    if (!data) {
      return NextResponse.json({ message: "No data payload" }, { status: 200 });
    }

    let title = "Linear Update";
    let description = "";
    let color = 0x5e6ad2; // Linear brand purple
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (type === "Issue") {
      const issueIdentifier =
        data.identifier || (data.team ? `${data.team.key}-${data.number}` : "Issue");
      const issueTitle = data.title || "Untitled Issue";
      const issueUrl = url || data.url || `https://linear.app/ceoubb/issue/${issueIdentifier}`;
      const stateName = data.state?.name || "Actualizado";
      const updatedFrom = payload.updatedFrom;
      const prevStateName = updatedFrom?.state?.name || updatedFrom?.stateName || null;

      const stateLower = stateName.toLowerCase();

      if (action === "create") {
        title = `🎯 Nuevo Issue: [${issueIdentifier}] ${issueTitle}`;
        color = 0x5e6ad2;
      } else if (action === "remove") {
        title = `🗑️ Issue Eliminado: [${issueIdentifier}] ${issueTitle}`;
        color = 0xef4444;
      } else if (action === "update") {
        if (
          stateLower.includes("done") ||
          stateLower.includes("complet") ||
          stateLower.includes("resuelto") ||
          stateLower.includes("closed")
        ) {
          title = `✅ Issue Completado: [${issueIdentifier}] ${issueTitle}`;
          color = 0x10b981; // Green
        } else if (
          stateLower.includes("progress") ||
          stateLower.includes("progreso") ||
          stateLower.includes("review")
        ) {
          title = `🚀 Issue en Progreso: [${issueIdentifier}] ${issueTitle}`;
          color = 0xf59e0b; // Amber / Orange
        } else if (
          stateLower.includes("todo") ||
          stateLower.includes("backlog") ||
          stateLower.includes("pendiente")
        ) {
          title = `📋 Issue Movido a Pendiente: [${issueIdentifier}] ${issueTitle}`;
          color = 0x3b82f6; // Blue
        } else {
          title = `🔄 Issue Actualizado: [${issueIdentifier}] ${issueTitle}`;
          color = 0x5e6ad2;
        }
      } else {
        title = `🎯 Issue [${issueIdentifier}]: ${issueTitle}`;
      }

      description = `**[Ver Issue en Linear](${issueUrl})**`;

      if (stateName) {
        let stateValue = `\`${stateName}\``;
        if (prevStateName && prevStateName !== stateName) {
          stateValue = `\`${prevStateName}\` ➡️ \`${stateName}\``;
        } else if (updatedFrom?.stateId || updatedFrom?.state) {
          stateValue = `➡️ \`${stateName}\``;
        }
        fields.push({ name: "Estado", value: stateValue, inline: true });
      }
      if (data.assignee?.name) {
        fields.push({ name: "Asignado a", value: data.assignee.name, inline: true });
      }
      if (data.creator?.name) {
        fields.push({ name: "Creado por", value: data.creator.name, inline: true });
      }
      if (data.priorityLabel) {
        fields.push({ name: "Prioridad", value: data.priorityLabel, inline: true });
      }
    } else if (type === "Comment") {
      const issueIdentifier = data.issue?.identifier || "Issue";
      const commentBody = data.body || "Nuevo comentario";
      const author = data.user?.name || "Alguien";

      title = `💬 Nuevo Comentario en [${issueIdentifier}]`;
      description = `**${author}**: ${commentBody}\n\n**[Ver en Linear](${url || data.url})**`;
      color = 0x10b981;
    } else if (type === "ProjectUpdate") {
      title = `📊 Actualización de Proyecto: ${data.project?.name || "Proyecto"}`;
      description = data.body || "Actualización disponible.";
      color = 0xf59e0b;
    } else {
      title = `📢 Evento de Linear (${type})`;
      description = `Acción: \`${action}\``;
    }

    const embed = {
      title,
      description,
      url: url || data.url || undefined,
      color,
      fields,
      footer: {
        text: "Linear • CEOUBB Task Tracking",
      },
      timestamp: new Date().toISOString(),
    };

    // Implements: REQ-NET-01
    const discordResponse = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        username: "Linear",
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errText = await discordResponse.text();
      console.error("[Linear Webhook] Error forwarding to Discord:", errText);
      return NextResponse.json(
        { error: "Error forwarding to notification channel" },
        { status: discordResponse.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Linear Webhook] Processing error:", error);
    return NextResponse.json({ error: "Error procesando webhook de Linear" }, { status: 500 });
  }
}
