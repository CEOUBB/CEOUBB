// Implements: REQ-DOC-01
export function isTeacherPreviewEnabled(
  environment = process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT ||
    process.env.CEOUBB_ENVIRONMENT ||
    process.env.VERCEL_ENV,
  nodeEnv = process.env.NODE_ENV
) {
  if (nodeEnv === "production" && environment !== "preview" && environment !== "staging") {
    return false;
  }
  return environment !== "production";
}
