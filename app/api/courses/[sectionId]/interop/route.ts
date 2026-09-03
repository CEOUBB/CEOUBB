import { fail } from "../../../../../lib/interop/errors.ts";
import {
  interopFailure,
  json,
  readBytes,
  readJson,
  sessionActor,
} from "../../../../../lib/interop/http.ts";
import { MAX_PACKAGE_BYTES } from "../../../../../lib/interop/zip.ts";
import {
  authorizeInteropSection,
  linkLtiResource,
  listInteropResources,
} from "../../../../../lib/services/interop.ts";
import { importLearningPackage } from "../../../../../lib/services/interop-storage.ts";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ sectionId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await sessionActor(request);
    const { sectionId } = await context.params;
    return json(
      await listInteropResources(
        actor,
        sectionId,
        new URL(request.url).searchParams.get("cursor") || undefined
      )
    );
  } catch (error) {
    return interopFailure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const actor = await sessionActor(request, true);
    const { sectionId } = await context.params;
    await authorizeInteropSection(actor, sectionId, true);
    const type = request.headers.get("content-type")?.split(";")[0].trim();
    if (type === "application/zip")
      return json(
        await importLearningPackage(actor, sectionId, await readBytes(request, MAX_PACKAGE_BYTES)),
        201
      );
    if (type !== "application/json") fail("Selecciona un paquete ZIP o una herramienta LTI.", 415);
    return json({ id: await linkLtiResource(actor, sectionId, await readJson(request)) }, 201);
  } catch (error) {
    return interopFailure(error);
  }
}
