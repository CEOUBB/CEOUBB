export const DEVELOPER_EMAILS = new Set([
  "elpapijuaco325@gmail.com",
  "felipearce.2004@gmail.com",
]);

export function normalizeAccessEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isDeveloperEmail(value: string) {
  return DEVELOPER_EMAILS.has(normalizeAccessEmail(value));
}
