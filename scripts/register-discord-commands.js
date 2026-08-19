try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional: the process may already carry the variables.
}

// Tokens
const CEOUBB_BOT_TOKEN = process.env.DISCORD_CEOUBB_BOT_TOKEN;
const GEMINI_BOT_TOKEN = process.env.DISCORD_ANTIGRAVITY_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;

// 1. Comandos exclusivos para CEOUBB Bot (DevOps, CI/CD, Standup, Prompts)
const CEOUBB_COMMANDS = [
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

// 2. Comandos exclusivos para el Bot de Gemini (Conversación, Consultas técnicas, Linear, Código)
const GEMINI_COMMANDS = [
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
    name: "consultar",
    description: "Consultar al Asistente Gemini de CEOUBB",
    options: [
      {
        name: "pregunta",
        description: "¿Qué deseas consultar o solicitar?",
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
];

async function registerForBot(botName, botToken, commands) {
  if (!botToken) {
    console.warn(`⚠️ Omitiendo ${botName}: token no configurado.`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`🤖 Registrando comandos para: ${botName}`);
  console.log(`========================================`);

  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!meRes.ok) {
    console.error(`❌ Error autenticando ${botName}:`, await meRes.text());
    return;
  }

  const meData = await meRes.json();
  const applicationId = meData.id;
  console.log(
    `👤 Usuario de Discord: ${meData.username}#${meData.discriminator} (App ID: ${applicationId})`
  );

  // Obtener servidores donde está el bot
  const guildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (guildsRes.ok) {
    const guilds = await guildsRes.json();
    for (const g of guilds) {
      console.log(
        `📡 Registrando ${commands.length} comando(s) en servidor "${g.name}" (${g.id})...`
      );
      const guildUrl = `https://discord.com/api/v10/applications/${applicationId}/guilds/${g.id}/commands`;
      const guildRes = await fetch(guildUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      });

      if (guildRes.ok) {
        console.log(`✅ Comandos registrados con éxito para ${botName} en "${g.name}".`);
      } else {
        console.warn(
          `⚠️ Error registrando comandos en "${g.name}" (${guildRes.status}):`,
          await guildRes.text()
        );
      }
    }
  }

  // Limpiar comandos globales para evitar duplicados
  const globalUrl = `https://discord.com/api/v10/applications/${applicationId}/commands`;
  await fetch(globalUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([]),
  });
}

async function main() {
  // Registrar para CEOUBB Bot
  await registerForBot("CEOUBB Bot (DevOps)", CEOUBB_BOT_TOKEN, CEOUBB_COMMANDS);

  // Registrar para Gemini Bot
  await registerForBot("Gemini Bot (Asistente IA)", GEMINI_BOT_TOKEN, GEMINI_COMMANDS);

  console.log(
    "\n🎉 ¡Registro completado! Cada bot ahora tiene exclusivamente sus propios comandos."
  );
}

main().catch(console.error);
