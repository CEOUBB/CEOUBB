import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import { sessions, users } from "../db/schema.ts";
import type { AccountRole } from "./access-policy.ts";
import type { SessionState } from "./portal-utils.ts";
import { MAX_PAGE_SIZE, listUserSections } from "./services/academic-catalog.ts";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  carrera?: string | null;
  photoUrl?: string | null;
};

export const SESSION_COOKIE = "centro_estudio_session";
export const MAX_ACTIVE_SESSIONS_PER_USER = 10;
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";

// Implements: REQ-PERF-02
export async function pruneExpiredSessions(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const result = await db.delete(sessions).where(lte(sessions.expiresAt, now));
  return Number(result.rowsAffected ?? 0);
}

// Implements: REQ-AUTH-01, REQ-PERF-01, REQ-PERF-02, REQ-SEC-14
export async function createSession(userId: string) {
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_SECONDS * 1000);
  const db = getDb();

  // 1. Limitar concurrencia de sesiones activas por usuario
  const activeUserSessions = await db
    .select({ tokenHash: sessions.tokenHash, createdAt: sessions.createdAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now.toISOString())))
    .orderBy(desc(sessions.createdAt))
    .limit(MAX_ACTIVE_SESSIONS_PER_USER + 5);

  if (activeUserSessions.length >= MAX_ACTIVE_SESSIONS_PER_USER) {
    const sessionsToEvict = activeUserSessions
      .slice(MAX_ACTIVE_SESSIONS_PER_USER - 1)
      .map((s) => s.tokenHash);

    if (sessionsToEvict.length > 0) {
      await db.delete(sessions).where(inArray(sessions.tokenHash, sessionsToEvict));
    }
  }

  // 2. Insertar nueva sesión
  await db.insert(sessions).values({
    tokenHash,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });

  // 3. Poda probabilística (1 de cada 50 inicios de sesión purga sesiones caducadas en background)
  if (Math.random() < 0.02) {
    pruneExpiredSessions().catch((err) =>
      console.warn("[createSession] Background pruning error:", err)
    );
  }

  return `${SESSION_COOKIE}=${rawToken}; HttpOnly${SESSION_SECURE}; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`;
}

export async function destroySession(request: Request) {
  const rawToken = readCookie(request, SESSION_COOKIE);
  if (rawToken) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, await sha256(rawToken)));
  }
  return `${SESSION_COOKIE}=; HttpOnly${SESSION_SECURE}; SameSite=Lax; Path=/; Max-Age=0`;
}

// Implements: REQ-AUTH-01, REQ-PERF-01
export async function getSessionUserFromToken(rawToken: string): Promise<PublicUser | null> {
  if (!rawToken) return null;
  const db = getDb();
  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      photoUrl: users.photoUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  const user = rows[0];
  return user ? publicUser(user) : null;
}

/*
  Identificador público de una sesión. Es un segundo SHA-256 sobre el hash ya
  almacenado: la interfaz puede nombrar una sesión para revocarla sin que salga
  del servidor ningún valor derivado directamente del token de acceso.
*/
// Implements: REQ-AUTH-08
export async function sessionPublicId(tokenHash: string): Promise<string> {
  return sha256(tokenHash);
}

// Implements: REQ-AUTH-08
export async function currentSessionTokenHash(request: Request): Promise<string | null> {
  const rawToken = readCookie(request, SESSION_COOKIE);
  return rawToken ? sha256(rawToken) : null;
}

// Implements: REQ-TYPE-01
export async function getSessionUser(request: Request): Promise<PublicUser | null> {
  const rawToken = readCookie(request, SESSION_COOKIE);
  if (!rawToken) return null;
  return getSessionUserFromToken(rawToken);
}

// Implements: REQ-AUTH-01, REQ-PERF-01
export async function getServerSessionState(rawToken: string | null): Promise<SessionState> {
  if (!rawToken) {
    return {
      user: null,
      sectionIds: [],
      memberships: [],
      sections: null,
      archivedNextCursor: null,
    };
  }
  const user = await getSessionUserFromToken(rawToken);
  if (!user) {
    return {
      user: null,
      sectionIds: [],
      memberships: [],
      sections: null,
      archivedNextCursor: null,
    };
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

  return {
    user,
    sectionIds,
    memberships,
    sections: [...current.items, ...archived.items],
    archivedNextCursor: archived.nextCursor,
  };
}

export function publicUser(user: {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  carrera?: string | null;
  photoUrl?: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photoUrl: user.photoUrl ?? null,
  };
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function randomToken() {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}
