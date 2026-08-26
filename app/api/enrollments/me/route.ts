import { getSessionUser } from "../../../../lib/auth";
import {
  MAX_PAGE_SIZE,
  boundedLimit,
  listUserSections,
  listUserSectionMemberships,
} from "../../../../lib/services/academic-catalog";

/*
  Secciones con matrícula activa de la sesión actual. El portal las necesita
  antes de abrir cualquier escucha de Firestore: sin esta lista no hay forma de
  suscribirse sólo a lo propio y se vuelve al barrido global.
*/
// Implements: REQ-PERF-01, REQ-ACAD-02, REQ-API-02, REQ-DATA-02
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "archived" ? "archived" : "current";
  const cursor = searchParams.get("cursor");
  const limit = boundedLimit(Number(searchParams.get("limit") ?? MAX_PAGE_SIZE));
  try {
    if (scope === "archived") {
      const sections = await listUserSections(actor.id, { limit, cursor, scope });
      return Response.json({
        sectionIds: [],
        memberships: [],
        sections: sections.items,
        nextCursor: sections.nextCursor,
      });
    }
    const [sections, memberships] = cursor
      ? await Promise.all([
          listUserSections(actor.id, { limit, cursor, scope }),
          listUserSectionMemberships(actor.id, { limit: MAX_PAGE_SIZE }),
        ])
      : await (async () => {
          const sec = await listUserSections(actor.id, { limit, cursor, scope });
          return [
            sec,
            sec.items.map((section) => ({
              sectionId: section.seccionId,
              role: section.rolSeccion,
            })),
          ] as const;
        })();
    const sectionIds = sections.items.map((section) => section.seccionId);
    if (!cursor && !searchParams.has("limit")) {
      return Response.json({ sectionIds, memberships });
    }
    return Response.json({
      sectionIds,
      memberships,
      sections: sections.items,
      nextCursor: sections.nextCursor,
    });
  } catch {
    return Response.json({ sectionIds: [], memberships: [], sections: [], nextCursor: null });
  }
}
