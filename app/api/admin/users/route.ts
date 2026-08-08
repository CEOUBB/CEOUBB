import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/auth";

export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner") return Response.json({ error: "Acceso restringido." }, { status: 403 });
  const rows = await getDb().select({ id: users.id, rut: users.rut, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt }).from(users);
  return Response.json({ users: rows });
}

export async function PATCH(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner") return Response.json({ error: "Acceso restringido." }, { status: 403 });
  const payload = (await request.json()) as { userId?: string; role?: string };
  if (!payload.userId || !["teacher", "student"].includes(payload.role ?? "")) return Response.json({ error: "Datos inválidos." }, { status: 400 });
  if (payload.userId === actor.id) return Response.json({ error: "La cuenta propietaria no puede degradarse." }, { status: 400 });
  await getDb().update(users).set({ role: payload.role as "teacher" | "student" }).where(eq(users.id, payload.userId));
  return Response.json({ ok: true });
}
