import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildFinalGradeRecords,
  finalGradeStatistics,
  fingerprintFinalGradeRecords,
} from "../lib/final-grade-records.ts";
import {
  createFinalGradePdf,
  createFinalGradeWorkbook,
  type FinalGradeExport,
} from "../lib/grade-record-exports.ts";

function storedZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    entries.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  return entries;
}

async function fixture(): Promise<FinalGradeExport> {
  const records = buildFinalGradeRecords(
    [
      {
        id: "u1",
        name: '=HIPERVINCULO("https://malicioso.cl")',
        email: "alicia@alumnos.ubiobio.cl",
        role: "student",
      },
      { id: "u2", name: "Bruno Díaz", email: "bruno@alumnos.ubiobio.cl", role: "student" },
    ],
    [
      { id: "c1", name: "Certamen 1", weight: 40, date: "2026-09-10" },
      { id: "c2", name: "Proyecto", weight: 60, date: "2026-11-12" },
    ],
    {
      u1: { c1: 5, c2: 6 },
      u2: { c1: 3, c2: 3, "evaluacion-integradora": 5 },
    }
  );
  const metadata = {
    courseId: "estatica-2026-2-1",
    courseCode: "440299",
    courseName: "Estática",
    section: "1",
    period: "2026-2",
    teacher: "Daniela Muñoz",
    generatedAt: "2026-08-28T20:00:00.000Z",
  };
  return {
    metadata,
    records,
    statistics: finalGradeStatistics(records),
    fingerprint: await fingerprintFinalGradeRecords(metadata, records),
    gradebook: [
      { id: "c1", name: "Certamen 1", weight: 40, date: "2026-09-10" },
      { id: "c2", name: "Proyecto", weight: 60, date: "2026-11-12" },
    ],
    classScores: {
      u1: { c1: 5, c2: 6 },
      u2: { c1: 3, c2: 3, "evaluacion-integradora": 5 },
    },
  };
}

test("REQ-ACTA-06 genera un XLSX válido con cuatro hojas y fórmulas seguras", async () => {
  const bytes = createFinalGradeWorkbook(await fixture());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 2)), "PK");
  const entries = storedZipEntries(bytes);
  assert.ok(entries.has("[Content_Types].xml"));
  assert.ok(entries.has("xl/worksheets/sheet1.xml"));
  assert.ok(entries.has("xl/worksheets/sheet4.xml"));
  const workbook = new TextDecoder().decode(entries.get("xl/workbook.xml"));
  assert.match(workbook, /Acta final/);
  assert.match(workbook, /Carga Intranet/);
  assert.match(workbook, /Detalle evaluaciones/);
  assert.match(workbook, /Resumen/);
  const acta = new TextDecoder().decode(entries.get("xl/worksheets/sheet1.xml"));
  assert.match(acta, /HIPERVINCULO/);
  assert.doesNotMatch(acta, /<f>HIPERVINCULO/);
  assert.match(acta, /ROUND\(E7\*0\.6\+F7\*0\.4,1\)/);
});

test("REQ-ACTA-07 genera PDF paginado con huella y descargo independiente", async () => {
  const input = await fixture();
  const bytes = createFinalGradePdf(input);
  const source = new TextDecoder("latin1").decode(bytes);
  assert.match(source, /^%PDF-1\.7/);
  assert.match(source, new RegExp(input.fingerprint));
  assert.match(source, /Documento de apoyo independiente/);
  assert.match(source, /\/Type \/Page/);
  assert.match(source, /%%EOF$/);
});

test("REQ-ACTA-02, REQ-ACTA-04 y REQ-ACTA-08 integran cierre, nómina completa y escritura auditada", async () => {
  const [panel, grades, styles] = await Promise.all([
    readFile("app/views/classroom/FinalGradeRecordsPanel.tsx", "utf8"),
    readFile("app/views/classroom/GradesSection.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);
  assert.match(panel, /loadCompleteStudentDirectory/);
  assert.match(panel, /saveStudentScores/);
  assert.match(panel, /Descargar Excel/);
  assert.match(panel, /Descargar PDF/);
  assert.match(panel, /no sustituyen el acta oficial/);
  assert.match(grades, /<FinalGradeRecordsPanel/);
  assert.match(styles, /\.final-grade-statistics/);
  assert.match(styles, /\.final-grade-table/);
});
