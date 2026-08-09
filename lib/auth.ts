import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";
import { isDeveloperEmail, normalizeAccessEmail } from "./access-policy";

export type AccountRole = "owner" | "teacher" | "student";

export type PublicUser = {
  id: string;
  rut: string;
  email: string;
  name: string;
  role: AccountRole;
};

const SESSION_COOKIE = "centro_estudio_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function normalizeRut(value: string) {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function formatRut(value: string) {
  const clean = normalizeRut(value);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const grouped = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped}-${verifier}`;
}

export function isValidRut(value: string) {
  const clean = normalizeRut(value);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? "0" : result === 10 ? "K" : String(result);
  return verifier === expected;
}

export function normalizeEmail(value: string) {
  return normalizeAccessEmail(value);
}

export function roleForEmail(email: string): AccountRole | null {
  const normalized = normalizeEmail(email);
  if (isDeveloperEmail(normalized)) return "owner";
  if (normalized.endsWith("@alumnos.ubiobio.cl")) return "student";
  if (normalized.endsWith("@ubiobio.cl")) return "teacher";
  return null;
}

export async function hashPassword(password: string, salt?: string) {
  const saltBytes = salt ? fromBase64(salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 210000 },
    key,
    256,
  );
  return { salt: toBase64(saltBytes), hash: toBase64(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const result = await hashPassword(password, salt);
  const left = fromBase64(result.hash);
  const right = fromBase64(expected);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
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
      rut: users.rut,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  const user = rows[0] as PublicUser | undefined;
  if (!user) return null;
  return { ...user, rut: publicRut(user.rut) };
}

export async function findUserByIdentifier(identifier: string) {
  const db = getDb();
  const email = normalizeEmail(identifier);
  if (email.includes("@")) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }
  const rut = normalizeRut(identifier);
  const rows = await db.select().from(users).where(eq(users.rut, rut)).limit(2);
  return rows.length === 1 ? rows[0] : null;
}

export function publicUser(user: typeof users.$inferSelect): PublicUser {
  return { id: user.id, rut: publicRut(user.rut), email: user.email, name: user.name, role: user.role };
}

export function canPublish(role: AccountRole) {
  return role === "owner" || role === "teacher";
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function publicRut(value: string) {
  return value.startsWith("FIREBASE:") ? "" : formatRut(value);
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

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
