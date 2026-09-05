import assert from "node:assert/strict";
import test from "node:test";
import { getSantiagoDateISO, nextEntry, type CalendarEntry } from "../lib/portal-utils.ts";

test("la agenda nunca presenta una evaluación pasada como próxima", () => {
  const entry: CalendarEntry = {
    key: "evaluation",
    courseId: "section",
    course: "Estática",
    detail: "Certamen",
    date: "2000-01-01",
    tone: "var(--color-primary)",
  };
  assert.equal(nextEntry([]), null);
  assert.equal(nextEntry([entry]), null);
  const today = { ...entry, key: "today", date: getSantiagoDateISO() };
  const future = { ...entry, key: "future", date: "2099-12-31" };
  assert.equal(nextEntry([entry, today, future]), today);
  assert.equal(nextEntry([entry, future]), future);
});
