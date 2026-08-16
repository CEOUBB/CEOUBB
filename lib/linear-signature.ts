import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_TIMESTAMP_SKEW_MS = 60_000;

export function verifyLinearSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!/^[0-9a-f]+$/i.test(signature) || signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

export function isFreshTimestamp(webhookTimestamp: unknown, now: number): boolean {
  const timestamp = Number(webhookTimestamp);
  return Number.isFinite(timestamp) && Math.abs(now - timestamp) <= MAX_TIMESTAMP_SKEW_MS;
}
