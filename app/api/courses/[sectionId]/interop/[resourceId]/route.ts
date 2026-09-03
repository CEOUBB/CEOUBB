import { currentSessionTokenHash } from "../../../../../../lib/auth.ts";
import { fail } from "../../../../../../lib/interop/errors.ts";
import {
  interopFailure,
  json,
  privateHeaders,
  sessionActor,
} from "../../../../../../lib/interop/http.ts";
import {
  getInteropResource,
  launchInteropResource,
} from "../../../../../../lib/services/interop.ts";
import { readInteropObject } from "../../../../../../lib/services/interop-storage.ts";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ sectionId: string; resourceId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const actor = await sessionActor(request, true);
    const { sectionId, resourceId } = await context.params;
    const sessionHash = await currentSessionTokenHash(request);
    if (!sessionHash) fail("Inicia sesión para continuar.", 401);
    return json(await launchInteropResource(actor, sectionId, resourceId, sessionHash));
  } catch (error) {
    return interopFailure(error);
  }
}
export async function GET(request: Request, context: Context) {
  try {
    const actor = await sessionActor(request);
    const { sectionId, resourceId } = await context.params;
    const { resource } = await getInteropResource(actor, sectionId, resourceId);
    if (resource.kind === "lti")
      fail("Las herramientas LTI no contienen un paquete descargable.", 400);
    const response = await readInteropObject(resource.storagePrefix + "original.zip");
    return new Response(response.body, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="objeto-' + resource.id + '.zip"',
      },
    });
  } catch (error) {
    return interopFailure(error);
  }
}
