import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

// Authorized maintainers
export const ALLOWED_USER_IDS = new Set([
  "1150176313974460457", // Pipe (pipe.os)
  "662149246631542816",  // Joaquín (Juvko0)
]);

// Friendly user name mapping & aliases
export const KNOWN_USER_NAMES = {
  "1150176313974460457": "Pipe (pipe_.os / Felipe)",
  "662149246631542816": "Joaquín (Juvko0 / Joaco / Topo / Topogigo)",
};

/**
 * Obtener nombre legible del autor de un mensaje
 */
export function getFriendlyAuthorName(author, member) {
  if (!author) return "Usuario";
  return KNOWN_USER_NAMES[author.id] || member?.displayName || author.globalName || author.username || "Usuario";
}

/**
 * Extraer los últimos 5 a 10 mensajes previos del canal para dar contexto de conversación al Agente IA
 */
export async function fetchChannelConversationContext(message, client, limit = 8) {
  try {
    if (!message.channel?.messages?.fetch) return "";

    const fetched = await message.channel.messages.fetch({
      limit: Math.min(limit, 15),
      before: message.id,
    });

    if (!fetched || fetched.size === 0) return "";

    // Convertir a array cronológico (de más antiguo a más reciente)
    const messagesArray = Array.from(fetched.values()).reverse();

    const formattedLines = [];

    // Si el usuario usó la función "Responder" de Discord a un mensaje específico
    if (message.reference?.messageId) {
      try {
        const replyTarget = await message.channel.messages.fetch(message.reference.messageId);
        if (replyTarget) {
          const authorName = getFriendlyAuthorName(replyTarget.author, replyTarget.member);
          const cleanText = replyTarget.content?.trim() || "[Mensaje con archivo o embed]";
          formattedLines.push(`📌 [MENSAJE CITADO DIRECTAMENTE]:\n${authorName}: "${cleanText}"\n`);
        }
      } catch {
        // Ignorar si el mensaje citado fue eliminado
      }
    }

    for (const msg of messagesArray) {
      // Ignorar mensajes vacíos o de bots con embeds gigantescos
      if (msg.author.bot && msg.author.id !== client?.user?.id) continue;
      if (msg.embeds?.length > 0 && !msg.content) continue;

      const authorName = getFriendlyAuthorName(msg.author, msg.member);
      const cleanContent = (msg.content || "")
        .replace(/<@!?\d+>/g, "")
        .trim();

      if (!cleanContent) continue;

      // Limitar cada mensaje a un tamaño razonable para no saturar
      const truncated = cleanContent.length > 300 ? `${cleanContent.slice(0, 300)}...` : cleanContent;
      formattedLines.push(`• ${authorName}: ${truncated}`);
    }

    if (formattedLines.length === 0) return "";

    return (
      `\n=== CONTEXTO RECIENTE DE LA CONVERSACIÓN EN ESTE CANAL DE DISCORD ===\n` +
      `${formattedLines.join("\n")}\n` +
      `=======================================================================\n`
    );
  } catch (err) {
    console.warn("⚠️ No se pudo obtener el historial del canal:", err.message);
    return "";
  }
}

/**
 * Gestor de sesiones persistente en disco (.cache/sessions-<name>.json)
 */
export class PersistentSessionStore {
  constructor(name, timeoutMs = 30 * 60 * 1000) {
    this.name = name;
    this.timeoutMs = timeoutMs;
    this.cacheDir = path.join(process.cwd(), ".cache");
    this.filePath = path.join(this.cacheDir, `sessions-${name}.json`);
    this.sessions = new Map();
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        const now = Date.now();
        for (const [key, val] of Object.entries(parsed)) {
          if (now - val.lastUsed < this.timeoutMs) {
            this.sessions.set(key, val);
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Error cargando sesiones de ${this.name}:`, e.message);
    }
  }

  save() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const obj = Object.fromEntries(this.sessions.entries());
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      console.warn(`⚠️ Error guardando sesiones de ${this.name}:`, e.message);
    }
  }

  getSession(channelId, userId) {
    const key = `${channelId}_${userId}`;
    const now = Date.now();
    const existing = this.sessions.get(key);

    if (existing && now - existing.lastUsed < this.timeoutMs) {
      existing.lastUsed = now;
      this.save();
      return { data: existing.data, isExisting: true };
    }

    return { data: null, isExisting: false };
  }

  setSession(channelId, userId, data) {
    const key = `${channelId}_${userId}`;
    this.sessions.set(key, { data, lastUsed: Date.now() });
    this.save();
  }

  resetSession(channelId, userId) {
    const key = `${channelId}_${userId}`;
    this.sessions.delete(key);
    this.save();
  }
}

/**
 * Ejecución segura de procesos CLI con paso de entrada vía stdin o argumentos
 */
export function spawnSafeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      shell: true,
      env: { ...process.env, ...options.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    if (options.stdin) {
      proc.stdin?.write(options.stdin);
      proc.stdin?.end();
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}
