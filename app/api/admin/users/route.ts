import { eq, or, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/auth";
import { projectUserRoleToFirestore } from "../../../../lib/services/enrollment-projection";

// Implements: REQ-PERF-03, REQ-PERF-04, REQ-SEC-06, REQ-API-02
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner")
    return Response.json({ error: "Acceso restringido." }, { status: 403 });

  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 50;
  const offset = (page - 1) * limit;

  const sanitizedQ = q.replace(/[%_\\]/g, "\\$&").toLowerCase();
  const searchPattern = `%${sanitizedQ}%`;
  const whereClause = sanitizedQ
    ? or(
        sql`lower(${users.name}) LIKE ${searchPattern} ESCAPE '\\'`,
        sql`lower(${users.email}) LIKE ${searchPattern} ESCAPE '\\'`
      )
    : undefined;

  try {
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
  } catch {
    return Response.json({ error: "Error al consultar usuarios." }, { status: 500 });
  }
}

// Implements: REQ-SEC-01, REQ-API-01, REQ-API-02
export async function PATCH(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner")
    return Response.json({ error: "Acceso restringido." }, { status: 403 });

  try {
    let payload: { userId?: unknown; role?: unknown } | null = null;
    try {
      payload = (await request.json()) as { userId?: unknown; role?: unknown };
    } catch {
      return Response.json({ error: "Datos inválidos." }, { status: 400 });
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.userId !== "string" ||
      !payload.userId.trim() ||
      typeof payload.role !== "string" ||
      !["teacher", "student"].includes(payload.role)
    )
      return Response.json({ error: "Datos inválidos." }, { status: 400 });
    if (payload.userId === actor.id)
      return Response.json(
        { error: "La cuenta propietaria no puede degradarse." },
        { status: 400 }
      );
    /*
      La protección ya no mira el correo: mira el rango administrativo guardado en
      Turso. Ninguna cuenta personal está codificada en el servidor.
    */
    const target = await getDb()
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    if (!target[0]) return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (target[0]?.role === "owner")
      return Response.json(
        { error: "Las cuentas propietarias no pueden cambiar de rango." },
        { status: 400 }
      );
    await getDb()
      .update(users)
      .set({ role: payload.role as "teacher" | "student" })
      .where(eq(users.id, payload.userId));

    // Implements: REQ-SEC-10
    await projectUserRoleToFirestore(payload.userId, payload.role as "teacher" | "student");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error al actualizar usuario." }, { status: 500 });
  }
}
