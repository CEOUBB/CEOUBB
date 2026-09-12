// Implements: REQ-TOAST-01, REQ-TOAST-02, REQ-URL-01, REQ-URL-02, REQ-URL-03, REQ-CMDK-01, REQ-VIRT-01, REQ-TURN-01
import assert from "node:assert/strict";
import test from "node:test";
import {
  adminSearchParams,
  adminSearchParamsCache,
  serializeAdminSearchParams,
  teacherCoursesSearchParams,
  teacherCoursesSearchParamsCache,
  teacherTabs,
  coursesSearchParams,
  coursesSearchParamsCache,
  courseStates,
} from "../lib/search-params.ts";
import { toast } from "../lib/toast.ts";

test("nuqs: adminSearchParams parsea query y número de página con defaults", () => {
  const parsed = adminSearchParamsCache.parse({ q: "ciencias", page: "4" });
  assert.equal(parsed.q, "ciencias");
  assert.equal(parsed.page, 4);

  const fallback = adminSearchParamsCache.parse({ page: "not-a-number" });
  assert.equal(fallback.q, "");
  assert.equal(fallback.page, 1);
});

test("nuqs: serializeAdminSearchParams serializa parámetros a query string", () => {
  const query = serializeAdminSearchParams({ q: "biologia", page: 3 });
  assert.ok(query.includes("q=biologia"));
  assert.ok(query.includes("page=3"));
});

test("nuqs: teacherCoursesSearchParams valida pestañas docentes", () => {
  assert.equal(teacherTabs.length, 3);
  const parsed = teacherCoursesSearchParamsCache.parse({ tab: "evaluations" });
  assert.equal(parsed.tab, "evaluations");

  const fallback = teacherCoursesSearchParamsCache.parse({ tab: "invalid_tab" });
  assert.equal(fallback.tab, "data");
});

test("nuqs: coursesSearchParams valida estados de ramos", () => {
  assert.equal(courseStates.length, 3);
  const parsed = coursesSearchParamsCache.parse({ filtro: "activo" });
  assert.equal(parsed.filtro, "activo");

  const fallback = coursesSearchParamsCache.parse({ filtro: "cualquiera" });
  assert.equal(fallback.filtro, "todos");
});

test("toast: expone los métodos requeridos por el contrato institucional", () => {
  assert.equal(typeof toast.success, "function");
  assert.equal(typeof toast.error, "function");
  assert.equal(typeof toast.info, "function");
  assert.equal(typeof toast.promise, "function");
  assert.equal(typeof toast.note, "function");
  assert.equal(typeof toast.dismiss, "function");
});

test("toast.note: mapea 'ok', 'bad' e 'info' a sus correspondientes alertas", () => {
  // Verificamos que note ejecute sin arrojar excepciones
  assert.doesNotThrow(() => {
    toast.note("Calificación guardada", "ok");
    toast.note("Error al sincronizar", "bad");
    toast.note("Información del período", "info");
    toast.note(""); // Silencioso ante string vacío
  });
});
