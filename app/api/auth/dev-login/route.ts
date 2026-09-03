import { eq } from "drizzle-orm";
import { getDb } from "../../../../db/index.ts";
import { users } from "../../../../db/schema.ts";
import { createSession, publicUser } from "../../../../lib/auth.ts";
import {
  DEV_TEST_USERS,
  DevLoginSchema,
  isDevOrPreviewAuthAllowed,
} from "../../../../lib/auth-dev.ts";
import { claimPendingEnrollments } from "../../../../lib/services/bulk-enrollment.ts";
import { claimPendingMoodleEnrollments } from "../../../../lib/services/moodle-import.ts";
import { MAX_PAGE_SIZE, listUserSections } from "../../../../lib/services/academic-catalog.ts";

// Implements: REQ-AUTH-04, REQ-AUTH-05, REQ-AUTH-06, REQ-SEC-14
export async function POST(request: Request) {
  const host = request.headers.get("host") ?? "";
  const devAuthSecretHeader = request.headers.get("x-dev-auth-secret");

  // Aislamiento estricto de producción: en producción institucional devuelve 404
  if (!isDevOrPreviewAuthAllowed(undefined, undefined, host, devAuthSecretHeader)) {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = DevLoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Rol no admitido para acceso rápido." }, { status: 400 });
  }

  const targetTestUser = DEV_TEST_USERS[parsed.data.role];
  try {
    const db = getDb();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, targetTestUser.email))
      .limit(1);

    let user = existing[0];
    if (user) {
      await db
        .update(users)
        .set({ name: targetTestUser.name, role: targetTestUser.role })
        .where(eq(users.id, user.id));
      user = { ...user, name: targetTestUser.name, role: targetTestUser.role };
    } else {
      user = {
        id: targetTestUser.id,
        email: targetTestUser.email,
        name: targetTestUser.name,
        role: targetTestUser.role,
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
      console.error("[Dev Login Moodle Enrollment]:", claimError);
    }

    const cookie = await createSession(user.id);

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
        photoUrl: "",
        sectionIds,
        memberships,
        sections,
        archivedNextCursor: archived.nextCursor,
      },
      { headers: { "Set-Cookie": cookie } }
    );
  } catch (err) {
    console.error("[Dev Login Error]:", err);
    return Response.json({ error: "No fue posible iniciar la sesión de prueba." }, { status: 500 });
  }
}
