import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { isDeveloperEmail } from "../../../../lib/access-policy";
import { getSessionUser } from "../../../../lib/auth";

export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner") return Response.json({ error: "Acceso restringido." }, { status: 403 });
  const rows = await getDb().select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt }).from(users);
  return Response.json({ users: rows });
}

export async function PATCH(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner") return Response.json({ error: "Acceso restringido." }, { status: 403 });
  const payload = (await request.json()) as { userId?: string; role?: string };
  if (!payload.userId || !["teacher", "student"].includes(payload.role ?? "")) return Response.json({ error: "Datos inválidos." }, { status: 400 });
  if (payload.userId === actor.id) return Response.json({ error: "La cuenta propietaria no puede degradarse." }, { status: 400 });
  const target = await getDb().select({ email: users.email }).from(users).where(eq(users.id, payload.userId)).limit(1);
  if (target[0] && isDeveloperEmail(target[0].email)) return Response.json({ error: "Las cuentas de desarrollador no pueden cambiar de rango." }, { status: 400 });
  await getDb().update(users).set({ role: payload.role as "teacher" | "student" }).where(eq(users.id, payload.userId));
  return Response.json({ ok: true });
}
