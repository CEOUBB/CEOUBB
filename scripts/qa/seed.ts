import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { zipSync } from "fflate";
import {
  asignaturas,
  adeccaImports,
  assistantAssignments,
  carreras,
  departamentos,
  facultades,
  interopResources,
  interopTools,
  matriculas,
  matriculasPendientes,
  moodleImports,
  periodos,
  secciones,
  sessions,
  sectionProfiles,
  solicitudesSoporte,
  users,
} from "../../db/schema.ts";
import { resolveQaRuntime } from "../../lib/qa-runtime.ts";
import { inspectLearningPackage } from "../../lib/interop/packages.ts";
import { prepareCourseImport, stableMoodleDocumentId } from "../../lib/moodle/index.ts";
import { prepareAdeccaCourseImport, stableAdeccaDocumentId } from "../../lib/adecca/index.ts";
import { defaultPreferences } from "../../lib/services/user-profile.ts";
import {
  QA_ENROLLMENTS,
  QA_ASSETS,
  QA_IDS,
  QA_NOW,
  QA_SUPPORT_SUBJECT,
  QA_SECTION_NAMES,
  QA_SECTIONS,
  QA_USERS,
  QA_USER_FIXTURES,
  QA_TEAMMATE,
  qaFirestoreDocuments,
  type QaRole,
} from "../../qa/fixtures.ts";

// A real, deterministic PDF lets the same artifact exercise Storage, download and preview.
export function qaPdf(): Buffer {
  const stream = "BT /F1 18 Tf 48 760 Td (CEOUBB - Synthetic QA document) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

// Implements: REQ-QA-02, REQ-QA-03, REQ-QA-05
export async function seedQa() {
  const runtime = resolveQaRuntime();
  if (!runtime) throw new Error("QA_SEED_REFUSED: enable the guarded local QA runtime first.");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  await client.execute("PRAGMA journal_mode = WAL;");
  await client.execute("PRAGMA busy_timeout = 5000;");
  const app = initializeApp(
    { projectId: runtime.projectId, storageBucket: `${runtime.projectId}.firebasestorage.app` },
    `qa-seed-${crypto.randomUUID()}`
  );
  try {
    const [moodle, adecca] = await Promise.all([
      prepareCourseImport(new File([await readFile(resolve(QA_ASSETS.moodle))], "course.mbz")),
      prepareAdeccaCourseImport(
        new File([await readFile(resolve(QA_ASSETS.adecca))], "adecca.json")
      ),
    ]);
    const packages = await Promise.all(
      (["scorm", "xapi"] as const).map(async (kind) => {
        const html = await readFile(resolve(`qa/assets/${kind}.html`));
        const manifestName = kind === "scorm" ? "imsmanifest.xml" : "tincan.xml";
        const manifest =
          kind === "scorm"
            ? '<manifest xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"><metadata><schemaversion>1.2</schemaversion></metadata><organizations><organization identifier="qa"><title>QA SCORM</title><item identifier="qa-item" identifierref="qa-resource"/></organization></organizations><resources><resource identifier="qa-resource" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>'
            : '<tincan><activities><activity id="https://qa.invalid/activity"><name>QA xAPI</name><launch>index.html</launch></activity></activities></tincan>';
        const files = { "index.html": html, [manifestName]: Buffer.from(manifest) };
        const bytes = zipSync(files, { mtime: new Date(QA_NOW) });
        return {
          id: QA_IDS[kind],
          bytes,
          files,
          manifest: (await inspectLearningPackage(bytes)).manifest,
          prefix: `interop/${QA_SECTIONS.active}/${QA_IDS[kind]}/`,
        };
      })
    );
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: resolve("drizzle") });
    await client.execute("PRAGMA foreign_keys = ON");
    await db.transaction(async (tx) => {
      await tx
        .delete(matriculasPendientes)
        .where(
          and(
            eq(matriculasPendientes.seccionId, QA_SECTIONS.active),
            eq(matriculasPendientes.email, "qa.pending@alumnos.ubiobio.cl")
          )
        );
      await tx
        .delete(moodleImports)
        .where(
          and(
            eq(moodleImports.seccionId, QA_SECTIONS.active),
            eq(moodleImports.fingerprint, moodle.preview.source.fingerprint)
          )
        );
      await tx
        .delete(adeccaImports)
        .where(
          and(
            eq(adeccaImports.seccionId, QA_SECTIONS.active),
            eq(adeccaImports.fingerprint, adecca.preview.source.fingerprint)
          )
        );
      for (const user of QA_USER_FIXTURES) {
        await tx
          .insert(users)
          .values({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: QA_NOW,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: { name: user.name, email: user.email, role: user.role, photoUrl: null },
          });
      }
      await tx
        .insert(facultades)
        .values({ id: "qa-faculty", nombre: "Facultad QA", sede: "Concepcion" })
        .onConflictDoNothing();
      await tx
        .insert(departamentos)
        .values({ id: "qa-department", facultadId: "qa-faculty", nombre: "Departamento QA" })
        .onConflictDoNothing();
      await tx
        .insert(carreras)
        .values({
          id: "qa-career",
          departamentoId: "qa-department",
          codigo: "QA01",
          nombre: "Ingeniería QA",
        })
        .onConflictDoNothing();
      await tx
        .insert(periodos)
        .values([
          {
            id: "qa-period-current",
            nombre: "Semestre QA vigente",
            fechaInicio: "2026-08-01",
            fechaFin: "2026-12-31",
            estado: "abierto",
          },
          {
            id: "qa-period-archived",
            nombre: "Semestre QA archivado",
            fechaInicio: "2026-03-01",
            fechaFin: "2026-07-31",
            estado: "archivado",
          },
        ])
        .onConflictDoNothing();
      for (const key of Object.keys(QA_SECTIONS) as (keyof typeof QA_SECTIONS)[]) {
        await tx
          .insert(asignaturas)
          .values({
            id: `qa-subject-${key}`,
            codigo: `QA-${key.toUpperCase()}`,
            nombre: QA_SECTION_NAMES[key],
            creditosSct: 6,
            departamentoId: "qa-department",
          })
          .onConflictDoNothing();
        await tx
          .insert(secciones)
          .values({
            id: QA_SECTIONS[key],
            asignaturaId: `qa-subject-${key}`,
            periodoId: key === "archived" ? "qa-period-archived" : "qa-period-current",
            numeroSeccion: 1,
            docenteId: key === "other" ? QA_USERS.owner.id : QA_USERS.teacher.id,
            createdAt: QA_NOW,
          })
          .onConflictDoNothing();
        const profile = {
          seccionId: QA_SECTIONS[key],
          title: QA_SECTION_NAMES[key],
          description: "Curso sintético para verificación local reproducible.",
          modality: "presencial" as const,
          room: "QA-101",
          tone: "sky" as const,
          updatedAt: QA_NOW,
        };
        await tx
          .insert(sectionProfiles)
          .values(profile)
          .onConflictDoUpdate({ target: sectionProfiles.seccionId, set: profile });
      }
      for (const enrollment of QA_ENROLLMENTS) {
        await tx
          .insert(matriculas)
          .values(enrollment)
          .onConflictDoUpdate({
            target: matriculas.id,
            set: { rolSeccion: enrollment.rolSeccion, estado: enrollment.estado },
          });
      }
      await tx
        .insert(assistantAssignments)
        .values({
          id: "qa-assistant-assignment",
          seccionId: QA_SECTIONS.active,
          usuarioId: QA_USERS.assistant.id,
          previousRole: "student",
          previousStatus: "activa",
          createdBy: QA_USERS.teacher.id,
          createdAt: QA_NOW,
        })
        .onConflictDoNothing();
      await tx
        .insert(interopTools)
        .values({
          id: QA_IDS.ltiTool,
          name: "QA LTI",
          clientId: "qa-lti-client",
          deploymentId: "qa-lti-deployment",
          loginUrl: "https://qa-tool.invalid/login",
          redirectUrisJson: JSON.stringify(["https://qa-tool.invalid/launch"]),
          targetUrisJson: JSON.stringify(["https://qa-tool.invalid/activity"]),
          enabled: true,
          createdBy: QA_USERS.owner.id,
          createdAt: QA_NOW,
        })
        .onConflictDoNothing();
      await tx
        .insert(interopResources)
        .values({
          id: QA_IDS.lti,
          sectionId: QA_SECTIONS.active,
          title: "QA LTI",
          kind: "lti",
          toolId: QA_IDS.ltiTool,
          targetUrl: "https://qa-tool.invalid/activity",
          fingerprint: "qa-lti",
          createdBy: QA_USERS.teacher.id,
          createdAt: QA_NOW,
        })
        .onConflictDoNothing();
      for (const item of packages) {
        await tx
          .insert(interopResources)
          .values({
            id: item.id,
            sectionId: QA_SECTIONS.active,
            title: item.manifest.title,
            kind: item.manifest.kind,
            manifestJson: JSON.stringify(item.manifest),
            storagePrefix: item.prefix,
            fingerprint: createHash("sha256").update(item.bytes).digest("hex"),
            createdBy: QA_USERS.teacher.id,
            createdAt: QA_NOW,
          })
          .onConflictDoNothing();
      }
    });

    const auth = getAuth(app);
    for (const user of QA_USER_FIXTURES) {
      const properties = {
        email: user.email,
        password: user.password,
        displayName: user.name,
        emailVerified: true,
        disabled: false,
      };
      try {
        const existing = await auth.getUser(user.uid);
        if (existing.email !== user.email || !existing.emailVerified)
          throw new Error(`QA_AUTH_FIXTURE_DRIFT: ${user.uid}`);
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "auth/user-not-found")
          throw error;
        await auth.createUser({ uid: user.uid, ...properties });
      }
    }
    const pdf = qaPdf();
    const documents = qaFirestoreDocuments(
      pdf.length,
      createHash("sha256").update(pdf).digest("hex")
    );
    const firestore = getFirestore(app);
    const batch = firestore.batch();
    for (const document of documents) batch.set(firestore.doc(document.path), document.data);
    for (const user of QA_USER_FIXTURES) {
      batch.set(firestore.doc(`users/${user.uid}/settings/preferences`), defaultPreferences());
    }
    for (const post of moodle.preview.posts) {
      batch.delete(
        firestore.doc(
          `courses/${QA_SECTIONS.active}/posts/${stableMoodleDocumentId(moodle.preview.source.sourceKey, post.sourceId)}`
        )
      );
    }
    for (const post of adecca.preview.posts) {
      batch.delete(
        firestore.doc(
          `courses/${QA_SECTIONS.active}/posts/${stableAdeccaDocumentId(adecca.preview.source.sourceKey, post.sourceId)}`
        )
      );
    }
    for (const quizId of [QA_IDS.quiz, QA_IDS.apiQuiz]) {
      for (const collection of ["drafts", "results"]) {
        batch.delete(
          firestore.doc(
            `courses/${QA_SECTIONS.active}/quizzes/${quizId}/${collection}/${QA_USERS.student.uid}`
          )
        );
      }
    }
    for (const userId of [QA_USERS.student.uid, QA_TEAMMATE.uid]) {
      batch.delete(
        firestore.doc(`courses/${QA_SECTIONS.active}/submissions/${QA_IDS.team}_${userId}`)
      );
    }
    await batch.commit();
    const bucket = getStorage(app).bucket();
    for (const [evaluationId, name] of [
      [QA_IDS.report, "qa-individual.pdf"],
      [QA_IDS.team, "qa-team.pdf"],
    ]) {
      const path = `courses/${QA_SECTIONS.active}/submissions/${evaluationId}/${QA_USERS.student.uid}/${Date.parse(QA_NOW)}_${name}`;
      await bucket.file(path).delete({ ignoreNotFound: true });
    }
    for (const path of [QA_IDS.filePath, QA_IDS.submissionPath]) {
      await bucket
        .file(path)
        .save(pdf, { resumable: false, metadata: { contentType: "application/pdf" } });
    }
    for (const item of packages) {
      await bucket.file(item.prefix + "original.zip").save(Buffer.from(item.bytes), {
        resumable: false,
        metadata: { contentType: "application/zip" },
      });
      for (const [name, bytes] of Object.entries(item.files)) {
        await bucket.file(item.prefix + "files/" + name).save(bytes, {
          resumable: false,
          metadata: { contentType: name.endsWith(".html") ? "text/html" : "application/xml" },
        });
      }
    }
    return {
      users: QA_USER_FIXTURES.length,
      sections: Object.keys(QA_SECTIONS).length,
      enrollments: QA_ENROLLMENTS.length,
      firestoreDocuments: documents.length + QA_USER_FIXTURES.length,
      storageObjects: 8,
      interopResources: 3,
    };
  } finally {
    client.close();
    await deleteApp(app);
  }
}

// Restores canonical documents only; caller-created documents require explicit cleanup.
export const resetQaFixtures = seedQa;

// Call before a fresh browser login, never while preserving an active scenario session.
export async function cleanupQaSessions(role: QaRole) {
  if (!resolveQaRuntime())
    throw new Error("QA_SESSIONS_REFUSED: a guarded local runtime is required.");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await client.execute("PRAGMA busy_timeout = 5000;");
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await drizzle(client).delete(sessions).where(eq(sessions.userId, QA_USERS[role].id));
        break;
      } catch (err: unknown) {
        if (
          attempt < 4 &&
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string" &&
          (err as { message: string }).message.includes("SQLITE_BUSY")
        ) {
          await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
          continue;
        }
        throw err;
      }
    }
  } finally {
    client.close();
  }
}

export async function qaSupportRequests(remove = false) {
  if (!resolveQaRuntime())
    throw new Error("QA_SUPPORT_REFUSED: a guarded local runtime is required.");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await client.execute("PRAGMA busy_timeout = 5000;");
    const db = drizzle(client);
    const rows = await db
      .select({
        id: solicitudesSoporte.id,
        email: solicitudesSoporte.email,
        estado: solicitudesSoporte.estado,
      })
      .from(solicitudesSoporte)
      .where(eq(solicitudesSoporte.asunto, QA_SUPPORT_SUBJECT))
      .limit(2);
    if (remove)
      await db.delete(solicitudesSoporte).where(eq(solicitudesSoporte.asunto, QA_SUPPORT_SUBJECT));
    return rows;
  } finally {
    client.close();
  }
}

export async function removeQaQuizDraft() {
  const runtime = resolveQaRuntime();
  if (!runtime) throw new Error("QA_QUIZ_REFUSED: a guarded local runtime is required.");
  const response = await fetch(
    `${runtime.firestore.origin}/v1/projects/${runtime.projectId}/databases/(default)/documents/courses/${QA_SECTIONS.active}/quizzes/${QA_IDS.quiz}/drafts/${QA_USERS.student.uid}`,
    { method: "DELETE", headers: { Authorization: "Bearer owner" } }
  );
  if (!response.ok && response.status !== 404)
    throw new Error(`QA draft cleanup failed: ${response.status}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  seedQa()
    .then((counts) => console.log(JSON.stringify(counts)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
