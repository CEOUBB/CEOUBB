import assert from "node:assert/strict";
import test from "node:test";
import {
  dayItems,
  normalizeDueDate,
  placeBlocks,
  plannerItems,
  shiftDate,
  validateBlock,
  weekDates,
} from "../lib/planner.ts";
import type { PersonalEvent, PlannerItem } from "../lib/planner.ts";
import type { Course } from "../lib/courses.ts";

const COURSES = [
  { id: "estatica", name: "Estática", tone: "#38bdf8" },
  { id: "edo", name: "Ecuaciones Diferenciales", tone: "#8b5cf6" },
] as Course[];

const WEEK = { from: "2026-08-17", to: "2026-08-23" };

function block(id: string, startTime: string, endTime: string, date = "2026-08-19"): PersonalEvent {
  return { id, title: id, detail: "", date, startTime, endTime, courseId: null, kind: "study", completed: false };
}

test("weekDates devuelve lunes a domingo desde cualquier dia de la semana", () => {
  const fromWednesday = weekDates("2026-08-19");
  assert.equal(fromWednesday.length, 7);
  assert.equal(fromWednesday[0], "2026-08-17");
  assert.equal(fromWednesday[6], "2026-08-23");
  assert.deepEqual(weekDates("2026-08-23"), fromWednesday, "el domingo pertenece a la semana que empieza el lunes anterior");
  assert.deepEqual(weekDates("2026-08-17"), fromWednesday);
});

test("shiftDate cruza el cambio de mes sin arrastrar huso horario", () => {
  assert.equal(shiftDate("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
});

test("normalizeDueDate acepta fecha sola o fecha con hora y descarta basura", () => {
  assert.equal(normalizeDueDate("2026-08-18"), "2026-08-18");
  assert.equal(normalizeDueDate("2026-08-18T23:59:00"), "2026-08-18T23:59");
  assert.equal(normalizeDueDate("mañana"), "");
  assert.equal(normalizeDueDate(undefined), "");
});

test("plannerItems une gradebook, entregas y bloques personales de la semana", () => {
  const items = plannerItems({
    courses: COURSES,
    gradebooks: [{ courseId: "estatica", items: [
      { id: "c1", name: "Certamen 1", weight: 30, date: "2026-08-20" },
      { id: "c2", name: "Certamen 2", weight: 30, date: "2026-09-30" },
    ] }],
    deadlines: [
      { id: "p1", courseId: "estatica", title: "Entrega Informe 1", dueDate: "2026-08-18T23:59" },
      { id: "p2", courseId: "estatica", title: "Fuera de semana", dueDate: "2026-07-01" },
      { id: "p3", courseId: "inexistente", title: "Ramo desconocido", dueDate: "2026-08-18" },
    ],
    personal: [{ ...block("b1", "15:00", "17:00"), courseId: "edo" }],
    ...WEEK,
  });

  assert.deepEqual(items.map((item) => item.id), ["due-p1", "b1", "eval-estatica-c1"]);
  assert.equal(items[0].tone, "#38bdf8", "la entrega toma el tono de Estática");
  assert.equal(items[0].detail, "Entrega 23:59");
  assert.equal(items[1].tone, "#8b5cf6", "el bloque personal toma el tono de EDO");
  assert.equal(items[2].detail, "30% de la nota");
});

test("plannerItems descarta bloques con horas invalidas o invertidas", () => {
  const items = plannerItems({
    courses: COURSES,
    gradebooks: [],
    deadlines: [],
    personal: [block("ok", "09:00", "10:00"), block("invertido", "12:00", "11:00"), block("vacio", "", "")],
    ...WEEK,
  });
  assert.deepEqual(items.map((item) => item.id), ["ok"]);
});

test("dayItems separa el ribbon de los bloques con hora", () => {
  const items = plannerItems({
    courses: COURSES,
    gradebooks: [{ courseId: "estatica", items: [{ id: "c1", name: "Certamen 1", weight: 30, date: "2026-08-19" }] }],
    deadlines: [],
    personal: [block("b1", "15:00", "17:00")],
    ...WEEK,
  });
  const wednesday = dayItems(items, "2026-08-19");
  assert.deepEqual(wednesday.ribbon.map((item) => item.id), ["eval-estatica-c1"]);
  assert.deepEqual(wednesday.blocks.map((item) => item.id), ["b1"]);
  assert.equal(dayItems(items, "2026-08-20").blocks.length, 0);
});

test("placeBlocks reparte en columnas solo los bloques que se solapan", () => {
  const timed = (id: string, startTime: string, endTime: string) =>
    ({ id, startTime, endTime, title: id }) as unknown as PlannerItem;

  const placed = placeBlocks([
    timed("a", "09:00", "11:00"),
    timed("b", "10:00", "12:00"),
    timed("c", "14:00", "15:00"),
  ]);
  const byId = new Map(placed.map((item) => [item.id, item]));

  assert.equal(byId.get("a")!.columns, 2);
  assert.equal(byId.get("b")!.columns, 2);
  assert.notEqual(byId.get("a")!.column, byId.get("b")!.column);
  assert.equal(byId.get("c")!.columns, 1, "un bloque aislado ocupa el ancho completo");
  assert.equal(byId.get("c")!.column, 0);
  assert.equal(byId.get("a")!.startMinutes, 540);
});

test("placeBlocks reutiliza la columna liberada por un bloque ya terminado", () => {
  const timed = (id: string, startTime: string, endTime: string) =>
    ({ id, startTime, endTime, title: id }) as unknown as PlannerItem;

  const placed = placeBlocks([
    timed("largo", "09:00", "13:00"),
    timed("corto1", "09:00", "10:00"),
    timed("corto2", "10:00", "11:00"),
  ]);
  const byId = new Map(placed.map((item) => [item.id, item]));

  assert.equal(byId.get("corto1")!.column, byId.get("corto2")!.column, "corto2 hereda la columna que corto1 dejo libre");
  assert.equal(byId.get("largo")!.columns, 2);
});

test("validateBlock rechaza lo que romperia la grilla y acepta lo valido", () => {
  const base = { title: "Estudiar EDO", date: "2026-08-19", startTime: "15:00", endTime: "17:00" };
  assert.equal(validateBlock(base), null);
  assert.match(validateBlock({ ...base, title: "   " })!, /título/);
  assert.match(validateBlock({ ...base, date: "19-08-2026" })!, /fecha/);
  assert.match(validateBlock({ ...base, endTime: "15:00" })!, /posterior/);
  assert.match(validateBlock({ ...base, startTime: "06:00" })!, /08:00 a 21:00/);
  assert.match(validateBlock({ ...base, endTime: "23:00" })!, /08:00 a 21:00/);
});
