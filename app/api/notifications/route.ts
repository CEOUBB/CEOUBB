import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { notificationReads, notifications, users } from "../../../db/schema";
import { getSessionUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const db = getDb();
  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      title: notifications.title,
      body: notifications.body,
      targetUrl: notifications.targetUrl,
      createdAt: notifications.createdAt,
      actorName: users.name,
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .where(and(eq(notifications.courseId, "estatica-440299"), ne(notifications.actorId, user.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
  const readRows = await db.select().from(notificationReads).where(eq(notificationReads.userId, user.id)).limit(1);
  const readAt = readRows[0]?.readAt ?? "1970-01-01T00:00:00.000Z";
  return Response.json({ notifications: rows, unread: rows.filter((item) => item.createdAt > readAt).length, readAt });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const readAt = new Date().toISOString();
  await getDb().insert(notificationReads).values({ userId: user.id, readAt }).onConflictDoUpdate({ target: notificationReads.userId, set: { readAt } });
  return Response.json({ readAt });
}
