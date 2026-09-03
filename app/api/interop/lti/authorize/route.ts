import { currentSessionTokenHash } from "../../../../../lib/auth.ts";
import { fail } from "../../../../../lib/interop/errors.ts";
import { interopFailure, readBytes, sessionActor } from "../../../../../lib/interop/http.ts";
import { ltiFormResponse } from "../../../../../lib/interop/lti.ts";
import { authorizeLti } from "../../../../../lib/services/interop.ts";
export const dynamic = "force-dynamic";
async function authorize(request: Request) {
  try {
    const actor = await sessionActor(request);
    const hash = await currentSessionTokenHash(request);
    if (!hash) fail("Inicia sesión para continuar.", 401);
    let params: URLSearchParams;
    if (request.method === "POST") {
      if (
        request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded"
      )
        fail("El retorno OIDC debe usar un formulario.", 415);
      params = new URLSearchParams(new TextDecoder().decode(await readBytes(request, 16384)));
    } else {
      if (request.url.length > 16384) fail("La solicitud OIDC es demasiado larga.", 413);
      params = new URL(request.url).searchParams;
    }
    const values: Record<string, string> = Object.create(null);
    for (const [key, value] of params) {
      if (Object.hasOwn(values, key)) fail("El retorno OIDC repite un parámetro.");
      values[key] = value;
    }
    const launch = await authorizeLti(actor, hash, values);
    return ltiFormResponse(launch.redirect, launch.token, launch.state);
  } catch (error) {
    return interopFailure(error);
  }
}
export const GET = authorize;
export const POST = authorize;
