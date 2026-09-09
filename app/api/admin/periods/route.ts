import { getSessionUser } from "../../../../lib/auth";
import { listAcademicPeriods } from "../../../../lib/services/academic-period-archive";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  if (actor.role !== "owner") {
    return Response.json(
      { error: "No tienes permisos para administrar períodos." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawCursor = searchParams.get("cursor");
  const cursor = rawCursor ? rawCursor.trim().slice(0, 100) : undefined;
  const requestedLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 50;
  try {
    return Response.json(await listAcademicPeriods({ cursor: cursor || null, limit }), {
      headers: privateHeaders,
    });
  } catch {
    return Response.json({ error: "No fue posible cargar los períodos." }, { status: 500 });
  }
}
