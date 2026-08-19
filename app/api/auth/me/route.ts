import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { sessions, users } from "../../../../db/schema";
import { destroySession, getSessionUser } from "../../../../lib/auth";
import { MAX_PAGE_SIZE, listUserSectionIds } from "../../../../lib/services/academic-catalog";

const UNAUTHORIZED = 401;

// Implements: REQ-PERF-01, REQ-PERF-02
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ user: null });
  const sectionIds = await listUserSectionIds(user.id, { limit: MAX_PAGE_SIZE });
  return Response.json({ user, sectionIds });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: UNAUTHORIZED });
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  return Response.json(
    { deleted: true },
    { headers: { "Set-Cookie": await destroySession(request) } }
  );
}
