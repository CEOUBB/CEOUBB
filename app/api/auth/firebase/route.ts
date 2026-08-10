import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { normalizeAccessEmail, roleForEmail } from "../../../../lib/access-policy";
import { createSession, publicUser } from "../../../../lib/auth";

const FIREBASE_API_KEY = "AIzaSyDpFz07hwK_6gV7CPxmyq_P3DfkjKaAFKU";

type FirebaseAccount = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: { photoUrl?: string }[];
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { idToken?: string };
    const idToken = payload.idToken?.trim() ?? "";
    if (!idToken) return error("No se recibió una credencial de Google válida.", 400);

    const verification = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!verification.ok) return error("La sesión de Google no pudo verificarse.", 401);

    const result = (await verification.json()) as { users?: FirebaseAccount[] };
    const account = result.users?.[0];
    const email = normalizeAccessEmail(account?.email ?? "");
    const role = roleForEmail(email);
    if (!account?.localId || !account.emailVerified) return error("Tu correo de Google debe estar verificado.", 403);
    if (!role) return error("Solo se permite el acceso con cuentas @alumnos.ubiobio.cl o @ubiobio.cl.", 403);

    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const name = account.displayName?.trim().replace(/\s+/g, " ") || email.split("@")[0];
    let user = existing[0];

    if (user) {
      await db.update(users).set({ name }).where(eq(users.id, user.id));
      user = { ...user, name };
    } else {
      user = {
        id: `firebase:${account.localId}`,
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
      };
      await db.insert(users).values(user);
    }

    const cookie = await createSession(user.id);
    const googlePhoto = account.photoUrl || account.providerUserInfo?.find((provider) => provider.photoUrl)?.photoUrl || "";
    const photoUrl = googlePhoto.startsWith("https://") ? googlePhoto : "";
    return Response.json({ user: publicUser(user), photoUrl }, { headers: { "Set-Cookie": cookie } });
  } catch {
    return error("No fue posible completar el acceso institucional.", 500);
  }
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
