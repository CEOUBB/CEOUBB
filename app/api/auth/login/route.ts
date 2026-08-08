import { createSession, findUserByIdentifier, publicUser, verifyPassword } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { identifier?: string; password?: string };
    const identifier = payload.identifier?.trim() ?? "";
    const password = payload.password ?? "";
    if (!identifier || !password) return Response.json({ error: "Ingresa tu RUT o correo y contraseña." }, { status: 400 });
    const user = await findUserByIdentifier(identifier);
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
      return Response.json({ error: "Los datos de acceso no coinciden." }, { status: 401 });
    }
    const cookie = await createSession(user.id, request);
    return Response.json({ user: publicUser(user) }, { headers: { "Set-Cookie": cookie } });
  } catch {
    return Response.json({ error: "No fue posible iniciar sesión." }, { status: 500 });
  }
}
