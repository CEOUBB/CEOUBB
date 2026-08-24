import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { sessions, users } from "../../../../db/schema";
import { destroySession, getSessionUser } from "../../../../lib/auth";
import {
  MAX_PAGE_SIZE,
  listUserSectionMemberships,
} from "../../../../lib/services/academic-catalog";

const UNAUTHORIZED = 401;

// Implements: REQ-PERF-01, REQ-PERF-02
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ user: null });
  const memberships = await listUserSectionMemberships(user.id, { limit: MAX_PAGE_SIZE }).catch(
    () => []
  );
  const sectionIds = memberships.map((membership) => membership.sectionId);
  return Response.json({ user, sectionIds, memberships });
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
