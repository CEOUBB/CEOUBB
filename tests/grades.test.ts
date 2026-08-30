import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_GRADE,
  gradeFromPoints,
  normalizeItems,
  normalizeScores,
  requiredGrade,
  round1,
  summarize,
} from "../lib/grades.ts";
import type { GradeItem } from "../lib/grades.ts";

const SCHEME: GradeItem[] = [
  { id: "c1", name: "Certamen 1", weight: 30, date: "2026-09-01" },
  { id: "c2", name: "Certamen 2", weight: 30, date: "2026-10-08" },
  { id: "t1", name: "Tareas", weight: 40, date: "2026-11-26" },
];

test("summarize promedia solo lo evaluado", () => {
  const summary = summarize(SCHEME, { c1: 5, c2: 4 });
  assert.equal(summary.totalWeight, 100);
  assert.equal(summary.gradedWeight, 60);
  assert.equal(summary.pendingWeight, 40);
  assert.equal(summary.average, 4.5);
  assert.equal(summary.complete, false);
});

test("summarize marca el ramo cerrado cuando todo tiene nota", () => {
  const summary = summarize(SCHEME, { c1: 5, c2: 4, t1: 6 });
  assert.equal(summary.complete, true);
  assert.equal(summary.average, 5.1);
});

test("requiredGrade redondea hacia arriba la nota que falta", () => {
  const target = requiredGrade(SCHEME, { c1: 3, c2: 4 }, 4);
  assert.equal(target.state, "needed");
  assert.equal(target.grade, 4.8);
});

test("requiredGrade avisa cuando la aprobacion ya esta asegurada", () => {
  assert.equal(requiredGrade(SCHEME, { c1: 7, c2: 7 }, 4).state, "secured");
});

test("requiredGrade avisa cuando el objetivo es inalcanzable", () => {
  const target = requiredGrade(SCHEME, { c1: 1, c2: 1 }, 5);
  assert.equal(target.state, "impossible");
  assert.ok(target.grade > MAX_GRADE);
});

test("requiredGrade se cierra cuando no queda nada pendiente", () => {
  assert.equal(requiredGrade(SCHEME, { c1: 5, c2: 5, t1: 5 }, 4).state, "closed");
  assert.equal(requiredGrade([], {}, 4).state, "closed");
});

test("las ponderaciones no necesitan sumar 100", () => {
  const scheme: GradeItem[] = [
    { id: "a", name: "A", weight: 1, date: "" },
    { id: "b", name: "B", weight: 3, date: "" },
  ];
  assert.equal(summarize(scheme, { a: 7, b: 3 }).average, 4);
  assert.equal(requiredGrade(scheme, { a: 7 }, 4).grade, 3);
});

test("normalizeScores descarta notas fuera de la escala 1,0 a 7,0", () => {
  assert.deepEqual(normalizeScores({ a: 0.9, b: 7.1, c: 4, d: "5", e: NaN }), { c: 4 });
  assert.deepEqual(normalizeScores(null), {});
});

test("normalizeItems descarta filas sin ponderacion", () => {
  const items = normalizeItems([
    { id: "a", name: "A", weight: 20, date: "" },
    { id: "b", name: "B", weight: 0, date: "" },
    null,
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "a");
});

test("gradeFromPoints aplica la escala chilena con exigencia de 60 por ciento", () => {
  assert.equal(gradeFromPoints(0, 10), 1);
  assert.equal(gradeFromPoints(6, 10), 4);
  assert.equal(gradeFromPoints(10, 10), 7);
  assert.equal(gradeFromPoints(8, 10), 5.5);
});

test("gradeFromPoints rechaza puntajes y exigencias invalidas", () => {
  assert.equal(gradeFromPoints(-1, 10), null);
  assert.equal(gradeFromPoints(11, 10), null);
  assert.equal(gradeFromPoints(1, 0), null);
  assert.equal(gradeFromPoints(1, 10, 1), null);
});

test("round1 aplica el redondeo institucional a una decimal", () => {
  assert.equal(round1(3.94), 3.9);
  assert.equal(round1(3.95), 4);
  assert.equal(round1(6.96), 7);
});
