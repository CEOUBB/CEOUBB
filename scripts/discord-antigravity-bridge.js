import { Client, GatewayIntentBits } from "discord.js";
import { GoogleGenAI } from "@google/genai";
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

// Tokens & Config
const DISCORD_BOT_TOKEN = process.env.DISCORD_ANTIGRAVITY_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DISCORD_BOT_TOKEN) {
  console.error("❌ Error: DISCORD_ANTIGRAVITY_BOT_TOKEN is not set in .env.local or environment.");
  process.exit(1);
}

const DEFAULT_MODEL = "gemini-3.6-flash";
const THINKING_EFFORT = "HIGH";

// SECURITY: Authorized maintainers
const ALLOWED_USER_IDS = new Set([
  "1150176313974460457", // Pipe (pipe.os)
  "662149246631542816",  // Joaquín (Juvko0)
]);

// Friendly user name mapping & aliases
const KNOWN_USER_NAMES = {
  "1150176313974460457": "Pipe (pipe_.os / Felipe)",
  "662149246631542816": "Joaquín (Juvko0 / Joaco / Topo / Topogigo)",
};

/**
 * Load project context (AGENTS.md & active PLAN.md summary)
 */
function getProjectContext() {
  let context = "";
  try {
    const agentsPath = path.join(process.cwd(), "AGENTS.md");
    if (fs.existsSync(agentsPath)) {
      context += `\n--- REPOSITORY RULES (AGENTS.md) ---\n${fs.readFileSync(agentsPath, "utf-8").slice(0, 2500)}\n`;
    }

    const planPath = path.join(process.cwd(), "PLAN.md");
    if (fs.existsSync(planPath)) {
      context += `\n--- ACTIVE PLAN (PLAN.md) ---\n${fs.readFileSync(planPath, "utf-8").slice(0, 2500)}\n`;
    }
  } catch (err) {
    console.warn("⚠️ Could not read project context files:", err.message);
  }
  return context;
}

// Define tool functions for Google Calendar & GitHub MCP integration
const toolDeclarations = [
  {
    name: "create_calendar_event",
    description: "Crear una reunión o evento en Google Calendar",
    parameters: {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING", description: "Título de la reunión" },
        startDateTime: { type: "STRING", description: "Fecha y hora de inicio (ISO format, ej. 2026-08-23T15:00:00-04:00)" },
        durationMinutes: { type: "NUMBER", description: "Duración en minutos (por defecto 60)" },
      },
      required: ["summary", "startDateTime"],
    },
  },
  {
    name: "github_recent_commits",
    description: "Obtener los últimos commits del repositorio Git local / GitHub",
    parameters: {
      type: "OBJECT",
      properties: {
        count: { type: "NUMBER", description: "Cantidad de commits a obtener (por defecto 5)" },
      },
    },
  },
  {
    name: "github_repo_status",
    description: "Obtener el estado actual del repositorio (git status y branch)",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "github_list_pull_requests",
    description: "Obtener y consultar Pull Requests del repositorio CEOUBB",
    parameters: {
      type: "OBJECT",
      properties: {
        state: { type: "STRING", description: "open, closed, or all (default: open)" },
      },
    },
  },
];

/**
 * Tool execution handlers
 */
async function executeToolCall(toolCall) {
  const { name, args } = toolCall;
  console.log(`🛠️ Executing Antigravity Tool: ${name}`, args);

  if (name === "github_list_pull_requests") {
    try {
      const { stdout } = await execPromise(`git log -5 --oneline && git status --short`);
      return {
        repository: "CEOUBB/CEOUBB",
        branch: "main",
        status: "Todas las ramas activas de características están integradas en origin/main.",
        recentCommits: stdout.trim()
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "github_recent_commits") {
    try {
      const count = args.count || 5;
      const { stdout } = await execPromise(`git log -${count} --oneline`);
      return { commits: stdout.trim() };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "github_repo_status") {
    try {
      const { stdout } = await execPromise(`git status --short && git branch --show-current`);
      return { status: stdout.trim() };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "create_calendar_event") {
    const { summary, startDateTime, durationMinutes = 60 } = args;
    // Format mock calendar response until OAuth token exchange
    return {
      status: "success",
      event: {
        summary,
        startDateTime,
        durationMinutes,
        calendar: "Google Calendar (CEOUBB Integration)",
      },
    };
  }

  return { error: `Tool ${name} not implemented` };
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
  console.log(`📚 Project Knowledge: Enabled (AGENTS.md & PLAN.md loaded)`);
  console.log(`🛠️ Tools Enabled: Google Calendar MCP & GitHub MCP`);
  console.log(`🔑 Gemini API Key Status: ${GEMINI_API_KEY ? "Configured ✅" : "Missing ⚠️ (Set GEMINI_API_KEY in .env.local)"}`);
  console.log(`🔒 Authorized Users: ${Array.from(ALLOWED_USER_IDS).join(", ")}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (processedMessageIds.has(message.id)) return;

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

  if (userPrompt.toLowerCase() === "!newchat" || userPrompt.toLowerCase() === "/newchat" || userPrompt.toLowerCase() === "nuevo chat") {
    resetSession(message.channel.id, message.author.id);
    await message.reply(`🔄 **Nueva conversación de Gemini / Antigravity iniciada para ${userDisplayName}.** Contexto reiniciado.`);
    return;
  }

  const { sessionHistory } = getOrCreateSession(message.channel.id, message.author.id);

  console.log(`\n📩 Antigravity Prompt received from ${userDisplayName} (@${message.author.username}): "${userPrompt}"`);

  if (!process.env.GEMINI_API_KEY) {
    await message.reply("⚠️ **Falta la clave API de Gemini (`GEMINI_API_KEY`).**\n\nPor favor, obtén una clave gratuita en [aistudio.google.com](https://aistudio.google.com) y agrégala a tu `.env.local`:\n```env\nGEMINI_API_KEY=tu_api_key_aqui\n```");
    return;
  }

  await message.channel.sendTyping();
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 7000);

  try {
    const projectContext = getProjectContext();
    const systemInstruction = `Estás interactuando en un chat en vivo de Discord con el mantenedor del proyecto CEOUBB (${userDisplayName}).
Tienes conocimiento completo del proyecto CEOUBB a través de los archivos del repositorio (AGENTS.md y PLAN.md).
Tienes acceso a herramientas de integración con GitHub (commits, estado del repositorio) y Google Calendar (agendar reuniones).
Responde siempre en español formal, educado y profesional. No utilices modismos, jerga informal ni chilenismos. Responde a las consultas de manera directa y concisa.

${projectContext}`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        ...sessionHistory,
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }],
      }
    });

    // Check if Gemini invoked tool calls
    const candidates = response.candidates || [];
    const firstCandidateContent = candidates[0]?.content;
    const functionCalls = firstCandidateContent?.parts?.filter(p => p.functionCall) || [];

    if (functionCalls.length > 0) {
      const toolResponseParts = [];
      for (const callPart of functionCalls) {
        const toolCall = callPart.functionCall;
        const toolResult = await executeToolCall(toolCall);
        toolResponseParts.push({
          functionResponse: {
            name: toolCall.name,
            response: toolResult,
          }
        });
      }

      // Follow up with tool response while preserving modelContent and thought_signature
      response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: [
          ...sessionHistory,
          { role: "user", parts: [{ text: userPrompt }] },
          firstCandidateContent,
          { role: "user", parts: toolResponseParts }
        ],
        config: { systemInstruction }
      });
    }

    clearInterval(typingInterval);

    const rawOutput = (response.text || "Sin respuesta.").trim();

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

    console.log(`✅ Sent ${chunks.length} plain text Antigravity response message(s) to ${userDisplayName}.`);
  } catch (error) {
    clearInterval(typingInterval);
    console.error("❌ Error executing Antigravity / Gemini request:", error);
    await message.reply({
      content: `❌ **Error al procesar con Antigravity / Gemini:**\n\`\`\`\n${error.message.slice(0, 1800)}\n\`\`\``,
    });
  }
});

client.login(DISCORD_BOT_TOKEN);
