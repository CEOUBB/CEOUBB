import assert from "node:assert/strict";
import test from "node:test";
import { chunkOperations, MAX_BATCH_OPERATIONS } from "../lib/firebase/grades.ts";
import type { StudentScoreRow } from "../lib/firebase/grades.ts";

test("MAX_BATCH_OPERATIONS está configurado estrictamente bajo el límite de 500 de Firestore", () => {
  assert.equal(MAX_BATCH_OPERATIONS, 400);
  assert.ok(MAX_BATCH_OPERATIONS < 500);
});

test("chunkOperations particiona 1.050 operaciones en lotes de máximo 400", () => {
  const rows = Array.from({ length: 1050 }, (_, i) => `op-${i + 1}`);
  const batches = chunkOperations(rows, MAX_BATCH_OPERATIONS);

  assert.equal(batches.length, 3);
  assert.equal(batches[0].length, 400);
  assert.equal(batches[1].length, 400);
  assert.equal(batches[2].length, 250);
  assert.equal(batches.flat().length, 1050);
});

test("chunkOperations maneja un curso de 350 estudiantes en lotes auditados de máximo 100", () => {
  const MAX_AUDITED_ROWS_PER_CALL = 100;
  const rows: StudentScoreRow[] = Array.from({ length: 350 }, (_, i) => ({
    userId: `student-${i + 1}`,
    scores: { c1: 5.5, c2: 6.0 },
  }));

  const batches = chunkOperations(rows, MAX_AUDITED_ROWS_PER_CALL);
  assert.equal(batches.length, 4);
  assert.equal(batches[0].length, 100);
  assert.equal(batches[1].length, 100);
  assert.equal(batches[2].length, 100);
  assert.equal(batches[3].length, 50);

  // Cada lote debe tener como máximo 100 filas
  for (const batch of batches) {
    assert.ok(batch.length <= MAX_AUDITED_ROWS_PER_CALL);
    assert.ok(batch.length <= MAX_BATCH_OPERATIONS);
  }
});

test("chunkOperations tolera entradas vacías y tamaños borde", () => {
  assert.deepEqual(chunkOperations([]), []);
  assert.equal(chunkOperations([1, 2, 3], 0).length, 3); // size <= 0 se ajusta a 1
  assert.equal(chunkOperations([1, 2, 3], -10).length, 3);
  assert.equal(chunkOperations([1, 2, 3], Number.NaN).length, 1); // NaN usa MAX_BATCH_OPERATIONS
  assert.equal(chunkOperations([1, 2, 3], 5).length, 1);
});
