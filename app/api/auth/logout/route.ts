import { destroySession } from "../../../../lib/auth";

export async function POST(request: Request) {
  const cookie = await destroySession(request);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}
