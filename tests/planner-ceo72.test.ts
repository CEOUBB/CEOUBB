import assert from "node:assert/strict";
import test from "node:test";
import {
  gridMinutes,
  isIsoDate,
  monthDates,
  movedBlockTimes,
  shiftMonth,
  weeklyDates,
} from "../lib/planner.ts";

test("CEO-72: meses completos, año nuevo, febrero bisiesto y seis semanas", () => {
  const september = monthDates("2026-09-30");
  assert.equal(september[0], "2026-08-31");
  assert.equal(september.at(-1), "2026-10-04");
  assert.equal(monthDates("2026-03-01").length, 42);
  assert.ok(monthDates("2028-02-01").includes("2028-02-29"));
  assert.equal(shiftMonth("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftMonth("2026-03-31", -1), "2026-02-01");
  assert.equal(isIsoDate("2026-02-30"), false);
});

test("CEO-72: recurrencia semanal inclusiva y acotada, sin desfase DST", () => {
  assert.deepEqual(weeklyDates("2026-09-01", "2026-09-15"), [
    "2026-09-01",
    "2026-09-08",
    "2026-09-15",
  ]);
  assert.deepEqual(weeklyDates("2026-09-01"), ["2026-09-01"]);
  assert.deepEqual(weeklyDates("2026-12-29", "2027-01-12"), [
    "2026-12-29",
    "2027-01-05",
    "2027-01-12",
  ]);
  assert.throws(() => weeklyDates("2026-09-01", "2026-08-01"));
  assert.throws(() => weeklyDates("2026-09-01", "2027-09-01"));
  assert.throws(() => weeklyDates("2026-02-30"));
  assert.throws(() => weeklyDates("2026-09-01", ""));
});

test("CEO-72: arrastre ajustado a cuartos de hora y movimiento conserva duración", () => {
  assert.equal(gridMinutes(130, 100, 780), 510);
  assert.equal(gridMinutes(-100, 100, 780), 480);
  assert.equal(gridMinutes(2000, 100, 780), 1245);
  assert.deepEqual(movedBlockTimes(1245, 90), { startTime: "19:30", endTime: "21:00" });
  assert.deepEqual(movedBlockTimes(0, 90), { startTime: "08:00", endTime: "09:30" });
});
