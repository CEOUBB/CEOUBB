import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENDA_DAYS,
  durationLabel,
  resizedBlockTimes,
  stepDate,
  viewDates,
} from "../lib/planner.ts";

test("CEO-72: cada vista cubre su rango y la agenda avanza desde el día ancla", () => {
  assert.deepEqual(viewDates("day", "2026-09-15"), ["2026-09-15"]);
  assert.deepEqual(viewDates("week", "2026-09-17"), [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
    "2026-09-20",
  ]);
  assert.equal(viewDates("month", "2026-09-15").length, 35);
  const agenda = viewDates("agenda", "2026-12-20");
  assert.equal(agenda.length, AGENDA_DAYS);
  assert.equal(agenda[0], "2026-12-20");
  assert.equal(agenda.at(-1), "2027-01-16");
});

test("CEO-72: el paso respeta la vista y conserva el día de la semana", () => {
  assert.equal(stepDate("day", "2026-02-28", 1), "2026-03-01");
  assert.equal(stepDate("week", "2026-09-17", -1), "2026-09-10");
  assert.equal(stepDate("month", "2026-01-31", 1), "2026-02-01");
  assert.equal(stepDate("agenda", "2026-09-15", 1), "2026-10-13");
});

test("CEO-72: redimensionar mantiene un cuarto de hora mínimo y el cierre del día", () => {
  assert.deepEqual(resizedBlockTimes(600, 615), { startTime: "10:00", endTime: "10:15" });
  assert.deepEqual(resizedBlockTimes(600, 560), { startTime: "10:00", endTime: "10:15" });
  assert.deepEqual(resizedBlockTimes(1200, 1400), { startTime: "20:00", endTime: "21:00" });
});

test("CEO-72: la duración se lee en horas y minutos", () => {
  assert.equal(durationLabel("09:00", "10:45"), "1 h 45 min");
  assert.equal(durationLabel("09:00", "11:00"), "2 h");
  assert.equal(durationLabel("09:00", "09:30"), "30 min");
  assert.equal(durationLabel("10:00", "09:00"), "");
});
