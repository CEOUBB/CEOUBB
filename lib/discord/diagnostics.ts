import { getLatestWorkflowRun } from "../services/github.ts";

/**
 * Diagnóstico en vivo de pipelines CI/CD de GitHub Actions en la rama main.
 */
export async function fetchLatestCIDiagnostics(): Promise<string> {
  try {
    const latestRun = await getLatestWorkflowRun("main");

    if (!latestRun) {
      return "ℹ️ No hay ejecuciones de CI registradas en `main`.";
    }

    const stepsDetail = (latestRun.steps || [])
      .map((s) => {
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

    const runStatusIcon =
      latestRun.conclusion === "success"
        ? "🟢 Exitoso"
        : latestRun.conclusion === "failure"
        ? "🔴 Falló"
        : `🟡 ${latestRun.status}`;

    return (
      `### 🩺 Diagnóstico Real de CI/CD (/doctor)\n\n` +
      `**Último commit en \`main\`:** [\`${latestRun.headSha}\`](${latestRun.htmlUrl}) — *"${latestRun.commitMessage}"* (por @${latestRun.actor})\n` +
      `**Estado General del Pipeline:** ${runStatusIcon}\n\n` +
      `**Detalle de verificaciones en GitHub Actions:**\n` +
      `${stepsDetail || "• Verificaciones automáticas completas"}\n\n` +
      `🔗 **[Ver ejecución completa en GitHub Actions](${latestRun.htmlUrl})**`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `⚠️ Error consultando diagnóstico en vivo: ${msg}`;
  }
}
