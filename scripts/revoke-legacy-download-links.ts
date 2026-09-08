import { invalidateCourseDownloadTokens } from "../lib/services/enrollment-projection.ts";

// Implements: REQ-SEC-02 — SEC-06: migración explícita de enlaces emitidos antes del despliegue.
const apply = process.argv.includes("--apply");
const count = await invalidateCourseDownloadTokens(undefined, !apply);
console.log(
  `${apply ? "Invalidados" : "Detectados (sólo lectura)"}: ${count} archivos académicos con tokens históricos.`
);
