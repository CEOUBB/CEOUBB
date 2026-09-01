// lib/services/turnstile.ts
// Implements: SEC-04, SEC-07, REQ-SUP-04

/**
 * Valida un token de Cloudflare Turnstile contra el endpoint oficial de siteverify.
 * Si TURNSTILE_SECRET_KEY no está configurada (por ejemplo en tests unitarios o desarrollo local sin llaves),
 * retorna true para permitir degradación limpia y pruebas sin conexión externa.
 */
export async function verifyTurnstileToken(token?: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

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
