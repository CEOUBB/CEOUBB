export type AccountRole = "owner" | "teacher" | "student";

export const DEVELOPER_EMAILS = new Set([
  "elpapijuaco325@gmail.com",
  "felipearce.2004@gmail.com",
]);

export const STUDENT_DOMAIN = "@alumnos.ubiobio.cl";
export const TEACHER_DOMAIN = "@ubiobio.cl";

/** Único texto de rechazo: la app nativa y el portal web dicen lo mismo. */
// Implements: REQ-CAP-12b
export const ACCESS_REJECTION_MESSAGE = "Solo se permite el acceso con cuentas @alumnos.ubiobio.cl o @ubiobio.cl.";

export const ACCESS_CASES: { email: string; role: AccountRole | null }[] = [
  { email: "elpapijuaco325@gmail.com", role: "owner" },
  { email: "felipearce.2004@gmail.com", role: "owner" },
  { email: "  FelipeArce.2004@Gmail.com  ", role: "owner" },
  { email: "juan.perez1901@alumnos.ubiobio.cl", role: "student" },
  { email: "JUAN.PEREZ1901@ALUMNOS.UBIOBIO.CL", role: "student" },
  { email: "docente@ubiobio.cl", role: "teacher" },
  { email: "otro@gmail.com", role: null },
  { email: "alumno@alumnos.udec.cl", role: null },
  { email: "impostor@ubiobio.cl.attacker.com", role: null },
  { email: "ubiobio.cl", role: null },
  { email: "", role: null },
];

export function normalizeAccessEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isDeveloperEmail(value: string) {
  return DEVELOPER_EMAILS.has(normalizeAccessEmail(value));
}

export function roleForEmail(value: string): AccountRole | null {
  const email = normalizeAccessEmail(value);
  if (isDeveloperEmail(email)) return "owner";
  if (email.endsWith(STUDENT_DOMAIN)) return "student";
  if (email.endsWith(TEACHER_DOMAIN)) return "teacher";
  return null;
}
