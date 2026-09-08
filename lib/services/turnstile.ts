// lib/services/turnstile.ts
// Implements: SEC-04, SEC-07, REQ-SUP-04

/**
 * Valida un token de Cloudflare Turnstile contra el endpoint oficial de siteverify.
 * Sin secreto sólo permite desarrollo y tests locales; producción falla cerrada.
 */
export async function verifyTurnstileToken(token?: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";

  if (!token || typeof token !== "string" || token.trim() === "") {
    return false;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token.trim(),
        remoteip: ip ?? "",
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return false;
    const outcome = (await res.json()) as { success?: boolean };
    return Boolean(outcome.success);
  } catch {
    return false;
  }
}
