import crypto from "node:crypto";

/**
 * Obtener claves públicas de Discord configuradas en variables de entorno.
 */
export function getDiscordPublicKeys(): string[] {
  return [
    process.env.DISCORD_PUBLIC_KEY,
    process.env.DISCORD_GEMINI_PUBLIC_KEY,
    process.env.DISCORD_ANTIGRAVITY_PUBLIC_KEY,
  ].filter(Boolean) as string[];
}

/**
 * Valida la firma criptográfica Ed25519 requerida por Discord según la especificación SPKI.
 */
export function verifyDiscordSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(publicKey, "hex"),
    ]);
    const key = crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Valida la firma de una petición entrante de Discord contra las claves públicas configuradas.
 * Si no hay claves públicas configuradas, retorna false (fail-closed).
 */
// Implements: REQ-SEC-04
export function verifyDiscordRequestSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKeys: string[] = getDiscordPublicKeys()
): boolean {
  if (publicKeys.length === 0) return false;
  return publicKeys.some((pk) => verifyDiscordSignature(rawBody, signature, timestamp, pk));
}
