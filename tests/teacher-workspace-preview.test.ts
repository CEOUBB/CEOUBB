import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isTeacherPreviewEnabled } from "../app/preview/docente/teacher-preview-environment.ts";
import {
  createInitialTeacherPreviewState,
  emptyActivity,
  gradebookOverview,
  paginateSubmissions,
  prioritizedWork,
  publishedStudentReview,
  teacherCounters,
  teacherPreviewReducer,
  validateActivity,
  validateReview,
} from "../app/preview/docente/teacher-preview-model.ts";

// Implements: REQ-DOC-01
test("REQ-DOC-01 deshabilita la preview únicamente en producción", () => {
  assert.equal(isTeacherPreviewEnabled("production"), false);
  assert.equal(isTeacherPreviewEnabled("preview"), true);
  assert.equal(isTeacherPreviewEnabled("development"), true);
  assert.equal(isTeacherPreviewEnabled(undefined), true);
});

// Implements: REQ-DOC-02, REQ-DOC-13, REQ-DOC-14
test("REQ-DOC-02 y REQ-DOC-13 crean fixtures sintéticos nuevos en cada carga", () => {
  const first = createInitialTeacherPreviewState();
  const second = createInitialTeacherPreviewState();
  first.activities[0].title = "Cambio temporal";
  first.reviews["sub-03"].feedback = "Cambio temporal";
  assert.notEqual(second.activities[0].title, "Cambio temporal");
  assert.notEqual(second.reviews["sub-03"].feedback, "Cambio temporal");
  assert.ok(second.submissions.every((submission) => /^Estudiante \d{2}$/.test(submission.studentAlias)));
  assert.doesNotMatch(JSON.stringify(second), /@|firebase|turso|storage/i);
});

// Implements: REQ-DOC-04, REQ-DOC-05, REQ-DOC-06
test("REQ-DOC-05 conserva el contexto y valida borrador, fechas y ponderación", () => {
  const state = createInitialTeacherPreviewState();
  const activity = emptyActivity(state.section.id, 9);
  assert.deepEqual(Object.keys(validateActivity(activity, "draft")).sort(), ["instructions", "title"]);
  const invalid = { ...activity, title: "Actividad nueva", instructions: "Instrucciones", opensAt: "2026-08-20T10:00", dueAt: "2026-08-19T10:00", cutoffAt: "2026-08-18T10:00", gradeWeight: 120 };
  const errors = validateActivity(invalid, "publish");
  assert.match(errors.dueAt ?? "", /posterior/);
  assert.match(errors.gradeWeight ?? "", /0% y 100%/);
  const valid = { ...invalid, dueAt: "2026-08-21T10:00", cutoffAt: "2026-08-22T10:00", gradeWeight: 20, lifecycle: "draft" as const };
  assert.deepEqual(validateActivity(valid, "publish"), {});
  const next = teacherPreviewReducer(state, { type: "save_activity", activity: valid });
  assert.equal(next.activities.at(-1)?.sectionId, state.section.id);
  assert.equal(next.selectedActivityId, valid.id);
});

// Implements: REQ-DOC-07
test("REQ-DOC-07 mantiene contadores coherentes y ordena el trabajo por urgencia", () => {
  const state = createInitialTeacherPreviewState();
  const counters = teacherCounters(state);
  const pending = state.submissions.filter((submission) => ["submitted", "late", "review_draft"].includes(submission.state)).length;
  assert.equal(counters.find((counter) => counter.id === "pending")?.value, pending);
  const work = prioritizedWork(state);
  assert.ok(work.length > 0);
  assert.deepEqual(work, [...work].sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt)));
});

// Implements: REQ-DOC-08
test("REQ-DOC-08 filtra y pagina la cola de manera estable", () => {
  const state = createInitialTeacherPreviewState();
  const first = paginateSubmissions(state.submissions, "control-1", "all", "", 1, 5);
  const second = paginateSubmissions(state.submissions, "control-1", "all", "", 2, 5);
  const late = paginateSubmissions(state.submissions, "control-1", "late", "", 1, 5);
  assert.equal(first.items.length, 5);
  assert.equal(second.items.length, 5);
  assert.notDeepEqual(first.items.map((item) => item.id), second.items.map((item) => item.id));
  assert.ok(late.items.every((item) => item.state === "late"));
  assert.deepEqual(paginateSubmissions(state.submissions, "control-1", "all", "Estudiante 01", 1).items.map((item) => item.studentAlias), ["Estudiante 01"]);
});

// Implements: REQ-DOC-09
test("REQ-DOC-09 mantiene privada una corrección guardada como borrador", () => {
  const initial = createInitialTeacherPreviewState();
  const submission = initial.submissions.find((item) => item.id === "sub-01");
  assert.deepEqual(validateReview(submission, 5.4, "Buen desarrollo"), {});
  const state = teacherPreviewReducer(initial, { type: "save_review_draft", submissionId: "sub-01", grade: 5.4, feedback: "Buen desarrollo", rubric: { planteamiento: 1.8, desarrollo: 2, comunicacion: 1.6 } });
  assert.equal(state.submissions.find((item) => item.id === "sub-01")?.state, "review_draft");
  assert.equal(state.reviews["sub-01"].visibility, "draft");
  assert.equal(publishedStudentReview(state, "sub-01"), null);
});

// Implements: REQ-DOC-10
test("REQ-DOC-10 publica nota y feedback juntos con historial inmutable", () => {
  const initial = createInitialTeacherPreviewState();
  const draft = teacherPreviewReducer(initial, { type: "save_review_draft", submissionId: "sub-01", grade: 5.4, feedback: "Buen desarrollo", rubric: { planteamiento: 1.8, desarrollo: 2, comunicacion: 1.6 } });
  const published = teacherPreviewReducer(draft, { type: "publish_review", submissionId: "sub-01", grade: 5.6, feedback: "Buen desarrollo; revisa las unidades.", rubric: { planteamiento: 1.8, desarrollo: 2.1, comunicacion: 1.7 } });
  const studentReview = publishedStudentReview(published, "sub-01");
  assert.equal(studentReview?.grade, 5.6);
  assert.equal(studentReview?.feedback, "Buen desarrollo; revisa las unidades.");
  assert.equal(studentReview?.history.at(-1)?.previous, "draft");
  assert.equal(studentReview?.history.at(-1)?.next, "published");
  assert.equal(draft.reviews["sub-01"].history.length, 1);
});

// Implements: REQ-DOC-04, REQ-DOC-10
test("el libro usa solamente calificaciones publicadas", () => {
  const initial = createInitialTeacherPreviewState();
  const before = gradebookOverview(initial);
  const draft = teacherPreviewReducer(initial, { type: "save_review_draft", submissionId: "sub-01", grade: 7, feedback: "Privada", rubric: { planteamiento: 2.2, desarrollo: 2.2, comunicacion: 2.1 } });
  assert.deepEqual(gradebookOverview(draft), before);
  const published = teacherPreviewReducer(draft, { type: "publish_review", submissionId: "sub-01", grade: 7, feedback: "Publicada", rubric: { planteamiento: 2.2, desarrollo: 2.2, comunicacion: 2.1 } });
  assert.equal(gradebookOverview(published).gradedCount, before.gradedCount + 1);
});

// Implements: REQ-DOC-02, REQ-DOC-03, REQ-DOC-11, REQ-DOC-14
test("la ruta no importa backend ni ofrece controles de entrega estudiantil", async () => {
  const folder = new URL("../app/preview/docente/", import.meta.url);
  const sources = await Promise.all([
    "page.tsx",
    "TeacherWorkspacePreview.tsx",
    "teacher-preview-model.ts",
    "teacher-preview-panels.tsx",
    "teacher-preview-dialogs.tsx",
  ].map((file) => readFile(new URL(file, folder), "utf8")));
  const source = sources.join("\n");
  assert.doesNotMatch(source, /firebase-classroom-client|firebase-client|@libsql|TURSO_DATABASE|localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(source, /type=["']file["']|Entregar actividad|Adjuntar entrega/i);
  assert.match(source, /@phosphor-icons\/react/);
  assert.match(source, /aria-live|role="alert"/);
});
