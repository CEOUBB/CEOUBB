import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  EnrollmentImportError,
  MAX_ENROLLMENT_ROWS,
  buildEnrollmentMutationPlan,
  classifyEnrollmentRows,
  enrollmentImportFingerprint,
  enrollmentPreviewPage,
  importChunks,
  parseEnrollmentCsv,
} from "../lib/bulk-enrollment.ts";
import { canManageEnrollmentSection } from "../lib/services/bulk-enrollment.ts";
import {
  applyEnrollmentImport,
  claimPendingEnrollments,
  previewEnrollmentImport,
} from "../lib/services/bulk-enrollment.ts";
import { getDb } from "../db/index.ts";
import {
  asignaturas,
  departamentos,
  facultades,
  matriculas,
  matriculasPendientes,
  periodos,
  secciones,
  users,
} from "../db/schema.ts";

test("REQ-ENR-01: accepts BOM, semicolon delimiters, aliases and quoted fields", () => {
  const rows = parseEnrollmentCsv(
    '\uFEFFNombre completo;Correo institucional\r\n"Pérez, Ana"; ANA@ALUMNOS.UBIOBIO.CL \r\n'
  );

  assert.deepEqual(rows, [
    {
      row: 2,
      name: "Pérez, Ana",
      email: "ana@alumnos.ubiobio.cl",
      error: null,
    },
  ]);
});

test("REQ-ENR-01: accepts comma CSV and escaped quotes", () => {
  const rows = parseEnrollmentCsv('name,email\n"Ana ""Anita"" Pérez",ana@alumnos.ubiobio.cl\n');

  assert.equal(rows[0]?.name, 'Ana "Anita" Pérez');
  assert.equal(rows[0]?.error, null);
});

test("REQ-ENR-07: invalid domains, missing data and repeated emails block the file", () => {
  const rows = parseEnrollmentCsv(
    [
      "nombre,correo",
      "Ana,ana@alumnos.ubiobio.cl",
      "Ana repetida,ANA@ALUMNOS.UBIOBIO.CL",
      "Docente,docente@ubiobio.cl",
      "Personal,persona@gmail.com",
      ",sin-nombre@alumnos.ubiobio.cl",
      "Sin correo,",
    ].join("\n")
  );

  assert.equal(rows[0]?.error, null);
  assert.match(rows[1]?.error ?? "", /repetido/);
  assert.match(rows[2]?.error ?? "", /@alumnos\.ubiobio\.cl/);
  assert.match(rows[3]?.error ?? "", /@alumnos\.ubiobio\.cl/);
  assert.match(rows[4]?.error ?? "", /nombre/);
  assert.match(rows[5]?.error ?? "", /correo/);
});

test("REQ-ENR-07: malformed quotes fail with a bounded row error", () => {
  assert.throws(
    () => parseEnrollmentCsv('nombre,correo\n"Ana,ana@alumnos.ubiobio.cl'),
    (cause) =>
      cause instanceof EnrollmentImportError &&
      cause.code === "invalid_csv" &&
      cause.message.includes("fila 2")
  );
});

test("REQ-ENR-01: rejects files above the institutional row ceiling", () => {
  const body = Array.from(
    { length: MAX_ENROLLMENT_ROWS + 1 },
    (_, index) => `Estudiante ${index},estudiante${index}@alumnos.ubiobio.cl`
  );
  assert.throws(
    () => parseEnrollmentCsv(["nombre,correo", ...body].join("\n")),
    (cause) => cause instanceof EnrollmentImportError && cause.code === "file_too_large"
  );
});

test("REQ-ENR-02 and REQ-ENR-04: classifies active, reactivated and pending students", () => {
  const parsed = parseEnrollmentCsv(
    [
      "nombre;correo",
      "Activa;activa@alumnos.ubiobio.cl",
      "Retirada;retirada@alumnos.ubiobio.cl",
      "Nueva cuenta;nueva@alumnos.ubiobio.cl",
      "Pendiente;pendiente@alumnos.ubiobio.cl",
    ].join("\n")
  );
  const classified = classifyEnrollmentRows(parsed, {
    registeredUsers: [
      { id: "u-activa", email: "activa@alumnos.ubiobio.cl" },
      { id: "u-retirada", email: "retirada@alumnos.ubiobio.cl" },
    ],
    currentEnrollments: [
      { userId: "u-activa", role: "student", status: "activa" },
      { userId: "u-retirada", role: "student", status: "retirada" },
    ],
    pendingEmails: ["pendiente@alumnos.ubiobio.cl"],
  });

  assert.deepEqual(
    classified.map((row) => row.status),
    ["unchanged", "reactivate", "pending", "unchanged"]
  );
  const plan = buildEnrollmentMutationPlan(classified);
  assert.deepEqual(
    plan.enrollments.map((row) => row.userId),
    ["u-retirada"]
  );
  assert.deepEqual(
    plan.pending.map((row) => row.email),
    ["nueva@alumnos.ubiobio.cl"]
  );
  assert.deepEqual(
    plan.registeredForProjection.map((row) => row.userId),
    ["u-activa", "u-retirada"]
  );
});

test("REQ-ENR-06: applying the same normalized roster produces no duplicate mutation plan", () => {
  const parsed = parseEnrollmentCsv(
    ["nombre,correo", "Ana,ana@alumnos.ubiobio.cl", "Bastián,bastian@alumnos.ubiobio.cl"].join("\n")
  );
  const first = classifyEnrollmentRows(parsed, {
    registeredUsers: [{ id: "u-ana", email: "ana@alumnos.ubiobio.cl" }],
    currentEnrollments: [],
    pendingEmails: [],
  });
  assert.equal(buildEnrollmentMutationPlan(first).enrollments.length, 1);
  assert.equal(buildEnrollmentMutationPlan(first).pending.length, 1);

  const repeated = classifyEnrollmentRows(parsed, {
    registeredUsers: [{ id: "u-ana", email: "ana@alumnos.ubiobio.cl" }],
    currentEnrollments: [{ userId: "u-ana", role: "student", status: "activa" }],
    pendingEmails: ["bastian@alumnos.ubiobio.cl"],
  });
  const repeatedPlan = buildEnrollmentMutationPlan(repeated);
  assert.deepEqual(
    repeated.map((row) => row.status),
    ["unchanged", "unchanged"]
  );
  assert.equal(repeatedPlan.enrollments.length, 0);
  assert.equal(repeatedPlan.pending.length, 0);
  assert.deepEqual(
    repeatedPlan.registeredForProjection.map((row) => row.userId),
    ["u-ana"]
  );
});

test("REQ-ENR-02 and REQ-ENR-08: preview responses are paginated to 50 rows", () => {
  const parsed = parseEnrollmentCsv(
    [
      "nombre,correo",
      ...Array.from(
        { length: 123 },
        (_, index) => `Estudiante ${index},estudiante${index}@alumnos.ubiobio.cl`
      ),
    ].join("\n")
  );
  const classified = classifyEnrollmentRows(parsed, {
    registeredUsers: [],
    currentEnrollments: [],
    pendingEmails: [],
  });
  const preview = enrollmentPreviewPage("fingerprint", classified, 3);

  assert.equal(preview.pageSize, 50);
  assert.equal(preview.totalPages, 3);
  assert.equal(preview.rows.length, 23);
  assert.equal(preview.totals.pending, 123);
  assert.equal(preview.canApply, true);
  assert.equal("userId" in preview.rows[0]!, false);
});

test("REQ-ENR-06: fingerprints use normalized content and query chunks never exceed 100", () => {
  const left = parseEnrollmentCsv("nombre,correo\n Ana  Pérez ,ANA@ALUMNOS.UBIOBIO.CL");
  const right = parseEnrollmentCsv("nombre;correo\nAna Pérez;ana@alumnos.ubiobio.cl");

  assert.equal(
    enrollmentImportFingerprint("seccion-1", left),
    enrollmentImportFingerprint("seccion-1", right)
  );
  assert.notEqual(
    enrollmentImportFingerprint("seccion-1", left),
    enrollmentImportFingerprint("seccion-2", right)
  );
  assert.deepEqual(
    importChunks(Array.from({ length: 225 }, (_, index) => index)).map((chunk) => chunk.length),
    [100, 100, 25]
  );
});

test("REQ-ENR-03: only the owner or current section teaching team can import", () => {
  const openSection = {
    docenteId: "teacher-primary",
    periodStatus: "abierto" as const,
  };
  assert.equal(canManageEnrollmentSection({ id: "owner", role: "owner" }, openSection), true);
  assert.equal(
    canManageEnrollmentSection({ id: "teacher-primary", role: "teacher" }, openSection),
    true
  );
  assert.equal(
    canManageEnrollmentSection(
      { id: "coordinator", role: "teacher" },
      {
        ...openSection,
        membershipRole: "coordinator",
        membershipStatus: "activa",
      }
    ),
    true
  );
  assert.equal(
    canManageEnrollmentSection(
      { id: "outsider", role: "teacher" },
      { ...openSection, membershipRole: "teacher", membershipStatus: "retirada" }
    ),
    false
  );
  assert.equal(
    canManageEnrollmentSection(
      { id: "owner", role: "owner" },
      { ...openSection, periodStatus: "archivado" }
    ),
    false
  );
});

test("REQ-ENR-04 and REQ-ENR-06: database apply is idempotent and keeps a projection outbox", async () => {
  process.env.TURSO_DATABASE_URL = "file::memory:?cache=shared";
  delete process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const db = getDb();
  const migrations = (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    const sql = await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8");
    await db.$client.executeMultiple(sql.replaceAll("--> statement-breakpoint", ""));
  }

  const now = "2026-08-23T12:00:00.000Z";
  await db.insert(users).values([
    { id: "owner", email: "owner@ubiobio.cl", name: "Owner", role: "owner", createdAt: now },
    {
      id: "teacher",
      email: "teacher@ubiobio.cl",
      name: "Teacher",
      role: "teacher",
      createdAt: now,
    },
    {
      id: "student-existing",
      email: "ana@alumnos.ubiobio.cl",
      name: "Ana",
      role: "student",
      createdAt: now,
    },
  ]);
  await db.insert(facultades).values({ id: "fi", nombre: "Ingeniería", sede: "Concepcion" });
  await db
    .insert(departamentos)
    .values({ id: "dim", facultadId: "fi", nombre: "Ingeniería Mecánica" });
  await db.insert(asignaturas).values({
    id: "estatica-asignatura",
    codigo: "440299",
    nombre: "Estática",
    creditosSct: 6,
    departamentoId: "dim",
  });
  await db.insert(periodos).values({
    id: "2026-2",
    nombre: "Segundo semestre 2026",
    fechaInicio: "2026-08-01",
    fechaFin: "2026-12-31",
    estado: "abierto",
  });
  await db.insert(secciones).values({
    id: "440299-2026-2-1",
    asignaturaId: "estatica-asignatura",
    periodoId: "2026-2",
    numeroSeccion: 1,
    docenteId: "teacher",
    createdAt: now,
  });

  const actor = {
    id: "owner",
    email: "owner@ubiobio.cl",
    name: "Owner",
    role: "owner" as const,
  };
  const newStudents = Array.from({ length: 101 }, (_, index) =>
    index === 0
      ? "Bastián;bastian@alumnos.ubiobio.cl"
      : `Pendiente ${index};pendiente${index}@alumnos.ubiobio.cl`
  );
  const input = {
    sectionId: "440299-2026-2-1",
    csv: ["nombre;correo", "Ana;ana@alumnos.ubiobio.cl", ...newStudents].join("\n"),
  };
  const firstPreview = await previewEnrollmentImport(actor, input);
  assert.equal(firstPreview.rows[0]?.status, "activate");
  assert.equal(firstPreview.totals.activate, 1);
  assert.equal(firstPreview.totals.pending, 101);

  const firstApply = await applyEnrollmentImport(actor, {
    ...input,
    fingerprint: firstPreview.fingerprint,
  });
  assert.equal(firstApply.activated, 1);
  assert.equal(firstApply.pending, 101);
  assert.equal(firstApply.projectionPending, true);
  assert.equal((await db.select().from(matriculas).limit(100)).length, 1);
  assert.equal((await db.select().from(matriculasPendientes).limit(200)).length, 102);

  const repeatedPreview = await previewEnrollmentImport(actor, input);
  assert.equal(
    repeatedPreview.rows.every((row) => row.status === "unchanged"),
    true
  );
  assert.equal(repeatedPreview.totals.unchanged, 102);
  const repeatedApply = await applyEnrollmentImport(actor, {
    ...input,
    fingerprint: repeatedPreview.fingerprint,
  });
  assert.equal(repeatedApply.activated, 0);
  assert.equal(repeatedApply.pending, 0);
  assert.equal(repeatedApply.unchanged, 102);
  assert.equal((await db.select().from(matriculas).limit(100)).length, 1);
  assert.equal((await db.select().from(matriculasPendientes).limit(200)).length, 102);

  await db.insert(users).values({
    id: "student-new",
    email: "bastian@alumnos.ubiobio.cl",
    name: "Bastián",
    role: "student",
    createdAt: now,
  });
  const claim = await claimPendingEnrollments({
    id: "student-new",
    email: "BASTIAN@ALUMNOS.UBIOBIO.CL",
  });
  assert.deepEqual(claim, { claimed: 1, projectionPending: true });
  assert.equal((await db.select().from(matriculas).limit(100)).length, 2);
  assert.equal((await db.select().from(matriculasPendientes).limit(200)).length, 102);
});
