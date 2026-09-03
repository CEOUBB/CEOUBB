import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  asignaturas,
  carreras,
  departamentos,
  facultades,
  matriculas,
  periodos,
  secciones,
  sectionProfiles,
  users,
} from "../db/schema.ts";

const dbFile = "local.db";
if (process.argv.includes("--reset") || !existsSync(dbFile)) {
  if (existsSync(dbFile)) {
    console.log(`[local-db] Eliminando base de datos local obsoleta (${dbFile})...`);
    unlinkSync(dbFile);
    if (existsSync(`${dbFile}-wal`)) unlinkSync(`${dbFile}-wal`);
    if (existsSync(`${dbFile}-shm`)) unlinkSync(`${dbFile}-shm`);
  }
}

const dbPath = process.env.TURSO_DATABASE_URL || "file:local.db";
const client = createClient({ url: dbPath });
const db = drizzle(client);

console.log(`[local-db] Aplicando migraciones Drizzle en ${dbPath}...`);
await migrate(db, { migrationsFolder: resolve("drizzle") });
console.log(`[local-db] Migraciones aplicadas con éxito.`);

const now = new Date().toISOString();

console.log(`[local-db] Insertando datos académicos de prueba...`);

// 1. Usuarios demo
const testUsers = [
  {
    id: "dev:teacher-demo",
    email: "docente.demo@ubiobio.cl",
    name: "Docente Demo",
    role: "teacher",
    createdAt: now,
  },
  {
    id: "dev:student-demo",
    email: "estudiante.demo@alumnos.ubiobio.cl",
    name: "Estudiante Demo",
    role: "student",
    createdAt: now,
  },
  {
    id: "firebase:test-owner",
    email: "coordinacion@ubiobio.cl",
    name: "Owner De Prueba",
    role: "owner",
    createdAt: now,
  },
  {
    id: "firebase:test-teacher",
    email: "docente@ubiobio.cl",
    name: "Docente De Prueba",
    role: "teacher",
    createdAt: now,
  },
  {
    id: "firebase:test-student",
    email: "estudiante@alumnos.ubiobio.cl",
    name: "Estudiante De Prueba",
    role: "student",
    createdAt: now,
  },
];

for (const u of testUsers) {
  await db
    .insert(users)
    .values(u)
    .onConflictDoUpdate({
      target: users.id,
      set: { email: u.email, name: u.name, role: u.role },
    });
}

// 2. Estructura institucional
const testFacultad = {
  id: "fac-ingenieria",
  nombre: "Facultad de Ingeniería",
  sede: "Concepcion",
};
await db.insert(facultades).values(testFacultad).onConflictDoNothing();

const testDepto = {
  id: "dep-mecanica",
  facultadId: "fac-ingenieria",
  nombre: "Departamento de Ingeniería Mecánica",
};
await db.insert(departamentos).values(testDepto).onConflictDoNothing();

const testCarrera = {
  id: "car-mecanica",
  departamentoId: "dep-mecanica",
  codigo: "29017",
  nombre: "Ingeniería Civil Mecánica",
};
await db.insert(carreras).values(testCarrera).onConflictDoNothing();

const testPeriodo = {
  id: "2026-2",
  nombre: "Segundo Semestre 2026",
  fechaInicio: "2026-08-01",
  fechaFin: "2026-12-31",
  estado: "abierto",
};
await db.insert(periodos).values(testPeriodo).onConflictDoNothing();

// 3. Asignaturas
const testAsignaturas = [
  {
    id: "asig-termo-1",
    codigo: "MEC210",
    nombre: "Termodinámica I",
    creditosSct: 5,
    departamentoId: "dep-mecanica",
  },
  {
    id: "asig-fluidos",
    codigo: "MEC220",
    nombre: "Mecánica de Fluidos",
    creditosSct: 6,
    departamentoId: "dep-mecanica",
  },
  {
    id: "asig-transferencia",
    codigo: "MEC310",
    nombre: "Transferencia de Calor",
    creditosSct: 5,
    departamentoId: "dep-mecanica",
  },
];

for (const a of testAsignaturas) {
  await db.insert(asignaturas).values(a).onConflictDoNothing();
}

// 4. Secciones y Perfiles de sección
const testSecciones = [
  {
    id: "sec-mec210-2026-2-1",
    asignaturaId: "asig-termo-1",
    periodoId: "2026-2",
    numeroSeccion: 1,
    docenteId: "dev:teacher-demo",
    createdAt: now,
    profile: {
      title: "Termodinámica I",
      description: "Curso de termodinámica clásica aplicada a sistemas de ingeniería.",
      modality: "presencial",
      room: "G-102",
      tone: "sky",
    },
  },
  {
    id: "sec-mec220-2026-2-1",
    asignaturaId: "asig-fluidos",
    periodoId: "2026-2",
    numeroSeccion: 1,
    docenteId: "dev:teacher-demo",
    createdAt: now,
    profile: {
      title: "Mecánica de Fluidos",
      description: "Estudio del comportamiento estático y dinámico de fluidos Newtonianos.",
      modality: "presencial",
      room: "Lab Fluidos",
      tone: "emerald",
    },
  },
  {
    id: "sec-mec310-2026-2-1",
    asignaturaId: "asig-transferencia",
    periodoId: "2026-2",
    numeroSeccion: 1,
    docenteId: "firebase:test-teacher",
    createdAt: now,
    profile: {
      title: "Transferencia de Calor",
      description: "Conducción, convección y radiación térmica.",
      modality: "presencial",
      room: "Auditorio Mecánica",
      tone: "gold",
    },
  },
];

for (const s of testSecciones) {
  await db
    .insert(secciones)
    .values({
      id: s.id,
      asignaturaId: s.asignaturaId,
      periodoId: s.periodoId,
      numeroSeccion: s.numeroSeccion,
      docenteId: s.docenteId,
      createdAt: s.createdAt,
    })
    .onConflictDoNothing();

  await db
    .insert(sectionProfiles)
    .values({
      seccionId: s.id,
      title: s.profile.title,
      description: s.profile.description,
      modality: s.profile.modality,
      room: s.profile.room,
      tone: s.profile.tone,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: sectionProfiles.seccionId,
      set: {
        title: s.profile.title,
        description: s.profile.description,
        modality: s.profile.modality,
        room: s.profile.room,
        tone: s.profile.tone,
        updatedAt: now,
      },
    });
}

// 5. Matrículas (Docentes y Estudiantes)
const testMatriculas = [
  // Docente Demo en sus 2 secciones
  {
    id: "mat-demo-teacher-termo",
    seccionId: "sec-mec210-2026-2-1",
    usuarioId: "dev:teacher-demo",
    rolSeccion: "teacher",
    estado: "activa",
    createdAt: now,
  },
  {
    id: "mat-demo-teacher-fluidos",
    seccionId: "sec-mec220-2026-2-1",
    usuarioId: "dev:teacher-demo",
    rolSeccion: "teacher",
    estado: "activa",
    createdAt: now,
  },
  // Estudiante Demo matriculado en Termodinámica y Fluidos
  {
    id: "mat-demo-student-termo",
    seccionId: "sec-mec210-2026-2-1",
    usuarioId: "dev:student-demo",
    rolSeccion: "student",
    estado: "activa",
    createdAt: now,
  },
  {
    id: "mat-demo-student-fluidos",
    seccionId: "sec-mec220-2026-2-1",
    usuarioId: "dev:student-demo",
    rolSeccion: "student",
    estado: "activa",
    createdAt: now,
  },
  // Test Docente en Transferencia de Calor
  {
    id: "mat-test-teacher-transf",
    seccionId: "sec-mec310-2026-2-1",
    usuarioId: "firebase:test-teacher",
    rolSeccion: "teacher",
    estado: "activa",
    createdAt: now,
  },
  {
    id: "mat-test-student-transf",
    seccionId: "sec-mec310-2026-2-1",
    usuarioId: "firebase:test-student",
    rolSeccion: "student",
    estado: "activa",
    createdAt: now,
  },
];

for (const m of testMatriculas) {
  await db
    .insert(matriculas)
    .values(m)
    .onConflictDoUpdate({
      target: [matriculas.seccionId, matriculas.usuarioId],
      set: { rolSeccion: m.rolSeccion, estado: m.estado },
    });
}

console.log(`[local-db] Base de datos local lista y poblada correctamente.`);
await client.close();
