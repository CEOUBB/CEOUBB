import { getSessionUser } from "../../../../../../lib/auth";
import {
  archiveAcademicPeriod,
  PeriodArchiveError,
} from "../../../../../../lib/services/academic-period-archive";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  if (actor.role !== "owner") {
    return Response.json({ error: "No tienes permisos para cerrar períodos." }, { status: 403 });
  }

  const { periodId } = await params;
  try {
    return Response.json(await archiveAcademicPeriod(periodId));
  } catch (cause) {
    if (cause instanceof PeriodArchiveError) {
      const status = cause.code === "invalid_period" ? 400 : cause.code === "not_found" ? 404 : 503;
      return Response.json({ error: cause.message }, { status });
    }
    return Response.json({ error: "No fue posible archivar el período." }, { status: 500 });
  }
}
