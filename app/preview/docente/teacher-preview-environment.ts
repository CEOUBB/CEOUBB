// Implements: REQ-DOC-01
export function isTeacherPreviewEnabled(vercelEnvironment = process.env.VERCEL_ENV) {
  return vercelEnvironment !== "production";
}
