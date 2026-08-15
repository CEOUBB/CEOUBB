import fs from "node:fs";
import path from "node:path";

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

const BOT_TOKEN =
  process.env.DISCORD_CEOUBB_BOT_TOKEN ||
  process.env.DISCORD_ANTIGRAVITY_BOT_TOKEN ||
  process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ Error: No se encontró DISCORD_CEOUBB_BOT_TOKEN ni DISCORD_BOT_TOKEN en .env.local");
  process.exit(1);
}

const COMMANDS = [
  {
    name: "gemini",
    description: "Pregúntale a Gemini 3.7 sobre el proyecto CEOUBB, Linear, GitHub o código",
    options: [
      {
        name: "pregunta",
        description: "¿Qué deseas consultar o solicitar a Gemini?",
        type: 3, // STRING
        required: true,
      },
      {
        name: "privado",
        description: "¿Responder solo para ti (mensaje efímero)?",
        type: 5, // BOOLEAN
        required: false,
      },
    ],
  },
  {
    name: "doctor",
    description: "Verificar estado y diagnóstico de CI/CD en main",
  },
  {
    name: "review-pr",
    description: "Auditar un Pull Request con IA",
    options: [
      {
        name: "numero",
        description: "Número del Pull Request (ej: 42)",
        type: 4, // INTEGER
        required: true,
      },
    ],
  },
  {
    name: "prompt",
    description: "Generar prompt y rama de git para una tarea de Linear",
    options: [
      {
        name: "tarea",
        description: "Código del issue (ej: CEO-38) o descripción",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "gitstarter",
    description: "Obtener comando de git para iniciar rama de trabajo",
    options: [
      {
        name: "tarea",
        description: "Código del issue (ej: CEO-38) o descripción",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "standup",
    description: "Ver resumen y panel del standup diario",
  },
];

async function main() {
  console.log("🔄 Autenticando con Discord API...");

  // Obtener info del bot y Application ID
  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });

  if (!meRes.ok) {
    console.error("❌ Error al autenticar con el token de Discord:", await meRes.text());
    process.exit(1);
  }

  const meData = await meRes.json();
  const applicationId = process.env.DISCORD_APPLICATION_ID || meData.id;
  const guildId = process.env.DISCORD_GUILD_ID || "1536934842741301321";

  console.log(`🤖 Bot identificado: ${meData.username}#${meData.discriminator} (App ID: ${applicationId})`);

  // 1. Registrar comandos en el Guild (inmediato, sin esperar 1 hora de propagación global)
  if (guildId) {
    console.log(`📡 Registrando comandos de barra en el servidor (Guild ID: ${guildId})...`);
    const guildUrl = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
    const guildRes = await fetch(guildUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(COMMANDS),
    });

    if (guildRes.ok) {
      console.log(`✅ Comandos registrados con éxito en el servidor de Discord (${guildId}).`);
    } else {
      console.warn(`⚠️ No se pudieron registrar comandos a nivel de Guild (${guildRes.status}):`, await guildRes.text());
    }
  }

  // 2. Registrar comandos globales
  console.log("🌐 Registrando comandos de barra globales en Discord...");
  const globalUrl = `https://discord.com/api/v10/applications/${applicationId}/commands`;
  const globalRes = await fetch(globalUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(COMMANDS),
  });

  if (globalRes.ok) {
    console.log("✅ Comandos globales registrados exitosamente.");
  } else {
    console.error(`❌ Error al registrar comandos globales (${globalRes.status}):`, await globalRes.text());
  }

  console.log("\n🎉 ¡Listo! El comando /gemini ya está disponible en Discord.");
}

main().catch(console.error);
