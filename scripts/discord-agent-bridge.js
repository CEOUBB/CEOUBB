import { Client, GatewayIntentBits } from "discord.js";
import {
  ALLOWED_USER_IDS,
  KNOWN_USER_NAMES,
  fetchChannelConversationContext,
  PersistentSessionStore,
  spawnSafeCommand,
} from "./discord-context-helper.js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional: the process may already carry the variables.
}

/*
  Un único puente para los agentes de línea de comandos que hablan por Discord.
  Cada agente solo difiere en binario, modelo y bandera de razonamiento, así que
  se declara aquí en lugar de clonar el archivo por cada CLI nueva.
*/
const AGENTS = {
  claude: {
    label: "Claude",
    command: "claude",
    tokenVars: ["DISCORD_BOT_TOKEN", "DISCORD_CEOUBB_BOT_TOKEN"],
    model: "claude-sonnet-5",
    effortFlag: "--thinking",
    effort: "adaptive",
  },
  codex: {
    label: "Codex",
    command: "codex",
    tokenVars: ["DISCORD_CODEX_BOT_TOKEN", "DISCORD_BOT_TOKEN"],
    model: "gpt-5.6-luna",
    effortFlag: "--reasoning-effort",
    effort: "high",
  },
};

const agentName = process.argv[2] ?? "claude";
const agent = AGENTS[agentName];

if (!agent) {
  console.error(
    `❌ Error: unknown agent "${agentName}". Available: ${Object.keys(AGENTS).join(", ")}.`
  );
  process.exit(1);
}

const DISCORD_BOT_TOKEN = agent.tokenVars.map((name) => process.env[name]).find(Boolean);

if (!DISCORD_BOT_TOKEN) {
  console.error(`❌ Error: ${agent.tokenVars[0]} is not set in .env.local or environment.`);
  process.exit(1);
}

const sessionStore = new PersistentSessionStore(agentName);

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
  console.log(`🤖 CEOUBB ${agent.label} Local Bridge connected as ${client.user.tag}`);
  console.log(`💬 Mode: Raw Text Reply (Human style with user context & reply detection)`);
  console.log(`🧠 Model: ${agent.model} (Reasoning: ${agent.effort})`);
  console.log(`💾 Persistent Sessions: Enabled (.cache/sessions-${agentName}.json)`);
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
    console.log(
      `⛔ Ignored prompt from unauthorized user @${message.author.username} (${message.author.id})`
    );
    if (isMentioned || isReplyToBot) {
      await message.reply(
        `🔒 Este agente local de ${agent.label} está restringido únicamente a los mantenedores autorizados del proyecto.`
      );
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

  const userDisplayName =
    KNOWN_USER_NAMES[message.author.id] ||
    message.member?.displayName ||
    message.author.globalName ||
    message.author.username;

  // Check if user requested a new chat / reset session
  if (
    userPrompt.toLowerCase() === "!newchat" ||
    userPrompt.toLowerCase() === "/newchat" ||
    userPrompt.toLowerCase() === "nuevo chat"
  ) {
    sessionStore.resetSession(message.channel.id, message.author.id);
    await message.reply(
      `🔄 **Nueva conversación de ${agent.label} iniciada para ${userDisplayName}.** Contexto reiniciado.`
    );
    return;
  }

  const sessionObj = sessionStore.getSession(message.channel.id, message.author.id);
  let sessionId = sessionObj.data;
  const isExisting = Boolean(sessionObj.isExisting && sessionId);

  if (!isExisting) {
    sessionId = crypto.randomUUID();
    sessionStore.setSession(message.channel.id, message.author.id, sessionId);
  }

  console.log(
    `\n📩 ${agent.label} prompt received from ${userDisplayName} (@${message.author.username}) [Session: ${sessionId.slice(0, 8)}... (${isExisting ? "resume" : "new"})]: "${userPrompt}"`
  );

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
      "-p",
      contextualPrompt,
      "--model",
      agent.model,
      agent.effortFlag,
      agent.effort,
      ...(isExisting ? ["-r", sessionId] : ["--session-id", sessionId]),
      "--system-prompt",
      systemPromptText,
    ];

    console.log(
      `🚀 Executing local ${agent.label} process with safe spawn [Session: ${sessionId.slice(0, 8)}]`
    );

    const { stdout, stderr } = await spawnSafeCommand(agent.command, args, {
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

    console.log(
      `✅ Sent ${chunks.length} plain text ${agent.label} response message(s) to ${userDisplayName}.`
    );
  } catch (error) {
    clearInterval(typingInterval);
    console.error(`❌ Error executing local ${agent.label} process:`, error);
    await message.reply({
      content: `❌ **Error al procesar con ${agent.label}:**\n\`\`\`\n${error.message.slice(0, 1800)}\n\`\`\``,
    });
  }
});

client.login(DISCORD_BOT_TOKEN);
