import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;

  const signature = parts[1];
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (!/^[0-9a-f]+$/i.test(signature) || signature.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
