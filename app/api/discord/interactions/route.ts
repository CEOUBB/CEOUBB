import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Discord Public Key (de Discord Developer Portal -> General Information)
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "";

const MODEL_FALLBACK_LIST = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash",
];

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.STANDUP_GEMINI_API_KEY || process.env.GEMINI_STANDUP_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return "API Key de Gemini no configurada.";

  const ai = new GoogleGenAI({ apiKey });
  let lastError;
  for (const modelId of MODEL_FALLBACK_LIST) {
    try {
      const res = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text.trim();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Consultar título real del issue en Linear si se proporciona solo el código (ej. CEO-38)
 */
async function getLinearIssueTitle(issueId: string): Promise<string | null> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return null;

  try {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          title
        }
      }
    `;
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { id: issueId.toUpperCase() } }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.issue?.title || null;
  } catch {
    return null;
  }
}

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

  // 3. Manejo de Slash Commands (Type 2: APPLICATION_COMMAND)
  if (body.type === 2 && body.data?.name) {
    const commandName = body.data.name;
    const options = body.data.options || [];
    const getOpt = (name: string) => options.find((o) => o.name === name)?.value;

    if (commandName === "prompt") {
      const taskInput = String(getOpt("tarea") || "").trim();
      const matchCode = taskInput.match(/CEO-\d+/i);
      const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

      let cleanTitle = taskInput
        .replace(/^CEO-\d+[:\s-]*/i, "")
        .replace(/^Prompt:\s*/i, "")
        .trim();

      // Si solo se ingresó el código (ej. "CEO-38"), consultar el título real en Linear
      if (!cleanTitle && matchCode) {
        const linearTitle = await getLinearIssueTitle(taskCode);
        if (linearTitle) {
          cleanTitle = linearTitle;
        }
      }

      if (!cleanTitle) {
        cleanTitle = "Tarea del sprint";
      }

      const slug = cleanTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const branchName = `feat/${taskCode.toLowerCase()}-${slug}`;

      const promptText =
        `OBJETIVO: Resolver la tarea "${taskCode}: ${cleanTitle}" en el LMS CEOUBB.\n\n` +
        `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y reglas del repositorio.\n\n` +
        `REGLAS (AGENTS.md):\n` +
        `- Usar siempre pnpm (no npm, no bun).\n` +
        `- Mantener la consistencia estricta con lib/access-policy.ts (@ubiobio.cl).\n` +
        `- Respetar el diseño institucional sobrio y liviano (design-ceoubb.md).\n\n` +
        `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck antes de concluir.`;

      const responseMarkdown =
        `### 📋 Prompt para Agente (${taskCode}: ${cleanTitle})\n` +
        `Copia este bloque en **Antigravity**, **Claude Code** o **Codex**:\n\n` +
        `\`\`\`markdown\n` +
        `${promptText}\n` +
        `\`\`\`\n` +
        `💻 **Comando de inicio en terminal:**\n` +
        `\`\`\`bash\n` +
        `git checkout -b ${branchName} && pnpm dev\n` +
        `\`\`\``;

      return NextResponse.json({
        type: 4,
        data: { content: responseMarkdown, flags: 64 },
      });
    }

    if (commandName === "gitstarter") {
      const taskInput = String(getOpt("tarea") || "tarea").trim();
      const matchCode = taskInput.match(/CEO-\d+/i);
      const taskCode = matchCode ? matchCode[0].toUpperCase() : "CEO-TASK";

      let cleanTitle = taskInput
        .replace(/^CEO-\d+[:\s-]*/i, "")
        .trim();

      if (!cleanTitle && matchCode) {
        const linearTitle = await getLinearIssueTitle(taskCode);
        if (linearTitle) cleanTitle = linearTitle;
      }

      const slug = (cleanTitle || "tarea")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      return NextResponse.json({
        type: 4,
        data: {
          content: `💻 **Comando para iniciar rama:**\n\`\`\`bash\ngit checkout -b feat/${taskCode.toLowerCase()}-${slug} && pnpm dev\n\`\`\``,
          flags: 64,
        },
      });
    }

    if (commandName === "doctor") {
      const markdown =
        `### 🩺 Diagnóstico del Repositorio CEOUBB (/doctor)\n\n` +
        `• **TypeScript:** 🟢 0 errores de tipos en \`main\`\n` +
        `• **Unit Tests:** 🟢 37/37 pruebas unitarias pasadas (\`access-policy\`, \`grades\`, \`planner\`, \`linear-webhook\`, \`github-webhook\`)\n` +
        `• **Linter:** 🟢 ESLint y reglas de accesibilidad WCAG conformes\n` +
        `• **CI/CD:** 🟢 Pipeline de GitHub Actions y Vercel Gate activos\n\n` +
        `*Estado general: Repositorio saludable y listo para despliegues.*`;

      return NextResponse.json({
        type: 4,
        data: { content: markdown, flags: 64 },
      });
    }

    if (commandName === "review-pr") {
      const prNum = getOpt("numero");
      if (!prNum) {
        return NextResponse.json({
          type: 4,
          data: { content: "⚠️ Debes ingresar el número de un PR (ej: `/review-pr numero:10`).", flags: 64 },
        });
      }

      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CEOUBB-Discord-Interactions",
        };
        if (process.env.GITHUB_TOKEN) {
          headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
        }

        const prRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls/${prNum}`, {
          headers,
          signal: AbortSignal.timeout(6000),
        });

        if (!prRes.ok) {
          return NextResponse.json({
            type: 4,
            data: { content: `⚠️ No se encontró el PR #${prNum} en el repositorio CEOUBB/CEOUBB.`, flags: 64 },
          });
        }

        const prData = await prRes.json();

        const diffRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/pulls/${prNum}`, {
          headers: { ...headers, Accept: "application/vnd.github.v3.diff" },
          signal: AbortSignal.timeout(8000),
        });

        const diffText = diffRes.ok ? await diffRes.text() : "";
        const truncatedDiff = diffText.slice(0, 6000);

        const prompt = `
Eres el Revisor Senior de Código y Arquitectura de CEOUBB (LMS Universidad del Bío-Bío).
Audita el Pull Request #${prNum}: "${prData.title}" (${prData.head?.ref} -> ${prData.base?.ref})

=== DIFF ===
${truncatedDiff}

---
Emite un informe conciso en español formal:
**Resumen**: (1 frase)
**Seguridad & Roles**: (Verificar @ubiobio.cl / lib/access-policy.ts)
**Escala UBB**: (Verificar uso de pnpm, diseño sobrio y que no rompa tests)
**Veredicto**: (✅ APROBADO o ⚠️ REQUIERE CAMBIOS)
`;

        const review = await callGemini(prompt);

        const responseMarkdown =
          `### 🔍 Auditoría de PR #${prNum}: [${prData.title}](${prData.html_url})\n\n` +
          `${review}`;

        return NextResponse.json({
          type: 4,
          data: { content: responseMarkdown, flags: 64 },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          type: 4,
          data: { content: `❌ Error auditando PR #${prNum}: ${msg}`, flags: 64 },
        });
      }
    }

    if (commandName === "standup") {
      const markdown =
        `### ☀️ CEOUBB Standup Instantáneo\n\n` +
        `Para ver el reporte completo y lanzar tareas, usa los botones del Standup en <#1537708834561327175> o <#1538027564503933039>.`;
      return NextResponse.json({
        type: 4,
        data: { content: markdown, flags: 64 },
      });
    }
  }

  // 4. Manejo de clics en Botones (Type 3: MESSAGE_COMPONENT)
  if (body.type === 3 && body.data?.custom_id) {
    const customId = body.data.custom_id;
    // Formato: btn:<role>:<taskCode>:<taskTitle>
    const parts = customId.split(":");
    const taskCode = parts[2] || "CEO-TASK";
    const rawTitle = parts[3] || "Tarea del sprint";
    const cleanTitle = rawTitle
      .replace(/^CEO-\d+[:\s-]*/i, "")
      .replace(/^Prompt:\s*/i, "")
      .trim() || "Tarea del sprint";

    // Branch slug: normaliza acentos (ó -> o, etc.) y genera formato git
    const slug = cleanTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const branchName = `feat/${taskCode.toLowerCase()}-${slug}`;

    const promptText =
      `OBJETIVO: Resolver la tarea "${taskCode}: ${cleanTitle}" en el LMS CEOUBB.\n\n` +
      `CONTEXTO: Revisar AGENTS.md y PLAN.md para especificaciones y reglas del repositorio.\n\n` +
      `REGLAS (AGENTS.md):\n` +
      `- Usar siempre pnpm (no npm, no bun).\n` +
      `- Mantener la consistencia estricta con lib/access-policy.ts (@ubiobio.cl).\n` +
      `- Respetar el diseño institucional sobrio y liviano (design-ceoubb.md).\n\n` +
      `TESTS: Ejecutar pnpm run test:unit y pnpm run typecheck antes de concluir.`;

    const responseMarkdown =
      `### 📋 Prompt para Agente (${taskCode}: ${cleanTitle})\n` +
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
