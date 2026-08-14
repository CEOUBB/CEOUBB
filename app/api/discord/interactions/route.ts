import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// Discord Public Key (de Discord Developer Portal -> General Information)
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "";

/**
 * Valida la firma criptográfica Ed25519 requerida por Discord
 */
function verifyDiscordSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"), // ASN.1 header para Ed25519
      Buffer.from(publicKey, "hex"),
    ]);
    const key = crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";

  // 1. Validar firma de Discord (si DISCORD_PUBLIC_KEY está configurada)
  if (DISCORD_PUBLIC_KEY) {
    const isValid = verifyDiscordSignature(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new NextResponse("Invalid request signature", { status: 401 });
    }
  }

  let body: {
    type: number;
    data?: {
      custom_id?: string;
      name?: string;
      options?: Array<{ name: string; value: string | number }>;
    };
    member?: { user?: { username: string; id: string } };
    user?: { username: string; id: string };
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // 2. Discord PING verification (Type 1)
  if (body.type === 1) {
    return NextResponse.json({ type: 1 }); // PONG
  }

  // 3. Manejo de clics en Botones (Type 3: MESSAGE_COMPONENT)
  if (body.type === 3 && body.data?.custom_id) {
    const customId = body.data.custom_id;
    // Formato: btn:<role>:<taskCode>:<taskTitle>
    const parts = customId.split(":");
    const taskCode = parts[2] || "CEO-TASK";
    const taskTitle = (parts[3] || "Tarea del sprint").replace(/-/g, " ");

    const branchName = `feat/${taskCode.toLowerCase()}-${taskTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

    const promptText =
      `OBJETIVO: Resolver la tarea "${taskCode}: ${taskTitle}" en el LMS CEOUBB.\n\n` +
      `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y reglas del repositorio.\n\n` +
      `REGLAS (AGENTS.md):\n` +
      `- Usar siempre pnpm (no npm, no bun).\n` +
      `- Mantener la consistencia estricta con lib/access-policy.ts (@ubiobio.cl).\n` +
      `- Respetar el diseño institucional sobrio y liviano (design-ceoubb.md).\n\n` +
      `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck antes de concluir.`;

    const responseMarkdown =
      `### 📋 Prompt para Agente (${taskCode}: ${taskTitle})\n` +
      `Copia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n` +
      `\`\`\`markdown\n` +
      `${promptText}\n` +
      `\`\`\`\n` +
      `💻 **Comando de inicio en terminal:**\n` +
      `\`\`\`bash\n` +
      `git checkout -b ${branchName} && pnpm dev\n` +
      `\`\`\``;

    return NextResponse.json({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: responseMarkdown,
        flags: 64, // 64 = EPHEMERAL (Solo el usuario que hizo clic lo ve)
      },
    });
  }

  return NextResponse.json({ type: 4, data: { content: "Acción procesada.", flags: 64 } });
}
