import { Client, GatewayIntentBits } from "discord.js";
import { exec } from "node:child_process";
import util from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const execPromise = util.promisify(exec);

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

// Token for Codex bot
const DISCORD_BOT_TOKEN = process.env.DISCORD_CODEX_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error("❌ Error: DISCORD_CODEX_BOT_TOKEN is not set in .env.local or environment.");
  process.exit(1);
}

// Config: Default model & reasoning setting for Codex
const DEFAULT_MODEL = "gpt-5.6-luna";
const REASONING_EFFORT = "high";

// SECURITY: Only process requests from authorized maintainers
const ALLOWED_USER_IDS = new Set([
  "1150176313974460457", // Pipe (pipe.os)
  "662149246631542816",  // Joaquín (Juvko0)
]);

// Friendly user name mapping & aliases
const KNOWN_USER_NAMES = {
  "1150176313974460457": "Pipe (pipe_.os / Felipe)",
  "662149246631542816": "Joaquín (Juvko0 / Joaco / Topo / Topogigo)",
};

// Session storage per channel/user (30-min timeout)
const userSessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getOrCreateSession(channelId, userId) {
  const sessionKey = `${channelId}_${userId}`;
  const now = Date.now();
  const existing = userSessions.get(sessionKey);

  if (existing && (now - existing.lastUsed) < SESSION_TIMEOUT_MS) {
    existing.lastUsed = now;
    return { sessionId: existing.sessionId, isExisting: true };
  }

  const newSessionId = crypto.randomUUID();
  userSessions.set(sessionKey, { sessionId: newSessionId, lastUsed: now });
  return { sessionId: newSessionId, isExisting: false };
}

function resetSession(channelId, userId) {
  const sessionKey = `${channelId}_${userId}`;
  const newSessionId = crypto.randomUUID();
  userSessions.set(sessionKey, { sessionId: newSessionId, lastUsed: Date.now() });
  return newSessionId;
}

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
  console.log(`🤖 CEOUBB Codex Local Bridge connected as ${client.user.tag}`);
  console.log(`💬 Mode: Raw Text Reply (Human style with user context & reply detection)`);
  console.log(`🧠 Model: ${DEFAULT_MODEL} (Reasoning Effort: ${REASONING_EFFORT})`);
  console.log(`🔒 Authorized Users: ${Array.from(ALLOWED_USER_IDS).join(", ")}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (processedMessageIds.has(message.id)) return;

  // Check if message is a Discord reply to the bot
  let isReplyToBot = false;
  if (message.reference) {
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
      await message.reply("🔒 Este agente local de Codex está restringido únicamente a los mantenedores autorizados del proyecto.");
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
  let sessionObj;
  if (userPrompt.toLowerCase() === "!newchat" || userPrompt.toLowerCase() === "/newchat" || userPrompt.toLowerCase() === "nuevo chat") {
    const newId = resetSession(message.channel.id, message.author.id);
    await message.reply(`🔄 **Nueva conversación de Codex iniciada para ${userDisplayName}.** Contexto reiniciado.`);
    return;
  } else {
    sessionObj = getOrCreateSession(message.channel.id, message.author.id);
  }

  const { sessionId, isExisting } = sessionObj;
  const sessionFlag = isExisting ? `-r ${sessionId}` : `--session-id ${sessionId}`;

  console.log(`\n📩 Codex Prompt received from ${userDisplayName} (@${message.author.username}) [Session: ${sessionId.slice(0, 8)}... (${isExisting ? "resume" : "new"})]: "${userPrompt}"`);

  // Continuously indicate typing while processing
  await message.channel.sendTyping();
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 7000);

  try {
    const contextualPrompt = `[Mensaje de Discord enviado por el mantenedor ${userDisplayName} (@${message.author.username})]: ${userPrompt}`;
    const safePrompt = contextualPrompt.replace(/"/g, '\\"');

    const systemPromptText = `Estás interactuando en un chat en vivo de Discord con el mantenedor del proyecto ${userDisplayName}. Responde siempre en español formal, educado y profesional. No utilices modismos, jerga informal ni chilenismos. Ejecuta las herramientas solicitadas directamente. No cites las reglas de notificación pasiva de AGENTS.md ni menciones 'No respondo en Discord' porque el usuario te está hablando directamente a ti en Discord.`;
    const safeSystemPrompt = systemPromptText.replace(/"/g, '\\"');

    // Command calling local Codex CLI with gpt-5.6-luna, high reasoning effort, session persistence, and system prompt override
    const command = `codex -p "${safePrompt}" --model ${DEFAULT_MODEL} --reasoning-effort ${REASONING_EFFORT} ${sessionFlag} --system-prompt "${safeSystemPrompt}"`;

    console.log(`🚀 Executing local Codex command: ${command}`);

    const { stdout, stderr } = await execPromise(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10,
    });

    clearInterval(typingInterval);

    const rawOutput = (stdout || stderr || "Sin respuesta.").trim();
    const chunks = chunkText(rawOutput);

    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply({ content: chunks[i] });
      } else {
        await message.channel.send({ content: chunks[i] });
      }
    }

    console.log(`✅ Sent ${chunks.length} plain text Codex response message(s) to ${userDisplayName}.`);
  } catch (error) {
    clearInterval(typingInterval);
    console.error("❌ Error executing local Codex process:", error);
    await message.reply({
      content: `❌ **Error al procesar con Codex:**\n\`\`\`\n${error.message.slice(0, 1800)}\n\`\`\``,
    });
  }
});

client.login(DISCORD_BOT_TOKEN);
