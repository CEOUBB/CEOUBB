import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { files, users } from "../../../../../db/schema";
import { canPublish, getSessionUser } from "../../../../../lib/auth";

const COURSE_ID = "estatica-440299";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const rows = await getDb()
    .select({
      id: files.id,
      name: files.name,
      contentType: files.contentType,
      size: files.size,
      createdAt: files.createdAt,
      authorName: users.name,
    })
    .from(files)
    .innerJoin(users, eq(files.authorId, users.id))
    .where(eq(files.courseId, COURSE_ID))
    .orderBy(desc(files.createdAt));
  return Response.json({ files: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!canPublish(user.role)) return Response.json({ error: "Solo docentes y administradores pueden subir archivos." }, { status: 403 });
  const data = await request.formData();
  const upload = data.get("file");
  if (!(upload instanceof File)) return Response.json({ error: "Selecciona un archivo." }, { status: 400 });
  if (upload.size <= 0 || upload.size > MAX_FILE_SIZE) return Response.json({ error: "El archivo debe pesar menos de 25 MB." }, { status: 400 });
  const allowed = /^(application\/(pdf|zip|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.(presentationml\.presentation|wordprocessingml\.document|spreadsheetml\.sheet))|image\/(png|jpeg|webp)|text\/plain)$/;
  const contentType = upload.type || "application/octet-stream";
  if (!allowed.test(contentType)) return Response.json({ error: "Formato no permitido. Usa PDF, PPT/PPTX, DOCX, XLSX, ZIP o imagen." }, { status: 400 });
  const id = crypto.randomUUID();
  const storageKey = `${COURSE_ID}/${id}/${safeName(upload.name)}`;
  const bucket = (env as unknown as { FILES: R2Bucket }).FILES;
  await bucket.put(storageKey, upload.stream(), { httpMetadata: { contentType } });
  const record = {
    id,
    courseId: COURSE_ID,
    authorId: user.id,
    name: upload.name.slice(0, 180),
    contentType,
    size: upload.size,
    storageKey,
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(files).values(record);
  return Response.json({ file: { ...record, authorName: user.name } }, { status: 201 });
}

function safeName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "archivo";
}
