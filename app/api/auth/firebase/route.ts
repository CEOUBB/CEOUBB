import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  ACCESS_REJECTION_MESSAGE,
  normalizeAccessEmail,
  roleForEmail,
} from "../../../../lib/access-policy";
import { createSession, publicUser } from "../../../../lib/auth";
import { firebaseConfigFromEnvironment } from "../../../../lib/firebase-config";
import { claimPendingEnrollments } from "../../../../lib/services/bulk-enrollment";
import { claimPendingAdeccaEnrollments } from "../../../../lib/services/adecca-import";
import { claimPendingMoodleEnrollments } from "../../../../lib/services/moodle-import";
import { z } from "zod";
import { MAX_PAGE_SIZE, listUserSections } from "../../../../lib/services/academic-catalog";

const FIREBASE_API_KEY = firebaseConfigFromEnvironment().apiKey;

const firebaseAuthSchema = z.object({
  idToken: z
    .string()
    .trim()
    .min(1, "No se recibió una credencial de Google válida.")
    .max(4096, "Credencial de Google no válida."),
});

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
    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return error("El cuerpo de la petición no es un JSON válido.", 400);
    }

    const parseResult = firebaseAuthSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      const issueMessage =
        parseResult.error.issues[0]?.message || "No se recibió una credencial de Google válida.";
      return error(issueMessage, 400);
    }
    const { idToken } = parseResult.data;

    const verification = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!verification.ok) return error("La sesión de Google no pudo verificarse.", 401);

    const result = (await verification.json()) as { users?: FirebaseAccount[] };
    const account = result.users?.[0];
    const email = normalizeAccessEmail(account?.email ?? "");
    if (!account?.localId || !account.emailVerified)
      return error("Tu correo de Google debe estar verificado.", 403);

    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let user = existing[0];

    const derivedRole = roleForEmail(email);
    // Si la cuenta ya posee rol administrativo 'owner' en la base de datos, se autoriza su acceso.
    // De lo contrario, se exige que el correo pertenezca a un dominio institucional válido.
    if (!user || user.role !== "owner") {
      if (!derivedRole) return error(ACCESS_REJECTION_MESSAGE, 403);
    }

    const role = user?.role === "owner" ? "owner" : (derivedRole ?? "student");
    const name = account.displayName?.trim().replace(/\s+/g, " ") || email.split("@")[0];

    if (user) {
      await db.update(users).set({ name }).where(eq(users.id, user.id));
      user = { ...user, name };
    } else {
      user = {
        id: `firebase:${account.localId}`,
        email,
        name,
        role,
        photoUrl: null,
        createdAt: new Date().toISOString(),
      };
      await db.insert(users).values(user);
    }

    const safeUser = publicUser(user);
    await claimPendingEnrollments({ id: user.id, email: user.email }).catch(() => undefined);
    try {
      await claimPendingMoodleEnrollments(safeUser);
    } catch (claimError) {
      console.error("[Moodle Pending Enrollment]:", claimError);
    }
    try {
      await claimPendingAdeccaEnrollments(safeUser);
    } catch (claimError) {
      console.error("[ADECCA Pending Enrollment]:", claimError);
    }
    const cookie = await createSession(user.id);
    const googlePhoto =
      account.photoUrl ||
      account.providerUserInfo?.find((provider) => provider.photoUrl)?.photoUrl ||
      "";
    const photoUrl = googlePhoto.startsWith("https://") ? googlePhoto : "";

    const [current, archived] = await Promise.all([
      listUserSections(user.id, { limit: MAX_PAGE_SIZE, scope: "current" }).catch(() => ({
        items: [],
        nextCursor: null,
      })),
      listUserSections(user.id, { limit: MAX_PAGE_SIZE, scope: "archived" }).catch(() => ({
        items: [],
        nextCursor: null,
      })),
    ]);
    const memberships = current.items.map((section) => ({
      sectionId: section.seccionId,
      role: section.rolSeccion,
    }));
    const sectionIds = current.items.map((section) => section.seccionId);
    const sections = [...current.items, ...archived.items];

    return Response.json(
      {
        user: safeUser,
        photoUrl,
        sectionIds,
        memberships,
        sections,
        archivedNextCursor: archived.nextCursor,
      },
      { headers: { "Set-Cookie": cookie } }
    );
  } catch (err) {
    // Implements: REQ-OBS-01
    console.error("[Auth Firebase Error]:", err);
    return error("No fue posible completar el acceso institucional.", 500);
  }
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
