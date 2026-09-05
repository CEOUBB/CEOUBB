import { sha1Text } from "../moodle/ids.ts";

export async function sha256Bytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function sha256Text(value: string) {
  return sha256Bytes(new TextEncoder().encode(value));
}

export function stableAdeccaDocumentId(sourceKey: string, sourceId: string) {
  return `adecca-${sha1Text(`${sourceKey}\u0000${sourceId}`)}`;
}
