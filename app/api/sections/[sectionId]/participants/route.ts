import { getSessionUser } from "../../../../../lib/auth";
import {
  activeSectionRoleForUser,
  countSectionRosterByRole,
  listSectionRoster,
} from "../../../../../lib/services/academic-catalog";
import { parseParticipantDirectoryRequest } from "../../../../../lib/participants";
import { isSectionId } from "../../../../../lib/section-roles";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const actor = await getSessionUser(request);
  if (!actor) return json({ error: "Sesión no válida." }, 401);

  const { sectionId } = await params;
  if (!isSectionId(sectionId)) return json({ error: "La sección no es válida." }, 400);

  const directoryRequest = parseParticipantDirectoryRequest(request.url);
  if ("error" in directoryRequest) return json({ error: directoryRequest.error }, 400);

  try {
    const membership = await activeSectionRoleForUser(actor.id, sectionId);
    if (actor.role !== "owner" && !membership)
      return json({ error: "No perteneces a esta sección." }, 403);

    const [page, counts] = await Promise.all([
      listSectionRoster(sectionId, {
        limit: directoryRequest.limit,
        cursor: directoryRequest.cursor,
        query: directoryRequest.query,
        roles: directoryRequest.roles,
      }),
      countSectionRosterByRole(sectionId, directoryRequest.query),
    ]);

    return json({
      items: page.items.map((participant) => ({
        id: participant.usuarioId,
        name: participant.nombre,
        email: participant.email,
        role: participant.rolSeccion,
      })),
      counts,
      nextCursor: page.nextCursor,
    });
  } catch {
    return json({ error: "No se pudo consultar el directorio de la sección." }, 500);
  }
}
