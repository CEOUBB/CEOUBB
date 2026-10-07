import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createClient } from "@libsql/client";
import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import activityProjection from "../firebase/functions/activity-projection.js";

const { projectCourseActivity } = activityProjection;
const PAGE_SIZE = 100;

// Implements: REQ-PERF-LOAD-03
export function activityBackfillTarget(options, environment) {
  const projectId = options.project;
  const databaseUrl = environment.TURSO_DATABASE_URL;

  if (!projectId || !databaseUrl) throw new Error("ACTIVITY_BACKFILL_TARGET_REQUIRED");
  const database = new URL(databaseUrl);
  const emulator = environment.FIRESTORE_EMULATOR_HOST;
  const local = /^demo-ceoubb(?:-[a-z0-9]+)*$/.test(projectId);

  if (database.username || database.password || database.search || database.hash)
    throw new Error("ACTIVITY_BACKFILL_DATABASE_REJECTED");

  if (local) {
    if (
      database.protocol !== "file:" ||
      !emulator ||
      !/^(?:127\.0\.0\.1|localhost):[0-9]+$/.test(emulator)
    )
      throw new Error("ACTIVITY_BACKFILL_LOCAL_TARGET_REJECTED");
  } else {
    const staging = projectId === "centro-de-estudio-ubb-staging";

    if (
      (!staging && projectId !== "centro-de-estudio-ubb") ||
      emulator ||
      !["libsql:", "https:"].includes(database.protocol) ||
      (staging && !database.hostname.includes("ceoubb-staging")) ||
      (!staging && database.hostname.includes("staging")) ||
      options["confirm-database"] !== database.hostname
    )
      throw new Error("ACTIVITY_BACKFILL_REMOTE_TARGET_REJECTED");
  }

  if (options.write && options["confirm-project"] !== projectId)
    throw new Error("ACTIVITY_BACKFILL_WRITE_CONFIRMATION_REQUIRED");
  return { projectId, databaseUrl, dryRun: options.write !== true };
}

// Implements: REQ-PERF-LOAD-03
export async function backfillCourseActivity({
  client,
  db,
  dryRun = true,
  checkpoint = {},
  saveCheckpoint = async (_checkpoint) => {},
}) {
  if (dryRun || checkpoint.phase === "complete") checkpoint = {};
  let sectionAfter = checkpoint.sectionAfter ?? "";
  let inspected = 0;
  let changed = 0;
  let sections = 0;

  while (true) {
    const page = await client.execute({
      sql: "SELECT id FROM secciones WHERE id > ? ORDER BY id LIMIT 1",
      args: [sectionAfter],
    });

    if (page.rows.length === 0) break;
    const sectionId = String(page.rows[0].id);

    if (!sectionId || sectionId.includes("/"))
      throw new Error("ACTIVITY_BACKFILL_SECTION_REJECTED");
    const phases = ["posts", "activity"];
    const resuming = checkpoint.sectionId === sectionId;

    for (const phase of phases) {
      if (resuming && checkpoint.phase === "activity" && phase === "posts") continue;
      let documentAfter = resuming && checkpoint.phase === phase ? checkpoint.documentAfter : "";

      while (true) {
        let query = db
          .collection(`courses/${sectionId}/${phase}`)
          .orderBy(FieldPath.documentId())
          .limit(PAGE_SIZE);

        if (documentAfter) query = query.startAfter(documentAfter);
        const documents = await query.get();

        if (documents.empty) break;

        for (const document of documents.docs) {
          const result = await projectCourseActivity(db, sectionId, document.id, dryRun);
          inspected++;

          if (result.changed) changed++;
        }
        documentAfter = documents.docs.at(-1).id;
        await saveCheckpoint({ sectionAfter, sectionId, phase, documentAfter });
      }
      await saveCheckpoint({
        sectionAfter,
        sectionId,
        phase: "activity",
        documentAfter: "",
      });
    }
    sectionAfter = sectionId;
    sections++;
    checkpoint = {};
    await saveCheckpoint({ sectionAfter });
  }
  await saveCheckpoint({ sectionAfter, phase: "complete" });
  return { dryRun, sections, inspected, changed };
}

async function main() {
  const { values } = parseArgs({
    options: {
      project: { type: "string" },
      write: { type: "boolean", default: false },
      "confirm-project": { type: "string" },
      "confirm-database": { type: "string" },
      checkpoint: { type: "string" },
    },
  });
  const target = activityBackfillTarget(values, process.env);
  const checkpointPath = resolve(
    values.checkpoint ??
      `working/course-activity-backfill-${target.dryRun ? "dry-run" : "write"}.json`
  );
  const identity = {
    projectId: target.projectId,
    databaseUrl: target.databaseUrl,
    dryRun: target.dryRun,
  };
  let checkpoint = {};

  try {
    const saved = JSON.parse(await readFile(checkpointPath, "utf8"));

    if (
      saved.projectId !== identity.projectId ||
      saved.databaseUrl !== identity.databaseUrl ||
      saved.dryRun !== identity.dryRun
    )
      throw new Error("ACTIVITY_BACKFILL_CHECKPOINT_TARGET_MISMATCH");
    checkpoint = saved.checkpoint;

    if (
      !checkpoint ||
      typeof checkpoint !== "object" ||
      Object.entries(checkpoint).some(
        ([key, value]) =>
          !["sectionAfter", "sectionId", "phase", "documentAfter"].includes(key) ||
          typeof value !== "string" ||
          value.includes("/")
      ) ||
      (checkpoint.phase && !["posts", "activity", "complete"].includes(checkpoint.phase))
    )
      throw new Error("ACTIVITY_BACKFILL_CHECKPOINT_INVALID");
  } catch (cause) {
    if (cause?.code !== "ENOENT") throw cause;
  }
  const app = initializeApp(
    {
      projectId: target.projectId,
      ...(target.projectId.startsWith("demo-") ? {} : { credential: applicationDefault() }),
    },
    "activity-backfill"
  );
  const client = createClient({
    url: target.databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const result = await backfillCourseActivity({
      client,
      db: getFirestore(app),
      dryRun: target.dryRun,
      checkpoint,
      saveCheckpoint: async (next) => {
        await mkdir(dirname(checkpointPath), { recursive: true });
        await writeFile(`${checkpointPath}.tmp`, JSON.stringify({ ...identity, checkpoint: next }));
        await rename(`${checkpointPath}.tmp`, checkpointPath);
      },
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    client.close();
    await deleteApp(app);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((cause) => {
    const message = cause instanceof Error ? cause.message : "";
    process.stderr.write(
      `${message.startsWith("ACTIVITY_BACKFILL_") ? message : "ACTIVITY_BACKFILL_PROVIDER_FAILED"}\n`
    );
    process.exitCode = 1;
  });
}
