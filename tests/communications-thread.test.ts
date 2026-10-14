import assert from "node:assert/strict";
import test from "node:test";
import {
  awaitsTeamReply,
  dayLabel,
  firstUnreadMessageId,
  groupMessages,
  stampLabel,
  type DirectMessage,
  type MessageThreadSummary,
} from "../lib/communications.ts";

function message(id: string, authorId: string, createdAt: string): DirectMessage {
  return {
    id,
    courseId: "estatica",
    threadId: "student-1",
    authorId,
    authorName: authorId === "student-1" ? "Estudiante" : "Docente",
    body: `Mensaje ${id}`,
    createdAt,
  };
}

const NOW = new Date("2026-10-13T15:00:00.000Z");

test("REQ-COMM-08: la hora relativa sigue la voz de una mensajería", () => {
  assert.equal(stampLabel("2026-10-13T14:59:30.000Z", NOW), "Ahora");
  assert.equal(stampLabel("2026-10-13T14:35:00.000Z", NOW), "Hace 25 min");
  assert.equal(stampLabel("2026-10-13T12:05:00.000Z", NOW), "09:05");
  assert.equal(stampLabel("2026-10-12T15:00:00.000Z", NOW), "Ayer");
  assert.equal(stampLabel("2026-10-09T15:00:00.000Z", NOW), "Viernes");
  assert.match(stampLabel("2026-09-01T15:00:00.000Z", NOW), /^1 sept?\.?$/);
  assert.match(stampLabel("2025-09-01T15:00:00.000Z", NOW), /2025/);
  assert.equal(stampLabel("", NOW), "");
});

test("REQ-COMM-08: los días de la conversación se nombran como en el teléfono", () => {
  assert.equal(dayLabel("2026-10-13", NOW), "Hoy");
  assert.equal(dayLabel("2026-10-12", NOW), "Ayer");
  assert.equal(dayLabel("2026-10-06", NOW), "Martes, 6 de octubre");
});

test("REQ-COMM-08: agrupa turnos por autor, día y pausa de diez minutos", () => {
  const days = groupMessages(
    [
      message("1", "student-1", "2026-10-12T13:00:00.000Z"),
      message("2", "student-1", "2026-10-12T13:04:00.000Z"),
      message("3", "teacher", "2026-10-12T13:05:00.000Z"),
      message("4", "teacher", "2026-10-12T13:30:00.000Z"),
      message("5", "teacher", "2026-10-13T13:00:00.000Z"),
    ],
    "student-1"
  );
  assert.deepEqual(
    days.map((day) => day.key),
    ["2026-10-12", "2026-10-13"]
  );
  assert.deepEqual(
    days[0].runs.map((run) => [run.own, run.messages.map((item) => item.id)]),
    [
      [true, ["1", "2"]],
      [false, ["3"]],
      [false, ["4"]],
    ]
  );
  assert.equal(days[1].runs.length, 1);
});

test("REQ-COMM-02: el divisor de nuevos sólo marca mensajes ajenos posteriores al cursor", () => {
  const messages = [
    message("1", "teacher", "2026-10-12T13:00:00.000Z"),
    message("2", "student-1", "2026-10-12T14:00:00.000Z"),
    message("3", "teacher", "2026-10-12T15:00:00.000Z"),
  ];
  assert.equal(firstUnreadMessageId(messages, "2026-10-12T13:30:00.000Z", "student-1"), "3");
  assert.equal(firstUnreadMessageId(messages, undefined, "student-1"), "");
  assert.equal(firstUnreadMessageId(messages, "2026-10-12T16:00:00.000Z", "student-1"), "");
});

test("REQ-COMM-04: una consulta espera respuesta mientras el último mensaje sea del estudiante", () => {
  const thread: MessageThreadSummary = {
    id: "student-1",
    courseId: "estatica",
    studentId: "student-1",
    studentName: "Estudiante",
    studentEmail: "estudiante@alumnos.ubiobio.cl",
    latestBody: "¿Podría revisar mi consulta?",
    latestAuthorId: "student-1",
    latestAuthorName: "Estudiante",
    createdAt: "2026-10-12T13:00:00.000Z",
    updatedAt: "2026-10-12T13:00:00.000Z",
  };
  assert.equal(awaitsTeamReply(thread), true);
  assert.equal(awaitsTeamReply({ ...thread, latestAuthorId: "teacher" }), false);
});
