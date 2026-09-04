import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  STAGING_FIXTURES,
  STAGING_REQUIREMENTS,
  assertStagingTargets,
  fixtureCounts,
} from "./staging-environment.mjs";

export const STAGING_SEED_REQUIREMENTS = [...STAGING_REQUIREMENTS, "Implements: REQ-STG-05"];

export async function seedTurso({ databaseUrl, authToken = undefined }) {
  const client = createClient({ url: databaseUrl, authToken });
  try {
    return await seedTursoWithClient(client);
  } finally {
    await client.close();
  }
}

export async function seedTursoWithClient(client) {
  await migrate(drizzle(client), { migrationsFolder: resolve("drizzle") });
  const statements = [
    ...STAGING_FIXTURES.users.map((item) => upsert("users", item)),
    ...STAGING_FIXTURES.faculties.map((item) => upsert("facultades", item)),
    ...STAGING_FIXTURES.departments.map((item) => upsert("departamentos", item)),
    ...STAGING_FIXTURES.careers.map((item) => upsert("carreras", item)),
    ...STAGING_FIXTURES.subjects.map((item) => upsert("asignaturas", item)),
    ...STAGING_FIXTURES.periods.map((item) => upsert("periodos", item)),
    ...STAGING_FIXTURES.sections.map((item) => upsert("secciones", item)),
    ...STAGING_FIXTURES.enrollments.map((item) => upsert("matriculas", item)),
  ];
  await client.batch(statements, "write");
  const [users, sections, enrollments] = await Promise.all([
    client.execute("SELECT count(*) AS total FROM users WHERE id LIKE 'firebase:staging-%'"),
    client.execute("SELECT count(*) AS total FROM secciones WHERE id LIKE 'staging-sec-%'"),
    client.execute("SELECT count(*) AS total FROM matriculas WHERE id LIKE 'staging-sec-%'"),
  ]);
  return {
    users: Number(users.rows[0]?.total ?? 0),
    sections: Number(sections.rows[0]?.total ?? 0),
    enrollments: Number(enrollments.rows[0]?.total ?? 0),
  };
}

/* `documents` queda parametrizado para que el sembrado de demo de las previews
   reutilice este transporte sin duplicar la autenticación con Firestore. */
export async function seedFirestore({
  projectId,
  clientEmail,
  privateKey,
  bearerToken,
  documents = firestoreDocuments(),
}) {
  const token = bearerToken || (await accessToken(clientEmail, privateKey));
  const writes = documents.map(({ path, data }) => ({
    update: {
      name: `projects/${projectId}/databases/(default)/documents/${path}`,
      fields: firestoreFields(data),
    },
  }));
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    }
  );
  if (!response.ok) {
    throw new Error(
      `STAGING_SEED_FAILED: Firestore rechazó el commit con HTTP ${response.status}.`
    );
  }
  return writes.length;
}

export function firestoreDocuments() {
  const users = STAGING_FIXTURES.users.map((user) => ({
    path: `users/${user.id.replace("firebase:", "")}`,
    data: { email: user.email, name: user.name, role: user.role, synthetic: true },
  }));
  const enrollments = STAGING_FIXTURES.enrollments.map((enrollment) => ({
    path: `enrollments/${enrollment.usuarioId.replace("firebase:", "")}/sections/${enrollment.seccionId}`,
    data: {
      seccionId: enrollment.seccionId,
      role: enrollment.rolSeccion,
      status: enrollment.estado,
      updatedAt: enrollment.createdAt,
      synthetic: true,
    },
  }));
  const classroom = STAGING_FIXTURES.sections.flatMap((section, sectionIndex) => {
    const posts = Array.from({ length: STAGING_FIXTURES.postsPerSection }, (_, index) => ({
      path: `courses/${section.id}/posts/staging-post-${index + 1}`,
      data: {
        authorId: "staging-teacher",
        authorName: "Docente de prueba",
        body: `Aviso sintético ${index + 1} de la sección ${sectionIndex + 1}`,
        kind: "announcement",
        createdAt: "2026-08-01T12:00:00.000Z",
        synthetic: true,
      },
    }));
    const gradebook = {
      path: `courses/${section.id}/meta/gradebook`,
      data: {
        synthetic: true,
        evaluations: [
          { id: "staging-eval-1", title: "Evaluación sintética 1", weight: 40 },
          { id: "staging-eval-2", title: "Evaluación sintética 2", weight: 60 },
        ],
      },
    };
    const grades = Array.from({ length: STAGING_FIXTURES.gradesPerSection }, (_, index) => ({
      path: `courses/${section.id}/grades/staging-student-${index + 1}`,
      data: {
        uid: `staging-student-${index + 1}`,
        scores: { "staging-eval-1": 5 + index * 0.3, "staging-eval-2": null },
        synthetic: true,
      },
    }));
    return [...posts, gradebook, ...grades];
  });
  return [...users, ...enrollments, ...classroom];
}

async function main() {
  const targets = assertStagingTargets({
    environment: process.env.CEOUBB_ENVIRONMENT,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
  });
  if (process.env.STAGING_SEED_DRY_RUN === "1") {
    process.stdout.write(`${JSON.stringify(fixtureCounts())}\n`);
    return;
  }
  const bearerToken = process.env.FIREBASE_ACCESS_TOKEN?.trim() ?? "";
  const credentials = bearerToken
    ? { clientEmail: "", privateKey: "" }
    : await serviceAccountCredentials();
  const relational = await seedTurso({
    databaseUrl: targets.tursoDatabaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const firestoreWrites = await seedFirestore({
    projectId: targets.firebaseProjectId,
    clientEmail: credentials.clientEmail,
    privateKey: credentials.privateKey,
    bearerToken,
  });
  process.stdout.write(
    `${JSON.stringify({ requirements: STAGING_SEED_REQUIREMENTS, relational, firestoreWrites })}\n`
  );
}

export function upsert(table, values) {
  const columns = Object.keys(values).map(snakeCase);
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  return {
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    args: Object.values(values),
  };
}

function snakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function firestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, firestoreValue(value)])
  );
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  return { mapValue: { fields: firestoreFields(value) } };
}

export async function serviceAccountCredentials() {
  let clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  let privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if ((!clientEmail || !privateKey) && credentialsPath) {
    const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
    clientEmail = typeof credentials.client_email === "string" ? credentials.client_email : "";
    privateKey = typeof credentials.private_key === "string" ? credentials.private_key : "";
  }
  if (!clientEmail || !privateKey) {
    throw new Error(
      "STAGING_CONFIG_INCOMPLETE: falta una cuenta de servicio dedicada para Firebase staging."
    );
  }
  return { clientEmail, privateKey };
}

async function accessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claim))}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey.replace(/\\n/g, "\n"), "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) {
    throw new Error("STAGING_SEED_FAILED: la cuenta de servicio no pudo autenticarse.");
  }
  const token = await response.json();
  if (!token.access_token) {
    throw new Error("STAGING_SEED_FAILED: Google OAuth no devolvió un token de acceso.");
  }
  return token.access_token;
}

function base64url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "STAGING_SEED_FAILED"}\n`);
    process.exitCode = 1;
  });
}
