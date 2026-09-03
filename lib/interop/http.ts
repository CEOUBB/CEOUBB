import { ZodError } from "zod";
import { getSessionUser } from "../auth.ts";
import { MoodleImportError } from "../moodle/archive.ts";
import { platformOrigin } from "./config.ts";
import { InteropError, fail } from "./errors.ts";

export const privateHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: privateHeaders });
}
export function interopFailure(error: unknown) {
  if (error instanceof InteropError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof ZodError)
    return json(
      { error: "Revisa los campos y los límites de la solicitud.", code: "INVALID_INTEROP_INPUT" },
      400
    );
  if (error instanceof MoodleImportError)
    return json(
      { error: error.message, code: error.code },
      error.code === "ARCHIVE_LIMIT" ? 413 : 400
    );
  return json(
    {
      error: "El servicio de interoperabilidad no está disponible. Intenta nuevamente.",
      code: "INTEROP_UNAVAILABLE",
    },
    503
  );
}
export async function sessionActor(request: Request, mutation = false) {
  if (new URL(request.url).origin !== platformOrigin()) fail("Origen no autorizado.", 403);
  if (mutation && request.headers.get("origin") !== platformOrigin())
    fail("La solicitud debe originarse en el portal.", 403);
  const actor = await getSessionUser(request);
  if (!actor) fail("Inicia sesión para continuar.", 401);
  return actor;
}
export async function readBytes(request: Request, limit: number) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limit) fail("La solicitud supera el tamaño permitido.", 413);
  if (!request.body) fail("La solicitud está vacía.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) {
        await reader.cancel();
        fail("La solicitud supera el tamaño permitido.", 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function readJson(request: Request, limit = 64 * 1024): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
    fail("La solicitud debe usar JSON.", 415);
  const bytes = await readBytes(request, limit);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return fail("El cuerpo JSON no es válido.");
  }
}
