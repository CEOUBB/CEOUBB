import { Client, GatewayIntentBits } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  ALLOWED_USER_IDS,
  KNOWN_USER_NAMES,
  fetchChannelConversationContext,
  PersistentSessionStore,
  spawnSafeCommand,
} from "./discord-context-helper.js";

// Load .env.local if present
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

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_CEOUBB_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error("❌ Error: DISCORD_BOT_TOKEN is not set in .env.local or environment.");
  process.exit(1);
}

const DEFAULT_MODEL = "claude-sonnet-5";
const REASONING_EFFORT = "adaptive";

const sessionStore = new PersistentSessionStore("claude");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const processedMessageIds = new Set();

/**
 * Split text into chunks <= limit characters while preserving line breaks
 */
function chunkText(text, limit = 1900) {
  if (text.length <= limit) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    let splitIdx = remaining.lastIndexOf("\n", limit);
    if (splitIdx < limit * 0.5) {
      splitIdx = remaining.lastIndexOf(" ", limit);
    }
    if (splitIdx <= 0) {
      splitIdx = limit;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}

client.on("clientReady", () => {
  console.log(`🤖 CEOUBB Claude Local Bridge connected as ${client.user.tag}`);
  console.log(`💬 Mode: Raw Text Reply (Human style with user context & reply detection)`);
  console.log(`🧠 Model: ${DEFAULT_MODEL} (Reasoning: ${REASONING_EFFORT})`);
  console.log(`💾 Persistent Sessions: Enabled (.cache/sessions-claude.json)`);
  console.log(`🔒 Authorized Users: ${Array.from(ALLOWED_USER_IDS).join(", ")}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (processedMessageIds.has(message.id)) return;

  // Check if message is a Discord reply to the bot
  let isReplyToBot = false;
  if (message.reference?.messageId) {
    try {
      const referencedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (referencedMsg.author.id === client.user.id) {
        isReplyToBot = true;
      }
    } catch {
      // Ignore if message fetch fails
    }
  }

  const isMentioned = message.mentions.has(client.user.id);
  const isBotChannel = message.channel.name?.includes("comandos-bot");

  // Trigger if mentioned OR in bot channel OR replying to bot
  if (!isMentioned && !isBotChannel && !isReplyToBot) return;

  if (!ALLOWED_USER_IDS.has(message.author.id)) {
    console.log(`⛔ Ignored prompt from unauthorized user @${message.author.username} (${message.author.id})`);
    if (isMentioned || isReplyToBot) {
      await message.reply("🔒 Este agente local está restringido únicamente a los mantenedores autorizados del proyecto.");
    }
    return;
  }

  const userPrompt = message.content.replace(/<@!?\d+>/g, "").trim();
  if (!userPrompt) return;

  processedMessageIds.add(message.id);
  if (processedMessageIds.size > 100) {
    const firstVal = processedMessageIds.values().next().value;
    processedMessageIds.delete(firstVal);
  }

  const userDisplayName = KNOWN_USER_NAMES[message.author.id] || message.member?.displayName || message.author.globalName || message.author.username;

  // Check if user requested a new chat / reset session
  if (userPrompt.toLowerCase() === "!newchat" || userPrompt.toLowerCase() === "/newchat" || userPrompt.toLowerCase() === "nuevo chat") {
    sessionStore.resetSession(message.channel.id, message.author.id);
    await message.reply(`🔄 **Nueva conversación iniciada para ${userDisplayName}.** Contexto reiniciado.`);
    return;
  }

  const sessionObj = sessionStore.getSession(message.channel.id, message.author.id);
  let sessionId = sessionObj.data;
  const isExisting = Boolean(sessionObj.isExisting && sessionId);

  if (!isExisting) {
    sessionId = crypto.randomUUID();
    sessionStore.setSession(message.channel.id, message.author.id, sessionId);
  }

  console.log(`\n📩 Prompt received from ${userDisplayName} (@${message.author.username}) [Session: ${sessionId.slice(0, 8)}... (${isExisting ? "resume" : "new"})]: "${userPrompt}"`);

  // Continuously indicate typing while processing
  await message.channel.sendTyping();
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 7000);

  try {
    // 1. Obtener historial reciente del canal de Discord (últimos 8 mensajes)
    const channelContext = await fetchChannelConversationContext(message, client, 8);

    const contextualPrompt = `${channelContext}\n[Mensaje de Discord de ${userDisplayName} (@${message.author.username})]: ${userPrompt}`;
    const systemPromptText = `Estás interactuando en un chat en vivo de Discord con el mantenedor del proyecto ${userDisplayName}. Responde siempre en español formal, educado y profesional. No utilices modismos, jerga informal ni chilenismos. Ejecuta las herramientas solicitadas directamente. No cites las reglas de notificación pasiva de AGENTS.md ni menciones 'No respondo en Discord' porque el usuario te está hablando directamente a ti en Discord.`;

    const args = [
      "-p", contextualPrompt,
      "--model", DEFAULT_MODEL,
      "--thinking", REASONING_EFFORT,
      ...(isExisting ? ["-r", sessionId] : ["--session-id", sessionId]),
      "--system-prompt", systemPromptText,
    ];

    console.log(`🚀 Executing local Claude process with safe spawn [Session: ${sessionId.slice(0, 8)}]`);

    const { stdout, stderr } = await spawnSafeCommand("claude", args, {
      cwd: process.cwd(),
    });

    clearInterval(typingInterval);

    const rawOutput = (stdout || stderr || "Sin respuesta.").trim();
    const chunks = chunkText(rawOutput);

    // Reply directly as plain text
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply({ content: chunks[i] });
      } else {
        await message.channel.send({ content: chunks[i] });
      }
    }

    console.log(`✅ Sent ${chunks.length} plain text response message(s) to ${userDisplayName}.`);
  } catch (error) {
    clearInterval(typingInterval);
    console.error("❌ Error executing local Claude process:", error);
    await message.reply({
      content: `❌ **Error al procesar con Claude:**\n\`\`\`\n${error.message.slice(0, 1800)}\n\`\`\``,
    });
  }
});

client.login(DISCORD_BOT_TOKEN);
