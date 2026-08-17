import { eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { isDeveloperEmail } from "../../../../lib/access-policy";
import { getSessionUser } from "../../../../lib/auth";

// Implements: REQ-PERF-03, REQ-PERF-04
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner")
    return Response.json({ error: "Acceso restringido." }, { status: 403 });

  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const q = (url.searchParams.get("q") ?? "").trim();

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 50;
  const offset = (page - 1) * limit;

  const whereClause = q
    ? or(
        like(sql`lower(${users.name})`, `%${q.toLowerCase()}%`),
        like(sql`lower(${users.email})`, `%${q.toLowerCase()}%`)
      )
    : undefined;

  const db = getDb();

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return Response.json({
    users: rows,
    total,
    page,
    totalPages,
  });
}

export async function PATCH(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner")
    return Response.json({ error: "Acceso restringido." }, { status: 403 });
  const payload = (await request.json()) as { userId?: string; role?: string };
  if (!payload.userId || !["teacher", "student"].includes(payload.role ?? ""))
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  if (payload.userId === actor.id)
    return Response.json({ error: "La cuenta propietaria no puede degradarse." }, { status: 400 });
  const target = await getDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);
  if (target[0] && isDeveloperEmail(target[0].email))
    return Response.json(
      { error: "Las cuentas de desarrollador no pueden cambiar de rango." },
      { status: 400 }
    );
  await getDb()
    .update(users)
    .set({ role: payload.role as "teacher" | "student" })
    .where(eq(users.id, payload.userId));
  return Response.json({ ok: true });
}
