import { getSessionUser } from "../../../../../../lib/auth.ts";
import { isSectionId } from "../../../../../../lib/section-roles.ts";
import { activeSectionRoleForUser } from "../../../../../../lib/services/academic-catalog.ts";
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
  if (!sectionId || sectionId.length > 100 || !isSectionId(sectionId)) {
    return Response.json({ error: "La sección no es válida." }, { status: 400 });
  }

  if (actor.role !== "owner") {
    const membership = await activeSectionRoleForUser(actor.id, sectionId);
    if (!membership || (membership !== "teacher" && membership !== "coordinator")) {
      return Response.json({ error: "No tienes permisos sobre esta sección." }, { status: 403 });
    }
  }
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
