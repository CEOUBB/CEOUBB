import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { teamSchemeError } from "../lib/course-management.ts";
import {
  MAX_TEAM_MEMBERS,
  normalizeItems,
  normalizeTeams,
  submissionModeOf,
  teamForStudent,
  type GradeItem,
} from "../lib/grades.ts";
import { firebaseUidOf } from "../lib/section-roles.ts";

const require = createRequire(import.meta.url);
const { groupRowsByTeam, normalizeTeamSubmissionRequest, normalizeGradebookRequest } =
  require("../firebase/functions/grade-audit.js") as {
    groupRowsByTeam: (
      rows: { userId: string; scores: Record<string, number> }[],
      teamsByItem: Map<string, string[][]>
    ) => { userId: string; scores: Record<string, number> }[][];
    normalizeTeamSubmissionRequest: (value: unknown) => {
      courseId: string;
      evalId: string;
      teamId: string;
      memberIds: string[];
      sha256: string;
    };
    normalizeGradebookRequest: (value: unknown) => {
      items: { id: string; submissionMode: string; teams: { memberIds: string[] }[] }[];
    };
  };

function item(values: Partial<GradeItem> = {}): GradeItem {
  return {
    id: "taller-1",
    name: "Taller de laboratorio",
    weight: 100,
    date: "",
    submissionMode: "individual",
    teams: [],
    ...values,
  };
}

const VALID_SHA = "a".repeat(64);

test("una evaluación sin modalidad declarada se corrige como individual", () => {
  assert.equal(submissionModeOf({ submissionMode: undefined }), "individual");
  assert.equal(submissionModeOf({ submissionMode: "inventada" as never }), "individual");
  assert.equal(submissionModeOf({ submissionMode: "team_free" }), "team_free");
});

test("normalizeItems conserva los equipos sólo en la modalidad que los publica", () => {
  const teams = [{ id: "e1", name: "Equipo 1", memberIds: ["u1", "u2"] }];
  const [fixed] = normalizeItems([
    { id: "t1", name: "Taller", weight: 100, teams, submissionMode: "team_fixed" },
  ]);
  const [free] = normalizeItems([
    { id: "t1", name: "Taller", weight: 100, teams, submissionMode: "team_free" },
  ]);
  assert.deepEqual(fixed.teams, teams);
  assert.deepEqual(free.teams, []);
});

test("normalizeTeams descarta equipos vacíos y colapsa integrantes repetidos", () => {
  const teams = normalizeTeams([
    { id: "e1", name: "  ", memberIds: ["u1", "u1", "u2"] },
    { id: "e2", name: "Equipo 2", memberIds: [] },
    { id: "e3", name: "Equipo 3", memberIds: Array.from({ length: 20 }, (_, i) => `x${i}`) },
  ]);
  assert.equal(teams.length, 2);
  assert.deepEqual(teams[0].memberIds, ["u1", "u2"]);
  assert.equal(teams[0].name, "Equipo 1");
  assert.equal(teams[1].memberIds.length, MAX_TEAM_MEMBERS);
});

test("teamForStudent sólo resuelve equipos publicados por el docente", () => {
  const teams = [{ id: "e1", name: "Equipo 1", memberIds: ["u1", "u2"] }];
  assert.equal(teamForStudent(item({ submissionMode: "team_fixed", teams }), "u2")?.id, "e1");
  assert.equal(teamForStudent(item({ submissionMode: "team_fixed", teams }), "u9"), null);
  assert.equal(teamForStudent(item({ submissionMode: "team_free", teams }), "u1"), null);
});

test("teamSchemeError rechaza equipos inviables y acepta una nómina correcta", () => {
  assert.equal(teamSchemeError(item({ submissionMode: "team_fixed", teams: [] })) !== null, true);
  assert.match(
    teamSchemeError(
      item({
        submissionMode: "team_fixed",
        teams: [{ id: "e1", name: "Equipo 1", memberIds: ["u1"] }],
      })
    ) ?? "",
    /dos integrantes/
  );
  assert.match(
    teamSchemeError(
      item({
        submissionMode: "team_fixed",
        teams: [
          { id: "e1", name: "Equipo 1", memberIds: ["u1", "u2"] },
          { id: "e2", name: "Equipo 2", memberIds: ["u2", "u3"] },
        ],
      })
    ) ?? "",
    /a un equipo por evaluación/
  );
  assert.equal(
    teamSchemeError(
      item({
        submissionMode: "team_fixed",
        teams: [
          { id: "e1", name: "Equipo 1", memberIds: ["u1", "u2"] },
          { id: "e2", name: "Equipo 2", memberIds: ["u3", "u4"] },
        ],
      })
    ),
    null
  );
  assert.equal(teamSchemeError(item({ submissionMode: "team_free" })), null);
});

test("firebaseUidOf traduce el identificador de Turso al UID que indexa Firestore", () => {
  assert.equal(firebaseUidOf("firebase:AbC123"), "AbC123");
  assert.equal(firebaseUidOf("seed-teacher-01"), "seed-teacher-01");
});

test("la nota de una evaluación grupal se replica al equipo en un solo grupo", () => {
  const teamsByItem = new Map([["taller-1", [["u1", "u2", "u3"]]]]);
  const groups = groupRowsByTeam([{ userId: "u1", scores: { "taller-1": 6.2 } }], teamsByItem);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((row) => row.userId).sort(), ["u1", "u2", "u3"]);
  for (const row of groups[0]) assert.equal(row.scores["taller-1"], 6.2);
});

test("una evaluación individual dentro de la misma fila no sale del expediente propio", () => {
  const teamsByItem = new Map([["taller-1", [["u1", "u2"]]]]);
  const groups = groupRowsByTeam(
    [{ userId: "u1", scores: { "taller-1": 6.2, "certamen-1": 4.5 } }],
    teamsByItem
  );
  const byUser = new Map(groups.flat().map((row) => [row.userId, row.scores]));
  assert.deepEqual(byUser.get("u1"), { "taller-1": 6.2, "certamen-1": 4.5 });
  assert.deepEqual(byUser.get("u2"), { "taller-1": 6.2 });
});

test("cada estudiante se escribe una sola vez aunque comparta equipos en dos evaluaciones", () => {
  const teamsByItem = new Map([
    ["taller-1", [["u1", "u2"]]],
    ["taller-2", [["u2", "u3"]]],
  ]);
  const groups = groupRowsByTeam(
    [
      { userId: "u1", scores: { "taller-1": 5.0 } },
      { userId: "u3", scores: { "taller-2": 6.0 } },
    ],
    teamsByItem
  );
  const rows = groups.flat();
  assert.equal(rows.length, new Set(rows.map((row) => row.userId)).size);
  assert.equal(groups.length, 1, "los equipos enlazados por u2 deben confirmarse juntos");
});

test("la nota escrita explícitamente para un integrante manda sobre la réplica", () => {
  const teamsByItem = new Map([["taller-1", [["u1", "u2"]]]]);
  const groups = groupRowsByTeam(
    [
      { userId: "u1", scores: { "taller-1": 6.5 } },
      { userId: "u2", scores: { "taller-1": 4.0 } },
    ],
    teamsByItem
  );
  const byUser = new Map(groups.flat().map((row) => [row.userId, row.scores]));
  assert.equal(byUser.get("u1")?.["taller-1"], 6.5);
  assert.equal(byUser.get("u2")?.["taller-1"], 4.0);
});

test("sin equipos declarados la corrección conserva una transacción por estudiante", () => {
  const groups = groupRowsByTeam(
    [
      { userId: "u1", scores: { "certamen-1": 5.0 } },
      { userId: "u2", scores: { "certamen-1": 6.0 } },
    ],
    new Map()
  );
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups
      .flat()
      .map((row) => row.userId)
      .sort(),
    ["u1", "u2"]
  );
});

test("el comprobante de equipo exige integrantes, ruta y huella válidos", () => {
  const base = {
    courseId: "mat-101-2026-2-s1",
    evalId: "taller-1",
    teamId: "e1",
    memberIds: ["u1", "u2"],
    fileName: "informe.pdf",
    storagePath: "courses/mat-101-2026-2-s1/submissions/taller-1/u1/1_informe.pdf",
    contentType: "application/pdf",
    size: 120_000,
    sha256: VALID_SHA,
  };
  assert.equal(normalizeTeamSubmissionRequest(base).sha256, VALID_SHA);
  /* Un navegador sin `crypto.subtle` entrega sin huella; lo que no se acepta es
     una huella falsa. */
  assert.equal(normalizeTeamSubmissionRequest({ ...base, sha256: "" }).sha256, "");
  assert.throws(() => normalizeTeamSubmissionRequest({ ...base, sha256: "abc" }));
  assert.throws(() => normalizeTeamSubmissionRequest({ ...base, memberIds: ["u1"] }));
  assert.throws(() =>
    normalizeTeamSubmissionRequest({
      ...base,
      memberIds: Array.from({ length: MAX_TEAM_MEMBERS + 1 }, (_, i) => `u${i}`),
    })
  );
  assert.throws(() => normalizeTeamSubmissionRequest({ ...base, storagePath: "../secreto" }));
  assert.throws(() => normalizeTeamSubmissionRequest({ ...base, size: 0 }));
});

test("el servidor rechaza un libro con un estudiante en dos equipos de la misma evaluación", () => {
  const request = {
    courseId: "mat-101-2026-2-s1",
    exemption: 5,
    items: [
      {
        id: "taller-1",
        name: "Taller",
        weight: 100,
        date: "",
        submissionMode: "team_fixed",
        teams: [
          { id: "e1", name: "Equipo 1", memberIds: ["u1", "u2"] },
          { id: "e2", name: "Equipo 2", memberIds: ["u2", "u3"] },
        ],
      },
    ],
  };
  assert.throws(() => normalizeGradebookRequest(request));

  const valid = normalizeGradebookRequest({
    ...request,
    items: [
      {
        ...request.items[0],
        teams: [
          { id: "e1", name: "Equipo 1", memberIds: ["u1", "u2"] },
          { id: "e2", name: "Equipo 2", memberIds: ["u3", "u4"] },
        ],
      },
    ],
  });
  assert.equal(valid.items[0].submissionMode, "team_fixed");
  assert.equal(valid.items[0].teams.length, 2);
});
