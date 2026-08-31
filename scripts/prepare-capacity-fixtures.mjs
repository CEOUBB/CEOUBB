import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  CAPACITY_REQUIREMENTS,
  assertCapacityTargets,
  buildCapacityShardFixture,
} from "./capacity-config.mjs";

export const CAPACITY_PREPARE_REQUIREMENTS = CAPACITY_REQUIREMENTS;

export async function prepareCapacityFixtures(options) {
  const targets = assertCapacityTargets(options);
  const completeFixture = buildCapacityShardFixture(targets.shardIndex);
  const fixture = targets.profile === "smoke" ? smokeFixture(completeFixture) : completeFixture;
  const password = `${randomBytes(24).toString("base64url")}aA1!`;
  const credential = applicationDefault();
  const access = await credential.getAccessToken();
  await enableStagingPasswordAuth(targets.firebaseProjectId, access.access_token);
  const app = initializeApp(
    { credential, projectId: targets.firebaseProjectId },
    `capacity-${targets.shardIndex}-${Date.now()}`
  );
  const client = createClient({
    url: targets.tursoDatabaseUrl,
    authToken: options.tursoAuthToken,
  });
  try {
    const [authUsers, tursoRows, firestoreWrites] = await Promise.all([
      upsertActiveAuthUsers(getAuth(app), fixture.activeStudents, password),
      seedCapacityTurso(client, fixture),
      seedCapacityFirestore({
        projectId: targets.firebaseProjectId,
        bearerToken: access.access_token,
        fixture,
      }),
    ]);
    const credentialPath = resolve(
      options.credentialPath ?? `.capacity/shard-${targets.shardIndex}-credentials.json`
    );
    await mkdir(dirname(credentialPath), { recursive: true });
    await writeFile(
      credentialPath,
      JSON.stringify({
        shardIndex: targets.shardIndex,
        profile: targets.profile,
        firebaseApiKey: options.firebaseApiKey,
        users: fixture.activeStudents.map((student) => ({
          uid: student.uid,
          email: student.email,
          password,
          sectionId: student.primarySectionId,
        })),
      }),
      { encoding: "utf8", mode: 0o600 }
    );
    return {
      requirements: CAPACITY_PREPARE_REQUIREMENTS,
      shardIndex: targets.shardIndex,
      profile: targets.profile,
      authUsers,
      tursoRows,
      firestoreWrites,
      credentialPath,
    };
  } finally {
    await Promise.allSettled([client.close(), deleteApp(app)]);
  }
}

export async function enableStagingPasswordAuth(projectId, bearerToken, enabled = true) {
  if (projectId !== "centro-de-estudio-ubb-staging") {
    throw new Error("CAPACITY_TARGET_REJECTED: Firebase Auth no identifica staging.");
  }
  const url = new URL(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`
  );
  url.searchParams.set("updateMask", "signIn.email.enabled,signIn.email.passwordRequired");
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `projects/${projectId}/config`,
      signIn: { email: { enabled, passwordRequired: true } },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `CAPACITY_AUTH_FAILED: no fue posible habilitar el proveedor sintético (${response.status}).`
    );
  }
}

export async function upsertActiveAuthUsers(auth, students, password) {
  let completed = 0;
  for (const group of chunks(students, 20)) {
    await Promise.all(
      group.map(async (student) => {
        const attributes = {
          email: student.email,
          emailVerified: true,
          displayName: student.name,
          password,
          disabled: false,
        };
        try {
          await auth.updateUser(student.uid, attributes);
        } catch (error) {
          if (error?.code !== "auth/user-not-found") throw error;
          await auth.createUser({ uid: student.uid, ...attributes });
        }
        completed += 1;
      })
    );
  }
  return completed;
}

export async function seedCapacityTurso(client, fixture) {
  const createdAt = "2026-08-30T00:00:00.000Z";
  const faculty = {
    id: "load-faculty",
    nombre: "Facultad sintética de capacidad",
    sede: "Concepcion",
  };
  const department = {
    id: "load-department",
    facultadId: faculty.id,
    nombre: "Departamento sintético de capacidad",
  };
  const career = {
    id: "load-career",
    departamentoId: department.id,
    codigo: "LOAD-001",
    nombre: "Programa sintético de capacidad",
  };
  const period = {
    id: fixture.periodId,
    nombre: "Segundo semestre sintético 2026",
    fechaInicio: "2026-08-01",
    fechaFin: "2026-12-31",
    estado: "abierto",
  };
  const groups = [
    [upsert("facultades", faculty)],
    [upsert("departamentos", department)],
    [upsert("carreras", career)],
    [upsert("periodos", period)],
    fixture.identities.map((identity) =>
      upsert("users", { ...identity, uid: undefined, createdAt })
    ),
    fixture.sections.map((section) =>
      upsert("asignaturas", {
        id: section.subjectId,
        codigo: section.subjectId.toUpperCase(),
        nombre: `Asignatura sintética ${section.id}`,
        creditosSct: 5,
        departamentoId: department.id,
      })
    ),
    fixture.sections.map((section) =>
      upsert("secciones", {
        id: section.id,
        asignaturaId: section.subjectId,
        periodoId: section.periodId,
        numeroSeccion: section.number,
        docenteId: section.teacherId,
        createdAt,
      })
    ),
    fixture.enrollments.map((enrollment) =>
      upsert("matriculas", {
        id: enrollment.id,
        seccionId: enrollment.sectionId,
        usuarioId: enrollment.studentId,
        rolSeccion: enrollment.role,
        estado: enrollment.status,
        createdAt,
      })
    ),
  ];
  let count = 0;
  for (const statements of groups) {
    for (const group of chunks(statements, 400)) {
      await retry(() => client.batch(group, "write"));
      count += group.length;
    }
  }
  return count;
}

export async function seedCapacityFirestore({ projectId, bearerToken, fixture }) {
  const writes = capacityFirestoreDocuments(fixture).map(({ path, data }) => ({
    update: {
      name: `projects/${projectId}/databases/(default)/documents/${path}`,
      fields: firestoreFields(data),
    },
  }));
  let completed = 0;
  for (const group of chunks(writes, 400)) {
    await retry(async () => {
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ writes: group }),
        }
      );
      if (!response.ok) {
        throw new RemoteWriteError(response.status);
      }
    });
    completed += group.length;
  }
  return completed;
}

export function capacityFirestoreDocuments(fixture) {
  const timestamps = {
    created: timestamp("2026-08-30T00:00:00.000Z"),
    expires: timestamp("2026-12-31T23:59:59.000Z"),
  };
  const users = fixture.identities.map((identity) => ({
    path: `users/${identity.uid}`,
    data: {
      email: identity.email,
      displayName: identity.name,
      role: identity.role,
      synthetic: true,
    },
  }));
  const periods = [
    {
      path: `academicPeriods/${fixture.periodId}`,
      data: { status: "abierto", synthetic: true },
    },
  ];
  const sections = fixture.sections.map((section) => ({
    path: `academicSections/${section.id}`,
    data: {
      seccionId: section.id,
      periodoId: section.periodId,
      teacherId: section.teacherId.replace("firebase:", ""),
      synthetic: true,
    },
  }));
  const enrollments = fixture.enrollments.map((enrollment) => ({
    path: `enrollments/${enrollment.studentUid}/sections/${enrollment.sectionId}`,
    data: {
      seccionId: enrollment.sectionId,
      role: enrollment.role,
      status: enrollment.status,
      updatedAt: timestamps.created,
      synthetic: true,
    },
  }));
  const classroom = fixture.sections.flatMap((section) => {
    const authorId = section.teacherId.replace("firebase:", "");
    const posts = Array.from({ length: 50 }, (_, offset) => ({
      path: `courses/${section.id}/posts/load-post-${String(offset + 1).padStart(2, "0")}`,
      data: {
        authorId,
        authorName: "Docente sintético",
        body: `Aviso sintético de capacidad ${offset + 1}`,
        kind: "announcement",
        createdAt: timestamps.created,
        synthetic: true,
      },
    }));
    return [
      ...posts,
      {
        path: `courses/${section.id}/meta/gradebook`,
        data: {
          synthetic: true,
          evaluations: Array.from({ length: 10 }, (_, offset) => ({
            id: `load-eval-${offset + 1}`,
            title: `Evaluación sintética ${offset + 1}`,
            weight: 10,
          })),
        },
      },
      {
        path: `courses/${section.id}/quizzes/load-quiz`,
        data: {
          courseId: section.id,
          title: "Certamen sintético de capacidad",
          status: "published",
          durationMinutes: 60,
          questions: Array.from({ length: 10 }, (_, offset) => ({
            id: `q-${offset + 1}`,
            prompt: `Pregunta sintética ${offset + 1}`,
          })),
          synthetic: true,
        },
      },
    ];
  });
  const active = fixture.activeStudents.flatMap((student) => [
    {
      path: `courses/${student.primarySectionId}/grades/${student.uid}`,
      data: {
        uid: student.uid,
        scores: Object.fromEntries(
          Array.from({ length: 10 }, (_, offset) => [`load-eval-${offset + 1}`, 5])
        ),
        synthetic: true,
      },
    },
    {
      path: `courses/${student.primarySectionId}/quizzes/load-quiz/drafts/${student.uid}`,
      data: {
        courseId: student.primarySectionId,
        quizId: "load-quiz",
        userId: student.uid,
        answers: {},
        startedAt: timestamps.created,
        expiresAt: timestamps.expires,
        submittedAt: null,
        updatedAt: timestamps.created,
      },
    },
  ]);
  return [...users, ...periods, ...sections, ...enrollments, ...classroom, ...active];
}

function smokeFixture(fixture) {
  const student = fixture.activeStudents[0];
  const section = fixture.sections.find((item) => item.id === student.primarySectionId);
  const staff = fixture.staff.filter((item) => item.id === section.teacherId);
  return {
    ...fixture,
    students: [student],
    staff,
    identities: [student, ...staff],
    sections: [section],
    enrollments: fixture.enrollments.filter(
      (enrollment) => enrollment.studentUid === student.uid && enrollment.sectionId === section.id
    ),
    activeStudents: [student],
  };
}

function upsert(table, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => snakeCase(key));
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  return {
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    args: entries.map(([, value]) => value),
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
  if (value?.kind === "timestamp") return { timestampValue: value.value };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  return { mapValue: { fields: firestoreFields(value) } };
}

function timestamp(value) {
  return { kind: "timestamp", value };
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function retry(operation) {
  let failure;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      failure = error;
      if (error instanceof RemoteWriteError && ![429, 500, 502, 503, 504].includes(error.status)) {
        break;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * 2 ** attempt));
    }
  }
  throw failure;
}

class RemoteWriteError extends Error {
  constructor(status) {
    super(`CAPACITY_FIXTURE_FAILED: Firestore rechazó un lote con HTTP ${status}.`);
    this.status = status;
  }
}

async function main() {
  const result = await prepareCapacityFixtures({
    confirmation: process.env.CONFIRM_STAGING,
    targetUrl: process.env.TARGET_URL,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
    firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    shardIndex: Number(process.env.CAPACITY_SHARD_INDEX),
    shardCount: Number(process.env.CAPACITY_SHARD_COUNT),
    profile: process.env.CAPACITY_PROFILE,
    credentialPath: process.env.CAPACITY_CREDENTIAL_PATH,
  });
  process.stdout.write(
    `${JSON.stringify({
      requirements: result.requirements,
      shardIndex: result.shardIndex,
      profile: result.profile,
      authUsers: result.authUsers,
      tursoRows: result.tursoRows,
      firestoreWrites: result.firestoreWrites,
    })}\n`
  );
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "CAPACITY_FIXTURE_FAILED"}\n`);
    process.exitCode = 1;
  });
}
