import { Client, GatewayIntentBits } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

// Token for Antigravity / Gemini bot
const DISCORD_BOT_TOKEN = process.env.DISCORD_ANTIGRAVITY_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DISCORD_BOT_TOKEN) {
  console.error("❌ Error: DISCORD_ANTIGRAVITY_BOT_TOKEN is not set in .env.local or environment.");
  process.exit(1);
}

// Config: Default Gemini model & reasoning settings requested by user
const DEFAULT_MODEL = "gemini-2.5-flash"; // Google GenAI SDK model ID
const THINKING_EFFORT = "HIGH";

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

// Initialize Google GenAI client if API key is provided
let aiClient = null;
if (GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// Session storage per channel/user (30-min timeout)
const userSessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getOrCreateSession(channelId, userId) {
  const sessionKey = `${channelId}_${userId}`;
  const now = Date.now();
  const existing = userSessions.get(sessionKey);

  if (existing && (now - existing.lastUsed) < SESSION_TIMEOUT_MS) {
    existing.lastUsed = now;
    return { sessionHistory: existing.history, isExisting: true };
  }

  const newHistory = [];
  userSessions.set(sessionKey, { history: newHistory, lastUsed: now });
  return { sessionHistory: newHistory, isExisting: false };
}

function resetSession(channelId, userId) {
  const sessionKey = `${channelId}_${userId}`;
  const newHistory = [];
  userSessions.set(sessionKey, { history: newHistory, lastUsed: Date.now() });
  return newHistory;
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
  console.log(`🤖 CEOUBB Antigravity Local Bridge connected as ${client.user.tag}`);
  console.log(`💬 Mode: Raw Text Reply (Human style with user context & reply detection)`);
  console.log(`🧠 Model: ${DEFAULT_MODEL} (Thinking Effort: ${THINKING_EFFORT})`);
  console.log(`🔑 Gemini API Key Status: ${GEMINI_API_KEY ? "Configured ✅" : "Missing ⚠️ (Set GEMINI_API_KEY in .env.local)"}`);
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
      await message.reply("🔒 Este agente local de Antigravity / Gemini está restringido únicamente a los mantenedores autorizados del proyecto.");
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
    resetSession(message.channel.id, message.author.id);
    await message.reply(`🔄 **Nueva conversación de Gemini / Antigravity iniciada para ${userDisplayName}.** Contexto reiniciado.`);
    return;
  }

  const { sessionHistory } = getOrCreateSession(message.channel.id, message.author.id);

  console.log(`\n📩 Gemini Prompt received from ${userDisplayName} (@${message.author.username}): "${userPrompt}"`);

  if (!process.env.GEMINI_API_KEY) {
    await message.reply("⚠️ **Falta la clave API de Gemini (`GEMINI_API_KEY`).**\n\nPor favor, obtén una clave gratuita en [aistudio.google.com](https://aistudio.google.com) y agrégala a tu `.env.local`:\n```env\nGEMINI_API_KEY=tu_api_key_aqui\n```");
    return;
  }

  // Continuously indicate typing while processing
  await message.channel.sendTyping();
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 7000);

  try {
    const systemInstruction = `Estás interactuando en un chat en vivo de Discord con el mantenedor del proyecto ${userDisplayName}. Responde siempre en español formal, educado y profesional. No utilices modismos, jerga informal ni chilenismos. Responde a la solicitud de manera directa y concisa.`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        ...sessionHistory,
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction,
      }
    });

    clearInterval(typingInterval);

    const rawOutput = (response.text || "Sin respuesta.").trim();

    // Store in session history
    sessionHistory.push({ role: "user", parts: [{ text: userPrompt }] });
    sessionHistory.push({ role: "model", parts: [{ text: rawOutput }] });
    if (sessionHistory.length > 20) {
      sessionHistory.splice(0, 2);
    }

    const chunks = chunkText(rawOutput);

    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply({ content: chunks[i] });
      } else {
        await message.channel.send({ content: chunks[i] });
      }
    }

    console.log(`✅ Sent ${chunks.length} plain text Gemini response message(s) to ${userDisplayName}.`);
  } catch (error) {
    clearInterval(typingInterval);
    console.error("❌ Error executing Gemini API call:", error);
    await message.reply({
      content: `❌ **Error al procesar con Gemini:**\n\`\`\`\n${error.message.slice(0, 1800)}\n\`\`\``,
    });
  }
});

client.login(DISCORD_BOT_TOKEN);
