// Implements: REQ-ARCH-01, REQ-ARCH-06, REQ-ARCH-07
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import {
  asignaturas,
  departamentos,
  facultades,
  periodos,
  secciones,
  users,
} from "../db/schema.ts";
import {
  archiveAcademicPeriod,
  listAcademicPeriods,
  listPeriodSectionProjections,
  PeriodArchiveError,
  synchronizeAcademicPeriod,
} from "../lib/services/academic-period-archive.ts";

process.env.TURSO_DATABASE_URL = "file::memory:?cache=shared";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

before(async () => {
  const db = getDb();
  const migrations = (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    const sql = await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8");
    await db.$client.executeMultiple(sql.replaceAll("--> statement-breakpoint", ""));
  }

  const now = "2026-03-01T08:00:00.000Z";
  await db
    .insert(facultades)
    .values({ id: "fac-ciencias", nombre: "Facultad de Ciencias", sede: "Concepcion" })
    .onConflictDoNothing();
  await db
    .insert(departamentos)
    .values({
      id: "dep-computacion",
      facultadId: "fac-ciencias",
      nombre: "Sistemas de Información",
    })
    .onConflictDoNothing();
  await db
    .insert(asignaturas)
    .values([
      {
        id: "asig-inf101",
        codigo: "INF101",
        nombre: "Estructuras de Datos",
        creditosSct: 6,
        departamentoId: "dep-computacion",
      },
      {
        id: "asig-inf102",
        codigo: "INF102",
        nombre: "Bases de Datos",
        creditosSct: 6,
        departamentoId: "dep-computacion",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      id: "docente-1",
      email: "docente@ubiobio.cl",
      name: "Profesor Prueba",
      role: "teacher",
      createdAt: now,
    })
    .onConflictDoNothing();
});

after(() => {
  getDb().$client.close();
});

test("listAcademicPeriods retorna períodos ordenados desc por id y pagina con boundedLimit y nextCursor", async () => {
  const db = getDb();
  await db.delete(secciones);
  await db.delete(periodos);

  await db.insert(periodos).values([
    {
      id: "2025-1",
      nombre: "Primer Semestre 2025",
      fechaInicio: "2025-03-01",
      fechaFin: "2025-07-31",
      estado: "archivado",
    },
    {
      id: "2025-2",
      nombre: "Segundo Semestre 2025",
      fechaInicio: "2025-08-01",
      fechaFin: "2025-12-31",
      estado: "archivado",
    },
    {
      id: "2026-1",
      nombre: "Primer Semestre 2026",
      fechaInicio: "2026-03-01",
      fechaFin: "2026-07-31",
      estado: "abierto",
    },
  ]);

  // Lista completa con boundedLimit por defecto (50)
  const all = await listAcademicPeriods();
  assert.equal(all.items.length, 3);
  assert.deepEqual(
    all.items.map((p) => p.id),
    ["2026-1", "2025-2", "2025-1"]
  );
  assert.equal(all.nextCursor, null);

  // Paginación con límite acotado (limit: 2)
  const page1 = await listAcademicPeriods({ limit: 2 });
  assert.equal(page1.items.length, 2);
  assert.deepEqual(
    page1.items.map((p) => p.id),
    ["2026-1", "2025-2"]
  );
  assert.equal(page1.nextCursor, "2025-2");

  // Página siguiente utilizando cursor determinista
  const page2 = await listAcademicPeriods({ limit: 2, cursor: page1.nextCursor });
  assert.equal(page2.items.length, 1);
  assert.equal(page2.items[0].id, "2025-1");
  assert.equal(page2.nextCursor, null);

  // Límites fuera de rango respetan boundedLimit (clamped a 1..100)
  const clampedMin = await listAcademicPeriods({ limit: 0 });
  assert.equal(clampedMin.items.length, 1);
  assert.equal(clampedMin.nextCursor, "2026-1");

  const clampedMax = await listAcademicPeriods({ limit: 500 });
  assert.equal(clampedMax.items.length, 3);
  assert.equal(clampedMax.nextCursor, null);
});

test("listPeriodSectionProjections filtra por periodoId y pagina ascendentemente por id", async () => {
  const db = getDb();
  await db.delete(secciones);
  const now = "2026-03-01T08:00:00.000Z";

  // Secciones pertenecientes a 2026-1 y una a 2025-2
  await db.insert(secciones).values([
    {
      id: "sec-2026-1-a",
      asignaturaId: "asig-inf101",
      periodoId: "2026-1",
      numeroSeccion: 1,
      docenteId: "docente-1",
      createdAt: now,
    },
    {
      id: "sec-2026-1-b",
      asignaturaId: "asig-inf101",
      periodoId: "2026-1",
      numeroSeccion: 2,
      docenteId: "docente-1",
      createdAt: now,
    },
    {
      id: "sec-2026-1-c",
      asignaturaId: "asig-inf102",
      periodoId: "2026-1",
      numeroSeccion: 1,
      docenteId: "docente-1",
      createdAt: now,
    },
    {
      id: "sec-2025-2-other",
      asignaturaId: "asig-inf101",
      periodoId: "2025-2",
      numeroSeccion: 1,
      docenteId: "docente-1",
      createdAt: now,
    },
  ]);

  // Filtra exclusivamente las secciones del periodo 2026-1
  const fullList = await listPeriodSectionProjections("2026-1");
  assert.equal(fullList.items.length, 3);
  assert.deepEqual(
    fullList.items.map((s) => s.seccionId),
    ["sec-2026-1-a", "sec-2026-1-b", "sec-2026-1-c"]
  );
  assert.ok(fullList.items.every((s) => s.periodoId === "2026-1"));
  assert.equal(fullList.nextCursor, null);

  // Paginación ascendente por id
  const page1 = await listPeriodSectionProjections("2026-1", { limit: 2 });
  assert.equal(page1.items.length, 2);
  assert.deepEqual(
    page1.items.map((s) => s.seccionId),
    ["sec-2026-1-a", "sec-2026-1-b"]
  );
  assert.equal(page1.nextCursor, "sec-2026-1-b");

  const page2 = await listPeriodSectionProjections("2026-1", {
    limit: 2,
    cursor: page1.nextCursor,
  });
  assert.equal(page2.items.length, 1);
  assert.equal(page2.items[0].seccionId, "sec-2026-1-c");
  assert.equal(page2.nextCursor, null);
});

test("loadPeriodAccess rechaza identificadores inválidos con invalid_period e inexistentes con not_found", async () => {
  const invalidIds = ["periodo/con/slash", "periodo con espacios", "", "2026-1/extra"];
  for (const id of invalidIds) {
    await assert.rejects(
      async () => archiveAcademicPeriod(id),
      (err: unknown) =>
        err instanceof PeriodArchiveError &&
        err.code === "invalid_period" &&
        err.message === "El identificador del período no es válido."
    );
    await assert.rejects(
      async () => synchronizeAcademicPeriod(id),
      (err: unknown) =>
        err instanceof PeriodArchiveError &&
        err.code === "invalid_period" &&
        err.message === "El identificador del período no es válido."
    );
  }

  const notFoundId = "periodo-inexistente-2099";
  await assert.rejects(
    async () => archiveAcademicPeriod(notFoundId),
    (err: unknown) =>
      err instanceof PeriodArchiveError &&
      err.code === "not_found" &&
      err.message === "El período académico no existe."
  );
  await assert.rejects(
    async () => synchronizeAcademicPeriod(notFoundId),
    (err: unknown) =>
      err instanceof PeriodArchiveError &&
      err.code === "not_found" &&
      err.message === "El período académico no existe."
  );
});

test("archiveAcademicPeriod: revierte y lanza projection_failed si falla proyección a Firestore, preservando estado", async (t) => {
  const db = getDb();
  // Asegurar que 2026-1 esté en estado abierto
  await db.update(periodos).set({ estado: "abierto" }).where(eq(periodos.id, "2026-1"));

  // Caso 1: credenciales de servicio ausentes
  delete process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;

  await assert.rejects(
    async () => archiveAcademicPeriod("2026-1"),
    (err: unknown) =>
      err instanceof PeriodArchiveError &&
      err.code === "projection_failed" &&
      err.message === "Firebase no confirmó el modo de solo lectura del período."
  );

  let [row] = await db.select().from(periodos).where(eq(periodos.id, "2026-1"));
  assert.equal(row.estado, "abierto");

  // Caso 2: credenciales presentes pero llamada a Firestore rechazada por error de red / HTTP 500
  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "audit@example.test";
  process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKeyPem;

  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    }
    return new Response("Internal error", { status: 500 });
  });

  await assert.rejects(
    async () => archiveAcademicPeriod("2026-1"),
    (err: unknown) =>
      err instanceof PeriodArchiveError &&
      err.code === "projection_failed" &&
      err.message === "Firebase no confirmó el modo de solo lectura del período."
  );

  [row] = await db.select().from(periodos).where(eq(periodos.id, "2026-1"));
  assert.equal(row.estado, "abierto");
});

test("archiveAcademicPeriod: archiva exitosamente en Turso y es idempotente en llamadas subsiguientes", async (t) => {
  const db = getDb();
  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "audit@example.test";
  process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKeyPem;

  const commits: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-valid-token", expires_in: 3600 });
    }
    if (url.includes("documents:commit")) {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      commits.push(body);
      return Response.json({ writeResults: [{ updateTime: "2026-03-01T12:00:00Z" }] });
    }
    return new Response("Not found", { status: 404 });
  });

  // 1. Primer archivado (éxito)
  const result1 = await archiveAcademicPeriod("2026-1");
  assert.equal(result1.alreadyArchived, false);
  assert.equal(result1.period.id, "2026-1");
  assert.equal(result1.period.estado, "archivado");
  assert.equal(result1.sectionCount, 3);

  // Verificar que el estado cambió a archivado en Turso
  const [row] = await db.select().from(periodos).where(eq(periodos.id, "2026-1"));
  assert.equal(row.estado, "archivado");
  assert.ok(commits.length > 0);

  // 2. Segundo archivado (idempotencia)
  const commitsBefore = commits.length;
  const result2 = await archiveAcademicPeriod("2026-1");
  assert.equal(result2.alreadyArchived, true);
  assert.equal(result2.period.id, "2026-1");
  assert.equal(result2.period.estado, "archivado");
  assert.equal(result2.sectionCount, 3);

  // Estado en Turso sigue siendo archivado
  const [rowAfter] = await db.select().from(periodos).where(eq(periodos.id, "2026-1"));
  assert.equal(rowAfter.estado, "archivado");
  assert.ok(commits.length >= commitsBefore);
});

test("synchronizeAcademicPeriod: sincroniza metadatos y secciones del período activo a Firestore", async (t) => {
  const db = getDb();
  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "audit@example.test";
  process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKeyPem;

  // Insertar un nuevo período abierto 2026-2 con una sección
  await db
    .insert(periodos)
    .values({
      id: "2026-2",
      nombre: "Segundo Semestre 2026",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-12-31",
      estado: "abierto",
    })
    .onConflictDoNothing();

  const now = "2026-08-01T08:00:00.000Z";
  await db
    .insert(secciones)
    .values({
      id: "sec-2026-2-sync",
      asignaturaId: "asig-inf101",
      periodoId: "2026-2",
      numeroSeccion: 1,
      docenteId: "docente-1",
      createdAt: now,
    })
    .onConflictDoNothing();

  type FirestoreWritePayload = {
    writes: Array<{
      update?: {
        name: string;
        fields?: Record<string, { stringValue?: string }>;
      };
    }>;
  };
  const writesReceived: FirestoreWritePayload[] = [];

  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-valid-token", expires_in: 3600 });
    }
    if (url.includes("documents:commit")) {
      const payload = JSON.parse(String(init?.body)) as FirestoreWritePayload;
      writesReceived.push(payload);
      return Response.json({ writeResults: [{ updateTime: "2026-08-01T12:00:00Z" }] });
    }
    return new Response("Not found", { status: 404 });
  });

  const syncResult = await synchronizeAcademicPeriod("2026-2");
  assert.equal(syncResult.period.id, "2026-2");
  assert.equal(syncResult.period.estado, "abierto");
  assert.equal(syncResult.sectionCount, 1);

  // Validar escrituras enviadas a Firestore
  const allWrites = writesReceived.flatMap((p) => p.writes);
  const periodWrite = allWrites.find((w) => w.update?.name.includes("/academicPeriods/2026-2"));
  assert.ok(periodWrite, "Debe proyectarse el documento academicPeriods/2026-2");
  assert.equal(periodWrite?.update?.fields?.status?.stringValue, "abierto");

  const sectionWrite = allWrites.find((w) =>
    w.update?.name.includes("/academicSections/sec-2026-2-sync")
  );
  assert.ok(sectionWrite, "Debe proyectarse el documento academicSections/sec-2026-2-sync");
  assert.equal(sectionWrite?.update?.fields?.periodoId?.stringValue, "2026-2");
});
