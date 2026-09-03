// Implements: REQ-DOC-01
export function isTeacherPreviewEnabled(
  environment = process.env.CEOUBB_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT ||
    process.env.VERCEL_ENV
) {
  // Si explícitamente se define preview, siempre se habilita
  if (process.env.CEOUBB_ENVIRONMENT === "preview") {
    return true;
  }
  return environment !== "production";
}
