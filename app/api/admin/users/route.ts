import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/auth";
import { projectUserRoleToFirestore } from "../../../../lib/services/enrollment-projection";

/*
  Implements: REQ-SUP-01
  Los parámetros de consulta se declaran en un esquema en lugar de interpretarse
  con sentencias sueltas. Los límites son los mismos de siempre: la página cae a
  1 ante cualquier valor no entero o menor que 1, el tamaño se recorta al rango
  1..100 y cae a 50 ante un valor no entero, y la búsqueda se recorta a 100
  caracteres. Se conserva `parseInt` en vez de una coerción estricta porque
  acepta prefijos numéricos, que es como la ruta se ha comportado desde siempre.
*/
const consultaUsuariosSchema = z.object({
  page: z
    .string()
    .nullable()
    .transform((valor) => parseInt(valor ?? "1", 10))
    .transform((numero) => (Number.isInteger(numero) && numero >= 1 ? numero : 1)),
  limit: z
    .string()
    .nullable()
    .transform((valor) => parseInt(valor ?? "50", 10))
    .transform((numero) => (Number.isInteger(numero) ? Math.max(1, Math.min(100, numero)) : 50)),
  q: z
    .string()
    .nullable()
    .transform((valor) => (valor ?? "").trim().slice(0, 100)),
});

// Implements: REQ-PERF-03, REQ-PERF-04, REQ-SEC-06, REQ-API-02
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor || actor.role !== "owner")
    return Response.json({ error: "Acceso restringido." }, { status: 403 });

  const url = new URL(request.url);
  const { page, limit, q } = consultaUsuariosSchema.parse({
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
    q: url.searchParams.get("q"),
  });
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
    let payload: { userId?: string; role?: string } | null = null;
    try {
      payload = (await request.json()) as { userId?: string; role?: string };
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
    payload.userId = payload.userId.trim();
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
