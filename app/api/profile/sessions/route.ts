import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { currentSessionTokenHash, getSessionUser, sessionPublicId } from "../../../../lib/auth";

const MAX_ACTIVE_SESSIONS = 20;

const revocacionSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/, "Identificador de sesión inválido."),
});

/*
  La consulta filtra por la columna indexada `user_id`, descarta las vencidas y
  lleva `.limit()` explícito. Ninguna respuesta expone el hash del token: la
  interfaz sólo recibe el identificador público derivado.

  El orden por fecha de creación no es cosmético: sin él, dos consultas acotadas
  pueden devolver subconjuntos distintos, y una cuenta con más sesiones que el
  tope vería fallar la revocación de una sesión que sí le pertenece.
*/
// Implements: REQ-AUTH-08 REQ-CFG-07
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db
      .select({
        tokenHash: sessions.tokenHash,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, actor.id), gt(sessions.expiresAt, now)))
      .orderBy(desc(sessions.createdAt), desc(sessions.tokenHash))
      .limit(MAX_ACTIVE_SESSIONS);

    const currentHash = await currentSessionTokenHash(request);
    const activas = await Promise.all(
      rows.map(async (row) => ({
        id: await sessionPublicId(row.tokenHash),
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        current: row.tokenHash === currentHash,
      }))
    );
    return Response.json({ sessions: activas });
  } catch (cause) {
    console.error("[api/profile/sessions] GET", cause);
    return Response.json({ error: "No se pudieron leer las sesiones." }, { status: 500 });
  }
}

/*
  La pertenencia se comprueba antes de borrar y sobre las filas del propio
  usuario: un identificador que no esté entre ellas responde error de
  autorización sin revelar si existe en otra cuenta.
*/
// Implements: REQ-AUTH-08 REQ-CFG-07
export async function DELETE(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON." }, { status: 400 });
  }

  const parsed = revocacionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Identificador de sesión inválido." }, { status: 422 });
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db
      .select({ tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(and(eq(sessions.userId, actor.id), gt(sessions.expiresAt, now)))
      .orderBy(desc(sessions.createdAt), desc(sessions.tokenHash))
      .limit(MAX_ACTIVE_SESSIONS);

    let target = "";
    for (const row of rows) {
      if ((await sessionPublicId(row.tokenHash)) === parsed.data.id) {
        target = row.tokenHash;
        break;
      }
    }
    if (!target) return Response.json({ error: "Acceso restringido." }, { status: 403 });

    await db.delete(sessions).where(eq(sessions.tokenHash, target));
    const currentHash = await currentSessionTokenHash(request);
    return Response.json({ revoked: parsed.data.id, current: target === currentHash });
  } catch (cause) {
    console.error("[api/profile/sessions] DELETE", cause);
    return Response.json({ error: "No se pudo cerrar la sesión." }, { status: 500 });
  }
}
