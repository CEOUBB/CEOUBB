import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { files } from "../../../../db/schema";
import { canPublish, getSessionUser } from "../../../../lib/auth";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await context.params;
  const rows = await getDb().select().from(files).where(eq(files.id, id)).limit(1);
  const record = rows[0];
  if (!record) return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
  const bucket = (env as unknown as { FILES: R2Bucket }).FILES;
  const object = await bucket.get(record.storageKey);
  if (!object) return Response.json({ error: "Archivo no disponible." }, { status: 404 });
  const encoded = encodeURIComponent(record.name).replace(/'/g, "%27");
  return new Response(object.body, {
    headers: {
      "Content-Type": record.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!canPublish(user.role)) return Response.json({ error: "Solo docentes y desarrolladores pueden modificar archivos." }, { status: 403 });
  const { id } = await context.params;
  const db = getDb();
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  const record = rows[0];
  if (!record) return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
  if (user.role !== "owner" && record.authorId !== user.id) return Response.json({ error: "Solo puedes modificar tus propios archivos." }, { status: 403 });
  const payload = (await request.json()) as { name?: string };
  const name = payload.name?.trim().slice(0, 180) ?? "";
  if (name.length < 3) return Response.json({ error: "Escribe un nombre válido." }, { status: 400 });
  await db.update(files).set({ name }).where(eq(files.id, id));
  return Response.json({ file: { ...record, name } });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!canPublish(user.role)) return Response.json({ error: "Solo docentes y desarrolladores pueden eliminar archivos." }, { status: 403 });
  const { id } = await context.params;
  const db = getDb();
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  const record = rows[0];
  if (!record) return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
  if (user.role !== "owner" && record.authorId !== user.id) return Response.json({ error: "Solo puedes eliminar tus propios archivos." }, { status: 403 });
  const bucket = (env as unknown as { FILES: R2Bucket }).FILES;
  await bucket.delete(record.storageKey);
  await db.delete(files).where(eq(files.id, id));
  return Response.json({ deleted: true });
}
