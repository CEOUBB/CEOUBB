import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  assistantAssignments,
  gradeAuditLogs,
  moodleImports,
  secciones,
  sessions,
  solicitudesSoporte,
  users,
} from "../../../../db/schema";
import { interopResources, interopTools } from "../../../../db/interop-schema";
import { destroySession, getSessionUser } from "../../../../lib/auth";
import {
  MAX_PAGE_SIZE,
  listUserSections,
  listUserSectionMemberships,
} from "../../../../lib/services/academic-catalog";

const UNAUTHORIZED = 401;

// Implements: REQ-PERF-01, REQ-PERF-02
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ user: null });
  const includeSections = new URL(request.url).searchParams.get("includeSections") === "1";
  if (!includeSections) {
    const memberships = await listUserSectionMemberships(user.id, { limit: MAX_PAGE_SIZE }).catch(
      () => []
    );
    const sectionIds = memberships.map((membership) => membership.sectionId);
    return Response.json({ user, sectionIds, memberships });
  }
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
  return Response.json({
    user,
    sectionIds,
    memberships,
    sections: [...current.items, ...archived.items],
    archivedNextCursor: archived.nextCursor,
  });
}

// Implements: REQ-DATA-01, REQ-API-02, REQ-SEC-13
export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: UNAUTHORIZED });
  if (user.role === "owner") {
    return Response.json({ error: "La cuenta propietaria no puede eliminarse." }, { status: 400 });
  }

  const db = getDb();

  const activeSections = await db
    .select({ id: secciones.id })
    .from(secciones)
    .where(eq(secciones.docenteId, user.id))
    .limit(1);

  if (activeSections.length > 0) {
    return Response.json(
      {
        error:
          "No es posible eliminar la cuenta porque figura como docente a cargo de secciones académicas. Reasigne las secciones antes de proceder.",
      },
      { status: 409 }
    );
  }

  try {
    await db.batch([
      db
        .update(solicitudesSoporte)
        .set({ userId: null })
        .where(eq(solicitudesSoporte.userId, user.id)),
      db
        .update(assistantAssignments)
        .set({ createdBy: null })
        .where(eq(assistantAssignments.createdBy, user.id)),
      db.update(moodleImports).set({ actorId: null }).where(eq(moodleImports.actorId, user.id)),
      db.update(interopTools).set({ createdBy: null }).where(eq(interopTools.createdBy, user.id)),
      db
        .update(interopResources)
        .set({ createdBy: null })
        .where(eq(interopResources.createdBy, user.id)),
      db.update(gradeAuditLogs).set({ actorId: null }).where(eq(gradeAuditLogs.actorId, user.id)),
      db.delete(sessions).where(eq(sessions.userId, user.id)),
      db.delete(users).where(eq(users.id, user.id)),
    ]);

    return Response.json(
      { deleted: true },
      { headers: { "Set-Cookie": await destroySession(request) } }
    );
  } catch (error) {
    console.error("[DELETE /api/auth/me] Error deleting user:", error);
    return Response.json({ error: "No fue posible eliminar la cuenta." }, { status: 500 });
  }
}
