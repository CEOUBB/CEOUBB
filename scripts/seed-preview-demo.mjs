/*
  Siembra el ramo de demostración que hace navegable una preview: una sección
  poblada, con publicaciones, ponderación, estudiantes y notas, y otra recién
  creada y vacía, para poder comparar el aula con datos contra sus estados
  vacíos sin salir del mismo despliegue.

  Escribe contra la misma base y el mismo proyecto Firebase de staging que usan
  las previews, nunca contra producción: `assertDemoTargets` rechaza cualquier
  otro objetivo antes de la primera escritura.
*/
// Implements: REQ-STG-01, REQ-AUTH-05

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  DEMO_FIXTURES,
  DEMO_FULL_SECTION,
  DEMO_TEACHER_ID,
  assertDemoTargets,
  demoFixtureCounts,
} from "./preview-demo-environment.mjs";
import { seedFirestore, serviceAccountCredentials, upsert } from "./seed-staging.mjs";

export async function seedDemoTurso({ databaseUrl, authToken = undefined }) {
  const client = createClient({ url: databaseUrl, authToken });
  try {
    return await seedDemoTursoWithClient(client);
  } finally {
    await client.close();
  }
}

export async function seedDemoTursoWithClient(client) {
  await migrate(drizzle(client), { migrationsFolder: resolve("drizzle") });
  await client.batch(
    [
      ...DEMO_FIXTURES.users.map((item) => upsert("users", item)),
      ...DEMO_FIXTURES.faculties.map((item) => upsert("facultades", item)),
      ...DEMO_FIXTURES.departments.map((item) => upsert("departamentos", item)),
      ...DEMO_FIXTURES.careers.map((item) => upsert("carreras", item)),
      ...DEMO_FIXTURES.subjects.map((item) => upsert("asignaturas", item)),
      ...DEMO_FIXTURES.periods.map((item) => upsert("periodos", item)),
      ...DEMO_FIXTURES.sections.map((item) => upsert("secciones", item)),
      ...DEMO_FIXTURES.profiles.map((item) => upsertProfile(item)),
      ...DEMO_FIXTURES.enrollments.map((item) => upsert("matriculas", item)),
    ],
    "write"
  );
  const [users, sections, enrollments] = await Promise.all([
    client.execute("SELECT count(*) AS total FROM users WHERE id LIKE 'dev:%'"),
    client.execute("SELECT count(*) AS total FROM secciones WHERE id LIKE 'demo-sec-%'"),
    client.execute("SELECT count(*) AS total FROM matriculas WHERE id LIKE 'demo-sec-%'"),
  ]);
  return {
    users: Number(users.rows[0]?.total ?? 0),
    sections: Number(sections.rows[0]?.total ?? 0),
    enrollments: Number(enrollments.rows[0]?.total ?? 0),
  };
}

/* `section_profiles` se identifica por la sección, no por una columna `id`, así
   que no puede pasar por el upsert genérico. */
function upsertProfile(profile) {
  return {
    sql: `INSERT INTO section_profiles (section_id, title, description, modality, room, tone, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(section_id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            modality = excluded.modality,
            room = excluded.room,
            tone = excluded.tone,
            updated_at = excluded.updated_at`,
    args: [
      profile.seccionId,
      profile.title,
      profile.description,
      profile.modality,
      profile.room,
      profile.tone,
      profile.updatedAt,
    ],
  };
}

export function demoFirestoreDocuments() {
  const users = DEMO_FIXTURES.users.map((user) => ({
    path: `users/${user.id}`,
    data: { email: user.email, name: user.name, role: user.role, demo: true },
  }));
  const enrollments = DEMO_FIXTURES.enrollments.map((enrollment) => ({
    path: `enrollments/${enrollment.usuarioId}/sections/${enrollment.seccionId}`,
    data: {
      seccionId: enrollment.seccionId,
      role: enrollment.rolSeccion,
      status: enrollment.estado,
      updatedAt: enrollment.createdAt,
      demo: true,
    },
  }));

  /* Sólo la sección poblada recibe contenido. La vacía se queda como la deja
     un docente que acaba de crearla. */
  const posts = DEMO_FIXTURES.posts.map((post) => ({
    path: `courses/${DEMO_FULL_SECTION}/posts/${post.id}`,
    data: {
      authorId: DEMO_TEACHER_ID,
      authorName: "Docente Demo",
      authorEmail: "docente.demo@ubiobio.cl",
      title: post.title,
      body: post.body,
      kind: post.kind,
      folder: post.folder,
      ...(post.dueDate ? { dueDate: post.dueDate } : {}),
      createdAt: "2026-08-01T12:00:00.000Z",
      demo: true,
    },
  }));

  const gradebook = {
    path: `courses/${DEMO_FULL_SECTION}/meta/gradebook`,
    data: { demo: true, evaluations: DEMO_FIXTURES.evaluations },
  };

  const students = DEMO_FIXTURES.enrollments.filter(
    (item) => item.seccionId === DEMO_FULL_SECTION && item.rolSeccion === "student"
  );
  const grades = students.map((student, index) => ({
    path: `courses/${DEMO_FULL_SECTION}/grades/${student.usuarioId}`,
    data: {
      uid: student.usuarioId,
      scores: {
        "demo-eval-certamen-1": Number((4.5 + index * 0.4).toFixed(1)),
        "demo-eval-certamen-2": null,
        "demo-eval-laboratorio": Number((5.2 + index * 0.3).toFixed(1)),
      },
      demo: true,
    },
  }));

  return [...users, ...enrollments, ...posts, gradebook, ...grades];
}

async function main() {
  const targets = assertDemoTargets({
    environment: process.env.CEOUBB_ENVIRONMENT,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
  });
  if (process.env.PREVIEW_SEED_DRY_RUN === "1") {
    process.stdout.write(`${JSON.stringify(demoFixtureCounts())}\n`);
    return;
  }
  const bearerToken = process.env.FIREBASE_ACCESS_TOKEN?.trim() ?? "";
  const credentials = bearerToken
    ? { clientEmail: "", privateKey: "" }
    : await serviceAccountCredentials();
  const relational = await seedDemoTurso({
    databaseUrl: targets.tursoDatabaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const firestoreWrites = await seedFirestore({
    projectId: targets.firebaseProjectId,
    clientEmail: credentials.clientEmail,
    privateKey: credentials.privateKey,
    bearerToken,
    documents: demoFirestoreDocuments(),
  });
  process.stdout.write(`${JSON.stringify({ relational, firestoreWrites })}\n`);
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  main().catch((cause) => {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  });
}
