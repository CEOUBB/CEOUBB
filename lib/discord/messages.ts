/**
 * Utilidades para interactuar con la API REST de mensajes de Discord.
 */

/**
 * Actualizar mensaje original diferido de Discord (Deferred Interaction Type 5).
 */
export async function updateOriginalDiscordMessage(
  applicationId: string,
  interactionToken: string,
  content: string
): Promise<void> {
  if (!applicationId || !interactionToken) return;

  try {
    const safeContent =
      content.length > 1950
        ? `${content.slice(0, 1920)}\n\n_...(respuesta recortada por límite de Discord)_`
        : content;

    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: safeContent }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(
        `❌ Error al actualizar mensaje diferido en Discord (${res.status}):`,
        await res.text()
      );
    }
  } catch (err) {
    console.error("❌ Error en updateOriginalDiscordMessage:", err);
  }
}

/**
 * Obtener historial de los últimos mensajes del canal en Discord para dar contexto de conversación a Gemini.
 */
export async function fetchDiscordChannelHistory(channelId?: string, limit = 12): Promise<string> {
  const botToken =
    process.env.DISCORD_ANTIGRAVITY_BOT_TOKEN ||
    process.env.DISCORD_CEOUBB_BOT_TOKEN ||
    process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !channelId) return "";

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          "User-Agent": "CEOUBB-Discord-Interactions",
        },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!res.ok) return "";
    const messages = await res.json();
    if (!Array.isArray(messages) || messages.length === 0) return "";

    const reversed = [...messages].reverse();
    const lines: string[] = [];

    for (const msg of reversed) {
      if (!msg.content && (!msg.embeds || msg.embeds.length === 0)) continue;
      const authorName = msg.author?.global_name || msg.author?.username || "Usuario";
      const cleanContent = (msg.content || "[Mensaje con archivo/embed]")
        .replace(/<@!?\d+>/g, "")
        .trim();
      if (!cleanContent) continue;
      const snippet = cleanContent.length > 300 ? `${cleanContent.slice(0, 300)}...` : cleanContent;
      lines.push(`• @${authorName}: ${snippet}`);
    }

    if (lines.length === 0) return "";

    return (
      `\n=== HISTORIAL RECIENTE DE CONVERSACIÓN EN ESTE CANAL DE DISCORD ===\n` +
      `${lines.join("\n")}\n` +
      `====================================================================\n`
    );
  } catch (err) {
    console.warn("⚠️ Error obteniendo historial del canal de Discord:", err);
    return "";
  }
}
