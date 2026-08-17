import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import { sessions, users } from "../db/schema.ts";
import type { AccountRole } from "./access-policy.ts";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
};

const SESSION_COOKIE = "centro_estudio_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";

// Implements: REQ-PERF-02
export async function pruneExpiredSessions(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const result = await db.delete(sessions).where(lte(sessions.expiresAt, now));
  return Number(result.rowsAffected ?? 0);
}

export async function createSession(userId: string) {
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_SECONDS * 1000);
  const db = getDb();
  await db.insert(sessions).values({
    tokenHash,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
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

export async function getSessionUser(request: Request): Promise<PublicUser | null> {
  const rawToken = readCookie(request, SESSION_COOKIE);
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
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  return (rows[0] as PublicUser | undefined) ?? null;
}

export function publicUser(user: typeof users.$inferSelect): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
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
