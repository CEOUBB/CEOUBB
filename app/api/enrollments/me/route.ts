import { getSessionUser } from "../../../../lib/auth";
import {
  MAX_PAGE_SIZE,
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
  try {
    const memberships = await listUserSectionMemberships(actor.id, { limit: MAX_PAGE_SIZE });
    const sectionIds = memberships.map((membership) => membership.sectionId);
    return Response.json({ sectionIds, memberships });
  } catch {
    return Response.json({ sectionIds: [], memberships: [] });
  }
}
