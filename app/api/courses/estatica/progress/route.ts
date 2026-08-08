import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { progress, users } from "../../../../../db/schema";
import { canPublish, getSessionUser } from "../../../../../lib/auth";

const COURSE_ID = "estatica-440299";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const db = getDb();
  if (!canPublish(user.role)) {
    const rows = await db.select().from(progress).where(and(eq(progress.userId, user.id), eq(progress.courseId, COURSE_ID))).limit(1);
    return Response.json({ progress: rows[0] ?? { userId: user.id, courseId: COURSE_ID, completed: 0, total: 4 } });
  }
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      completed: progress.completed,
      total: progress.total,
      updatedAt: progress.updatedAt,
    })
    .from(users)
    .leftJoin(progress, and(eq(progress.userId, users.id), eq(progress.courseId, COURSE_ID)))
    .where(eq(users.role, "student"));
  return Response.json({ students: rows.map((row) => ({ ...row, completed: row.completed ?? 0, total: row.total ?? 4 })) });
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const payload = (await request.json()) as { completed?: number; total?: number };
  const total = Math.max(1, Math.min(50, Math.round(payload.total ?? 4)));
  const completed = Math.max(0, Math.min(total, Math.round(payload.completed ?? 0)));
  const record = { userId: user.id, courseId: COURSE_ID, completed, total, updatedAt: new Date().toISOString() };
  await getDb().insert(progress).values(record).onConflictDoUpdate({
    target: [progress.userId, progress.courseId],
    set: { completed, total, updatedAt: record.updatedAt },
  });
  return Response.json({ progress: record });
}
