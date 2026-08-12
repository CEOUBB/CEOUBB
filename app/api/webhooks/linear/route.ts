import { NextResponse } from "next/server";

// Discord webhook URL for #🎯-❙-linear
const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_LINEAR_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1536974344553762897/vdRp3bekJhBcSqIZh2-xQqnGove9rYeiTcgFOxCq0xWZFXPXULUY1OdDcjo-E_6yQX6y";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
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

      if (action === "create") {
        title = `🎯 Nuevo Ticket: [${issueIdentifier}] ${issueTitle}`;
        color = 0x5e6ad2;
      } else if (action === "update") {
        title = `🔄 Ticket Actualizado: [${issueIdentifier}] ${issueTitle}`;
        color = 0x3b82f6;
      } else if (action === "remove") {
        title = `🗑️ Ticket Eliminado: [${issueIdentifier}] ${issueTitle}`;
        color = 0xef4444;
      } else {
        title = `🎯 Ticket [${issueIdentifier}]: ${issueTitle}`;
      }

      description = `**[Ver Ticket en Linear](${issueUrl})**`;

      if (stateName) {
        fields.push({ name: "Estado", value: `\`${stateName}\``, inline: true });
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

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errText = await discordResponse.text();
      console.error("[Linear Webhook] Error forwarding to Discord:", errText);
      return NextResponse.json({ error: errText }, { status: discordResponse.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Linear Webhook] Processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
