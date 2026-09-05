import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  GRADE_FEEDBACK_REQUIREMENTS,
  MAX_GRADE_FEEDBACK_LENGTH,
  normalizeGradeFeedback,
} from "../lib/grades.ts";

const require = createRequire(import.meta.url);
const { diffFeedback, normalizeFeedbackRequest, storedFeedbackMap } =
  require("../firebase/functions/grade-audit.js") as {
    diffFeedback: (
      previous: Record<string, string>,
      gradeItemId: string,
      nextValue: string | null
    ) => { previousValue: string | null; newValue: string | null } | null;
    normalizeFeedbackRequest: (value: unknown) => {
      courseId: string;
      userId: string;
      gradeItemId: string;
      feedback: string | null;
    };
    storedFeedbackMap: (value: unknown) => Record<string, string>;
  };

const read = (relative: string) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("REQ-FEEDBACK-01/05 normaliza texto, conserva saltos y acota el payload", () => {
  assert.equal(MAX_GRADE_FEEDBACK_LENGTH, 2_000);
  assert.deepEqual(
    normalizeGradeFeedback({ certamen: "  Primera línea\nSegunda línea  ", vacio: "   " }),
    { certamen: "Primera línea\nSegunda línea" }
  );
  assert.deepEqual(
    normalizeFeedbackRequest({
      courseId: "440299-2026-2-1",
      userId: "student-1",
      gradeItemId: "certamen-1",
      feedback: "  Revisa el equilibrio.  ",
    }),
    {
      courseId: "440299-2026-2-1",
      userId: "student-1",
      gradeItemId: "certamen-1",
      feedback: "Revisa el equilibrio.",
    }
  );
  assert.equal(
    normalizeFeedbackRequest({
      courseId: "440299-2026-2-1",
      userId: "student-1",
      gradeItemId: "certamen-1",
      feedback: "   ",
    }).feedback,
    null
  );
  assert.throws(
    () =>
      normalizeFeedbackRequest({
        courseId: "440299-2026-2-1",
        userId: "student-1",
        gradeItemId: "certamen-1",
        feedback: "x".repeat(2_001),
      }),
    /2\.000 caracteres/i
  );
});

test("REQ-FEEDBACK-01/05 detecta cambios, eliminaciones y no-op auditables", () => {
  assert.deepEqual(diffFeedback({}, "c1", "Buen desarrollo."), {
    previousValue: null,
    newValue: "Buen desarrollo.",
  });
  assert.deepEqual(diffFeedback({ c1: "Anterior" }, "c1", null), {
    previousValue: "Anterior",
    newValue: null,
  });
  assert.equal(diffFeedback({ c1: "Sin cambios" }, "c1", "Sin cambios"), null);
  assert.deepEqual(storedFeedbackMap({ c1: "  Válido  ", vacio: " ", "clave inválida": "No" }), {
    c1: "Válido",
  });
});

test("REQ-FEEDBACK-01/05 persiste feedback y auditoría en una transacción dedicada", async () => {
  const functions = await read("firebase/functions/index.js");
  assert.match(functions, /exports\.saveAuditedGradeFeedback\s*=\s*onCall/);
  assert.match(functions, /normalizeFeedbackRequest\(request\.data\)/);
  assert.match(functions, /storedScoreMap/);
  assert.match(functions, /Object\.hasOwn\(scores, next\.gradeItemId\)/);
  assert.match(functions, /feedback:\s*write\.nextFeedback/);
  assert.match(functions, /\{\s*merge:\s*true\s*\}/);
  assert.match(functions, /targetType:\s*"feedback"/);
  assert.match(functions, /transaction\.create\(auditRef/);
  assert.match(functions, /changedAt:\s*FieldValue\.serverTimestamp\(\)/);
});

test("REQ-FEEDBACK-02 mantiene lectura por dueño y escritura sólo por servidor", async () => {
  const rules = await read("firebase/firestore.rules");
  const gradeBlock = rules.match(
    /match \/courses\/\{courseId\}\/grades\/\{userId\} \{[\s\S]*?\n {4}\}/
  )?.[0];
  const auditBlock = rules.match(
    /match \/courses\/\{courseId\}\/gradeAudit\/\{auditId\} \{[\s\S]*?\n {4}\}/
  )?.[0];
  assert.ok(gradeBlock);
  assert.match(gradeBlock, /request\.auth\.uid == userId/);
  assert.match(gradeBlock, /isEnrolled\(courseId\)/);
  assert.match(gradeBlock, /allow write: if false;/);
  assert.ok(auditBlock);
  assert.match(auditBlock, /resource\.data\.targetType in \['score', 'feedback'\]/);
  assert.match(auditBlock, /resource\.data\.studentId == request\.auth\.uid/);
  assert.match(auditBlock, /allow write: if false;/);
});

test("REQ-FEEDBACK-03/06 reutiliza los snapshots de notas en ambas proyecciones", async () => {
  const posts = await read("lib/firebase/posts.ts");
  assert.match(posts, /officialFeedback:[\s\S]{0,120}normalizeGradeFeedback/);
  assert.match(posts, /classFeedback:[\s\S]{0,240}normalizeGradeFeedback/);
  assert.doesNotMatch(posts, /collection\([^\n]+["']feedback["']/);
  assert.doesNotMatch(posts, /onSnapshot\([^)]*["']feedback["']/);
});

test("REQ-FEEDBACK-03/04 ofrece un editor único y lectura web/móvil en la vista real", async () => {
  const view = await read("app/views/classroom/GradesSection.tsx");
  assert.match(view, /ChatCenteredText/);
  assert.match(view, /data-requirement="Implements: REQ-FEEDBACK-03 REQ-FEEDBACK-04"/);
  assert.match(view, /officialFeedback\[detail\.id\]/);
  assert.match(view, /officialFeedback\[item\.id\]/);
  assert.equal(view.match(/<FeedbackDialog\b/g)?.length, 1);
  assert.match(view, /aria-labelledby="grade-feedback-dialog-title"/);
  assert.match(view, /maxLength=\{MAX_GRADE_FEEDBACK_LENGTH\}/);
  assert.doesNotMatch(view, /dangerouslySetInnerHTML/);
});

test("REQ-FEEDBACK-01 a 06 permanecen trazables sin comentarios fuente nuevos", () => {
  assert.deepEqual(GRADE_FEEDBACK_REQUIREMENTS, [
    "REQ-FEEDBACK-01",
    "REQ-FEEDBACK-02",
    "REQ-FEEDBACK-03",
    "REQ-FEEDBACK-04",
    "REQ-FEEDBACK-05",
    "REQ-FEEDBACK-06",
  ]);
});
