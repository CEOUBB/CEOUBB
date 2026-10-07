import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  emptyParticipantCounts,
  groupParticipants,
  participantContactHref,
  participantCount,
  participantGroupCount,
  parseParticipantDirectoryPage,
  parseParticipantDirectoryRequest,
  type ParticipantDirectoryEntry,
} from "../lib/participants.ts";

const participants: ParticipantDirectoryEntry[] = [
  {
    id: "teacher-1",
    name: "Daniela Muñoz",
    email: "daniela.munoz@ubiobio.cl",
    role: "teacher",
  },
  {
    id: "coordinator-1",
    name: "Sergio Díaz",
    email: "sergio.diaz@ubiobio.cl",
    role: "coordinator",
  },
  {
    id: "assistant-1",
    name: "Camila Soto",
    email: "camila.soto@alumnos.ubiobio.cl",
    role: "assistant",
  },
  {
    id: "student-1",
    name: "Martín Pérez",
    email: "martin.perez@alumnos.ubiobio.cl",
    role: "student",
  },
];

test("REQ-PART-03 groups teaching staff, assistants and students without losing roles", () => {
  const groups = groupParticipants(participants);
  assert.deepEqual(
    groups.teaching.map((participant) => participant.id),
    ["teacher-1", "coordinator-1"]
  );
  assert.deepEqual(
    groups.assistant.map((participant) => participant.id),
    ["assistant-1"]
  );
  assert.deepEqual(
    groups.student.map((participant) => participant.id),
    ["student-1"]
  );

  const counts = emptyParticipantCounts();
  for (const participant of participants) counts[participant.role] += 1;
  assert.equal(participantGroupCount(counts, "teaching"), 2);
  assert.equal(participantGroupCount(counts, "assistant"), 1);
  assert.equal(participantGroupCount(counts, "student"), 1);
  assert.equal(participantCount(counts), 4);
});

test("REQ-PART-04 creates one safe mail recipient with section context", () => {
  const href = participantContactHref("camila.soto@alumnos.ubiobio.cl", "440299", "1");
  assert.ok(href);
  assert.match(href, /^mailto:camila\.soto@alumnos\.ubiobio\.cl\?subject=/);
  assert.match(decodeURIComponent(href), /Consulta 440299 · Sección 1/);
  assert.equal(participantContactHref("persona\r\n@ejemplo.cl", "440299", "1"), null);
  assert.equal(participantContactHref("sin-correo", "440299", "1"), null);
});

test("REQ-PART-02 and REQ-PART-06 validate search, filters, cursor and page ceiling", () => {
  assert.deepEqual(
    parseParticipantDirectoryRequest(
      "https://ceoubb.com/api/sections/estatica/participants?q=%20camila%20&role=teaching&limit=500&cursor=user-24"
    ),
    {
      query: "camila",
      role: "teaching",
      roles: ["teacher", "coordinator"],
      cursor: "user-24",
      limit: 50,
    }
  );
  assert.deepEqual(
    parseParticipantDirectoryRequest(
      `https://ceoubb.com/api/sections/estatica/participants?q=${"a".repeat(81)}`
    ),
    { error: "La búsqueda no puede superar 80 caracteres." }
  );
  assert.deepEqual(
    parseParticipantDirectoryRequest(
      "https://ceoubb.com/api/sections/estatica/participants?role=owner"
    ),
    { error: "El filtro de rol no es válido." }
  );
  assert.deepEqual(
    parseParticipantDirectoryRequest(
      "https://ceoubb.com/api/sections/estatica/participants?limit=cinco"
    ),
    { error: "El límite no es válido." }
  );
});

test("REQ-PART-02 rejects malformed or duplicate directory rows", () => {
  const valid = {
    items: participants,
    counts: { teacher: 1, coordinator: 1, assistant: 1, student: 1 },
    nextCursor: "student-1",
  };
  assert.deepEqual(parseParticipantDirectoryPage(valid), valid);
  assert.equal(
    parseParticipantDirectoryPage({
      ...valid,
      items: [...participants, { ...participants[0] }],
    }),
    null
  );
  assert.equal(
    parseParticipantDirectoryPage({
      ...valid,
      items: [{ ...participants[0], role: "owner" }],
    }),
    null
  );
  assert.equal(parseParticipantDirectoryPage({ ...valid, counts: { student: 4 } }), null);
});

test("REQ-PART-01 through REQ-PART-06 remain wired across API, query and interface", async () => {
  const [catalog, route, view, styles] = await Promise.all([
    readFile(new URL("../lib/services/academic-catalog.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/sections/[sectionId]/participants/route.ts", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../app/views/classroom/PeopleSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(catalog, /function activeSectionRoleForUser[\s\S]*?\.limit\(1\)/);
  assert.match(catalog, /function listSectionRoster[\s\S]*?\.limit\(limit \+ 1\)/);
  assert.match(catalog, /rosterSearchCondition\(options\.query\)/);
  assert.match(route, /getSessionUser\(request\)/);
  assert.match(route, /activeSectionRoleForUser\(actor\.id, sectionId\)/);
  assert.match(route, /private, no-store/);
  assert.match(route, /Promise\.all/);
  assert.match(view, /placeholder="Buscar por nombre o correo"/);
  assert.match(view, /Equipo docente/);
  assert.match(view, /Ayudantes/);
  assert.match(view, /participantContactHref/);
  assert.match(view, /aria-live="polite"/);
  assert.match(styles, /\.participant-row[\s\S]*?content-visibility: auto/);
});
