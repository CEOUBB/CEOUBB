export const INTEROP_REQUIREMENTS = Array.from(
  { length: 11 },
  (_, i) => `REQ-IO-${String(i + 1).padStart(2, "0")}`
);

export class InteropError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "INVALID_INTEROP_INPUT") {
    super(message);
    this.name = "InteropError";
    this.status = status;
    this.code = code;
  }
}

export function fail(message: string, status = 400, code?: string): never {
  throw new InteropError(message, status, code);
}

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
