import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import activityProjection from "../firebase/functions/activity-projection.js";
import {
  activityBackfillTarget,
  backfillCourseActivity,
} from "../scripts/backfill-course-activity.mjs";

const { compactActivity, projectCourseActivity } = activityProjection;
type Fields = Record<string, unknown>;

function database(documents = new Map<string, Fields>()) {
  let writes = 0;
  const requested: { path: string; limit: number; after: string }[] = [];
  const db = {
    doc: (path: string) => path,
    runTransaction: async <T>(operation: (tx: ReturnType<typeof transaction>) => T) =>
      operation(transaction()),
    collection: (path: string) => {
      let count = 0;
      let after = "";
      const query = {
        orderBy: () => query,
        limit: (limit: number) => {
          count = limit;
          return query;
        },
        startAfter: (id: string) => {
          after = id;
          return query;
        },
        get: async () => {
          assert.ok(count > 0 && count <= 100);
          requested.push({ path, limit: count, after });
          const docs = [...documents.keys()]
            .filter((key) => key.startsWith(`${path}/`))
            .map((key) => ({ id: key.slice(path.length + 1) }))
            .filter((document) => document.id > after)
            .sort((left, right) => left.id.localeCompare(right.id))
            .slice(0, count);
          return { docs, empty: docs.length === 0 };
        },
      };
      return query;
    },
  };
  function transaction() {
    return {
      getAll: async (...paths: string[]) =>
        paths.map((path) => ({
          exists: documents.has(path),
          data: () => documents.get(path),
        })),
      set: (path: string, data: Fields) => {
        documents.set(path, data);
        writes++;
      },
      delete: (path: string) => {
        documents.delete(path);
        writes++;
      },
    };
  }
  return { db, documents, requested, writes: () => writes };
}

const post = {
  title: "Publicación importada",
  kind: "assessment",
  dueDate: "2026-10-01T12:30",
  createdAt: { seconds: 100, nanoseconds: 50 },
  body: "Body and attachment bytes must remain in the classroom.",
  attachments: [{ name: "file.pdf" }],
  authorId: "teacher",
  sourceSystem: "moodle",
  notifyStudents: false,
};

// Implements: REQ-PERF-LOAD-03
test("activity covers import, edit, duplicate and reordered delete/recreate events", async () => {
  const source = "courses/section/posts/imported";
  const target = "courses/section/activity/imported";
  const fixture = database(new Map([[source, post]]));
  assert.deepEqual(await projectCourseActivity(fixture.db, "section", "imported"), {
    changed: true,
    exists: true,
  });
  assert.deepEqual(fixture.documents.get(target), {
    title: post.title,
    kind: post.kind,
    dueDate: post.dueDate,
    createdAt: post.createdAt,
  });
  await projectCourseActivity(fixture.db, "section", "imported");
  assert.equal(fixture.writes(), 1);
  fixture.documents.set(source, { ...post, title: "Título editado" });
  await projectCourseActivity(fixture.db, "section", "imported");
  assert.equal(fixture.documents.get(target)?.title, "Título editado");
  fixture.documents.set(source, { ...post, title: "Título editado", body: "Body edit only" });
  await projectCourseActivity(fixture.db, "section", "imported");
  assert.equal(fixture.writes(), 2);
  fixture.documents.delete(source);
  await projectCourseActivity(fixture.db, "section", "imported");
  await projectCourseActivity(fixture.db, "section", "imported");
  assert.equal(fixture.documents.has(target), false);
  assert.equal(fixture.writes(), 3);
  fixture.documents.set(source, { ...post, title: "Recreada" });
  await projectCourseActivity(fixture.db, "section", "imported");
  assert.equal(fixture.documents.get(target)?.title, "Recreada");
  assert.equal(fixture.writes(), 4);
});

test("activity dry run reports drift without changing data or absent timestamp ordering", async () => {
  const fixture = database(new Map([["courses/section/posts/post", post]]));
  assert.deepEqual(await projectCourseActivity(fixture.db, "section", "post", true), {
    changed: true,
    exists: true,
  });
  assert.equal(fixture.writes(), 0);
  assert.equal("createdAt" in compactActivity({ body: "No creation timestamp" }), false);
  fixture.documents.set("courses/section/activity/orphan", compactActivity(post));
  await projectCourseActivity(fixture.db, "section", "orphan", true);
  assert.equal(fixture.documents.has("courses/section/activity/orphan"), true);
});

test("backfill scans authoritative current and archived sections with bounded resumable cursors", async () => {
  const fixture = database();

  for (let index = 0; index < 105; index++) {
    fixture.documents.set(`courses/active/posts/post-${String(index).padStart(3, "0")}`, post);
  }
  fixture.documents.set("courses/archived/posts/old", post);
  fixture.documents.set("courses/archived/activity/orphan", compactActivity(post));
  const client = {
    execute: async ({ sql, args }: { sql: string; args: string[] }) => {
      assert.equal(sql, "SELECT id FROM secciones WHERE id > ? ORDER BY id LIMIT 1");
      const next = ["active", "archived", "empty"].find((id) => id > args[0]);
      return { rows: next ? [{ id: next }] : [] };
    },
  };
  let saved: Record<string, string> = {};
  await assert.rejects(
    backfillCourseActivity({
      client,
      db: fixture.db,
      dryRun: false,
      saveCheckpoint: async (checkpoint: Record<string, string>) => {
        saved = checkpoint;

        if (checkpoint.phase === "posts") throw new Error("Interruption after first page");
      },
    }),
    /Interruption/
  );
  assert.equal(saved.documentAfter, "post-099");
  const result = await backfillCourseActivity({
    client,
    db: fixture.db,
    dryRun: false,
    checkpoint: saved,
  });
  assert.equal(result.sections, 3);
  assert.equal(fixture.writes(), 107);
  assert.equal(fixture.documents.has("courses/archived/activity/orphan"), false);
  assert.equal(fixture.documents.has("courses/archived/activity/old"), true);
  assert.ok(fixture.requested.some((query) => query.after === "post-099"));
  assert.ok(fixture.requested.every((query) => query.limit === 100));
});

test("completed dry-run checkpoint rescans all sections and detects new drift", async () => {
  const fixture = database();

  for (const section of ["active", "archived"]) {
    fixture.documents.set(`courses/${section}/posts/post`, post);
    fixture.documents.set(`courses/${section}/activity/post`, compactActivity(post));
  }
  const client = {
    execute: async ({ args }: { args: string[] }) => {
      const next = ["active", "archived"].find((id) => id > args[0]);
      return { rows: next ? [{ id: next }] : [] };
    },
  };
  let checkpoint: Record<string, string> = {};
  const first = await backfillCourseActivity({
    client,
    db: fixture.db,
    saveCheckpoint: async (next: Record<string, string>) => {
      checkpoint = next;
    },
  });
  assert.equal(first.changed, 0);
  assert.equal(checkpoint.phase, "complete");
  fixture.documents.set("courses/active/posts/new", post);
  const second = await backfillCourseActivity({ client, db: fixture.db, checkpoint });
  assert.equal(second.sections, 2);
  assert.ok(second.inspected > 0);
  assert.equal(second.changed, 1);
  assert.equal(fixture.writes(), 0);
});

test("incomplete dry-run checkpoint cannot hide drift preceding its cursor", async () => {
  const fixture = database(new Map([["courses/active/posts/post-001", post]]));
  const client = {
    execute: async ({ args }: { args: string[] }) => ({
      rows: args[0] === "" ? [{ id: "active" }] : [],
    }),
  };
  const result = await backfillCourseActivity({
    client,
    db: fixture.db,
    checkpoint: {
      sectionAfter: "",
      sectionId: "active",
      phase: "posts",
      documentAfter: "post-099",
    },
  });
  assert.equal(result.changed, 1);
  assert.equal(fixture.requested[0].after, "");
  assert.equal(fixture.writes(), 0);
});

test("backfill refuses implicit targets and requires exact write confirmations", () => {
  const local = {
    TURSO_DATABASE_URL: "file:working/local.sqlite",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  };
  assert.equal(activityBackfillTarget({ project: "demo-ceoubb-qa" }, local).dryRun, true);
  assert.throws(() => activityBackfillTarget({}, local), /TARGET_REQUIRED/);
  assert.throws(
    () => activityBackfillTarget({ project: "demo-ceoubb-qa", write: true }, local),
    /WRITE_CONFIRMATION/
  );
  assert.throws(
    () =>
      activityBackfillTarget(
        { project: "demo-ceoubb-qa" },
        { ...local, FIRESTORE_EMULATOR_HOST: "remote:8080" }
      ),
    /LOCAL_TARGET/
  );
  assert.throws(
    () =>
      activityBackfillTarget(
        { project: "unknown" },
        { TURSO_DATABASE_URL: "libsql://ceoubb-staging.turso.io" }
      ),
    /REMOTE_TARGET/
  );
  const remote = { TURSO_DATABASE_URL: "libsql://ceoubb-staging.turso.io" };
  const options = {
    project: "centro-de-estudio-ubb-staging",
    "confirm-database": "ceoubb-staging.turso.io",
  };
  assert.equal(activityBackfillTarget(options, remote).dryRun, true);
  assert.throws(
    () =>
      activityBackfillTarget(
        { ...options, write: true, "confirm-project": "centro-de-estudio-ubb" },
        remote
      ),
    /WRITE_CONFIRMATION/
  );
  assert.equal(
    activityBackfillTarget({ ...options, write: true, "confirm-project": options.project }, remote)
      .dryRun,
    false
  );
  assert.throws(
    () => activityBackfillTarget(options, { ...remote, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }),
    /REMOTE_TARGET/
  );
});

test("activity retains section isolation and the client gate is disabled by default", async () => {
  const rules = await readFile(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(
    rules,
    /match \/courses\/\{courseId\}\/activity\/\{postId\}\s*\{\s*allow read: if isOwner\(\) \|\| isMember\(\) && isEnrolled\(courseId\);\s*allow write: if false;/
  );
  assert.doesNotMatch(rules, /match \/\{path=\*\*\}\//);
  const source = await readFile(new URL("../lib/firebase/posts.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /NEXT_PUBLIC_CEOUBB_ACTIVITY_PROJECTION === "enabled"\s*\? "activity"\s*: "posts"/
  );
});
