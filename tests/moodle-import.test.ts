import assert from "node:assert/strict";
import { File } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { deflateRawSync, gzipSync } from "node:zlib";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { moodleImports, pendingMatriculas } from "../db/schema.ts";
import {
  MAX_MOODLE_ARCHIVE_BYTES,
  MAX_MOODLE_ENTRIES,
  MAX_MOODLE_EXPANDED_BYTES,
  MAX_MOODLE_XML_BYTES,
  chunkImportRecords,
  fileIsSupported,
  prepareCourseImport,
  stableMoodleDocumentId,
  verifyMoodleFileBytes,
} from "../lib/moodle/index.ts";
import {
  importedPostDocumentPath,
  pendingEnrollmentExpiry,
  validateMoodleImportPosts,
} from "../lib/services/moodle-import.ts";

const encoder = new TextEncoder();

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function writeText(target: Uint8Array, offset: number, length: number, value: string) {
  target.set(encoder.encode(value).slice(0, length), offset);
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number) {
  writeText(target, offset, length, value.toString(8).padStart(length - 1, "0") + "\0");
}

function tar(entries: Record<string, Uint8Array>) {
  const parts: Uint8Array[] = [];
  for (const [name, content] of Object.entries(entries)) {
    const header = new Uint8Array(512);
    writeText(header, 0, 100, name);
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, content.length);
    writeOctal(header, 136, 12, 1_700_000_000);
    header.fill(0x20, 148, 156);
    header[156] = 0x30;
    writeText(header, 257, 6, "ustar\0");
    writeText(header, 263, 2, "00");
    const checksum = header.reduce((sum, value) => sum + value, 0);
    writeText(header, 148, 8, checksum.toString(8).padStart(6, "0") + "\0 ");
    const padding = new Uint8Array((512 - (content.length % 512)) % 512);
    parts.push(header, content, padding);
  }
  parts.push(new Uint8Array(1024));
  return concat(parts);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function zip(entries: Record<string, Uint8Array>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = encoder.encode(name);
    const compressed = new Uint8Array(deflateRawSync(content));
    const checksum = crc32(content);
    const local = concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(8),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(compressed.length),
      uint32(content.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
      compressed,
    ]);
    centrals.push(
      concat([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0x0800),
        uint16(8),
        uint16(0),
        uint16(0),
        uint32(checksum),
        uint32(compressed.length),
        uint32(content.length),
        uint16(nameBytes.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        nameBytes,
      ])
    );
    locals.push(local);
    offset += local.length;
  }
  const central = concat(centrals);
  return concat([
    ...locals,
    central,
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(centrals.length),
    uint16(centrals.length),
    uint32(central.length),
    uint32(offset),
    uint16(0),
  ]);
}

function xml(value: string) {
  return encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>${value}`);
}

function fixtureEntries() {
  const pdf = encoder.encode("%PDF-1.7 CEOUBB fixture");
  const scorm = encoder.encode("PK SCORM fixture");
  const pdfHash = createHash("sha1").update(pdf).digest("hex");
  const scormHash = createHash("sha1").update(scorm).digest("hex");
  const files = [
    `<file id="501"><contenthash>${pdfHash}</contenthash><contextid>211</contextid><component>mod_resource</component><filearea>content</filearea><itemid>0</itemid><filepath>/</filepath><filename>guía.pdf</filename><filesize>${pdf.length}</filesize><mimetype>application/pdf</mimetype><timecreated>1700000000</timecreated></file>`,
    `<file id="502"><contenthash>${scormHash}</contenthash><contextid>215</contextid><component>mod_scorm</component><filearea>package</filearea><itemid>0</itemid><filepath>/</filepath><filename>unidad-scorm.zip</filename><filesize>${scorm.length}</filesize><mimetype>application/zip</mimetype><timecreated>1700000100</timecreated></file>`,
  ].join("");
  return {
    "moodle_backup.xml": xml(
      `<moodle_backup><information><name>backup.mbz</name><moodle_version>2025041400</moodle_version><moodle_release>5.0</moodle_release><original_wwwroot>https://moodle.ubiobio.cl</original_wwwroot><original_course_id>77</original_course_id><original_course_fullname>Resistencia de Materiales</original_course_fullname><original_course_shortname>440201-1</original_course_shortname><contents><activities><activity><moduleid>10</moduleid><sectionid>2</sectionid><modulename>label</modulename><title>Bienvenida</title><directory>activities/label_10</directory></activity><activity><moduleid>11</moduleid><sectionid>2</sectionid><modulename>resource</modulename><title>Guía</title><directory>activities/resource_11</directory></activity><activity><moduleid>12</moduleid><sectionid>2</sectionid><modulename>quiz</modulename><title>Quiz 1</title><directory>activities/quiz_12</directory></activity><activity><moduleid>13</moduleid><sectionid>2</sectionid><modulename>page</modulename><title>Página</title><directory>activities/page_13</directory></activity><activity><moduleid>14</moduleid><sectionid>2</sectionid><modulename>assign</modulename><title>Informe</title><directory>activities/assign_14</directory></activity><activity><moduleid>15</moduleid><sectionid>2</sectionid><modulename>scorm</modulename><title>Paquete</title><directory>activities/scorm_15</directory></activity><activity><moduleid>16</moduleid><sectionid>2</sectionid><modulename>label</modulename><title>Oculta</title><directory>activities/label_16</directory></activity></activities><sections><section><sectionid>2</sectionid><title>Unidad 1</title><directory>sections/section_2</directory></section></sections></contents></information></moodle_backup>`
    ),
    "course/course.xml": xml(
      `<course id="77" contextid="100"><shortname>440201-1</shortname><fullname>Resistencia de Materiales</fullname><summary><![CDATA[<p>Resumen <strong>histórico</strong>.</p>]]></summary><startdate>1693526400</startdate></course>`
    ),
    "sections/section_2/section.xml": xml(
      `<section id="2"><number>1</number><name>Unidad 1</name><summary>Fundamentos</summary><sequence>10,11,12,13,14,15,16</sequence><visible>1</visible></section>`
    ),
    "activities/label_10/module.xml": xml(
      `<module id="10"><visible>1</visible><added>1700000000</added></module>`
    ),
    "activities/label_10/label.xml": xml(
      `<activity id="310" moduleid="10" modulename="label" contextid="210"><label id="310"><name>Bienvenida</name><intro><![CDATA[<p>Texto <strong>inicial</strong></p>]]></intro></label></activity>`
    ),
    "activities/resource_11/module.xml": xml(
      `<module id="11"><visible>1</visible><added>1700000001</added></module>`
    ),
    "activities/resource_11/resource.xml": xml(
      `<activity id="311" moduleid="11" modulename="resource" contextid="211"><resource id="311"><name>Guía principal</name><intro>Documento base</intro></resource></activity>`
    ),
    "activities/quiz_12/module.xml": xml(`<module id="12"><visible>1</visible></module>`),
    "activities/quiz_12/quiz.xml": xml(
      `<activity id="312" moduleid="12" modulename="quiz" contextid="212"><quiz id="312"><name>Quiz 1</name></quiz></activity>`
    ),
    "activities/page_13/module.xml": xml(
      `<module id="13"><visible>1</visible><added>1700000002</added></module>`
    ),
    "activities/page_13/page.xml": xml(
      `<activity id="313" moduleid="13" modulename="page" contextid="213"><page id="313"><name>Página de apoyo</name><intro></intro><content><![CDATA[<h2>Conceptos</h2><p>Contenido &amp; ejemplos.</p>]]></content></page></activity>`
    ),
    "activities/assign_14/module.xml": xml(
      `<module id="14"><visible>1</visible><added>1700000003</added></module>`
    ),
    "activities/assign_14/assign.xml": xml(
      `<activity id="314" moduleid="14" modulename="assign" contextid="214"><assign id="314"><name>Informe 1</name><intro>Entregar informe</intro><duedate>1700611200</duedate></assign></activity>`
    ),
    "activities/scorm_15/module.xml": xml(`<module id="15"><visible>1</visible></module>`),
    "activities/scorm_15/scorm.xml": xml(
      `<activity id="315" moduleid="15" modulename="scorm" contextid="215"><scorm id="315"><name>Paquete Unidad 1</name><intro>Contenido interactivo</intro></scorm></activity>`
    ),
    "activities/label_16/module.xml": xml(`<module id="16"><visible>0</visible></module>`),
    "activities/label_16/label.xml": xml(
      `<activity id="316" moduleid="16" modulename="label" contextid="216"><label id="316"><name>Oculta</name><intro>No publicar</intro></label></activity>`
    ),
    "files.xml": xml(`<files>${files}</files>`),
    "roles.xml": xml(
      `<roles_definition><role id="3"><shortname>editingteacher</shortname><archetype>editingteacher</archetype></role><role id="5"><shortname>student</shortname><archetype>student</archetype></role></roles_definition>`
    ),
    "course/roles.xml": xml(
      `<roles><role_assignments><assignment id="1"><roleid>5</roleid><userid>100</userid></assignment><assignment id="2"><roleid>3</roleid><userid>101</userid></assignment><assignment id="3"><roleid>5</roleid><userid>102</userid></assignment></role_assignments></roles>`
    ),
    "users.xml": xml(
      `<users><user id="100"><email>ana@alumnos.ubiobio.cl</email><firstname>Ana</firstname><lastname>Pérez</lastname></user><user id="101"><email>profesor@ubiobio.cl</email><firstname>Profe</firstname><lastname>UBB</lastname></user><user id="102"><email>externo@example.com</email><firstname>Fuera</firstname><lastname>UBB</lastname></user></users>`
    ),
    [`files/${pdfHash.slice(0, 2)}/${pdfHash}`]: pdf,
    [`files/${scormHash.slice(0, 2)}/${scormHash}`]: scorm,
  };
}

async function prepare(bytes: Uint8Array, name: string) {
  return prepareCourseImport(new File([bytes.slice().buffer as ArrayBuffer], name));
}

test("REQ-MOODLE-01/02/03: TGZ and ZIP produce the same bounded course preview", async () => {
  const entries = fixtureEntries();
  const tgz = await prepare(new Uint8Array(gzipSync(tar(entries))), "resistencia.mbz");
  const zipped = await prepare(zip(entries), "resistencia.mbz");
  for (const prepared of [tgz, zipped]) {
    assert.equal(prepared.preview.kind, "moodle");
    assert.equal(prepared.preview.source.courseName, "Resistencia de Materiales");
    assert.equal(prepared.preview.source.courseShortName, "440201-1");
    assert.deepEqual(prepared.preview.sections, ["Unidad 1"]);
    assert.ok(prepared.preview.posts.some((item) => item.title === "Página de apoyo"));
    assert.ok(prepared.preview.posts.some((item) => item.kind === "assessment"));
    assert.equal(prepared.preview.files.length, 2);
    assert.equal(prepared.preview.participants.length, 1);
    assert.equal(prepared.preview.participants[0].email, "ana@alumnos.ubiobio.cl");
    assert.ok(prepared.preview.omissions.some((item) => item.category === "quiz"));
    assert.ok(prepared.preview.omissions.some((item) => item.category === "hidden"));
    assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-role"));
    assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-domain"));
  }
  assert.deepEqual(
    tgz.preview.posts.map((item) => item.sourceId),
    zipped.preview.posts.map((item) => item.sourceId)
  );
  assert.equal(tgz.preview.source.sourceKey, zipped.preview.source.sourceKey);
});

test("REQ-MOODLE-04: archive bytes are checked against Moodle SHA-1 and passive types", async () => {
  const prepared = await prepare(new Uint8Array(gzipSync(tar(fixtureEntries()))), "curso.mbz");
  const pdf = prepared.preview.files.find((item) => item.fileName === "guía.pdf");
  assert.ok(pdf);
  const bytes = await prepared.readArchiveFile(pdf.archivePath);
  await assert.doesNotReject(() => verifyMoodleFileBytes(pdf, bytes));
  await assert.rejects(() => verifyMoodleFileBytes(pdf, encoder.encode("alterado")), /integridad/i);
  assert.equal(fileIsSupported("guia.pdf", "application/pdf"), true);
  assert.equal(fileIsSupported("contenido.zip", "application/zip"), true);
  assert.equal(fileIsSupported("ataque.svg", "image/svg+xml"), false);
  assert.equal(fileIsSupported("script.html", "text/html"), false);
  assert.equal(fileIsSupported("instalador.exe", "application/octet-stream"), false);
});

test("REQ-MOODLE-01/09: traversal, DTD and archive budgets fail before preview", async () => {
  const entries = fixtureEntries();
  await assert.rejects(
    () =>
      prepare(
        new Uint8Array(gzipSync(tar({ ...entries, "../escape.xml": xml("<x/>") }))),
        "bad.mbz"
      ),
    /ruta|archivo/i
  );
  await assert.rejects(
    () =>
      prepare(
        new Uint8Array(
          gzipSync(
            tar({
              ...entries,
              "moodle_backup.xml": encoder.encode(
                `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><moodle_backup><information>&y;</information></moodle_backup>`
              ),
            })
          )
        ),
        "dtd.mbz"
      ),
    /DTD|XML/i
  );
  assert.equal(MAX_MOODLE_ARCHIVE_BYTES, 250 * 1024 * 1024);
  assert.equal(MAX_MOODLE_EXPANDED_BYTES, 512 * 1024 * 1024);
  assert.equal(MAX_MOODLE_ENTRIES, 20_000);
  assert.equal(MAX_MOODLE_XML_BYTES, 8 * 1024 * 1024);
});

test("REQ-MOODLE-02/06: semicolon CSV imports only institutional student rows", async () => {
  const csv = encoder.encode(
    "Correo;Rol;Nombre\nana@alumnos.ubiobio.cl;estudiante;Ana\nprofesor@ubiobio.cl;docente;Profe\nexterno@gmail.com;estudiante;Fuera\n"
  );
  const prepared = await prepare(csv, "nomina.csv");
  assert.equal(prepared.preview.kind, "csv");
  assert.deepEqual(
    prepared.preview.participants.map((item) => item.email),
    ["ana@alumnos.ubiobio.cl"]
  );
  assert.equal(prepared.preview.files.length, 0);
  assert.equal(prepared.preview.posts.length, 0);
  assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-role"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-domain"));
});

test("REQ-MOODLE-05/09: IDs and batches are deterministic and bounded", () => {
  const first = stableMoodleDocumentId("source-key", "module:77");
  const second = stableMoodleDocumentId("source-key", "module:77");
  assert.equal(first, second);
  assert.match(first, /^moodle-[a-f0-9]{40}$/);
  assert.notEqual(first, stableMoodleDocumentId("source-key", "module:78"));
  assert.deepEqual(
    chunkImportRecords(Array.from({ length: 205 }, (_, index) => index)).map(
      (chunk) => chunk.length
    ),
    [100, 100, 5]
  );
});

test("REQ-MOODLE-06/08: relational tables are indexed for jobs and expiring pending enrollments", () => {
  const jobs = getTableConfig(moodleImports);
  const pending = getTableConfig(pendingMatriculas);
  assert.equal(jobs.name, "moodle_imports");
  assert.equal(pending.name, "pending_matriculas");
  assert.ok(
    jobs.indexes.some((entry) => entry.config.name === "idx_moodle_imports_section_updated")
  );
  assert.ok(
    jobs.indexes.some(
      (entry) =>
        entry.config.name === "idx_moodle_imports_section_fingerprint" && entry.config.unique
    )
  );
  assert.ok(pending.indexes.some((entry) => entry.config.name === "idx_pending_matriculas_email"));
  assert.ok(
    pending.indexes.some(
      (entry) => entry.config.name === "idx_pending_matriculas_section_email" && entry.config.unique
    )
  );
  assert.ok(
    getTableConfig(pendingMatriculas).foreignKeys.some(
      (key) => getTableConfig(key.reference().foreignTable).name === "secciones"
    )
  );
});

test("REQ-MOODLE-05/07: server post contracts bind every document and storage path to the destination", () => {
  const valid = {
    sourceId: "source:module:10",
    title: "Página importada",
    body: "Contenido histórico",
    kind: "notice" as const,
    folder: "Unidad 1",
    linkUrl: "",
    dueDate: "",
    storagePath: "",
    fileName: "",
    contentType: "",
    fileSize: 0,
    sourceCreatedAt: "2026-08-01T12:00:00.000Z",
  };
  assert.deepEqual(validateMoodleImportPosts("440201-2026-2-1", [valid]), [valid]);
  assert.throws(
    () =>
      validateMoodleImportPosts("440201-2026-2-1", [
        {
          ...valid,
          storagePath: "courses/otra-seccion/uid/archivo.pdf",
          fileName: "archivo.pdf",
          contentType: "application/pdf",
          fileSize: 20,
        },
      ]),
    /ruta|sección/i
  );
  assert.match(
    importedPostDocumentPath("440201-2026-2-1", "source-key", "module:10"),
    /courses\/440201-2026-2-1\/posts\/moodle-[a-f0-9]{40}$/
  );
});

test("REQ-MOODLE-06/10: pending enrollment retention is exactly 90 days", () => {
  assert.equal(
    pendingEnrollmentExpiry(new Date("2026-08-23T00:00:00.000Z")),
    "2026-11-21T00:00:00.000Z"
  );
});

test("REQ-MOODLE-07/11: route and teacher UI preserve server authorization and accessible progress", async () => {
  const route = await readFile(
    new URL("../app/api/courses/[sectionId]/imports/moodle/route.ts", import.meta.url),
    "utf8"
  );
  const classroom = await readFile(
    new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url),
    "utf8"
  );
  const dialog = await readFile(
    new URL("../app/views/classroom/MoodleImportDialog.tsx", import.meta.url),
    "utf8"
  );
  assert.match(route, /getSessionUser\(request\)/);
  assert.match(route, /authorizeMoodleImport/);
  assert.doesNotMatch(route, /payload\.role|body\.role/);
  /* El acceso a la importación se mudó al encabezado del ramo, tras el mismo
     control de rol que lo protegía dentro de «Materiales». */
  assert.match(classroom, /canTeach\s*&&\s*<MoodleImportDialog/);
  assert.match(dialog, /<dialog/);
  assert.match(dialog, /<progress/);
  assert.match(dialog, /aria-live="polite"/);
  assert.match(dialog, /Importar participantes/);
});

test("REQ-MOODLE-10: implementation never writes Moodle grades, attempts or forum messages", async () => {
  const importer = await readFile(
    new URL("../lib/firebase/moodle-import.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(importer, /saveStudentScores|gradeAuditLogs|submissions/);
  assert.match(importer, /notifyStudents:\s*false/);
});
