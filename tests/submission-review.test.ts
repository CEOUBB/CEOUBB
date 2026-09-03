import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FEEDBACK_DEBOUNCE_MS,
  MAX_GUIDE_POSTS,
  REVIEW_FILTERS,
  SUBMISSION_STATE_LABELS,
  buildReviewQueue,
  createDeferredSave,
  filterReviewQueue,
  guidePosts,
  isPdfSubmission,
  isTypingTarget,
  parseGradeDraft,
  reviewProgress,
  stepIndex,
} from "../app/views/classroom/submission-review-model.ts";
import type {
  ClassroomPost,
  ClassroomStudent,
  StudentSubmission,
} from "../lib/firebase-classroom-client.ts";

const ITEM_ID = "certamen-1";
const DUE_DATE = "2026-05-10T23:59:00.000Z";

function student(userId: string, name: string): ClassroomStudent {
  return {
    userId,
    name,
    email: `${userId}@alumnos.ubiobio.cl`,
    completed: 0,
    total: 0,
    updatedAt: null,
  };
}

function submission(uid: string, createdAt: string, extra: Partial<StudentSubmission> = {}) {
  return {
    id: `${ITEM_ID}_${uid}`,
    evalId: ITEM_ID,
    uid,
    fileName: "informe.pdf",
    storagePath: `courses/mat-101/submissions/${ITEM_ID}/${uid}/1_informe.pdf`,
    contentType: "application/pdf",
    size: 120_000,
    createdAt,
    ...extra,
  } satisfies StudentSubmission;
}

const ROSTER = [
  student("u1", "Ana Rivas"),
  student("u2", "Bruno Soto"),
  student("u3", "Carla Díaz"),
  student("u4", "Diego Pino"),
];

function queue({
  submissions = [
    submission("u1", "2026-05-09T10:00:00.000Z"),
    submission("u2", "2026-05-11T08:30:00.000Z"),
    submission("u3", "2026-05-08T12:00:00.000Z"),
  ],
  classScores = { u3: { [ITEM_ID]: 6.4 } },
  classFeedback = { u1: { [ITEM_ID]: "Revisa la conclusión." } },
}: {
  submissions?: StudentSubmission[];
  classScores?: Record<string, Record<string, number>>;
  classFeedback?: Record<string, Record<string, string>>;
} = {}) {
  return buildReviewQueue(ROSTER, submissions, {
    itemId: ITEM_ID,
    dueDate: DUE_DATE,
    classScores,
    classFeedback,
  });
}

// Implements: REQ-REV-04
test("REQ-REV-04 deriva el estado de cada estudiante de la sección", () => {
  const rows = queue();
  assert.equal(rows.length, ROSTER.length);
  assert.deepEqual(
    rows.map((row) => row.state),
    ["review_draft", "late", "graded", "missing"]
  );
  assert.equal(rows[2].grade, 6.4);
  assert.equal(rows[3].submittedAt, "");
  assert.equal(rows[0].feedback, "Revisa la conclusión.");
});

// Implements: REQ-REV-04
test("REQ-REV-04 conserva sólo la entrega más reciente de cada estudiante", () => {
  const rows = queue({
    submissions: [
      submission("u1", "2026-05-01T09:00:00.000Z", { fileName: "borrador.pdf" }),
      submission("u1", "2026-05-09T09:00:00.000Z", { fileName: "final.pdf" }),
    ],
    classScores: {},
    classFeedback: {},
  });
  assert.equal(rows[0].fileName, "final.pdf");
  assert.equal(rows[0].state, "submitted");
});

// Implements: REQ-REV-04
test("REQ-REV-04 ignora comprobantes de otra evaluación", () => {
  const rows = queue({
    submissions: [submission("u1", "2026-05-09T09:00:00.000Z", { evalId: "control-2" })],
    classScores: {},
    classFeedback: {},
  });
  assert.equal(rows[0].state, "missing");
});

// Implements: REQ-REV-04
test("REQ-REV-04 filtra la cola por estado y por texto de búsqueda", () => {
  const rows = queue();
  assert.deepEqual(
    filterReviewQueue(rows, "missing", "").map((row) => row.name),
    ["Diego Pino"]
  );
  assert.deepEqual(
    filterReviewQueue(rows, "graded", "").map((row) => row.name),
    ["Carla Díaz"]
  );
  assert.deepEqual(
    filterReviewQueue(rows, "all", "diaz").map((row) => row.name),
    ["Carla Díaz"]
  );
  assert.deepEqual(
    filterReviewQueue(rows, "all", "u2@alumnos").map((row) => row.name),
    ["Bruno Soto"]
  );
  assert.equal(filterReviewQueue(rows, "graded", "Diego").length, 0);
  assert.equal(filterReviewQueue(rows, "all", "   ").length, rows.length);
});

// Implements: REQ-REV-04
test("REQ-REV-04 resume el avance de corrección de la evaluación", () => {
  assert.deepEqual(reviewProgress(queue()), { graded: 1, delivered: 3, total: 4 });
});

// Implements: REQ-REV-04
test("REQ-REV-04 ofrece un filtro por cada estado del ciclo de vida", () => {
  const offered = REVIEW_FILTERS.map((option) => option.value).filter((value) => value !== "all");
  assert.deepEqual(offered.sort(), Object.keys(SUBMISSION_STATE_LABELS).sort());
});

// Implements: REQ-REV-02
test("REQ-REV-02 acepta notas válidas en la escala chilena, con coma o punto", () => {
  assert.deepEqual(parseGradeDraft("5,8"), { score: 5.8, error: "" });
  assert.deepEqual(parseGradeDraft("5.8"), { score: 5.8, error: "" });
  assert.deepEqual(parseGradeDraft(" 7 "), { score: 7, error: "" });
  assert.deepEqual(parseGradeDraft("1,0"), { score: 1, error: "" });
  assert.deepEqual(parseGradeDraft(""), { score: null, error: "" });
});

// Implements: REQ-REV-02
test("REQ-REV-02 rechaza notas fuera de 1,0 a 7,0 y textos no numéricos", () => {
  for (const value of ["7,5", "0,8", "-3", "12"]) {
    const parsed = parseGradeDraft(value);
    assert.equal(parsed.score, null);
    assert.match(parsed.error, /entre 1,0 y 7,0/);
  }
  const typed = parseGradeDraft("muy bueno");
  assert.equal(typed.score, null);
  assert.match(typed.error, /cifras/);
});

// Implements: REQ-REV-02
test("REQ-REV-02 agrupa las pulsaciones en un solo guardado diferido", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [];
  const deferred = createDeferredSave((value) => saved.push(value));

  deferred.schedule("Bu");
  deferred.schedule("Buen");
  t.mock.timers.tick(FEEDBACK_DEBOUNCE_MS - 1);
  assert.deepEqual(saved, []);
  assert.equal(deferred.hasPending(), true);

  deferred.schedule("Buen trabajo");
  t.mock.timers.tick(FEEDBACK_DEBOUNCE_MS);
  assert.deepEqual(saved, ["Buen trabajo"]);
  assert.equal(deferred.hasPending(), false);

  t.mock.timers.tick(FEEDBACK_DEBOUNCE_MS * 3);
  assert.deepEqual(saved, ["Buen trabajo"]);
});

// Implements: REQ-REV-02
test("REQ-REV-02 vacía lo escrito al cambiar de alumno sin esperar el retardo", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [];
  const deferred = createDeferredSave((value) => saved.push(value));

  deferred.schedule("Falta la bibliografía");
  deferred.flush();
  assert.deepEqual(saved, ["Falta la bibliografía"]);

  deferred.flush();
  assert.deepEqual(saved, ["Falta la bibliografía"]);
});

// Implements: REQ-REV-02
test("REQ-REV-02 mantiene el retardo dentro del rango acordado", () => {
  assert.ok(FEEDBACK_DEBOUNCE_MS >= 600 && FEEDBACK_DEBOUNCE_MS <= 800);
});

// Implements: REQ-REV-03
test("REQ-REV-03 suprime los atajos cuando el foco está en un campo editable", () => {
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "input" }), true);
  assert.equal(isTypingTarget({ tagName: "SELECT" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "DIV" }), false);
  assert.equal(isTypingTarget(null), false);
});

// Implements: REQ-REV-03
test("REQ-REV-03 avanza y retrocede en la cola sin salirse de los extremos", () => {
  assert.equal(stepIndex(0, 4, 1), 1);
  assert.equal(stepIndex(3, 4, 1), 3);
  assert.equal(stepIndex(0, 4, -1), 0);
  assert.equal(stepIndex(2, 4, -1), 1);
  assert.equal(stepIndex(0, 0, 1), 0);
});

// Implements: REQ-REV-01
test("REQ-REV-01 reconoce qué entregas puede abrir el visor", () => {
  assert.equal(isPdfSubmission({ contentType: "application/pdf", fileName: "a.pdf" }), true);
  assert.equal(isPdfSubmission({ contentType: "", fileName: "informe.PDF" }), true);
  assert.equal(
    isPdfSubmission({
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "informe.docx",
    }),
    false
  );
});

// Implements: REQ-REV-05
test("REQ-REV-05 ofrece como pauta las publicaciones de certamen y guía", () => {
  const post = (id: string, kind: ClassroomPost["kind"]): ClassroomPost => ({
    id,
    authorId: "t1",
    authorEmail: "docente@ubiobio.cl",
    authorName: "Docente",
    authorRole: "teacher",
    title: `Publicación ${id}`,
    body: "Cuerpo",
    kind,
    folder: "",
    linkUrl: null,
    storagePath: "",
    attachments: [],
    dueDate: "",
    createdAt: "2026-05-01T10:00:00.000Z",
  });

  const selected = guidePosts([
    post("p1", "notice"),
    post("p2", "assessment"),
    post("p3", "resource"),
    post("p4", "guide"),
  ]);
  assert.deepEqual(
    selected.map((entry) => entry.id),
    ["p2", "p4"]
  );

  const many = Array.from({ length: MAX_GUIDE_POSTS + 5 }, (_, index) =>
    post(`g${index}`, "guide")
  );
  assert.equal(guidePosts(many).length, MAX_GUIDE_POSTS);
});

// Implements: REQ-REV-01
test("REQ-REV-01 carga el visor de PDF sólo en el cliente", async () => {
  const tray = await readFile("app/views/classroom/SubmissionReviewTray.tsx", "utf8");
  assert.match(tray, /dynamic\(\s*\(\) => import\("\.\/PDFViewerPane"\)/);
  assert.match(tray, /ssr:\s*false/);

  const pane = await readFile("app/views/classroom/PDFViewerPane.tsx", "utf8");
  assert.match(pane, /^"use client";/);
  assert.match(pane, /usePDFSlick/);
});

/*
  El paquete del visor trae un worker congelado en la versión de PDF.js con la
  que se publicó. Si la API que resuelve el proyecto avanza, PDF.js aborta cada
  documento con un error de versión y el visor queda inservible, así que el
  worker debe venir del mismo paquete que provee la API.
*/
// Implements: REQ-REV-01
test("REQ-REV-01 sirve el worker de PDF.js desde la misma versión que la API", async () => {
  const pane = await readFile("app/views/classroom/PDFViewerPane.tsx", "utf8");
  assert.match(pane, /GlobalWorkerOptions[\s\S]{0,80}from "pdfjs-dist"/);
  assert.match(
    pane,
    /GlobalWorkerOptions\.workerSrc = new URL\(\s*"pdfjs-dist\/build\/pdf\.worker\.min\.mjs",\s*import\.meta\.url\s*\)/
  );

  const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
    dependencies: Record<string, string>;
  };
  assert.ok(
    manifest.dependencies["pdfjs-dist"],
    "pdfjs-dist debe declararse como dependencia directa para fijar la versión del worker"
  );
});

// Implements: REQ-REV-04
test("REQ-REV-04 acota la escucha de entregas de la sección", async () => {
  const storage = await readFile("lib/firebase/storage.ts", "utf8");
  assert.match(storage, /export function watchSectionSubmissions/);
  assert.match(storage, /sdk\.limit\(MAX_SECTION_SUBMISSIONS\)/);
  assert.match(storage, /sdk\.where\("evalId", "==", evalId\)/);
});
