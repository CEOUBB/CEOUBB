import { z } from "zod";
import { contentOrigin } from "../../../../../../lib/interop/config.ts";
import { fail } from "../../../../../../lib/interop/errors.ts";
import { interopFailure, readJson } from "../../../../../../lib/interop/http.ts";
import { packageContentType } from "../../../../../../lib/interop/packages.ts";
import { contentHeaders, playerDocument } from "../../../../../../lib/interop/player.ts";
import { safePackagePath } from "../../../../../../lib/interop/zip.ts";
import {
  contentGrant,
  getXapiStatement,
  hashToken,
  loadInteropProgress,
  saveInteropProgress,
  saveXapiStatements,
} from "../../../../../../lib/services/interop.ts";
import { readInteropObject } from "../../../../../../lib/services/interop-storage.ts";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ grant: string; path: string[] }> };
function xapiHeaders() {
  return {
    ...contentHeaders(),
    "Content-Type": "application/json",
    "X-Experience-API-Version": "1.0.3",
    "X-Experience-API-Consistent-Through": new Date().toISOString(),
  };
}
function xapiVersion(request: Request, grant: string) {
  if (request.headers.get("x-experience-api-version") !== "1.0.3")
    fail("Usa X-Experience-API-Version: 1.0.3.", 400);
  const auth = request.headers.get("authorization");
  if (auth !== "Bearer " + grant) fail("La autorización xAPI no corresponde a esta sesión.", 401);
}
export async function GET(request: Request, context: Context) {
  try {
    const { grant, path } = await context.params;
    const resolved = await contentGrant(grant, new URL(request.url).origin);
    if (path.length === 1 && path[0] === "player") {
      const progress = await loadInteropProgress(resolved.resource.id, resolved.actor.id);
      return new Response(
        playerDocument({
          manifest: resolved.manifest,
          grant,
          actorId: await hashToken(resolved.actor.id),
          registration: resolved.grant.registration,
          progress,
        }),
        { headers: { ...contentHeaders(), "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    if (path.join("/") === "xapi/statements") {
      xapiVersion(request, grant);
      if (resolved.resource.kind !== "xapi") fail("El recurso no utiliza xAPI.");
      const url = new URL(request.url);
      if ([...url.searchParams.keys()].some((key) => key !== "statementId"))
        fail("Sólo se admite consulta por statementId.");
      const id = z.uuid().parse(url.searchParams.get("statementId"));
      return Response.json(await getXapiStatement(resolved, id), { headers: xapiHeaders() });
    }
    if (path[0] !== "files" || path.length < 2) fail("El archivo no existe.", 404);
    const file = safePackagePath(path.slice(1).join("/"));
    if (!resolved.manifest.files.some((f) => f.name === file))
      fail("El archivo no pertenece al paquete.", 404);
    const object = await readInteropObject(resolved.resource.storagePrefix + "files/" + file);
    return new Response(object.body, {
      headers: { ...contentHeaders(), "Content-Type": packageContentType(file) },
    });
  } catch (error) {
    return interopFailure(error);
  }
}
async function mutate(request: Request, context: Context) {
  try {
    const { grant, path } = await context.params;
    const resolved = await contentGrant(grant, new URL(request.url).origin);
    if (request.headers.get("origin") !== contentOrigin())
      fail("Origen de contenido no válido.", 403);
    if (path.join("/") === "progress" && request.method === "POST") {
      const saved = await saveInteropProgress(resolved, await readJson(request, 128 * 1024));
      return Response.json(saved, {
        headers: { ...contentHeaders(), "Content-Type": "application/json" },
      });
    }
    if (path.join("/") !== "xapi/statements") fail("La operación no está disponible.", 404);
    xapiVersion(request, grant);
    const url = new URL(request.url);
    const id =
      request.method === "PUT" ? z.uuid().parse(url.searchParams.get("statementId")) : undefined;
    if (
      [...url.searchParams.keys()].some((key) => key !== "statementId") ||
      (request.method === "POST" && url.search)
    )
      fail("Parámetros xAPI no soportados.");
    const body = await readJson(request, 32 * 1024);
    if (request.method === "PUT" && Array.isArray(body))
      fail("PUT xAPI requiere un único Statement.");
    const ids = await saveXapiStatements(resolved, body, id);
    return request.method === "PUT"
      ? new Response(null, { status: 204, headers: xapiHeaders() })
      : Response.json(ids, { headers: xapiHeaders() });
  } catch (error) {
    return interopFailure(error);
  }
}
export const POST = mutate;
export const PUT = mutate;
