import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseAcademicSections, partitionAcademicCourses } from "../lib/courses.ts";
import {
  academicPeriodDocumentPath,
  academicSectionDocumentPath,
  toAcademicPeriodWrite,
  toAcademicSectionWrite,
} from "../lib/services/enrollment-projection.ts";

const repeatedSubjectSections = [
  {
    seccionId: "mat101-2025-2-1",
    asignaturaCodigo: "MAT101",
    asignaturaNombre: "Matemática I",
    periodoId: "2025-2",
    periodoNombre: "Segundo semestre 2025",
    periodoEstado: "archivado",
    numeroSeccion: 1,
    docenteId: "teacher-1",
    docenteNombre: "Docente Uno",
    rolSeccion: "student",
  },
  {
    seccionId: "mat101-2026-2-3",
    asignaturaCodigo: "MAT101",
    asignaturaNombre: "Matemática I",
    periodoId: "2026-2",
    periodoNombre: "Segundo semestre 2026",
    periodoEstado: "abierto",
    numeroSeccion: 3,
    docenteId: "teacher-2",
    docenteNombre: "Docente Dos",
    rolSeccion: "student",
  },
] as const;

test("REQ-ARCH-03/04/05: open and historical attempts remain separate courses", () => {
  const sections = parseAcademicSections(repeatedSubjectSections);
  const result = partitionAcademicCourses(sections);

  assert.equal(result.current.length, 1);
  assert.equal(result.archived.length, 1);
  assert.equal(result.current[0].id, "mat101-2026-2-3");
  assert.equal(result.archived[0].id, "mat101-2025-2-1");
  assert.equal(result.current[0].code, result.archived[0].code);
  assert.notEqual(result.current[0].id, result.archived[0].id);
  assert.equal(result.current[0].readOnly, false);
  assert.equal(result.archived[0].readOnly, true);
});

test("REQ-ARCH-04: malformed and duplicate academic sections fail closed", () => {
  const valid = repeatedSubjectSections[1];
  assert.deepEqual(parseAcademicSections([valid]), [valid]);
  assert.deepEqual(parseAcademicSections([{ ...valid, periodoEstado: "vigente" }]), []);
  assert.deepEqual(parseAcademicSections([{ ...valid, seccionId: "con/barra" }]), []);
  assert.deepEqual(parseAcademicSections([{ ...valid, rolSeccion: "owner" }]), []);
  assert.deepEqual(parseAcademicSections([valid, valid]), []);
});

test("REQ-ARCH-01/02: section and period projections use narrow deterministic paths", () => {
  assert.equal(
    academicSectionDocumentPath("mat101-2026-2-3", "centro-de-estudio-ubb"),
    "projects/centro-de-estudio-ubb/databases/(default)/documents/academicSections/mat101-2026-2-3"
  );
  assert.equal(
    academicPeriodDocumentPath("2026-2", "centro-de-estudio-ubb"),
    "projects/centro-de-estudio-ubb/databases/(default)/documents/academicPeriods/2026-2"
  );

  const sectionWrite = toAcademicSectionWrite(
    { seccionId: "mat101-2026-2-3", periodoId: "2026-2" },
    "centro-de-estudio-ubb"
  );
  assert.ok("update" in sectionWrite);
  assert.deepEqual(sectionWrite.update.fields, {
    seccionId: { stringValue: "mat101-2026-2-3" },
    periodoId: { stringValue: "2026-2" },
  });
  assert.deepEqual(sectionWrite.updateMask.fieldPaths, ["seccionId", "periodoId"]);

  const periodWrite = toAcademicPeriodWrite(
    {
      periodoId: "2026-2",
      status: "archivado",
      updatedAt: "2026-12-31T23:59:59.000Z",
    },
    "centro-de-estudio-ubb"
  );
  assert.ok("update" in periodWrite);
  assert.deepEqual(periodWrite.update.fields, {
    periodoId: { stringValue: "2026-2" },
    status: { stringValue: "archivado" },
    updatedAt: { stringValue: "2026-12-31T23:59:59.000Z" },
  });
});

test("REQ-ARCH-01/06/07: archival is owner-only, bounded, idempotent, and non-destructive", async () => {
  const [service, route] = await Promise.all([
    readFile(new URL("../lib/services/academic-period-archive.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/admin/periods/[periodId]/archive/route.ts", import.meta.url),
      "utf8"
    ),
  ]);

  assert.match(service, /archiveAcademicPeriod/);
  assert.match(service, /projectAcademicSectionsToFirestore/);
  assert.match(service, /projectAcademicPeriodToFirestore/);
  assert.match(service, /\.limit\(limit \+ 1\)/);
  assert.match(service, /estado: "archivado"/);
  assert.doesNotMatch(service, /delete\(periodos\)|delete\(secciones\)|delete\(matriculas\)/);
  assert.match(route, /getSessionUser\(request\)/);
  assert.match(route, /actor\.role !== "owner"/);
  assert.match(route, /archiveAcademicPeriod\(periodId\)/);
  assert.match(route, /params: Promise<\{ periodId: string \}>/);
});

test("REQ-ARCH-02: Firebase and privileged grade mutations require an open section", async () => {
  const [firestore, storage, functions] = await Promise.all([
    readFile(new URL("../firebase/firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../firebase/storage.rules", import.meta.url), "utf8"),
    readFile(new URL("../firebase/functions/index.js", import.meta.url), "utf8"),
  ]);

  for (const rules of [firestore, storage]) {
    assert.match(rules, /function sectionIsWritable\(seccionId\)/);
    assert.match(rules, /academicSections/);
    assert.match(rules, /academicPeriods/);
    assert.match(rules, /status == 'abierto'/);
  }
  assert.match(firestore, /allow create:[^;]+sectionIsWritable\(courseId\)/);
  assert.match(firestore, /allow update:[^;]+sectionIsWritable\(courseId\)/);
  assert.match(firestore, /allow delete:[^;]+sectionIsWritable\(courseId\)/);
  assert.match(storage, /allow create, update:[^;]+sectionIsWritable\(courseId\)/);
  assert.match(storage, /allow delete:[^;]+sectionIsWritable\(courseId\)/);
  assert.match(functions, /assertSectionWritable/);
  assert.match(functions, /await assertSectionWritable\(db, courseId\)/);
});

test("REQ-ARCH-03/04: portal exposes history and marks archived classrooms read-only", async () => {
  const [dashboard, classroom, portal] = await Promise.all([
    readFile(new URL("../app/views/CoursesDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Portal.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /Ramos archivados/);
  assert.match(dashboard, /archivedCourses/);
  assert.match(classroom, /Solo lectura/);
  assert.match(classroom, /course\.readOnly/);
  assert.match(portal, /partitionAcademicCourses/);
  assert.match(portal, /current\.map\(\(item\) => item\.id\)/);
});
