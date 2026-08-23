import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  MAX_CONCURRENT_TRANSACTIONS,
  MAX_ROWS_PER_REQUEST,
  actorFromAuth,
  canEditSection,
  diffScores,
  normalizeGradebookRequest,
  normalizeScoreRequest,
} = require("../firebase/functions/grade-audit.js") as {
  MAX_CONCURRENT_TRANSACTIONS: number;
  MAX_ROWS_PER_REQUEST: number;
  actorFromAuth: (auth: unknown) => { actorUid: string; actorEmail: string; actorName: string };
  canEditSection: (role: string, enrolled: boolean) => boolean;
  diffScores: (
    previous: Record<string, number>,
    next: Record<string, number>
  ) => Array<{ gradeItemId: string; previousValue: number | null; newValue: number | null }>;
  normalizeGradebookRequest: (value: unknown) => {
    courseId: string;
    items: Array<{ id: string; name: string; weight: number; date: string }>;
    exemption: number | null;
  };
  normalizeScoreRequest: (value: unknown) => {
    courseId: string;
    rows: Array<{ userId: string; scores: Record<string, number> }>;
  };
};

const read = (relative: string) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("REQ-AUDIT-01: score differences preserve previous and new values", () => {
  assert.deepEqual(diffScores({ c1: 5, c2: 4.5 }, { c1: 6, c3: 5.5 }), [
    { gradeItemId: "c1", previousValue: 5, newValue: 6 },
    { gradeItemId: "c2", previousValue: 4.5, newValue: null },
    { gradeItemId: "c3", previousValue: null, newValue: 5.5 },
  ]);
  assert.deepEqual(diffScores({ c1: 5.5 }, { c1: 5.5 }), []);
});

test("REQ-AUDIT-02: audit identity comes only from verified auth context", () => {
  assert.deepEqual(
    actorFromAuth({ uid: "teacher-1", token: { email: "PROFE@UBIOBIO.CL", name: "Ada" } }),
    { actorUid: "teacher-1", actorEmail: "profe@ubiobio.cl", actorName: "Ada" }
  );
  assert.throws(() => actorFromAuth(null), /autenticada/i);
});

test("REQ-AUDIT-04: only owners or enrolled teachers can edit a section", () => {
  assert.equal(canEditSection("owner", false), true);
  assert.equal(canEditSection("teacher", true), true);
  assert.equal(canEditSection("teacher", false), false);
  assert.equal(canEditSection("student", true), false);
});

test("REQ-AUDIT-06: score payloads are bounded and grades stay on the Chilean scale", () => {
  assert.equal(MAX_ROWS_PER_REQUEST, 100);
  assert.equal(MAX_CONCURRENT_TRANSACTIONS, 10);
  assert.deepEqual(
    normalizeScoreRequest({
      courseId: "440299-2026-2-1",
      rows: [{ userId: "student-1", scores: { c1: 5.7 } }],
    }),
    { courseId: "440299-2026-2-1", rows: [{ userId: "student-1", scores: { c1: 5.7 } }] }
  );
  assert.throws(
    () =>
      normalizeScoreRequest({
        courseId: "440299-2026-2-1",
        rows: Array.from({ length: 101 }, (_, index) => ({
          userId: `student-${index}`,
          scores: {},
        })),
      }),
    /100 estudiantes/i
  );
  assert.throws(
    () =>
      normalizeScoreRequest({
        courseId: "440299-2026-2-1",
        rows: [{ userId: "student-1", scores: { c1: 7.1 } }],
      }),
    /entre 1,0 y 7,0/i
  );
});

test("REQ-AUDIT-07: gradebook payloads normalize a complete auditable value", () => {
  assert.deepEqual(
    normalizeGradebookRequest({
      courseId: "440299-2026-2-1",
      items: [{ id: "certamen-1", name: " Certamen 1 ", weight: 40, date: "2026-09-10" }],
      exemption: 5,
    }),
    {
      courseId: "440299-2026-2-1",
      items: [{ id: "certamen-1", name: "Certamen 1", weight: 40, date: "2026-09-10" }],
      exemption: 5,
    }
  );
  assert.throws(
    () =>
      normalizeGradebookRequest({
        courseId: "440299-2026-2-1",
        items: [{ id: "certamen-1", name: "Certamen", weight: 101, date: "2026-09-10" }],
        exemption: 5,
      }),
    /ponderaci/i
  );
});

test("REQ-AUDIT-01/02/07: callable transactions commit state and audit together", async () => {
  const functions = await read("firebase/functions/index.js");
  assert.match(functions, /exports\.saveAuditedStudentScores\s*=\s*onCall/);
  assert.match(functions, /exports\.saveAuditedGradebook\s*=\s*onCall/);
  assert.match(functions, /runTransaction/);
  assert.match(functions, /transaction\.create\(auditRef/);
  assert.match(functions, /FieldValue\.serverTimestamp\(\)/);
  assert.doesNotMatch(functions, /request\.data\.(actor|author|changedAt|updatedAt)/);
});

test("REQ-AUDIT-03/05: rules deny audit writes and direct audited-state writes", async () => {
  const rules = await read("firebase/firestore.rules");
  const gradeBlock = rules.match(
    /match \/courses\/\{courseId\}\/grades\/\{userId\} \{[\s\S]*?\n {4}\}/
  )?.[0];
  const auditBlock = rules.match(
    /match \/courses\/\{courseId\}\/gradeAudit\/\{auditId\} \{[\s\S]*?\n {4}\}/
  )?.[0];
  assert.ok(gradeBlock);
  assert.match(gradeBlock, /allow write: if false;/);
  assert.ok(auditBlock);
  assert.match(auditBlock, /allow write: if false;/);
  assert.match(auditBlock, /resource\.data\.studentId == request\.auth\.uid/);
  assert.match(rules, /documentId != 'gradebook'/);
});

test("REQ-AUDIT-03: the web client has no direct write path for official grades", async () => {
  const client = await read("lib/firebase/grades.ts");
  assert.match(client, /httpsCallable/);
  assert.match(client, /saveAuditedStudentScores/);
  assert.match(client, /saveAuditedGradebook/);
  assert.doesNotMatch(client, /sdk\.writeBatch|batch\.set/);
  assert.doesNotMatch(client, /"grades", row\.userId/);
});

test("REQ-AUDIT-05: student history has a bounded composite index", async () => {
  const indexes = JSON.parse(await read("firebase/firestore.indexes.json")) as {
    indexes: Array<{
      collectionGroup: string;
      fields: Array<{ fieldPath: string; order: string }>;
    }>;
  };
  assert.ok(
    indexes.indexes.some(
      (index) =>
        index.collectionGroup === "gradeAudit" &&
        index.fields.some(
          (field) => field.fieldPath === "studentId" && field.order === "ASCENDING"
        ) &&
        index.fields.some(
          (field) => field.fieldPath === "changedAt" && field.order === "DESCENDING"
        )
    )
  );
});
