import { getSessionUser } from "../../../../../../lib/auth.ts";
import { EnrollmentImportError } from "../../../../../../lib/bulk-enrollment.ts";
import { reconcileSectionProjections } from "../../../../../../lib/services/bulk-enrollment.ts";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > 16384) {
      return Response.json(
        { error: "El cuerpo de la solicitud es demasiado extenso." },
        { status: 413 }
      );
    }
  }

  const actor = await getSessionUser(request);
  if (!actor) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
  if (actor.role !== "teacher" && actor.role !== "owner") {
    return Response.json({ error: "No autorizado." }, { status: 403 });
  }

  const { sectionId } = await params;
  try {
    const result = await reconcileSectionProjections(actor, sectionId);
    return Response.json(result);
  } catch (cause: unknown) {
    if (cause instanceof EnrollmentImportError) {
      return Response.json({ error: cause.message, code: cause.code }, { status: cause.status });
    }
    console.error(`[POST /api/sections/${sectionId}/projections/reconcile] Error:`, cause);
    return Response.json(
      { error: "No fue posible reconciliar las proyecciones con Firestore." },
      { status: 502 }
    );
  }
}
