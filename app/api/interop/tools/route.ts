import { z } from "zod";
import { interopFailure, json, readJson, sessionActor } from "../../../../lib/interop/http.ts";
import {
  listInteropTools,
  registerTool,
  setToolEnabled,
} from "../../../../lib/services/interop.ts";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await sessionActor(request);
    return json(
      await listInteropTools(new URL(request.url).searchParams.get("cursor") || undefined)
    );
  } catch (error) {
    return interopFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await sessionActor(request, true);
    return json(await registerTool(actor, await readJson(request)), 201);
  } catch (error) {
    return interopFailure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await sessionActor(request, true);
    // Implements: REQ-INT-05
    const input = z
      .strictObject({ id: z.uuid(), enabled: z.boolean() })
      .parse(await readJson(request));
    await setToolEnabled(actor, input.id, input.enabled);
    return json({ ok: true });
  } catch (error) {
    return interopFailure(error);
  }
}
