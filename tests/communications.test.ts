import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_COMMUNICATION_ITEMS,
  MESSAGE_EMPTY_ERROR,
  MESSAGE_TOO_LONG_ERROR,
  announcementCursorKey,
  canListStudentThreads,
  mergeMessageThreads,
  normalizeMessageBody,
  threadCursorKey,
  unreadCommunicationCount,
  type CommunicationReadCursor,
  type MessageThreadSummary,
} from "../lib/communications.ts";

function thread(
  id: string,
  courseId: string,
  updatedAt: string,
  latestAuthorId = "teacher-1"
): MessageThreadSummary {
  return {
    id,
    courseId,
    studentId: id,
    studentName: `Estudiante ${id}`,
    studentEmail: `${id}@alumnos.ubiobio.cl`,
    latestBody: `Mensaje ${id}`,
    latestAuthorId,
    latestAuthorName: "Docente",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt,
  };
}

test("REQ-COMM-06: normaliza mensajes y rechaza entradas vacías o sobre 2.000 caracteres", () => {
  assert.equal(
    normalizeMessageBody("  Primera línea\r\nsegunda línea  "),
    "Primera línea\nsegunda línea"
  );
  assert.throws(() => normalizeMessageBody(" \n\t "), { message: MESSAGE_EMPTY_ERROR });
  assert.equal(normalizeMessageBody("a".repeat(2000)).length, 2000);
  assert.throws(() => normalizeMessageBody("a".repeat(2001)), {
    message: MESSAGE_TOO_LONG_ERROR,
  });
});

test("REQ-COMM-02: genera cursores deterministas para avisos y conversaciones", () => {
  assert.equal(announcementCursorKey("estatica"), "course:estatica");
  assert.equal(threadCursorKey("estatica", "student-1"), "thread:estatica:student-1");
});

test("REQ-COMM-04 y REQ-COMM-05: sólo autoridad docente lista hilos ajenos", () => {
  assert.equal(canListStudentThreads("owner", "student"), true);
  assert.equal(canListStudentThreads("teacher", "teacher"), true);
  assert.equal(canListStudentThreads("teacher", "coordinator"), true);
  assert.equal(canListStudentThreads("student", "assistant"), false);
  assert.equal(canListStudentThreads("student", "student"), false);
});

test("REQ-COMM-07: mezcla, deduplica y limita hilos por recencia", () => {
  const bySection = new Map<string, MessageThreadSummary[]>();
  bySection.set("estatica", [
    thread("student-1", "estatica", "2026-08-23T10:00:00.000Z"),
    thread("student-2", "estatica", "2026-08-23T12:00:00.000Z"),
  ]);
  bySection.set("edo", [
    thread("student-1", "estatica", "2026-08-23T13:00:00.000Z"),
    ...Array.from({ length: MAX_COMMUNICATION_ITEMS + 8 }, (_, index) =>
      thread(
        `student-extra-${index}`,
        "edo",
        `2026-08-${String(22 - (index % 20)).padStart(2, "0")}T09:00:00.000Z`
      )
    ),
  ]);

  const merged = mergeMessageThreads(bySection);
  assert.equal(merged.length, MAX_COMMUNICATION_ITEMS);
  assert.equal(merged[0]?.id, "student-1");
  assert.equal(new Set(merged.map((item) => `${item.courseId}:${item.id}`)).size, merged.length);
  assert.ok(
    merged.every((item, index) => index === 0 || merged[index - 1].updatedAt >= item.updatedAt)
  );
});

test("REQ-COMM-02: cuenta avisos y respuestas ajenas posteriores al cursor", () => {
  const cursors: CommunicationReadCursor[] = [
    { key: announcementCursorKey("estatica"), readAt: "2026-08-23T10:30:00.000Z" },
    { key: threadCursorKey("estatica", "student-1"), readAt: "2026-08-23T10:30:00.000Z" },
  ];
  const activity = [
    {
      id: "post-old",
      courseId: "estatica",
      title: "Antiguo",
      kind: "notice" as const,
      dueDate: "",
      createdAt: "2026-08-23T10:00:00.000Z",
    },
    {
      id: "post-new",
      courseId: "estatica",
      title: "Nuevo",
      kind: "notice" as const,
      dueDate: "",
      createdAt: "2026-08-23T11:00:00.000Z",
    },
  ];
  const threads = [
    thread("student-1", "estatica", "2026-08-23T11:30:00.000Z", "teacher-1"),
    thread("student-2", "edo", "2026-08-23T12:00:00.000Z", "current-user"),
  ];
  assert.equal(unreadCommunicationCount(activity, threads, cursors, "current-user"), 2);
});

test("REQ-COMM-05 y REQ-COMM-06: las reglas aíslan hilos y hacen mensajes inmutables", () => {
  const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/courses\/\{courseId\}\/messageThreads\/\{threadId\}/);
  assert.match(rules, /request\.auth\.uid == threadId/);
  assert.match(rules, /teachesSection\(courseId\)/);
  assert.match(rules, /match \/messages\/\{messageId\}/);
  assert.match(rules, /request\.resource\.data\.body\.size\(\) <= 2000/);
  assert.match(rules, /request\.resource\.data\.createdAt == request\.time/);
  assert.match(rules, /allow update, delete: if false/);
  assert.doesNotMatch(rules, /match \/\{path=\*\*\}/);
});

test("REQ-COMM-02: los cursores son privados y usan el reloj del servidor", () => {
  const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/notificationReads\/\{cursorId\}/);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.match(rules, /request\.resource\.data\.readAt == request\.time/);
});

test("REQ-COMM-07: todos los listeners de comunicaciones tienen límites explícitos", () => {
  const source = readFileSync(
    new URL("../lib/firebase/communications.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /MAX_THREAD_SUMMARIES_PER_SECTION = 25/);
  assert.match(source, /MAX_MESSAGES_PER_THREAD = 100/);
  assert.match(source, /MAX_READ_CURSORS = 200/);
  assert.match(source, /sdk\.limit\(MAX_THREAD_SUMMARIES_PER_SECTION\)/);
  assert.match(source, /sdk\.limitToLast\(MAX_MESSAGES_PER_THREAD\)/);
  assert.match(source, /sdk\.limit\(MAX_READ_CURSORS\)/);
  assert.doesNotMatch(source, /collectionGroup/);
});

test("REQ-COMM-08: el centro está disponible en cabecera, riel y barra móvil", () => {
  const portal = readFileSync(new URL("../app/Portal.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../app/portal-shell.tsx", import.meta.url), "utf8");
  const types = readFileSync(new URL("../app/portal-types.ts", import.meta.url), "utf8");
  const center = readFileSync(
    new URL("../app/views/CommunicationsCenter.tsx", import.meta.url),
    "utf8"
  );
  assert.match(types, /label: "Avisos y mensajes"/);
  assert.match(shell, /aria-label=.*Avisos y mensajes/);
  assert.match(portal, /label: "Avisos"/);
  assert.match(center, /role="tablist"/);
  assert.match(center, /Marcar todo como leído/);
  assert.match(center, /Escribir al equipo docente/);
  assert.match(center, /maxLength=\{2000\}/);
  assert.match(center, /role="status"/);
});
