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
 * Consultar diagnóstico real en tiempo real de GitHub Actions CI en main
 */
async function fetchLatestCIDiagnostics(): Promise<string> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CEOUBB-Discord-Interactions",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const runsRes = await fetch("https://api.github.com/repos/CEOUBB/CEOUBB/actions/runs?branch=main&per_page=1", {
      headers,
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 },
    });

    if (!runsRes.ok) {
      return "⚠️ No se pudo consultar la API de GitHub Actions.";
    }

    const runsData = await runsRes.json();
    const latestRun = runsData?.workflow_runs?.[0];

    if (!latestRun) {
      return "ℹ️ No hay ejecuciones de CI registradas en `main`.";
    }

    let stepsDetail = "";
    if (latestRun.jobs_url) {
      const jobsRes = await fetch(latestRun.jobs_url, {
        headers,
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 0 },
      });

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const verifyJob = jobsData?.jobs?.[0];
        const relevantSteps = (verifyJob?.steps || []).filter((s: { name: string }) =>
          ["Check Firebase Functions syntax", "TypeScript typecheck", "Lint code", "Run test suite"].includes(s.name)
        );

        stepsDetail = relevantSteps
          .map((s: { name: string; status: string; conclusion: string | null }) => {
            const icon =
              s.conclusion === "success"
                ? "🟢"
                : s.conclusion === "failure"
                ? "🔴"
                : s.status === "in_progress"
                ? "🟡 (En ejecución)"
                : "⚪ (Pendiente)";
            return `• **${s.name}:** ${icon}`;
          })
          .join("\n");
      }
    }

    const runStatusIcon =
      latestRun.conclusion === "success"
        ? "🟢 Exitoso"
        : latestRun.conclusion === "failure"
        ? "🔴 Falló"
        : `🟡 ${latestRun.status}`;

    const sha = latestRun.head_sha?.slice(0, 7) || "commit";
    const commitMsg = latestRun.head_commit?.message?.split("\n")[0] || "Sin mensaje";
    const actor = latestRun.actor?.login || "Desarrollador";

    return (
      `### 🩺 Diagnóstico Real de CI/CD (/doctor)\n\n` +
      `**Último commit en \`main\`:** [\`${sha}\`](${latestRun.html_url}) — *"${commitMsg}"* (por @${actor})\n` +
      `**Estado General del Pipeline:** ${runStatusIcon}\n\n` +
      `**Detalle de verificaciones en GitHub Actions:**\n` +
      `${stepsDetail || "• Verificaciones automáticas completas"}\n\n` +
      `🔗 **[Ver ejecución completa en GitHub Actions](${latestRun.html_url})**`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `⚠️ Error consultando diagnóstico en vivo: ${msg}`;
  }
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
      const liveDiagnostics = await fetchLatestCIDiagnostics();
      return NextResponse.json({
        type: 4,
        data: { content: liveDiagnostics },
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

        // 3. Obtener comentarios del PR para detectar diagnósticos de React Doctor
        let reactDoctorNotes = "Sin comentarios de React Doctor detectados en el PR.";
        try {
          const commentsRes = await fetch(`https://api.github.com/repos/CEOUBB/CEOUBB/issues/${prNum}/comments`, {
            headers,
            signal: AbortSignal.timeout(5000),
          });
          if (commentsRes.ok) {
            const comments = await commentsRes.json();
            const doctorComments = (comments || []).filter((c: { body?: string; user?: { login?: string } }) =>
              c.body?.toLowerCase().includes("react doctor") ||
              c.body?.toLowerCase().includes("million") ||
              c.user?.login?.toLowerCase().includes("doctor")
            );
            if (doctorComments.length > 0) {
              reactDoctorNotes = doctorComments.map((c: { body?: string }) => c.body).join("\n\n---\n\n").slice(0, 3000);
            }
          }
        } catch {
          // Ignorar error al consultar comentarios
        }

        const prompt = `
Eres el Revisor Senior de Código y Arquitectura de CEOUBB (LMS Universidad del Bío-Bío).
Audita el Pull Request #${prNum}: "${prData.title}" (${prData.head?.ref} -> ${prData.base?.ref})

=== DIFF DE CÓDIGO ===
${truncatedDiff}

=== COMENTARIOS DE AUDITORÍA (REACT DOCTOR / CI) ===
${reactDoctorNotes}

---
Instrucciones de auditoría:
1. Diagnósticos de React Doctor: Revisa si React Doctor dejó advertencias de rendimiento, renderizados innecesarios o accesibilidad. Si React Doctor reportó algún problema, enuméralo detalladamente y EXIGE su resolución antes de aprobar el PR.
2. Seguridad & Roles: Verificar que la derivación de roles use estrictamente lib/access-policy.ts y dominios @ubiobio.cl.
3. Escala UBB: Verificar uso de pnpm, diseño sobrio (design-ceoubb.md) y pruebas unitarias.

Emite un informe conciso en español formal con este formato:
**Resumen**: (1 frase de lo que hace el PR)
**Diagnósticos de React Doctor**: (Detalla si hay problemas reportados por React Doctor o si está completamente limpio)
**Seguridad & Roles**: (Verificar @ubiobio.cl / lib/access-policy.ts)
**Escala UBB**: (Verificar uso de pnpm, diseño sobrio y estabilidad)
**Veredicto**: (✅ APROBADO si todo está limpio y sin problemas de React Doctor, o ⚠️ REQUIERE CAMBIOS indicando qué corregir)
`;

        const review = await callGemini(prompt);

        const responseMarkdown =
          `### 🔍 Auditoría de PR #${prNum}: [${prData.title}](${prData.html_url})\n\n` +
          `${review}`;

        return NextResponse.json({
          type: 4,
          data: { content: responseMarkdown },
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
        data: { content: markdown },
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
