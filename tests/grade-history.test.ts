import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  canReadGradeHistory,
  parseGradeHistoryQuery,
  gradeHistoryPageSchema,
} from "../lib/grade-history.ts";
import { handleGradeHistory } from "../lib/grade-history-handler.ts";
import { buildGradeHistoryQuery, readGradeHistoryPage } from "../lib/services/grade-history.ts";

const sectionId = "mat-2026-2-1";
const query = { sectionId, studentId: "student-1", gradeItemId: "c1", cursor: null };
const changedAt = "2026-09-02T16:20:30.123456789Z";
const request = () =>
  new Request(
    `https://ceoubb.com/api/sections/${sectionId}/grade-history?studentId=firebase%3Astudent-1&gradeItemId=c1`
  );
const event = (id: string) => ({
  document: {
    name: `projects/demo/databases/(default)/documents/courses/${sectionId}/gradeAudit/${id}`,
    fields: {
      targetType: { stringValue: "score" },
      courseId: { stringValue: sectionId },
      studentId: { stringValue: "student-1" },
      gradeItemId: { stringValue: "c1" },
      actorUid: { stringValue: "teacher-1" },
      actorName: { stringValue: "Docente Original" },
      actorEmail: { stringValue: "docente@ubiobio.cl" },
      changedAt: { timestampValue: changedAt },
      previousValue: { nullValue: null },
      newValue: { doubleValue: 5.5 },
    },
  },
});

test("REQ-HISTORY-01: matriz de permisos por cuenta y sección", () => {
  assert.equal(canReadGradeHistory("owner", null), true);
  for (const role of ["teacher", "coordinator"] as const) {
    assert.equal(canReadGradeHistory("teacher", role), true);
    assert.equal(canReadGradeHistory("student", role), false);
  }
  assert.equal(canReadGradeHistory("student", "assistant"), true);
  assert.equal(canReadGradeHistory("teacher", "assistant"), true);
  assert.equal(canReadGradeHistory("teacher", "student"), false);
  assert.equal(canReadGradeHistory("teacher", null), false);
  assert.equal(canReadGradeHistory("student", "student"), false);
});

test("REQ-HISTORY-01: el controlador real deniega antes de consultar y no guarda caché", async () => {
  for (const [role, membership, status] of [
    [null, null, 401],
    ["student", "student", 403],
    ["teacher", null, 403],
    ["owner", null, 200],
    ["teacher", "teacher", 200],
    ["teacher", "coordinator", 200],
    ["student", "assistant", 200],
  ] as const) {
    let reads = 0;
    const response = await handleGradeHistory(request(), sectionId, {
      session: async () => (role ? { id: "actor", role } : null),
      membership: async () => membership,
      read: async (value) => {
        reads++;
        assert.deepEqual(value, query);
        return { items: [], nextCursor: null };
      },
    });
    assert.equal(response.status, status);
    assert.equal(reads, status === 200 ? 1 : 0);
    assert.match(response.headers.get("Cache-Control") ?? "", /private, no-store/);
  }
});

test("REQ-HISTORY-02: entrada y cursor conservan precisión y rechazan otro contexto", () => {
  assert.deepEqual(parseGradeHistoryQuery(request().url, sectionId), query);
  const cursor = { sectionId, studentId: "student-1", gradeItemId: "c1", changedAt, id: "event-9" };
  const url = new URL(request().url);
  url.searchParams.set("cursor", JSON.stringify(cursor));
  const parsed = parseGradeHistoryQuery(url.href, sectionId);
  assert.equal(parsed.cursor?.changedAt, changedAt);
  assert.equal(parsed.cursor?.id, "event-9");
  assert.throws(() => parseGradeHistoryQuery(url.href, "otra-seccion"));
  url.searchParams.set("studentId", "../student-2");
  assert.throws(() => parseGradeHistoryQuery(url.href, sectionId));
  url.searchParams.set("studentId", "student-1");
  url.searchParams.set("cursor", "{bad");
  assert.throws(() => parseGradeHistoryQuery(url.href, sectionId));
});

test("REQ-HISTORY-02: consulta indexada y acotada con desempate estable", () => {
  const built = buildGradeHistoryQuery(
    { ...query, cursor: { ...query, changedAt, id: "event-9" } },
    "demo"
  );
  assert.equal(built.limit, 26);
  assert.deepEqual(built.orderBy, [
    { field: { fieldPath: "changedAt" }, direction: "DESCENDING" },
    { field: { fieldPath: "__name__" }, direction: "DESCENDING" },
  ]);
  assert.deepEqual(
    built.where.compositeFilter.filters.map((filter) => filter.fieldFilter.value.stringValue),
    ["score", "student-1", "c1"]
  );
  assert.equal(built.startAt?.before, false);
  assert.deepEqual(built.startAt?.values[0], { timestampValue: changedAt });
  assert.deepEqual(built.startAt?.values[1], {
    referenceValue: `projects/demo/databases/(default)/documents/courses/${sectionId}/gradeAudit/event-9`,
  });
});

test("REQ-HISTORY-02/03: lector REST devuelve 25 eventos y cursor sin convertir timestamp", async () => {
  let calls = 0;
  const page = await readGradeHistoryPage(query, {
    token: async () => "test-token",
    projectId: "demo",
    fetch: async (url, init) => {
      calls++;
      assert.equal(
        String(url),
        `https://firestore.googleapis.com/v1/projects/demo/databases/(default)/documents/courses/${sectionId}:runQuery`
      );
      assert.equal(init?.method, "POST");
      assert.equal(JSON.parse(String(init?.body)).structuredQuery.limit, 26);
      return Response.json(Array.from({ length: 26 }, (_, i) => event(`event-${26 - i}`)));
    },
  });
  assert.equal(calls, 1);
  assert.equal(page.items.length, 25);
  assert.equal(page.items[0].actorName, "Docente Original");
  assert.equal(page.items[0].previousValue, null);
  assert.equal(page.items[0].newValue, 5.5);
  assert.equal(page.items[0].changedAt, changedAt);
  assert.equal(JSON.parse(page.nextCursor!).id, "event-2");
  assert.equal(JSON.parse(page.nextCursor!).changedAt, changedAt);
  assert.equal(gradeHistoryPageSchema.safeParse(page).success, true);
});

test("REQ-HISTORY-02/04: respuesta vacía válida; errores y datos ajenos fallan cerrados", async () => {
  const options = { token: async () => "test-token", projectId: "demo" };
  assert.deepEqual(
    await readGradeHistoryPage(query, {
      ...options,
      fetch: async () => Response.json([{ readTime: changedAt }]),
    }),
    { items: [], nextCursor: null }
  );
  await assert.rejects(
    readGradeHistoryPage(query, {
      ...options,
      fetch: async () => new Response("index missing", { status: 400 }),
    })
  );
  const wrong = event("wrong");
  wrong.document.fields.studentId.stringValue = "student-2";
  await assert.rejects(
    readGradeHistoryPage(query, { ...options, fetch: async () => Response.json([wrong]) })
  );
  const response = await handleGradeHistory(request(), sectionId, {
    session: async () => ({ id: "actor", role: "owner" }),
    membership: async () => null,
    read: async () => {
      throw new Error("secret-token and missing index");
    },
  });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|index/);
});

test("REQ-HISTORY-02: índice de historial coincide con filtros y orden", async () => {
  const config = JSON.parse(await readFile("firebase/firestore.indexes.json", "utf8"));
  assert.ok(
    config.indexes.some(
      (index: {
        collectionGroup: string;
        queryScope: string;
        fields: { fieldPath: string; order: string }[];
      }) =>
        index.collectionGroup === "gradeAudit" &&
        index.queryScope === "COLLECTION" &&
        ["targetType", "studentId", "gradeItemId", "changedAt"].every(
          (field, i) => index.fields[i]?.fieldPath === field
        ) &&
        index.fields[3].order === "DESCENDING"
    )
  );
});
