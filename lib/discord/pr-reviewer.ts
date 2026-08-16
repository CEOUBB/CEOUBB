import {
  getPullRequest,
  getPullRequestDiff,
  getPullRequestComments,
  getGeminiClient,
  generateContentWithFallback,
} from "../services/index.ts";

/**
 * Realiza una auditoría completa de un Pull Request de GitHub utilizando Gemini y reglas del repositorio.
 */
export async function reviewPullRequest(prNum: string | number): Promise<{ content: string; isError?: boolean }> {
  try {
    const prData = await getPullRequest(prNum);

    if (!prData) {
      return {
        content: `⚠️ No se encontró el PR #${prNum} en el repositorio CEOUBB/CEOUBB.`,
        isError: true,
      };
    }

    const diffText = await getPullRequestDiff(prNum);
    const truncatedDiff = diffText.slice(0, 6000);

    let reactDoctorNotes = "Sin comentarios de React Doctor detectados en el PR.";
    try {
      const comments = await getPullRequestComments(prNum);
      const doctorComments = (comments || []).filter((c) =>
        c.body?.toLowerCase().includes("react doctor") ||
        c.body?.toLowerCase().includes("million") ||
        c.author?.toLowerCase().includes("doctor")
      );
      if (doctorComments.length > 0) {
        reactDoctorNotes = doctorComments.map((c) => c.body).join("\n\n---\n\n").slice(0, 3000);
      }
    } catch {
      // Ignorar error al consultar comentarios
    }

    const prompt = `
Eres el Revisor Senior de Código y Arquitectura de CEOUBB (LMS Universidad del Bío-Bío).
Audita el Pull Request #${prNum}: "${prData.title}" (${prData.branch} -> ${prData.baseBranch})

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

    const ai = getGeminiClient();
    let review = "API Key de Gemini no configurada.";
    if (ai) {
      try {
        const result = await generateContentWithFallback(ai, prompt);
        review = result.text;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        review = `⚠️ Error al generar auditoría con Gemini: ${errMsg}`;
      }
    }

    const responseMarkdown =
      `### 🔍 Auditoría de PR #${prNum}: [${prData.title}](${prData.html_url || prData.url})\n\n` +
      `${review}`;

    return { content: responseMarkdown, isError: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: `❌ Error auditando PR #${prNum}: ${msg}`, isError: true };
  }
}
