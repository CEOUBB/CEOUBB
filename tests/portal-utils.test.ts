import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRole as Role } from "../lib/access-policy.ts";
import { roleLabel } from "../lib/portal-utils.ts";

test("roleLabel mapea 'owner' a 'Desarrollador'", () => {
  assert.equal(roleLabel("owner"), "Desarrollador");
});

test("roleLabel mapea 'teacher' a 'Docente'", () => {
  assert.equal(roleLabel("teacher"), "Docente");
});

test("roleLabel mapea 'student' a 'Estudiante'", () => {
  assert.equal(roleLabel("student"), "Estudiante");
});

test("roleLabel retorna 'Estudiante' para roles desconocidos o vacíos", () => {
  assert.equal(roleLabel("unknown" as Role), "Estudiante");
  assert.equal(roleLabel("" as Role), "Estudiante");
});

test("calendarEntries genera y ordena las entradas de calendario correctamente", async () => {
  const { calendarEntries } = await import("../lib/portal-utils.ts");
  const courses = [
    {
      id: "course-1",
      code: "INF101",
      name: "Algoritmos",
      section: "G1",
      semester: "2026-1",
      tone: "blue",
      evaluations: [{ id: "eval-1", name: "Certamen 1", weight: 30, date: "2026-05-10" }],
    },
    {
      id: "course-2",
      code: "INF102",
      name: "Estructuras de Datos",
      section: "G1",
      semester: "2026-1",
      tone: "green",
      evaluations: [{ id: "eval-2", name: "Certamen 2", weight: 40, date: "2026-04-15" }],
    },
  ];
  const gradebooks = [
    {
      courseId: "course-1",
      items: [{ id: "gb-1", name: "Tarea 1", weight: 10, date: "2026-03-20" }],
    },
  ];

  type CourseInput = Parameters<typeof calendarEntries>[0];
  type GradebookInput = Parameters<typeof calendarEntries>[1];
  const entries = calendarEntries(
    courses as unknown as CourseInput,
    gradebooks as unknown as GradebookInput
  );

  assert.equal(entries.length, 2);
  assert.equal(entries[0].key, "course-1-gb-1");
  assert.equal(entries[0].date, "2026-03-20");
  assert.equal(entries[0].detail, "Tarea 1 · 10% de la nota");

  assert.equal(entries[1].key, "course-2-eval-2");
  assert.equal(entries[1].date, "2026-04-15");
  assert.equal(entries[1].detail, "Certamen 2");
});
