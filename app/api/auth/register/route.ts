import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createSession,
  formatRut,
  hashPassword,
  isValidRut,
  normalizeEmail,
  normalizeRut,
  publicUser,
  registrationRoleForEmail,
} from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { name?: string; rut?: string; email?: string; password?: string };
    const name = payload.name?.trim().replace(/\s+/g, " ") ?? "";
    const rut = normalizeRut(payload.rut ?? "");
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password ?? "";
    const role = registrationRoleForEmail(email);

    if (name.length < 3 || name.length > 80) return error("Escribe tu nombre completo.");
    if (!isValidRut(rut)) return error("El RUT no es válido.");
    if (!role) return error("Solo puedes crear una cuenta con tu correo institucional UBB: @alumnos.ubiobio.cl o @ubiobio.cl.");
    if (password.length < 10) return error("La contraseña debe tener al menos 10 caracteres.");

    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return error("Ya existe una cuenta con ese correo.", 409);

    const secured = await hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      rut,
      email,
      name,
      role,
      passwordSalt: secured.salt,
      passwordHash: secured.hash,
      createdAt: new Date().toISOString(),
    };
    await db.insert(users).values(user);
    const cookie = await createSession(user.id, request);
    return Response.json(
      { user: { ...publicUser(user), rut: formatRut(rut) } },
      { status: 201, headers: { "Set-Cookie": cookie } },
    );
  } catch (cause) {
    return Response.json({ error: messageFor(cause) }, { status: 500 });
  }
}

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function messageFor(cause: unknown) {
  const message = cause instanceof Error ? messageForError(cause) : "No fue posible crear la cuenta.";
  return message.includes("no such table") ? "La base de datos todavía se está preparando. Intenta nuevamente en unos minutos." : message;
}

function messageForError(cause: Error) {
  return cause.message || "No fue posible crear la cuenta.";
}
