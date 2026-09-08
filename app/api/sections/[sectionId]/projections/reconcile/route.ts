import { getSessionUser } from "../../../../../../lib/auth.ts";
import { reconcileSectionProjections } from "../../../../../../lib/services/bulk-enrollment.ts";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const actor = await getSessionUser(request);
  if (!actor || (actor.role !== "teacher" && actor.role !== "owner")) {
    return Response.json({ error: "No autorizado." }, { status: 403 });
  }

  const { sectionId } = await params;
  try {
    const result = await reconcileSectionProjections(actor, sectionId);
    return Response.json(result);
  } catch (cause) {
    console.error(`[POST /api/sections/${sectionId}/projections/reconcile] Error:`, cause);
    return Response.json(
      { error: "No fue posible reconciliar las proyecciones con Firestore." },
      { status: 502 }
    );
  }
}
