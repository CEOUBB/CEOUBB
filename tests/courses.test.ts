import assert from "node:assert/strict";
import test from "node:test";
import { COURSES, PERIOD, courseById, materialFolders } from "../lib/courses.ts";
import type { Course } from "../lib/courses.ts";

test("courseById encuentra un curso existente por su ID", () => {
  const estatica = courseById("estatica");
  assert.notEqual(estatica, null);
  assert.equal(estatica?.id, "estatica");
  assert.equal(estatica?.name, "Estática");
  assert.equal(estatica?.code, "440299");
  assert.equal(estatica?.section, "1");
  assert.equal(estatica?.period, `Semestre ${PERIOD}`);
  assert.ok(Array.isArray(estatica?.units));
  assert.ok(Array.isArray(estatica?.evaluations));
});

test("courseById retorna null para IDs no existentes o vacíos", () => {
  assert.equal(courseById("inexistente"), null);
  assert.equal(courseById(""), null);
  assert.equal(courseById("ESTATICA"), null); // es sensible a mayúsculas/minúsculas
  assert.equal(courseById("  estatica  "), null);
});

test("courseById permite consultar todos los cursos del catalogo oficial", () => {
  assert.ok(COURSES.length > 0);
  for (const course of COURSES) {
    const found = courseById(course.id);
    assert.notEqual(found, null);
    assert.equal(found?.id, course.id);
    assert.equal(found?.name, course.name);
  }
});

test("materialFolders genera carpetas con los prefijos de unidades y carpetas por defecto", () => {
  const estatica = courseById("estatica");
  assert.ok(estatica);

  const folders = materialFolders(estatica);
  assert.deepEqual(folders, [
    "RA1",
    "RA2",
    "RA3",
    "RA4",
    "Certámenes anteriores",
    "General",
  ]);
});

test("materialFolders retorna carpetas por defecto para cursos sin unidades", () => {
  const edo = courseById("edo");
  assert.ok(edo);
  assert.equal(edo.units.length, 0);

  const folders = materialFolders(edo);
  assert.deepEqual(folders, ["Certámenes anteriores", "General"]);
});

test("materialFolders maneja correctamente titulos de unidad sin delimitador, con espacios y vacíos", () => {
  const mockCourse: Course = {
    id: "test-course",
    name: "Curso de Prueba",
    code: "TEST101",
    section: "1",
    teacher: "Profesor Prueba",
    period: "Semestre 2026-2",
    tone: "#000000",
    eyebrow: "Eyebrow",
    headline: "Headline",
    summary: "Resumen",
    facts: [],
    units: [
      { title: "Unidad 1 · Introducción general", subtitle: "Sub 1" },
      { title: "Unidad 2 Sin Delimitador", subtitle: "Sub 2" },
      { title: "  Unidad 3  ·  Con Espacios  ", subtitle: "Sub 3" },
      { title: " · Solo Sufijo", subtitle: "Sub 4" }, // prefijo vacío antes del punto volado
      { title: "   ", subtitle: "Sub 5" }, // título en blanco
    ],
    evaluations: [],
  };

  const folders = materialFolders(mockCourse);
  assert.deepEqual(folders, [
    "Unidad 1",
    "Unidad 2 Sin Delimitador",
    "Unidad 3",
    "Certámenes anteriores",
    "General",
  ]);
});

test("PERIOD y la constante de periodo estan correctamente definidas", () => {
  assert.equal(typeof PERIOD, "string");
  assert.ok(PERIOD.length > 0);
  assert.match(PERIOD, /^\d{4}-\d$/);
});
