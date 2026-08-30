import assert from "node:assert/strict";
import test from "node:test";
import {
  INTEGRATIVE_GRADE_ITEM_ID,
  buildFinalGradeRecords,
  calculateFinalGrade,
  finalGradeStatistics,
  fingerprintFinalGradeRecords,
} from "../lib/final-grade-records.ts";
import type { GradeItem } from "../lib/grades.ts";
import { loadCompleteStudentDirectory } from "../lib/participants.ts";

const ITEMS: GradeItem[] = [
  { id: "c1", name: "Certamen 1", weight: 50, date: "2026-09-10" },
  { id: "c2", name: "Certamen 2", weight: 50, date: "2026-11-12" },
];

test("REQ-ACTA-02 clasifica los tres umbrales reglamentarios", () => {
  const blocked = calculateFinalGrade(ITEMS, { c1: 1.9, c2: 1.9 });
  const required = calculateFinalGrade(ITEMS, { c1: 3.9, c2: 3.9 });
  const optional = calculateFinalGrade(ITEMS, { c1: 4, c2: 4 });

  assert.equal(blocked.eligibility, "blocked");
  assert.equal(blocked.finalGrade, 1.9);
  assert.equal(required.eligibility, "required");
  assert.equal(required.outcome, "integrative-pending");
  assert.equal(optional.eligibility, "optional");
  assert.equal(optional.finalGrade, 4);
});

test("REQ-ACTA-03 aplica 60/40 y redondea la nota final", () => {
  const result = calculateFinalGrade(ITEMS, {
    c1: 3,
    c2: 4,
    [INTEGRATIVE_GRADE_ITEM_ID]: 5,
  });
  assert.equal(result.partialAverage, 3.5);
  assert.equal(result.integrativeGrade, 5);
  assert.equal(result.finalGrade, 4.1);
  assert.equal(result.outcome, "passed");
});

test("REQ-ACTA-02 considera la integradora voluntaria aunque disminuya la nota", () => {
  const result = calculateFinalGrade(ITEMS, {
    c1: 5,
    c2: 5,
    [INTEGRATIVE_GRADE_ITEM_ID]: 3,
  });
  assert.equal(result.eligibility, "optional");
  assert.equal(result.finalGrade, 4.2);
});

test("REQ-ACTA-01 no cierra el acta con parciales incompletos", () => {
  const result = calculateFinalGrade(ITEMS, {
    c1: 5,
    [INTEGRATIVE_GRADE_ITEM_ID]: 6,
  });
  assert.equal(result.partialAverage, null);
  assert.equal(result.finalGrade, null);
  assert.equal(result.outcome, "incomplete");
  assert.equal(result.eligibility, "blocked");
});

test("REQ-ACTA-04 resume aprobados, reprobados, pendientes e integradoras", () => {
  const records = buildFinalGradeRecords(
    [
      { id: "u1", name: "Alicia", email: "alicia@alumnos.ubiobio.cl", role: "student" },
      { id: "u2", name: "Bruno", email: "bruno@alumnos.ubiobio.cl", role: "student" },
      { id: "u3", name: "Carla", email: "carla@alumnos.ubiobio.cl", role: "student" },
      { id: "u4", name: "Diego", email: "diego@alumnos.ubiobio.cl", role: "student" },
    ],
    ITEMS,
    {
      u1: { c1: 5, c2: 5 },
      u2: { c1: 3, c2: 3, [INTEGRATIVE_GRADE_ITEM_ID]: 3 },
      u3: { c1: 3, c2: 3 },
      u4: { c1: 6 },
    }
  );
  assert.deepEqual(finalGradeStatistics(records), {
    total: 4,
    passed: 1,
    failed: 1,
    pending: 2,
    integrativeRequired: 2,
    integrativePending: 1,
    sectionAverage: 4,
  });
  assert.equal(records[0].institutionalId, "alicia@alumnos.ubiobio.cl");
});

test("REQ-ACTA-07 cambia la huella cuando cambia una nota", async () => {
  const base = buildFinalGradeRecords(
    [{ id: "u1", name: "Alicia", email: "alicia@alumnos.ubiobio.cl", role: "student" }],
    ITEMS,
    { u1: { c1: 5, c2: 5 } }
  );
  const changed = buildFinalGradeRecords(
    [{ id: "u1", name: "Alicia", email: "alicia@alumnos.ubiobio.cl", role: "student" }],
    ITEMS,
    { u1: { c1: 6, c2: 5 } }
  );
  const metadata = {
    courseId: "estatica-2026-2-1",
    courseCode: "440299",
    courseName: "Estática",
    section: "1",
    period: "2026-2",
    teacher: "Daniela Muñoz",
    generatedAt: "2026-08-28T20:00:00.000Z",
  };
  assert.notEqual(
    await fingerprintFinalGradeRecords(metadata, base),
    await fingerprintFinalGradeRecords(metadata, changed)
  );
});

test("REQ-ACTA-05 recorre la nómina paginada completa", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const second = url.includes("cursor=u1");
    return Response.json({
      items: second
        ? [{ id: "u2", name: "Bruno", email: "bruno@alumnos.ubiobio.cl", role: "student" }]
        : [{ id: "u1", name: "Alicia", email: "alicia@alumnos.ubiobio.cl", role: "student" }],
      counts: { teacher: 1, coordinator: 0, assistant: 0, student: 2 },
      nextCursor: second ? null : "u1",
    });
  }) as typeof fetch;
  try {
    const students = await loadCompleteStudentDirectory("estatica-2026-2-1");
    assert.deepEqual(
      students.map((student) => student.id),
      ["u1", "u2"]
    );
    assert.equal(calls.length, 2);
    assert.ok(calls[0].includes("limit=50"));
    assert.ok(calls[0].includes("role=student"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("REQ-ACTA-05 rechaza una nómina incompleta", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      items: [{ id: "u1", name: "Alicia", email: "alicia@alumnos.ubiobio.cl", role: "student" }],
      counts: { teacher: 1, coordinator: 0, assistant: 0, student: 2 },
      nextCursor: null,
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => loadCompleteStudentDirectory("estatica-2026-2-1"),
      /No se pudo completar la nómina activa/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("REQ-ACTA-05 detiene una paginación cíclica", async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = (async () => {
    call += 1;
    return Response.json({
      items: [
        {
          id: `u${call}`,
          name: `Estudiante ${call}`,
          email: `estudiante${call}@alumnos.ubiobio.cl`,
          role: "student",
        },
      ],
      counts: { teacher: 1, coordinator: 0, assistant: 0, student: 3 },
      nextCursor: "cursor-repetido",
    });
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => loadCompleteStudentDirectory("estatica-2026-2-1"),
      /cursor repetido/
    );
    assert.equal(call, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
