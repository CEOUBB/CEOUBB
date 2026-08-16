import { GoogleGenAI } from "@google/genai";

/**
 * Modelos Gemini modernos para reintentos en orden de preferencia y capacidad.
 */
export const MODEL_FALLBACK_LIST = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3-flash",
];

/**
 * Resuelve la API Key de Gemini desde las distintas variables de entorno soportadas.
 */
export function getGeminiApiKey(): string | null {
  return (
    process.env.STANDUP_GEMINI_API_KEY ||
    process.env.GEMINI_STANDUP_API_KEY ||
    process.env.GEMINI_API_KEY ||
    null
  );
}

/**
 * Inicializa y retorna una instancia del cliente de GoogleGenAI si la API key está disponible.
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = customApiKey || getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export interface GenerateContentResult {
  text: string;
  usedModel: string;
}

export interface GenerateContentOptions {
  systemInstruction?: string;
  tools?: unknown[];
  temperature?: number;
  [key: string]: unknown;
}

/**
 * Ejecuta la generación de contenido en Gemini recorriendo automáticamente la lista de modelos de fallback ante errores de cuota o indisponibilidad.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  contents: string | Array<Record<string, unknown>>,
  config?: GenerateContentOptions
): Promise<GenerateContentResult> {
  const normalizedContents =
    typeof contents === "string" ? [{ role: "user", parts: [{ text: contents }] }] : contents;

  let lastError: unknown;

  for (const modelId of MODEL_FALLBACK_LIST) {
    try {
      const res = await ai.models.generateContent({
        model: modelId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: normalizedContents as any,
        config: config as Record<string, unknown> | undefined,
      });

      const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) {
        return { text: text.trim(), usedModel: modelId };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ Modelo Gemini '${modelId}' falló durante generación: ${errorMsg}`);
      lastError = err;
    }
  }

  const finalError =
    lastError instanceof Error
      ? lastError
      : new Error(
          String(lastError || "No se pudo obtener respuesta de ningún modelo de fallback de Gemini")
        );
  throw finalError;
}
