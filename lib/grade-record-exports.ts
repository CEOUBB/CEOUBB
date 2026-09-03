import {
  finalGradeOutcomeLabel,
  type FinalGradeMetadata,
  type FinalGradeRecord,
  type FinalGradeStatistics,
} from "./final-grade-records.ts";
import type { GradeItem, GradeScores } from "./grades.ts";

export type FinalGradeExport = {
  metadata: FinalGradeMetadata;
  records: readonly FinalGradeRecord[];
  statistics: FinalGradeStatistics;
  fingerprint: string;
  gradebook: readonly GradeItem[];
  classScores: Readonly<Record<string, GradeScores>>;
};

type WorkbookCell =
  | { type: "text"; value: string; style?: number }
  | { type: "number"; value: number; style?: number }
  | { type: "formula"; formula: string; value: number | string | null; style?: number };

type WorkbookRow = { cells: readonly WorkbookCell[]; height?: number };

const utf8 = new TextEncoder();

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function workbookCell(cell: WorkbookCell, column: number, row: number): string {
  const reference = `${columnName(column)}${row}`;
  const style = cell.style === undefined ? "" : ` s="${cell.style}"`;
  if (cell.type === "text") {
    return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(cell.value)}</t></is></c>`;
  }
  if (cell.type === "number") {
    return `<c r="${reference}"${style}><v>${cell.value}</v></c>`;
  }
  if (typeof cell.value === "string") {
    return `<c r="${reference}" t="str"${style}><f>${xml(cell.formula)}</f><v>${xml(cell.value)}</v></c>`;
  }
  const cached = cell.value === null ? "" : String(cell.value);
  return `<c r="${reference}"${style}><f>${xml(cell.formula)}</f><v>${cached}</v></c>`;
}

function worksheetXml(
  rows: readonly WorkbookRow[],
  widths: readonly number[],
  options: { freezeRows?: number; autoFilter?: string; merges?: readonly string[] } = {}
): string {
  let maxColumns = 1;
  for (const row of rows) {
    if (row.cells.length > maxColumns) maxColumns = row.cells.length;
  }
  const rowXml = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}"${row.height ? ` ht="${row.height}" customHeight="1"` : ""}>${row.cells
          .map((cell, columnIndex) => workbookCell(cell, columnIndex, rowIndex + 1))
          .join("")}</row>`
    )
    .join("");
  const columns = widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    )
    .join("");
  const freeze = options.freezeRows
    ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${options.freezeRows}" topLeftCell="A${options.freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>`;
  const merges = options.merges?.length
    ? `<mergeCells count="${options.merges.length}">${options.merges
        .map((range) => `<mergeCell ref="${range}"/>`)
        .join("")}</mergeCells>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(maxColumns - 1)}${Math.max(rows.length, 1)}"/>${freeze}<sheetFormatPr defaultRowHeight="18"/><cols>${columns}</cols><sheetData>${rowXml}</sheetData>${merges}${options.autoFilter ? `<autoFilter ref="${options.autoFilter}"/>` : ""}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function textCell(value: string, style = 4): WorkbookCell {
  return { type: "text", value, style };
}

function numberCell(value: number | null, style = 3): WorkbookCell {
  return value === null ? textCell("", style) : { type: "number", value, style };
}

function formulaCell(formula: string, value: number | string | null, style = 3): WorkbookCell {
  return { type: "formula", formula, value, style };
}

function recordDocumentTitle(input: FinalGradeExport): string {
  return input.statistics.pending > 0
    ? "PRE-ACTA DE CALIFICACIONES"
    : "ACTA FINAL DE CALIFICACIONES";
}

function actaRows(input: FinalGradeExport): WorkbookRow[] {
  const header = [
    "N°",
    "Identificador institucional",
    "Nombre completo",
    "Correo institucional",
    "Promedio parciales",
    "Evaluación integradora",
    "Nota final",
    "Situación",
  ].map((value) => textCell(value, 2));
  return [
    { cells: [textCell(recordDocumentTitle(input), 1)], height: 28 },
    {
      cells: [
        textCell(
          `${input.metadata.courseCode} · ${input.metadata.courseName} · Sección ${input.metadata.section}`,
          5
        ),
      ],
    },
    {
      cells: [
        textCell(
          `${input.metadata.period} · Docente: ${input.metadata.teacher} · Generada: ${input.metadata.generatedAt}`,
          5
        ),
      ],
    },
    { cells: [textCell("")] },
    {
      cells: [
        textCell(
          "Documento de apoyo independiente. No sustituye el acta oficial registrada en Intranet UBB.",
          5
        ),
      ],
    },
    { cells: header, height: 30 },
    ...input.records.map((record, index) => {
      const row = index + 7;
      const finalFormula = `IF(E${row}="","",IF(AND(E${row}>=2,E${row}<=3.9),IF(F${row}="","",ROUND(E${row}*0.6+F${row}*0.4,1)),IF(F${row}="",E${row},ROUND(E${row}*0.6+F${row}*0.4,1))))`;
      return {
        cells: [
          numberCell(index + 1, 4),
          textCell(record.institutionalId),
          textCell(record.name),
          textCell(record.email),
          numberCell(record.partialAverage),
          numberCell(record.integrativeGrade),
          formulaCell(finalFormula, record.finalGrade),
          textCell(finalGradeOutcomeLabel(record.outcome)),
        ],
      };
    }),
  ];
}

function intranetRows(input: FinalGradeExport): WorkbookRow[] {
  return [
    { cells: [textCell("CARGA INTRANET UBB", 1)], height: 28 },
    {
      cells: [
        textCell(
          "Copie identificador y nota final en el mecanismo institucional vigente. Las filas pendientes quedan vacías.",
          5
        ),
      ],
    },
    { cells: [textCell("")] },
    {
      cells: ["Identificador institucional", "Nombre completo", "Nota final", "Situación"].map(
        (value) => textCell(value, 2)
      ),
    },
    ...input.records.map((record, index) => {
      const sourceRow = index + 7;
      return {
        cells: [
          formulaCell(`'Acta final'!B${sourceRow}`, record.institutionalId, 4),
          formulaCell(`'Acta final'!C${sourceRow}`, record.name, 4),
          formulaCell(`'Acta final'!G${sourceRow}`, record.finalGrade),
          formulaCell(`'Acta final'!H${sourceRow}`, finalGradeOutcomeLabel(record.outcome), 4),
        ],
      };
    }),
  ];
}

function detailRows(input: FinalGradeExport): WorkbookRow[] {
  const header = [
    "Identificador institucional",
    "Nombre completo",
    ...input.gradebook.map((item) => `${item.name} (${item.weight}%)`),
    "Promedio parciales",
  ].map((value) => textCell(value, 2));
  return [
    { cells: [textCell("DETALLE DE EVALUACIONES PARCIALES", 1)], height: 28 },
    {
      cells: [
        textCell(
          `${input.metadata.courseCode} · ${input.metadata.courseName} · Sección ${input.metadata.section}`,
          5
        ),
      ],
    },
    { cells: [textCell("")] },
    { cells: header, height: 30 },
    ...input.records.map((record) => {
      const scores = input.classScores[record.userId] ?? {};
      return {
        cells: [
          textCell(record.institutionalId),
          textCell(record.name),
          ...input.gradebook.map((item) =>
            typeof scores[item.id] === "number" ? numberCell(scores[item.id]) : textCell("")
          ),
          numberCell(record.partialAverage),
        ],
      };
    }),
  ];
}

function summaryRows(input: FinalGradeExport): WorkbookRow[] {
  const { metadata, statistics } = input;
  const fields: [string, string | number][] = [
    ["Código", metadata.courseCode],
    ["Asignatura", metadata.courseName],
    ["Sección", metadata.section],
    ["Período", metadata.period],
    ["Docente responsable", metadata.teacher],
    ["Generada", metadata.generatedAt],
    ["Total estudiantes", statistics.total],
    ["Aprobados", statistics.passed],
    ["Reprobados", statistics.failed],
    ["Pendientes", statistics.pending],
    ["En condición de integradora", statistics.integrativeRequired],
    ["Integradoras pendientes", statistics.integrativePending],
    ["Promedio de la sección", statistics.sectionAverage ?? "Pendiente"],
    ["Huella SHA-256", input.fingerprint],
  ];
  return [
    { cells: [textCell("RESUMEN Y CERTIFICACIÓN DOCENTE", 1)], height: 28 },
    {
      cells: [
        textCell(
          "Huella de integridad de la instantánea; no equivale a firma electrónica avanzada ni a certificación oficial UBB.",
          5
        ),
      ],
    },
    { cells: [textCell("")] },
    ...fields.map(([label, value]) => ({
      cells: [textCell(label, 2), typeof value === "number" ? numberCell(value) : textCell(value)],
    })),
  ];
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function bytesOf(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

function little16(value: number): Uint8Array {
  return bytesOf(value & 0xff, (value >>> 8) & 0xff);
}

function little32(value: number): Uint8Array {
  return bytesOf(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function zipStore(entries: readonly { name: string; content: string }[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = utf8.encode(entry.name);
    const data = utf8.encode(entry.content);
    const checksum = crc32(data);
    const local = concatenate([
      little32(0x04034b50),
      little16(20),
      little16(0x0800),
      little16(0),
      little16(0),
      little16(33),
      little32(checksum),
      little32(data.length),
      little32(data.length),
      little16(name.length),
      little16(0),
      name,
      data,
    ]);
    localParts.push(local);
    centralParts.push(
      concatenate([
        little32(0x02014b50),
        little16(20),
        little16(20),
        little16(0x0800),
        little16(0),
        little16(0),
        little16(33),
        little32(checksum),
        little32(data.length),
        little32(data.length),
        little16(name.length),
        little16(0),
        little16(0),
        little16(0),
        little16(0),
        little32(0),
        little32(localOffset),
        name,
      ])
    );
    localOffset += local.length;
  }
  const central = concatenate(centralParts);
  const end = concatenate([
    little32(0x06054b50),
    little16(0),
    little16(0),
    little16(entries.length),
    little16(entries.length),
    little32(central.length),
    little32(localOffset),
    little16(0),
  ]);
  return concatenate([...localParts, central, end]);
}

function workbookEntries(input: FinalGradeExport): { name: string; content: string }[] {
  const acta = actaRows(input);
  const intranet = intranetRows(input);
  const detail = detailRows(input);
  const summary = summaryRows(input);
  const actaLastRow = Math.max(7, acta.length);
  const detailLastRow = Math.max(5, detail.length);
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Acta final" sheetId="1" r:id="rId1"/><sheet name="Carga Intranet" sheetId="2" r:id="rId2"/><sheet name="Detalle evaluaciones" sheetId="3" r:id="rId3"/><sheet name="Resumen" sheetId="4" r:id="rId4"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font><font><i/><color rgb="FF475569"/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF002B5C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0055B8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7DEE8"/></left><right style="thin"><color rgb="FFD7DEE8"/></right><top style="thin"><color rgb="FFD7DEE8"/></top><bottom style="thin"><color rgb="FFD7DEE8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(recordDocumentTitle(input))} ${xml(input.metadata.courseCode)}</dc:title><dc:creator>CEOUBB</dc:creator><cp:lastModifiedBy>${xml(input.metadata.teacher)}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${xml(input.metadata.generatedAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xml(input.metadata.generatedAt)}</dcterms:modified></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>CEOUBB</Application><AppVersion>1.0</AppVersion></Properties>`;
  return [
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rels },
    { name: "docProps/core.xml", content: core },
    { name: "docProps/app.xml", content: app },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: styles },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheetXml(acta, [6, 30, 34, 34, 18, 18, 14, 24], {
        freezeRows: 6,
        autoFilter: `A6:H${actaLastRow}`,
        merges: ["A1:H1", "A2:H2", "A3:H3", "A5:H5"],
      }),
    },
    {
      name: "xl/worksheets/sheet2.xml",
      content: worksheetXml(intranet, [32, 36, 14, 24], {
        freezeRows: 4,
        autoFilter: `A4:D${Math.max(5, intranet.length)}`,
        merges: ["A1:D1", "A2:D2"],
      }),
    },
    {
      name: "xl/worksheets/sheet3.xml",
      content: worksheetXml(detail, [30, 34, ...input.gradebook.map(() => 18), 18], {
        freezeRows: 4,
        autoFilter: `A4:${columnName(2 + input.gradebook.length)}${detailLastRow}`,
        merges: [
          `A1:${columnName(2 + input.gradebook.length)}1`,
          `A2:${columnName(2 + input.gradebook.length)}2`,
        ],
      }),
    },
    {
      name: "xl/worksheets/sheet4.xml",
      content: worksheetXml(summary, [30, 86], {
        merges: ["A1:B1", "A2:B2"],
      }),
    },
  ];
}

// Implements: REQ-ACTA-06
export function createFinalGradeWorkbook(input: FinalGradeExport): Uint8Array {
  return zipStore(workbookEntries(input));
}

const windows1252 = new Map<string, number>([
  ["á", 0xe1],
  ["é", 0xe9],
  ["í", 0xed],
  ["ó", 0xf3],
  ["ú", 0xfa],
  ["Á", 0xc1],
  ["É", 0xc9],
  ["Í", 0xcd],
  ["Ó", 0xd3],
  ["Ú", 0xda],
  ["ñ", 0xf1],
  ["Ñ", 0xd1],
  ["ü", 0xfc],
  ["Ü", 0xdc],
  ["°", 0xb0],
  ["–", 0x96],
  ["—", 0x97],
  ["·", 0xb7],
]);

function pdfLiteral(value: string): string {
  let result = "";
  for (const character of value.replaceAll("\r", " ").replaceAll("\n", " ")) {
    const code = character.charCodeAt(0);
    const byte = code <= 0xff ? code : (windows1252.get(character) ?? 0x3f);
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) result += `\\${String.fromCharCode(byte)}`;
    else if (byte < 0x20 || byte > 0x7e) result += `\\${byte.toString(8).padStart(3, "0")}`;
    else result += String.fromCharCode(byte);
  }
  return `(${result})`;
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(1, limit - 1))}…`;
}

function pdfText(x: number, y: number, size: number, value: string, color = "0.059 0.090 0.165") {
  return `BT /F1 ${size} Tf ${color} rg ${x} ${y} Td ${pdfLiteral(value)} Tj ET\n`;
}

function pdfPageContent(
  input: FinalGradeExport,
  pageRecords: readonly FinalGradeRecord[],
  page: number,
  pages: number
): string {
  const widths = [26, 172, 200, 72, 72, 62, 150];
  const headers = [
    "N°",
    "Identificador",
    "Nombre",
    "Parciales",
    "Integradora",
    "Final",
    "Situación",
  ];
  let content = "0.000 0.169 0.361 rg 0 516 842 80 re f\n";
  content += pdfText(36, 563, 17, recordDocumentTitle(input), "1 1 1");
  content += pdfText(
    36,
    540,
    10,
    `${input.metadata.courseCode} · ${input.metadata.courseName} · Sección ${input.metadata.section} · ${input.metadata.period}`,
    "1 1 1"
  );
  content += pdfText(36, 506, 9, `Docente: ${input.metadata.teacher}`);
  content += pdfText(36, 492, 8, `Generada: ${input.metadata.generatedAt}`);
  content += pdfText(
    360,
    506,
    9,
    `Aprobados ${input.statistics.passed} · Reprobados ${input.statistics.failed} · Pendientes ${input.statistics.pending}`
  );
  content += pdfText(
    360,
    492,
    8,
    `Promedio sección: ${input.statistics.sectionAverage?.toFixed(1).replace(".", ",") ?? "pendiente"} · Integradora: ${input.statistics.integrativeRequired}`
  );
  let x = 44;
  const headerY = 466;
  for (let index = 0; index < headers.length; index += 1) {
    content += `0.000 0.333 0.722 rg ${x} ${headerY} ${widths[index]} 22 re f\n`;
    content += pdfText(x + 4, headerY + 7, 7.5, headers[index], "1 1 1");
    x += widths[index];
  }
  pageRecords.forEach((record, localIndex) => {
    const y = headerY - 18 * (localIndex + 1);
    const globalIndex = (page - 1) * 22 + localIndex + 1;
    const values = [
      String(globalIndex),
      truncate(record.institutionalId, 35),
      truncate(record.name, 40),
      record.partialAverage?.toFixed(1).replace(".", ",") ?? "-",
      record.integrativeGrade?.toFixed(1).replace(".", ",") ?? "-",
      record.finalGrade?.toFixed(1).replace(".", ",") ?? "-",
      finalGradeOutcomeLabel(record.outcome),
    ];
    let cellX = 44;
    for (let index = 0; index < values.length; index += 1) {
      content += `0.843 0.871 0.910 RG 0.4 w ${cellX} ${y} ${widths[index]} 18 re S\n`;
      content += pdfText(cellX + 4, y + 6, 7, values[index]);
      cellX += widths[index];
    }
  });
  content += pdfText(
    44,
    34,
    7,
    "Documento de apoyo independiente. No sustituye el acta oficial registrada en Intranet UBB."
  );
  content += pdfText(44, 21, 6.5, `Huella SHA-256: ${input.fingerprint}`);
  content += pdfText(748, 21, 7, `Página ${page} de ${pages}`);
  return content;
}

function pdfDocument(objects: readonly string[], root: number, info: number): Uint8Array {
  let source = "%PDF-1.7\n%CEOUBB\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(utf8.encode(source).length);
    source += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = utf8.encode(source).length;
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) source += `${String(offset).padStart(10, "0")} 00000 n \n`;
  source += `trailer\n<< /Size ${objects.length + 1} /Root ${root} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return utf8.encode(source);
}

// Implements: REQ-ACTA-07
export function createFinalGradePdf(input: FinalGradeExport): Uint8Array {
  const chunks: FinalGradeRecord[][] = [];
  for (let index = 0; index < input.records.length; index += 22) {
    chunks.push(input.records.slice(index, index + 22));
  }
  if (chunks.length === 0) chunks.push([]);

  const objects: string[] = [
    "",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  const pageReferences: number[] = [];
  chunks.forEach((records, index) => {
    const pageObject = objects.length + 1;
    const contentObject = pageObject + 1;
    const stream = pdfPageContent(input, records, index + 1, chunks.length);
    pageReferences.push(pageObject);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 596] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
    objects.push(`<< /Length ${utf8.encode(stream).length} >>\nstream\n${stream}endstream`);
  });
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Count ${pageReferences.length} /Kids [${pageReferences.map((reference) => `${reference} 0 R`).join(" ")}] >>`;
  const infoObject = objects.length + 1;
  objects.push(
    `<< /Title ${pdfLiteral(`${recordDocumentTitle(input)} ${input.metadata.courseCode}`)} /Author ${pdfLiteral(input.metadata.teacher)} /Creator (CEOUBB) /CreationDate ${pdfLiteral(`D:${input.metadata.generatedAt.replaceAll(/[-:TZ.]/g, "").slice(0, 14)}`)} >>`
  );
  return pdfDocument(objects, 1, infoObject);
}
