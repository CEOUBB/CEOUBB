import { currentSessionTokenHash } from "../../../../../lib/auth.ts";
import { fail } from "../../../../../lib/interop/errors.ts";
import { interopFailure, readBytes, sessionActor } from "../../../../../lib/interop/http.ts";
import { ltiFormResponse } from "../../../../../lib/interop/lti.ts";
import { authorizeLti } from "../../../../../lib/services/interop.ts";
// Implements: REQ-INT-04
export const dynamic = "force-dynamic";

async function handleAuthorization(request: Request, params: URLSearchParams) {
  const [actor, hash] = await Promise.all([
    sessionActor(request),
    currentSessionTokenHash(request),
  ]);
  if (!hash) fail("Inicia sesión para continuar.", 401);

  const values: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(values, key)) fail("El retorno OIDC repite un parámetro.");
    values[key] = value;
  }
  const launch = await authorizeLti(actor, hash, values);
  return ltiFormResponse(launch.redirect, launch.token, launch.state);
}

export async function GET(request: Request) {
  try {
    if (request.url.length > 16384) fail("La solicitud OIDC es demasiado larga.", 413);
    const params = new URL(request.url).searchParams;
    return await handleAuthorization(request, params);
  } catch (error) {
    return interopFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (
      request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded"
    ) {
      fail("El retorno OIDC debe usar un formulario.", 415);
    }
    const params = new URLSearchParams(new TextDecoder().decode(await readBytes(request, 16384)));
    return await handleAuthorization(request, params);
  } catch (error) {
    return interopFailure(error);
  }
}
