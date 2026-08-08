import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { posts, users } from "../../../../../db/schema";
import { canPublish, getSessionUser } from "../../../../../lib/auth";

const COURSE_ID = "estatica-440299";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  const db = getDb();
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      kind: posts.kind,
      linkUrl: posts.linkUrl,
      createdAt: posts.createdAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.courseId, COURSE_ID))
    .orderBy(desc(posts.createdAt))
    .limit(100);
  return Response.json({ posts: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!canPublish(user.role)) return Response.json({ error: "Solo docentes y administradores pueden publicar." }, { status: 403 });
  const payload = (await request.json()) as { title?: string; body?: string; kind?: string; linkUrl?: string };
  const title = payload.title?.trim() ?? "";
  const body = payload.body?.trim() ?? "";
  const allowedKinds = new Set(["notice", "guide", "assessment", "resource"]);
  const kind = allowedKinds.has(payload.kind ?? "") ? payload.kind as "notice" | "guide" | "assessment" | "resource" : "notice";
  const linkUrl = payload.linkUrl?.trim() || null;
  if (title.length < 3 || body.length < 3) return Response.json({ error: "Completa el título y el contenido." }, { status: 400 });
  if (linkUrl && !/^https:\/\//i.test(linkUrl)) return Response.json({ error: "El enlace debe comenzar con https://" }, { status: 400 });
  const post = {
    id: crypto.randomUUID(),
    courseId: COURSE_ID,
    authorId: user.id,
    title,
    body,
    kind,
    linkUrl,
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(posts).values(post);
  return Response.json({ post: { ...post, authorName: user.name, authorRole: user.role } }, { status: 201 });
}
