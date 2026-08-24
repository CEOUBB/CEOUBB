import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { sessions, users } from "../../../../db/schema";
import { destroySession, getSessionUser } from "../../../../lib/auth";
import {
  MAX_PAGE_SIZE,
  listUserSections,
  listUserSectionMemberships,
} from "../../../../lib/services/academic-catalog";

const UNAUTHORIZED = 401;

// Implements: REQ-PERF-01, REQ-PERF-02
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ user: null });
  const includeSections = new URL(request.url).searchParams.get("includeSections") === "1";
  if (!includeSections) {
    const memberships = await listUserSectionMemberships(user.id, { limit: MAX_PAGE_SIZE }).catch(
      () => []
    );
    const sectionIds = memberships.map((membership) => membership.sectionId);
    return Response.json({ user, sectionIds, memberships });
  }
  const [current, archived] = await Promise.all([
    listUserSections(user.id, { limit: MAX_PAGE_SIZE, scope: "current" }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
    listUserSections(user.id, { limit: MAX_PAGE_SIZE, scope: "archived" }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
  ]);
  const memberships = current.items.map((section) => ({
    sectionId: section.seccionId,
    role: section.rolSeccion,
  }));
  const sectionIds = current.items.map((section) => section.seccionId);
  return Response.json({
    user,
    sectionIds,
    memberships,
    sections: [...current.items, ...archived.items],
    archivedNextCursor: archived.nextCursor,
  });
}

// Implements: REQ-DATA-01, REQ-API-02, REQ-SEC-13
export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: UNAUTHORIZED });
  if (user.role === "owner") {
    return Response.json({ error: "La cuenta propietaria no puede eliminarse." }, { status: 400 });
  }
  try {
    const db = getDb();
    await db.batch([
      db.delete(sessions).where(eq(sessions.userId, user.id)),
      db.delete(users).where(eq(users.id, user.id)),
    ]);
    return Response.json(
      { deleted: true },
      { headers: { "Set-Cookie": await destroySession(request) } }
    );
  } catch {
    return Response.json({ error: "No fue posible eliminar la cuenta." }, { status: 500 });
  }
}
