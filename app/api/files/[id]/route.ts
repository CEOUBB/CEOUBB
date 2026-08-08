import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { files } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/auth";

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
