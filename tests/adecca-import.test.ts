import assert from "node:assert/strict";
import { File as NodeFile } from "node:buffer";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import {
  adeccaImports,
  adeccaImportRunItems,
  asignaturas,
  departamentos,
  facultades,
  matriculas,
  pendingAdeccaMatriculas,
  periodos,
  secciones,
  users,
} from "../db/schema.ts";
import type { PublicUser } from "../lib/auth.ts";
import { containsForbiddenSecretMaterial, safeAdeccaHttpUrl } from "../lib/adecca/privacy.ts";
import {
  ADECCA_IMPORT_REQUIREMENTS,
  MAX_ADECCA_ARCHIVE_BYTES,
  MAX_ADECCA_ENTRIES,
  MAX_ADECCA_EXPANDED_BYTES,
  MAX_ADECCA_FILE_BYTES,
  AdeccaImportError,
  adeccaFileIsSupported,
  chunkAdeccaImportRecords,
  prepareAdeccaCourseImport,
  sha256Bytes,
  stableAdeccaDocumentId,
  verifyAdeccaFileBytes,
} from "../lib/adecca/index.ts";
import {
  adeccaImportedPostDocumentPath,
  authorizeAdeccaImport,
  completeAdeccaImport,
  listAdeccaImports,
  pendingAdeccaEnrollmentExpiry,
  reconcileAdeccaRoster,
  startAdeccaImport,
  validateAdeccaImportPlan,
  validateAdeccaImportPosts,
  validateAdeccaImportSource,
  writeAdeccaImportPosts,
} from "../lib/services/adecca-import.ts";
import { createIsolatedTestDb } from "./helpers/db-harness.ts";

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

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipEntries(entries: Array<[string, Uint8Array]>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
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

function sourceFile(bytes: Uint8Array, name: string): File {
  return new NodeFile([bytes.slice().buffer as ArrayBuffer], name) as unknown as File;
}

async function prepareZip(entries: Array<[string, Uint8Array]>, name = "curso-adecca.zip") {
  return prepareAdeccaCourseImport(sourceFile(zipEntries(entries), name));
}

test("REQ-ADECCA-01/02/03/04: un ZIP local organizado produce una preview acotada", async () => {
  const pdf = encoder.encode("%PDF-1.7 material ADECCA sintetico");
  const prepared = await prepareZip([
    ["Curso ADECCA/Unidad 1/README.md", encoder.encode("# Unidad 1\n\nContenido **base**.")],
    ["Curso ADECCA/Unidad 1/Apuntes.pdf", pdf],
  ]);

  assert.equal(prepared.preview.kind, "adecca");
  assert.equal(prepared.preview.source.sourceFormat, "zip");
  assert.deepEqual(prepared.preview.folders, ["Unidad 1"]);
  assert.equal(prepared.preview.posts.length, 1);
  assert.equal(prepared.preview.posts[0].kind, "guide");
  assert.match(prepared.preview.posts[0].body, /Contenido/);
  assert.equal(prepared.preview.files.length, 1);
  assert.equal(prepared.preview.files[0].fileName, "Apuntes.pdf");
  assert.equal(prepared.preview.files[0].contentHash.length, 64);
  assert.equal(prepared.preview.uploadBytes, pdf.length);
  const restored = await prepared.readArchiveFile(prepared.preview.files[0].archivePath);
  assert.deepEqual(restored, pdf);
  await assert.doesNotReject(() => verifyAdeccaFileBytes(prepared.preview.files[0], restored));
});

test("REQ-ADECCA-01/03/04/06/09: el manifiesto v1 conserva sólo semántica compatible", async () => {
  const guide = encoder.encode("%PDF-1.7 guia didactica sintetica");
  const guideHash = await sha256Bytes(guide);
  const manifest = {
    format: "ceoubb-adecca-package",
    version: 1,
    source: {
      courseId: "4864",
      courseName: "Álgebra ADECCA",
      courseShortName: "ALG-01",
      adeccaVersion: "2.0",
    },
    items: [
      { sourceId: "aviso-1", title: "Bienvenida", kind: "notice", body: "Aviso inicial" },
      {
        sourceId: "enlace-1",
        title: "Bibliografía",
        kind: "resource",
        linkUrl: "https://biblioteca.ubiobio.cl/recurso",
      },
      {
        sourceId: "enlace-http",
        title: "Referencia HTTP",
        kind: "resource",
        linkUrl: "http://example.edu/recurso",
      },
      {
        sourceId: "enlace-adecca",
        title: "Referencia interna",
        kind: "resource",
        linkUrl: "https://adecca.ubiobio.cl/recurso",
      },
      {
        sourceId: "tarea-1",
        title: "Tarea descriptiva",
        kind: "assessment",
        bodyHtml:
          '<p>Resolver <strong>ejercicios</strong> <a href="https://adecca.ubiobio.cl/recurso">material</a></p><script>alert(1)</script>',
        dueDate: "2026-10-10",
      },
      {
        sourceId: "guia-1",
        title: "Guía didáctica",
        kind: "guide",
        folder: "Unidad 1",
        filePath: "materiales/guia.pdf",
        linkUrl: "https://example.edu/guia",
        dueDate: "2026-11-30",
        sha256: guideHash,
      },
      {
        sourceId: "oculto-1",
        title: "Oculto",
        kind: "notice",
        filePath: "materiales/oculto.pdf",
        visible: false,
      },
      {
        sourceId: "foro-1",
        title: "Foro histórico",
        kind: "forum",
        filePath: "materiales/foro.pdf",
      },
      { sourceId: "notas-1", title: "Notas finales", kind: "notice", body: "7,0" },
      { sourceId: "x".repeat(500), title: "Identificador largo", kind: "notice", body: "Seguro" },
      {
        sourceId: "archivo-fallido",
        title: "Guía descriptiva preservable",
        kind: "guide",
        body: "El adjunto falló, pero este texto es compatible.",
        filePath: "materiales/fallida.pdf",
        sha256: "0".repeat(64),
      },
      {
        sourceId: "fecha-imposible",
        title: "Fecha imposible",
        kind: "assessment",
        body: "No importar",
        dueDate: "2026-02-30",
        filePath: "materiales/fecha.pdf",
      },
    ],
    participants: [
      { sourceUserId: "11.111.111-1", email: "ana@alumnos.ubiobio.cl", role: "student" },
      { sourceUserId: "2", email: "docente@ubiobio.cl", role: "student" },
      { sourceUserId: "3", email: "externa@example.com", role: "student" },
    ],
  };
  const prepared = await prepareZip([
    ["Paquete/adecca-manifest.json", encoder.encode(JSON.stringify(manifest))],
    ["Paquete/materiales/guia.pdf", guide],
    ["Paquete/materiales/oculto.pdf", guide],
    ["Paquete/materiales/foro.pdf", guide],
    ["Paquete/materiales/fallida.pdf", guide],
    ["Paquete/materiales/fecha.pdf", guide],
  ]);

  assert.equal(prepared.preview.source.courseId, "4864");
  assert.equal(prepared.preview.source.courseName, "Álgebra ADECCA");
  assert.deepEqual(
    prepared.preview.posts.map((item) => item.kind),
    ["notice", "resource", "resource", "assessment", "notice", "guide"]
  );
  assert.equal(prepared.preview.posts[2].linkUrl, "http://example.edu/recurso");
  assert.doesNotMatch(prepared.preview.posts[3].body, /script|alert/i);
  assert.doesNotMatch(prepared.preview.posts[3].body, /access_token|no-conservar/i);
  assert.equal(prepared.preview.posts[3].dueDate, "2026-10-10");
  assert.ok(
    prepared.preview.posts.every(
      (item) => item.sourceId.length <= 500 && /^adecca-[a-f0-9]{40}$/.test(item.sourceId)
    )
  );
  assert.equal(prepared.preview.files.length, 1);
  assert.equal(prepared.preview.files[0].kind, "guide");
  assert.equal(prepared.preview.files[0].linkUrl, "https://example.edu/guia");
  assert.equal(prepared.preview.files[0].dueDate, "2026-11-30");
  assert.deepEqual(
    prepared.preview.participants.map((item) => item.email),
    ["ana@alumnos.ubiobio.cl"]
  );
  assert.doesNotMatch(JSON.stringify(prepared.preview.participants), /11\.111\.111-1/);
  assert.ok(prepared.preview.omissions.some((item) => item.category === "hidden"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "forum"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "grades"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "url"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "date"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "file-integrity"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-domain"));
  assert.doesNotMatch(
    JSON.stringify(prepared.preview.omissions),
    /docente@ubiobio\.cl|externa@example\.com/i
  );
});

test("REQ-ADECCA-01/03/04: JSON sin ZIP importa posts pero no afirma restaurar binarios", async () => {
  const manifest = {
    format: "ceoubb-adecca-package",
    version: 1,
    source: { courseId: "99", courseName: "Curso JSON" },
    items: [
      { sourceId: "n-1", title: "Aviso", kind: "notice", body: "Contenido" },
      {
        sourceId: "f-1",
        title: "Archivo ausente",
        kind: "resource",
        filePath: "Unidad 1/archivo.pdf",
      },
    ],
  };
  const bytes = encoder.encode(JSON.stringify(manifest));
  const prepared = await prepareAdeccaCourseImport(sourceFile(bytes, "adecca-manifest.json"));

  assert.equal(prepared.preview.source.sourceFormat, "json");
  assert.equal(prepared.preview.posts.length, 1);
  assert.equal(prepared.preview.files.length, 0);
  assert.ok(prepared.preview.omissions.some((item) => item.category === "file-missing"));
  await assert.rejects(() => prepared.readArchiveFile("Unidad 1/archivo.pdf"), /no contiene/i);
});

test("REQ-ADECCA-01/03: un único manifiesto dentro de una carpeta raíz se reconoce", async () => {
  const manifest = {
    format: "ceoubb-adecca-package",
    version: 1,
    source: { courseId: "unico", courseName: "Curso con raíz" },
    items: [{ sourceId: "aviso", title: "Aviso", kind: "notice", body: "Contenido" }],
  };
  const prepared = await prepareZip([
    ["Curso ADECCA/adecca-manifest.json", encoder.encode(JSON.stringify(manifest))],
  ]);

  assert.equal(prepared.preview.source.courseId, "unico");
  assert.equal(prepared.preview.posts.length, 1);
});

test("REQ-ADECCA-01/06/11: CSV conserva sólo correo estudiantil institucional", async () => {
  const csv = encoder.encode(
    "RUT;Nombre;Correo;Rol\n11.111.111-1;Ana Pérez;ANA@alumnos.ubiobio.cl;estudiante\n22.222.222-2;Profesor UBB;profesor@ubiobio.cl;docente\n33.333.333-3;Externa;externa@gmail.com;estudiante\n"
  );
  const prepared = await prepareAdeccaCourseImport(sourceFile(csv, "nomina-adecca.csv"));

  assert.equal(prepared.preview.kind, "csv");
  assert.deepEqual(prepared.preview.participants, [
    { sourceUserId: "csv:1", email: "ana@alumnos.ubiobio.cl", role: "student" },
  ]);
  assert.doesNotMatch(JSON.stringify(prepared.preview.participants), /11\.111|Ana Pérez/i);
  assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-role"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "participant-domain"));
});

test("REQ-ADECCA-01/02/09: traversal, secretos y contenido activo nunca son restaurables", async () => {
  await assert.rejects(
    () => prepareZip([["../escape.pdf", encoder.encode("escape")]], "hostil.zip"),
    /ruta|segur/i
  );

  const secretManifest = encoder.encode(
    JSON.stringify({
      format: "ceoubb-adecca-package",
      version: 1,
      source: { courseId: "1", courseName: "Hostil" },
      password: "no-debe-aceptarse",
    })
  );
  await assert.rejects(
    () => prepareAdeccaCourseImport(sourceFile(secretManifest, "secreto.json")),
    /credencial|secreto|contraseña/i
  );

  const compoundSecretManifest = encoder.encode(
    JSON.stringify({
      format: "ceoubb-adecca-package",
      version: 1,
      source: { courseId: "1", courseName: "Hostil", accessToken: "no-debe-aceptarse" },
    })
  );
  await assert.rejects(
    () => prepareAdeccaCourseImport(sourceFile(compoundSecretManifest, "token.json")),
    /credencial|secreto|contraseña/i
  );

  const prepared = await prepareZip([
    [
      "Curso/Unidad 1/descripcion.html",
      encoder.encode("<h2>Descripción</h2><script>robar()</script><p>Texto seguro</p>"),
    ],
    ["Curso/Unidad 1/script.js", encoder.encode("fetch('https://example.com')")],
    ["Curso/notas.csv", encoder.encode("rut,nota\n11111111-1,7.0")],
    ["Curso/Notas/README.md", encoder.encode("Calificaciones individuales")],
    ["Curso/Unidad 1/material.pdf", new Uint8Array([0x4d, 0x5a, 0x90, 0x00])],
    ["Curso/Nomina-2026.xlsx", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    ["Curso/Nómina.csv", encoder.encode("Correo;Rol\nestudiante@alumnos.ubiobio.cl;estudiante")],
  ]);
  assert.equal(prepared.preview.posts.length, 1);
  assert.equal(prepared.preview.participants.length, 1);
  assert.doesNotMatch(prepared.preview.posts[0].body, /script|robar/i);
  assert.equal(prepared.preview.files.length, 0);
  assert.ok(prepared.preview.omissions.some((item) => item.category === "file-type"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "grades"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "file-signature"));
  assert.ok(prepared.preview.omissions.some((item) => item.category === "roster-data"));
});

test("REQ-ADECCA-02: CRC inválido aborta el paquete", async () => {
  const bytes = zipEntries([["Unidad 1/apuntes.pdf", encoder.encode("contenido")]]);
  const tampered = new Uint8Array(bytes);
  const nameLength = new DataView(tampered.buffer).getUint16(26, true);
  const dataOffset = 30 + nameLength;
  tampered[dataOffset] ^= 0xff;
  await assert.rejects(
    () => prepareAdeccaCourseImport(sourceFile(tampered, "crc-invalido.zip")),
    /CRC|compresión|dañad/i
  );
});

test("REQ-ADECCA-02: CRC inválido también aborta archivos que serían omitidos", async () => {
  const bytes = zipEntries([["Unidad 1/script.js", encoder.encode("alert('sintético')")]]);
  const tampered = new Uint8Array(bytes);
  const nameLength = new DataView(tampered.buffer).getUint16(26, true);
  tampered[30 + nameLength] ^= 0xff;

  await assert.rejects(
    () => prepareAdeccaCourseImport(sourceFile(tampered, "crc-activo.zip")),
    /CRC|compresión|dañad/i
  );
});

test("REQ-ADECCA-02/05/10: hashes, IDs, tipos y lotes son deterministas y acotados", async () => {
  assert.equal(MAX_ADECCA_ARCHIVE_BYTES, 250 * 1024 * 1024);
  assert.equal(MAX_ADECCA_EXPANDED_BYTES, 512 * 1024 * 1024);
  assert.equal(MAX_ADECCA_ENTRIES, 20_000);
  assert.equal(MAX_ADECCA_FILE_BYTES, 50 * 1024 * 1024);
  assert.equal(adeccaFileIsSupported("guia.pdf", "application/pdf"), true);
  assert.equal(adeccaFileIsSupported("pagina.html", "text/html"), false);
  assert.equal(adeccaFileIsSupported("script.js", "application/javascript"), false);
  const first = stableAdeccaDocumentId("source", "item-1");
  assert.equal(first, stableAdeccaDocumentId("source", "item-1"));
  assert.notEqual(first, stableAdeccaDocumentId("source", "item-2"));
  assert.match(first, /^adecca-[a-f0-9]{40}$/);
  assert.deepEqual(
    chunkAdeccaImportRecords(Array.from({ length: 205 }, (_, index) => index)).map(
      (chunk) => chunk.length
    ),
    [100, 100, 5]
  );

  const content = encoder.encode("%PDF-1.7 archivo verificable");
  const prepared = await prepareZip([["Unidad/archivo.pdf", content]]);
  const file = prepared.preview.files[0];
  await assert.doesNotReject(() => verifyAdeccaFileBytes(file, content));
  await assert.rejects(
    () => verifyAdeccaFileBytes(file, encoder.encode("alterado")),
    /integridad/i
  );
});

test("REQ-ADECCA-05/07: el contrato servidor vincula origen, destino, hash y rutas", () => {
  const source = {
    sourceKey: "a".repeat(64),
    fingerprint: "b".repeat(64),
    courseId: "curso-1",
    courseName: "Curso sintético",
    courseShortName: "CUR-1",
    adeccaVersion: "local",
    fileName: "curso.zip",
    sourceFormat: "zip" as const,
  };
  assert.deepEqual(validateAdeccaImportSource(source), source);
  const post = {
    sourceId: "adecca-" + "c".repeat(40),
    title: "Material",
    body: "Contenido",
    kind: "resource" as const,
    folder: "Unidad 1",
    linkUrl: "https://example.edu/material",
    dueDate: "",
    storagePath: "courses/seccion-2026/uid/archivo.pdf",
    fileName: "archivo.pdf",
    contentType: "application/pdf",
    fileSize: 20,
    contentHash: "d".repeat(64),
    sourceCreatedAt: null,
  };
  assert.deepEqual(validateAdeccaImportPosts("seccion-2026", [post]), [post]);
  assert.throws(
    () =>
      validateAdeccaImportPosts("seccion-2026", [
        { ...post, linkUrl: "https://example.edu/?access_token=secreto" },
      ]),
    /enlace inseguro/i
  );
  assert.match(
    adeccaImportedPostDocumentPath("seccion-2026", source.sourceKey, post.sourceId),
    /courses\/seccion-2026\/posts\/adecca-[a-f0-9]{40}$/
  );
  assert.equal(
    pendingAdeccaEnrollmentExpiry(new Date("2026-09-01T00:00:00.000Z")),
    "2026-11-30T00:00:00.000Z"
  );
});

test("REQ-ADECCA-06/08: esquema y migración crean auditoría y pendientes separados", async () => {
  const jobs = getTableConfig(adeccaImports);
  const pending = getTableConfig(pendingAdeccaMatriculas);
  assert.ok(jobs.columns.some((column) => column.name === "source_key"));
  assert.ok(jobs.columns.some((column) => column.name === "source_format"));
  assert.ok(
    jobs.indexes.some(
      (entry) =>
        entry.config.name === "idx_adecca_imports_section_fingerprint" && entry.config.unique
    )
  );
  assert.ok(
    pending.indexes.some(
      (entry) =>
        entry.config.name === "idx_pending_adecca_matriculas_section_email" && entry.config.unique
    )
  );

  const context = await createIsolatedTestDb();
  try {
    const result = await context.client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('adecca_imports', 'pending_adecca_matriculas') ORDER BY name"
    );
    assert.deepEqual(
      result.rows.map((row) => String(row.name)),
      ["adecca_imports", "pending_adecca_matriculas"]
    );
  } finally {
    await context.cleanup();
  }
});

test("REQ-ADECCA-05..11: API, cliente, retención y UI mantienen los invariantes", async () => {
  const [route, service, client, dialog, classroom, retention, migration] = await Promise.all([
    readFile(
      new URL("../app/api/courses/[sectionId]/imports/adecca/route.ts", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../lib/services/adecca-import.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/firebase/adecca-import.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/views/classroom/AdeccaImportDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cron/audit-retention/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0013_importacion_adecca.sql", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getSessionUser\(request\)/);
  assert.match(route, /authorizeAdeccaImport/);
  assert.match(route, /containsForbiddenSecretField/);
  assert.match(service, /eq\(periodos\.estado,\s*"abierto"\)|periodStatus !== "abierto"/);
  assert.match(service, /setWhere:\s*eq\(matriculas\.rolSeccion,\s*"student"\)/);
  assert.match(service, /notifyStudents:\s*\{ booleanValue: false \}/);
  assert.doesNotMatch(service, /JSON\.stringify\(compact\)\.slice/);
  assert.match(client, /customMetadata\.contentHash === source\.contentHash/);
  assert.match(client, /metadata\.size === source\.fileSize/);
  assert.match(client, /signal\?\.addEventListener\("abort"/);
  assert.match(dialog, /useState\(false\)/);
  assert.match(dialog, /aria-label="Progreso de la importación ADECCA"/);
  assert.match(dialog, /Cancelar importación/);
  assert.match(classroom, /canTeach\s*&&\s*<AdeccaImportDialog/);
  assert.match(retention, /purgeExpiredPendingAdeccaEnrollments/);
  assert.match(migration, /CREATE TABLE `adecca_imports`/);
  assert.doesNotMatch(client, /saveStudentScores|gradeAuditLogs|submissions\//);
});

test("REQ-ADECCA-01..11: la interfaz pública declara trazabilidad completa", async () => {
  assert.deepEqual(ADECCA_IMPORT_REQUIREMENTS, [
    "REQ-ADECCA-01",
    "REQ-ADECCA-02",
    "REQ-ADECCA-03",
    "REQ-ADECCA-04",
    "REQ-ADECCA-05",
    "REQ-ADECCA-06",
    "REQ-ADECCA-07",
    "REQ-ADECCA-08",
    "REQ-ADECCA-09",
    "REQ-ADECCA-10",
    "REQ-ADECCA-11",
  ]);
  await assert.rejects(
    () =>
      prepareAdeccaCourseImport(sourceFile(encoder.encode("https://adecca.ubiobio.cl"), "url.txt")),
    (error) => error instanceof AdeccaImportError && error.code === "INVALID_ADECCA_PACKAGE"
  );
});

test("REQ-ADECCA-01/09: secretos en valores abortan y URLs personales o ADECCA se omiten", async () => {
  for (const secret of [
    "https://example.edu/?access_token=no-conservar",
    "https://usuario:clave@example.edu/material",
    "https://example.edu/password/privada",
    "Bearer credencial-sintetica",
    "client_secret=valor-sintetico",
  ]) {
    assert.equal(containsForbiddenSecretMaterial({ body: secret }), true);
    await assert.rejects(
      () =>
        prepareAdeccaCourseImport(
          sourceFile(
            encoder.encode(
              JSON.stringify({
                format: "ceoubb-adecca-package",
                version: 1,
                source: { courseId: "demo", courseName: "Curso" },
                items: [{ sourceId: "aviso", title: "Aviso", kind: "notice", body: secret }],
              })
            ),
            "curso.json"
          )
        ),
      /credencial|secreto/i
    );
  }
  for (const url of [
    "https://adecca.ubiobio.cl/recurso",
    "https://example.edu/persona/11.111.111-1",
    "https://example.edu/?contact=ana%40alumnos.ubiobio.cl",
    "https://example.edu/%2574oken/valor",
  ])
    assert.equal(safeAdeccaHttpUrl(url), "");
  assert.equal(
    safeAdeccaHttpUrl("https://biblioteca.ubiobio.cl/recurso"),
    "https://biblioteca.ubiobio.cl/recurso"
  );
});

test("REQ-ADECCA-06: el cron Cloudflare autentica la purga y propaga sus fallos", async () => {
  const code = await readFile(new URL("../cloudflare-worker.js", import.meta.url), "utf8");
  const fixture = code.replace(
    /import worker,\s*\{[\s\S]*?\}\s*from "\.\/\.open-next\/worker\.js";/,
    `export const calls = [];
     const worker = { fetch: async (request, env) => {
       calls.push({ url: request.url, authorization: request.headers.get('authorization') });
       return new Response(null, { status: env.TEST_STATUS || 204 });
     }};
     const BucketCachePurge = class {};
     const DOQueueHandler = class {};
     const DOShardedTagCache = class {};`
  );
  const workerModule = await import(
    `data:text/javascript;base64,${Buffer.from(fixture).toString("base64")}`
  );
  let scheduled: Promise<void> | undefined;
  const context = {
    waitUntil(value: Promise<void>) {
      scheduled = value;
    },
  };
  workerModule.default.scheduled({}, { CRON_SECRET: "sintetico" }, context);
  await scheduled;
  assert.deepEqual(workerModule.calls, [
    { url: "https://ceoubb.com/api/cron/audit-retention", authorization: "Bearer sintetico" },
  ]);
  workerModule.default.scheduled({}, {}, context);
  await assert.rejects(scheduled!, /CRON_SECRET/);
  assert.equal(workerModule.calls.length, 1);
  workerModule.default.scheduled({}, { CRON_SECRET: "sintetico", TEST_STATUS: 500 }, context);
  await assert.rejects(scheduled!, /HTTP 500/);
});

test("REQ-ADECCA-01/04/09: metadatos se redactan y adjuntos de texto sensibles no se publican", async () => {
  const manifest = {
    format: "ceoubb-adecca-package",
    version: 1,
    source: { courseId: "11.111.111-1", courseName: "Curso ana@alumnos.ubiobio.cl" },
    items: [
      {
        sourceId: "persona",
        title: "Aviso 11.111.111-1",
        kind: "notice",
        body: "Consultar a ana@alumnos.ubiobio.cl",
        folder: "Unidad 11.111.111-1",
      },
    ],
  };
  const prepared = await prepareZip(
    [
      ["adecca-manifest.json", encoder.encode(JSON.stringify(manifest))],
      ["material-ana@alumnos.ubiobio.cl.pdf", encoder.encode("%PDF-1.7 sintetico")],
      ["contactos.txt", encoder.encode("ana@alumnos.ubiobio.cl")],
      ["datos.csv", encoder.encode("identificador,valor\n11.111.111-1,privado")],
    ],
    "curso-11.111.111-1.zip"
  );
  assert.doesNotMatch(JSON.stringify(prepared.preview.source), /11\.111\.111-1|ana@/);
  assert.doesNotMatch(JSON.stringify(prepared.preview.posts), /11\.111\.111-1|ana@/);
  assert.equal(prepared.preview.files.length, 1);
  assert.doesNotMatch(prepared.preview.files[0].fileName, /ana@/);
  assert.ok(prepared.preview.omissions.length >= 2);
  validateAdeccaImportSource(prepared.preview.source);
  validateAdeccaImportPosts(
    "seccion-2026",
    prepared.preview.posts.map((post) => ({
      ...post,
      storagePath: "",
      fileName: "",
      contentType: "",
      fileSize: 0,
      contentHash: "",
    }))
  );
  for (const [name, mime] of [
    ["video.mp4", "video/mp4"],
    ["imagen.gif", "image/gif"],
    ["audio.mp3", "audio/mpeg"],
    ["archivo.rar", "application/vnd.rar"],
    ["documento.odt", "application/vnd.oasis.opendocument.text"],
    ["falso.pdf", "text/plain"],
  ])
    assert.equal(adeccaFileIsSupported(name, mime), false);
});

test("REQ-ADECCA-05/06/07/08: ejecución real en libSQL conserva límites, actor y contadores", async () => {
  const previousUrl = process.env.TURSO_DATABASE_URL;
  process.env.TURSO_DATABASE_URL = "file::memory:?cache=shared";
  const db = getDb();
  const actor: PublicUser = {
    id: "docente-demo",
    name: "Docente",
    email: "docente@ubiobio.cl",
    role: "teacher",
  };
  const other: PublicUser = {
    id: "otro-demo",
    name: "Otro",
    email: "otro@ubiobio.cl",
    role: "teacher",
  };
  const section = "adecca-demo-2026";
  const now = new Date().toISOString();
  const source = {
    sourceKey: "a".repeat(64),
    fingerprint: "b".repeat(64),
    courseId: "demo",
    courseName: "Curso",
    courseShortName: "DEMO",
    adeccaVersion: "local",
    fileName: "curso.zip",
    sourceFormat: "zip" as const,
  };
  const plan = { contentCount: 0, fileCount: 0, participantCount: 1 };
  const roster = [
    { sourceUserId: "csv:1", email: "sintetica@alumnos.ubiobio.cl", role: "student" as const },
  ];
  try {
    for (const file of (await readdir(new URL("../drizzle/", import.meta.url)))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort()) {
      await db.$client.executeMultiple(
        (await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8")).replaceAll(
          "--> statement-breakpoint",
          ""
        )
      );
    }
    await db.insert(users).values([actor, other].map((user) => ({ ...user, createdAt: now })));
    await db.insert(facultades).values({ id: "f", nombre: "Ingeniería", sede: "Concepcion" });
    await db.insert(departamentos).values({ id: "d", facultadId: "f", nombre: "Mecánica" });
    await db
      .insert(asignaturas)
      .values({ id: "a", departamentoId: "d", codigo: "A101", nombre: "Curso", creditosSct: 6 });
    await db.insert(periodos).values({
      id: "p",
      nombre: "2026-2",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-12-31",
      estado: "abierto",
    });
    await db.insert(secciones).values({
      id: section,
      asignaturaId: "a",
      periodoId: "p",
      docenteId: actor.id,
      createdAt: now,
    });
    await db.insert(matriculas).values(
      [actor, other].map((user) => ({
        id: `mat-${user.id}`,
        seccionId: section,
        usuarioId: user.id,
        rolSeccion: "teacher" as const,
        estado: "activa" as const,
        createdAt: now,
      }))
    );
    assert.throws(() => validateAdeccaImportPlan({ ...plan, contentCount: 20_001 }), /límites/);
    assert.throws(() => validateAdeccaImportPlan({ ...plan, fileCount: 1 }), /límites/);
    const started = await startAdeccaImport(actor, section, source, plan);
    const resumed = await startAdeccaImport(actor, section, source, plan);
    assert.equal(resumed.runToken, started.runToken);
    assert.equal(resumed.resumed, true);
    await assert.rejects(() => startAdeccaImport(other, section, source, plan), /otro actor/);
    await assert.rejects(
      () => startAdeccaImport(actor, section, source, { ...plan, participantCount: 2 }),
      /otro actor/
    );
    await assert.rejects(
      () =>
        reconcileAdeccaRoster(
          other,
          section,
          source.sourceKey,
          source.fingerprint,
          started.runToken,
          roster
        ),
      /actor/
    );
    await assert.rejects(
      () =>
        reconcileAdeccaRoster(
          actor,
          section,
          source.sourceKey,
          source.fingerprint,
          "0".repeat(64),
          roster
        ),
      /actor/
    );
    const first = await reconcileAdeccaRoster(
      actor,
      section,
      source.sourceKey,
      source.fingerprint,
      started.runToken,
      roster
    );
    const repeated = await reconcileAdeccaRoster(
      actor,
      section,
      source.sourceKey,
      source.fingerprint,
      started.runToken,
      roster
    );
    assert.equal(first.participantsPending, 1);
    assert.equal(repeated.participantsPending, 1);
    await assert.rejects(
      () =>
        reconcileAdeccaRoster(
          actor,
          section,
          source.sourceKey,
          source.fingerprint,
          started.runToken,
          [{ ...roster[0], email: "segunda@alumnos.ubiobio.cl" }]
        ),
      /supera el plan/
    );
    assert.equal((await db.select().from(pendingAdeccaMatriculas)).length, 1);
    const items = await db.select().from(adeccaImportRunItems);
    assert.equal(items.length, 1);
    assert.doesNotMatch(JSON.stringify(items), /sintetica@|csv:1/);
    await db
      .update(adeccaImports)
      .set({ contentCount: 999, participantCount: 999 })
      .where(eq(adeccaImports.id, started.id));
    const completed = await completeAdeccaImport(
      actor,
      section,
      source.sourceKey,
      source.fingerprint,
      started.runToken,
      { warningCount: 0, warningCategories: [] }
    );
    assert.equal(completed.contentImported, 0);
    assert.equal(completed.participantCount, 1);
    assert.equal(completed.status, "completed");
    await assert.rejects(
      () =>
        writeAdeccaImportPosts(
          actor,
          section,
          source.sourceKey,
          source.fingerprint,
          started.runToken,
          []
        ),
      /finalizada/
    );
    const restarted = await startAdeccaImport(actor, section, source, plan);
    assert.notEqual(restarted.runToken, started.runToken);
    assert.equal((await db.select().from(adeccaImportRunItems)).length, 0);
    await assert.rejects(
      () =>
        reconcileAdeccaRoster(
          actor,
          section,
          source.sourceKey,
          source.fingerprint,
          started.runToken,
          roster
        ),
      /actor/
    );
    const partial = await completeAdeccaImport(
      actor,
      section,
      source.sourceKey,
      source.fingerprint,
      restarted.runToken,
      { warningCount: 0, warningCategories: [] }
    );
    assert.equal(partial.status, "partial");
    const listed = await listAdeccaImports(actor, section, 1);
    assert.equal(listed.length, 1);
    assert.equal(
      (await listAdeccaImports(actor, section, 1, `${listed[0].updatedAt}|${listed[0].id}`)).length,
      0
    );
    await db.update(periodos).set({ estado: "cerrado" }).where(eq(periodos.id, "p"));
    await assert.rejects(() => authorizeAdeccaImport(actor, section), /período/);
  } finally {
    db.$client.close();
    if (previousUrl === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = previousUrl;
  }
});
