import type { AccountRole } from "./access-policy.ts";
import type { SectionRole } from "./section-roles.ts";
import {
  canReadGradeHistory,
  parseGradeHistoryQuery,
  type GradeHistoryPage,
  type GradeHistoryQuery,
} from "./grade-history.ts";

type Dependencies = {
  session: (request: Request) => Promise<{ id: string; role: AccountRole } | null>;
  membership: (userId: string, sectionId: string) => Promise<SectionRole | null>;
  read: (query: GradeHistoryQuery) => Promise<GradeHistoryPage>;
};

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}

export async function handleGradeHistory(
  request: Request,
  sectionId: string,
  dependencies: Dependencies
) {
  try {
    const actor = await dependencies.session(request);
    if (!actor) return json({ error: "Sesión no válida." }, 401);
    let query: GradeHistoryQuery;
    try {
      query = parseGradeHistoryQuery(request.url, sectionId);
    } catch {
      return json(
        { error: "La sección, la evaluación, el estudiante o el cursor no son válidos." },
        400
      );
    }
    const membership =
      actor.role === "owner" ? null : await dependencies.membership(actor.id, sectionId);
    if (!canReadGradeHistory(actor.role, membership)) {
      return json({ error: "No tienes permiso para consultar el historial de esta sección." }, 403);
    }
    return json(await dependencies.read(query));
  } catch {
    return json({ error: "El historial no está disponible. Inténtalo nuevamente." }, 503);
  }
}
