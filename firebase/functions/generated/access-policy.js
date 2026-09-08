"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESS_CASES =
  exports.ACCESS_REJECTION_MESSAGE =
  exports.TEACHER_DOMAIN =
  exports.STUDENT_DOMAIN =
    void 0;
exports.normalizeAccessEmail = normalizeAccessEmail;
exports.roleForEmail = roleForEmail;
exports.STUDENT_DOMAIN = "@alumnos.ubiobio.cl";
exports.TEACHER_DOMAIN = "@ubiobio.cl";
/** Único texto de rechazo: la app nativa y el portal web dicen lo mismo. */
// Implements: REQ-CAP-12b
exports.ACCESS_REJECTION_MESSAGE =
  "Solo se permite el acceso con cuentas @alumnos.ubiobio.cl o @ubiobio.cl.";
/*
  La derivación de rol es estrictamente institucional: no existe ninguna cuenta
  personal con privilegios en el código ni en las reglas. El rol `owner` deja de
  ser un dato del correo y pasa a ser un estado administrativo verificado que
  vive en Turso (`users.role`) y se proyecta a Firestore (`users/{uid}.role`).
*/
// Implements: REQ-SEC-01
exports.ACCESS_CASES = [
  { email: "juan.perez1901@alumnos.ubiobio.cl", role: "student" },
  { email: "JUAN.PEREZ1901@ALUMNOS.UBIOBIO.CL", role: "student" },
  { email: "  Docente.Mecanica@Ubiobio.cl  ", role: "teacher" },
  { email: "docente@ubiobio.cl", role: "teacher" },
  { email: "otro@gmail.com", role: null },
  { email: "alumno@alumnos.udec.cl", role: null },
  { email: "impostor@ubiobio.cl.attacker.com", role: null },
  { email: "ubiobio.cl", role: null },
  { email: "", role: null },
];
function normalizeAccessEmail(value) {
  return value.trim().toLowerCase();
}
// Implements: REQ-SEC-01
function roleForEmail(value) {
  const email = normalizeAccessEmail(value);
  if (email.endsWith(exports.STUDENT_DOMAIN)) return "student";
  if (email.endsWith(exports.TEACHER_DOMAIN)) return "teacher";
  return null;
}
