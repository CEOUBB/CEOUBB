import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, rm, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";
import { transformSync } from "esbuild";
import { eq } from "drizzle-orm";
import { zipSync } from "fflate";
import { load as loadYaml } from "js-yaml";
import { periodos, users } from "../db/schema.ts";
import { createIsolatedTestDb } from "../tests/helpers/db-harness.ts";
import {
  assignCourseAssistant,
  createTeacherCourse,
  listCourseAssistants,
  removeCourseAssistant,
  updateTeacherCourse,
} from "../lib/services/teacher-course-management.ts";

const require = createRequire(import.meta.url);

test("release scripts fail closed without signing credentials or a preview token", async () => {
  const release = loadYaml(
    await readFile(new URL("../.github/workflows/release-android.yml", import.meta.url), "utf8")
  );
  const deploy = loadYaml(
    await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8")
  );
  const signing = release.jobs["build-and-upload-apk"].steps.find(
    (step) => step.env?.KEYSTORE_BASE64
  );
  const preview = deploy.jobs.deploy.steps.find((step) => step.id === "deploy-preview");
  assert.equal(preview.env.CLOUDFLARE_API_TOKEN, "${{ secrets.CLOUDFLARE_PREVIEW_API_TOKEN }}");
  const dir = await mkdtemp(join(tmpdir(), "ceoubb-security-workflow-"));
  const bash =
    process.platform === "win32" ? join(process.env.ProgramFiles, "Git/bin/bash.exe") : "bash";
  const environment = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    GITHUB_OUTPUT: join(dir, "output"),
    KEYSTORE_BASE64: "",
    KEYSTORE_PASSWORD: "",
    KEY_ALIAS: "",
    KEY_PASSWORD: "",
    CLOUDFLARE_API_TOKEN: "",
  };
  try {
    await mkdir(join(dir, "android"));
    const unsigned = spawnSync(bash, ["-c", signing.run], {
      cwd: dir,
      env: environment,
      encoding: "utf8",
    });
    assert.equal(unsigned.error, undefined);
    assert.equal(unsigned.status, 1);
    await assert.rejects(access(join(dir, "android/keystore.properties")));
    const absentPreview = spawnSync(bash, ["-c", preview.run], {
      cwd: dir,
      env: environment,
      encoding: "utf8",
    });
    assert.equal(absentPreview.error, undefined);
    assert.equal(absentPreview.status, 0);
    await assert.rejects(access(join(dir, "output")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("preview publication reports the staging domain only after deployment succeeds", async () => {
  const deploy = loadYaml(
    await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8")
  );
  const preview = deploy.jobs.deploy.steps.find((step) => step.id === "deploy-preview");
  const dir = await mkdtemp(join(tmpdir(), "ceoubb-preview-workflow-"));
  const bash =
    process.platform === "win32" ? join(process.env.ProgramFiles, "Git/bin/bash.exe") : "bash";
  const output = join(dir, "output");
  const environment = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    GITHUB_OUTPUT: output,
    CLOUDFLARE_API_TOKEN: "fixture-preview-token",
  };

  try {
    const failed = spawnSync(bash, ["-e", "-c", `pnpm() { return 12; }\n${preview.run}`], {
      cwd: dir,
      env: environment,
      encoding: "utf8",
    });
    assert.equal(failed.error, undefined);
    assert.equal(failed.status, 12);
    await assert.rejects(access(output));
    const published = spawnSync(bash, ["-e", "-c", `pnpm() { return 0; }\n${preview.run}`], {
      cwd: dir,
      env: environment,
      encoding: "utf8",
    });
    assert.equal(published.error, undefined);
    assert.equal(published.status, 0);
    assert.equal(
      await readFile(output, "utf8"),
      "preview_url=https://staging.ceoubb.com\nurl=https://staging.ceoubb.com\n"
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the patched brace parser and AST walkers bound nesting", () => {
  const braces = require("braces");
  const deep = "{".repeat(1024) + "a,b" + "}".repeat(1024);
  for (const name of ["parse", "compile", "expand", "stringify"]) {
    assert.throws(() => braces[name](deep), /safe depth limit/);
  }
  for (const name of ["compile", "expand", "stringify"]) {
    let ast = { type: "text", value: "a" };
    for (let index = 0; index < 1024; index += 1) ast = { type: "root", nodes: [ast] };
    assert.throws(() => braces[name](ast), /safe depth limit/);
  }
  assert.deepEqual(braces.expand("src/{app,lib}/*.ts"), ["src/app/*.ts", "src/lib/*.ts"]);
});

function loadSource(file, adapters) {
  const sourceRequire = createRequire(new URL(file, import.meta.url));
  return readFile(new URL(file, import.meta.url), "utf8").then((source) => {
    const code = transformSync(source.replaceAll("import(", "__import("), {
      loader: file.endsWith("tsx") ? "tsx" : "ts",
      format: "cjs",
      jsx: "automatic",
    }).code;
    const loaded = { exports: {} };
    new Function("require", "module", "exports", "__import", code)(
      (name) => adapters[name] ?? sourceRequire(name),
      loaded,
      loaded.exports,
      async (name) => adapters[name] ?? sourceRequire(name)
    );
    return loaded.exports;
  });
}

test("logout attempts both Firebase identities and reports a failed layer", async () => {
  const calls = [];
  let rejectWeb = false;
  const auth = { currentUser: null };
  const client = await loadSource("../lib/firebase-client.ts", {
    "firebase/app": { getApps: () => [], initializeApp: () => ({}) },
    "firebase/app-check": {},
    "firebase/auth": {
      getAuth: () => auth,
      signOut: async () => {
        calls.push("web");
        if (rejectWeb) throw new Error("synthetic web failure");
      },
    },
    "@capacitor/core": { Capacitor: { isNativePlatform: () => true } },
    "@capacitor-firebase/authentication": {
      FirebaseAuthentication: {
        signOut: async () => {
          calls.push("native");
        },
      },
    },
    "./access-policy.ts": {},
    "./firebase-config.ts": { firebaseConfigFromEnvironment: () => ({}) },
    "./qa-runtime.ts": { qaClientRuntime: () => null },
    "./push-notifications.ts": {
      unregisterPushNotifications: async () => {
        calls.push("push");
      },
    },
  });
  await client.signOutOfFirebase();
  assert.deepEqual(calls, ["push", "web", "native"]);
  calls.length = 0;
  rejectWeb = true;
  await assert.rejects(client.signOutOfFirebase(), /synthetic web failure/);
  assert.deepEqual(calls, ["push", "web", "native"]);
});

test("portal logout still attempts the server when Firebase loading fails and reports partial failure", async () => {
  const source = await readFile(new URL("../app/usePortalCore.tsx", import.meta.url), "utf8");
  const start = source.indexOf("const logout = useCallback(");
  const end = source.indexOf("const finishSignedInWithSession", start);
  assert.ok(start >= 0 && end > start);
  const code = transformSync(source.slice(start, end).replaceAll("import(", "__import("), {
    loader: "tsx",
    format: "cjs",
  }).code;
  for (const failure of [null, "firebase", "server"]) {
    const calls = [];
    const logout = new Function(
      "useCallback",
      "router",
      "fetch",
      "dispatchSession",
      "dispatchNav",
      "forgetPhoto",
      "forgetPreferences",
      "__import",
      code + "\nreturn logout;"
    )(
      (callback) => callback,
      { refresh: () => calls.push("refresh") },
      async () => {
        calls.push("server");
        return { ok: failure !== "server" };
      },
      () => calls.push("session"),
      () => calls.push("navigation"),
      () => calls.push("photo"),
      () => calls.push("preferences"),
      async (name) => {
        if (name.endsWith("toast.ts")) return { toast: { error: () => calls.push("error") } };
        if (failure === "firebase") throw new Error("synthetic module failure");
        return {
          signOutOfFirebase: async () => {
            calls.push("firebase");
          },
        };
      }
    );
    await logout();
    assert.ok(calls.includes("server"));
    if (failure) {
      assert.ok(calls.includes("error"));
      assert.ok(!calls.includes("refresh") && !calls.includes("session"));
    } else {
      assert.deepEqual(
        new Set(calls),
        new Set(["server", "firebase", "photo", "preferences", "session", "navigation", "refresh"])
      );
    }
  }
});

test("ADECCA rejects archival at the guarded commit and releases its SQL reservation", async () => {
  const fixture = await createIsolatedTestDb();
  const actor = {
    id: "firebase:audit-import-teacher",
    email: "audit.import@ubiobio.cl",
    name: "Synthetic teacher",
    role: "teacher",
  };
  const requests = [];
  const originalFetch = globalThis.fetch;
  const projection = await loadSource("../lib/services/enrollment-projection.ts", {
    "../qa-runtime.ts": { resolveQaRuntime: () => ({ projectId: "demo-security" }) },
    "../firebase-endpoints.ts": {
      firebaseRestOrigins: () => ({ firestore: "http://127.0.0.1:1" }),
    },
  });
  const service = await loadSource("../lib/services/adecca-import.ts", {
    "../../db/index.ts": { getDb: () => fixture.db },
    "./enrollment-projection.ts": projection,
  });
  let period = "archivado";
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).startsWith("http://127.0.0.1:1/"));
    const body = JSON.parse(options.body);
    const operation = String(url).split(":").at(-1);
    requests.push({ operation, body });
    if (operation === "beginTransaction")
      return Response.json({ transaction: "synthetic-transaction" });
    if (operation === "batchGet") {
      assert.equal(body.transaction, "synthetic-transaction");
      const fields = body.documents[0].includes("/academicSections/")
        ? { periodoId: { stringValue: "2026-2" } }
        : { status: { stringValue: period } };
      return Response.json([{ found: { fields } }]);
    }
    return Response.json({});
  };
  try {
    await fixture.db.insert(users).values({ ...actor, createdAt: "2026-10-03T00:00:00.000Z" });
    await fixture.db.update(periodos).set({ estado: "abierto" }).where(eq(periodos.id, "2026-2"));
    const course = await createTeacherCourse(
      actor,
      {
        code: "AUD102",
        name: "Synthetic import",
        creditsSct: 6,
        departmentId: "dep-ceoubb-general",
        periodId: "2026-2",
        sectionNumber: 1,
        summary: "Synthetic import",
        modality: "presencial",
        room: "Lab",
        tone: "sky",
      },
      { db: fixture.db, projectEnrollment: async () => {} }
    );
    const source = {
      sourceKey: "a".repeat(64),
      fingerprint: "b".repeat(64),
      courseId: "synthetic",
      courseName: "Synthetic course",
      courseShortName: "SYN",
      adeccaVersion: "local",
      fileName: "course.zip",
      sourceFormat: "zip",
    };
    const run = await service.startAdeccaImport(actor, course.id, source, {
      contentCount: 1,
      fileCount: 0,
      participantCount: 0,
    });
    const posts = [
      {
        sourceId: "adecca-" + "c".repeat(40),
        title: "Synthetic material",
        body: "Synthetic content",
        kind: "resource",
        folder: "Unit",
        linkUrl: "",
        dueDate: "",
        storagePath: "",
        fileName: "",
        contentType: "",
        fileSize: 0,
        contentHash: "",
        sourceCreatedAt: null,
      },
    ];
    await assert.rejects(
      service.writeAdeccaImportPosts(
        actor,
        course.id,
        source.sourceKey,
        source.fingerprint,
        run.runToken,
        posts
      ),
      /período.*cerrado/i
    );
    assert.deepEqual(
      requests.map(({ operation }) => operation),
      ["beginTransaction", "batchGet", "batchGet", "rollback"]
    );
    requests.length = 0;
    period = "abierto";
    const result = await service.writeAdeccaImportPosts(
      actor,
      course.id,
      source.sourceKey,
      source.fingerprint,
      run.runToken,
      posts
    );
    assert.equal(result.imported, 1);
    const commit = requests.find(({ operation }) => operation === "commit");
    assert.equal(commit.body.transaction, "synthetic-transaction");
    assert.equal(commit.body.writes.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await fixture.cleanup();
  }
});

test("native token callbacks cannot bind an earlier registration to the next user", async () => {
  const auth = { currentUser: { uid: "synthetic-first" } };
  const registrations = [];
  const writes = [];
  const cleanup = [];
  const push = await loadSource("../lib/push-notifications.ts", {
    "@capacitor/push-notifications": {
      PushNotifications: {
        checkPermissions: async () => ({ receive: "granted" }),
        addListener: async (name, callback) => {
          if (name === "registration") registrations.push(callback);
        },
        register: async () => {},
        unregister: async () => {
          cleanup.push("unregister");
        },
        removeAllDeliveredNotifications: async () => {
          cleanup.push("notifications");
        },
        removeAllListeners: async () => {
          cleanup.push("listeners");
        },
      },
    },
    "firebase/auth": { getAuth: () => auth },
    "./firebase-client": { firebaseApp: {}, firebaseEmulatorsReady: Promise.resolve() },
    "./mobile-bridge": { isNativeShell: () => true },
    "./user-preferences.ts": {
      loadPreferences: async () => ({ channels: { posts: { push: true } } }),
    },
    "firebase/firestore": {
      getFirestore: () => ({}),
      doc: (_db, _collection, uid) => uid,
      setDoc: async (uid, data) => {
        writes.push({ uid, ...data });
      },
    },
  });
  await push.registerPushNotifications();
  registrations[0]({ value: "synthetic-first-token" });
  await new Promise((resolve) => setImmediate(resolve));
  await push.unregisterPushNotifications();
  auth.currentUser = { uid: "synthetic-second" };
  await push.registerPushNotifications();
  registrations[0]({ value: "stale-token" });
  registrations[1]({ value: "synthetic-second-token" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(cleanup.sort(), ["listeners", "notifications", "unregister"]);
  assert.deepEqual(writes, [
    { uid: "synthetic-first", fcmToken: "synthetic-first-token" },
    { uid: "synthetic-first", fcmToken: "" },
    { uid: "synthetic-second", fcmToken: "synthetic-second-token" },
  ]);
});

test("callable mutations reject a period archived after preflight authorization", async () => {
  const names = [
    "publishQuiz",
    "startQuizAttempt",
    "submitQuizAttempt",
    "saveAuditedStudentScores",
    "saveAuditedGradeFeedback",
    "registerTeamSubmission",
    "saveAuditedGradebook",
  ];
  const source = await readFile(new URL("../firebase/functions/index.js", import.meta.url), "utf8");
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const normalize = (value) => value;
  for (const name of names) {
    let writes = 0;
    const reads = [];
    const student = name.includes("Attempt") || name === "registerTeamSubmission";
    const snapshot = (path, transactional) => ({
      exists: !path.startsWith("authRevocations/"),
      empty: true,
      docs: [],
      data: () => ({ items: [{ id: "synthetic", submissionMode: "individual" }] }),
      get: (field) =>
        ({
          periodoId: "synthetic-period",
          status: transactional ? "archivado" : "abierto",
          role: path.startsWith("users/") ? (student ? "student" : "owner") : "student",
          items: [{ id: "synthetic" }],
        })[field],
    });
    const ref = (path = "") => ({
      path,
      id: "synthetic-quiz",
      collection: (key) => ref(`${path}/${key}`.replace(/^\//, "")),
      doc: (key = "synthetic-quiz") => ref(`${path}/${key}`),
      where: () => ref(path),
      limit: () => ref(path),
      get: async () => snapshot(path, false),
    });
    const transaction = {
      get: async (reference) => {
        reads.push(reference.path);
        return snapshot(reference.path, true);
      },
      getAll: async (...refs) => refs.map((reference) => snapshot(reference.path, true)),
      create: () => {
        writes += 1;
      },
      set: () => {
        writes += 1;
      },
    };
    const db = {
      collection: (key) => ref(key),
      getAll: async (...refs) => refs.map((reference) => snapshot(reference.path, false)),
      runTransaction: (run) => run(transaction),
    };
    const adapters = {
      "firebase-admin/app": { initializeApp: () => {} },
      "firebase-admin/firestore": { getFirestore: () => db, FieldValue: {}, Timestamp: {} },
      "firebase-admin/messaging": {},
      "firebase-functions/v2": { setGlobalOptions: () => {} },
      "firebase-functions/v2/firestore": {
        onDocumentCreated: () => {},
        onDocumentWritten: () => {},
      },
      "firebase-functions/v2/https": { HttpsError, onCall: (...args) => args.at(-1) },
      "./activity-projection": {},
      "./auth-access": { authenticationIsActive: () => true },
      "./grade-audit": {
        actorFromAuth: () => ({ actorUid: "synthetic-user" }),
        canEditSection: () => true,
        normalizeGradebookRequest: normalize,
        normalizeFeedbackRequest: normalize,
        normalizeScoreRequest: normalize,
        normalizeTeamSubmissionRequest: normalize,
        storedGradebook: normalize,
        groupRowsByTeam: (rows) => [rows],
        MAX_CONCURRENT_TRANSACTIONS: 4,
      },
      "./quiz-engine": { normalizePublishRequest: normalize, normalizeQuizRequest: normalize },
    };
    const loaded = { exports: {} };
    new Function("require", "module", "exports", source)(
      (key) => adapters[key] ?? require(key),
      loaded,
      loaded.exports
    );
    const data = {
      courseId: "synthetic-section",
      gradeItemId: "synthetic",
      quizId: "synthetic-quiz",
      evalId: "synthetic",
      userId: "synthetic-user",
      memberIds: ["synthetic-user"],
      storagePath: "courses/synthetic-section/submissions/synthetic/synthetic-user/file.pdf",
      rows: [{ userId: "synthetic-user", scores: { synthetic: 5 } }],
    };
    await assert.rejects(
      loaded.exports[name]({
        auth: { uid: "synthetic-user", token: { email_verified: true } },
        data,
      }),
      (error) => error.code === "failed-precondition" && /período.*cerrado/i.test(error.message),
      name
    );
    assert.deepEqual(
      reads,
      ["academicSections/synthetic-section", "academicPeriods/synthetic-period"],
      name
    );
    assert.equal(writes, 0, name);
  }
});

test("ZIP expansion uses a bounded output buffer and rejects understated sizes", async () => {
  const real = require("fflate");
  const allocations = [];
  const { openMoodleArchive } = await loadSource("../lib/moodle/archive.ts", {
    fflate: {
      ...real,
      inflateSync: (input, options) => {
        const output = real.inflateSync(input, options);
        allocations.push(output.byteLength);
        return output;
      },
    },
  });
  const valid = zipSync({ "synthetic.txt": new Uint8Array(8192).fill(65) });
  const malformed = valid.slice();
  const view = new DataView(malformed.buffer);
  for (let offset = 0; offset + 46 <= malformed.length; offset += 1) {
    if (view.getUint32(offset, true) === 0x02014b50) view.setUint32(offset + 24, 8, true);
  }
  const archive = await openMoodleArchive({
    size: malformed.length,
    arrayBuffer: async () => malformed.buffer,
  });
  await assert.rejects(archive.read("synthetic.txt"));
  assert.ok(allocations.length > 0);
  assert.ok(
    allocations.every((size) => size <= 9),
    "decompression must never allocate the understated actual output"
  );
  const safe = await openMoodleArchive({
    size: valid.length,
    arrayBuffer: async () => valid.buffer,
  });
  assert.deepEqual(await safe.read("synthetic.txt"), new Uint8Array(8192).fill(65));
});

test("archived teacher management rejects mutations while retaining historical assistant reads", async () => {
  const fixture = await createIsolatedTestDb();
  const teacher = {
    id: "firebase:audit-teacher",
    email: "audit.teacher@ubiobio.cl",
    name: "Synthetic teacher",
    role: "teacher",
  };
  const student = {
    id: "firebase:audit-student",
    email: "audit.student@alumnos.ubiobio.cl",
    name: "Synthetic student",
    role: "student",
  };
  let projections = 0;
  const dependencies = {
    db: fixture.db,
    projectEnrollment: async () => {
      projections += 1;
    },
  };
  try {
    await fixture.db
      .insert(users)
      .values(
        [teacher, student].map((user) => ({ ...user, createdAt: "2026-10-03T00:00:00.000Z" }))
      );
    await fixture.db.update(periodos).set({ estado: "abierto" }).where(eq(periodos.id, "2026-2"));
    const course = await createTeacherCourse(
      teacher,
      {
        code: "AUD101",
        name: "Synthetic course",
        creditsSct: 6,
        departmentId: "dep-ceoubb-general",
        periodId: "2026-2",
        sectionNumber: 1,
        summary: "Synthetic course",
        modality: "presencial",
        room: "Lab",
        tone: "sky",
      },
      dependencies
    );
    await assignCourseAssistant(teacher, course.id, { email: student.email }, dependencies);
    const before = projections;
    await fixture.db.update(periodos).set({ estado: "archivado" }).where(eq(periodos.id, "2026-2"));
    for (const actor of [teacher, { ...teacher, role: "owner" }]) {
      await assert.rejects(
        updateTeacherCourse(actor, course.id, { title: "Changed" }, dependencies),
        /período.*cerrado/i
      );
      await assert.rejects(
        assignCourseAssistant(actor, course.id, { email: student.email }, dependencies),
        /período.*cerrado/i
      );
      await assert.rejects(
        removeCourseAssistant(actor, course.id, student.id, dependencies),
        /período.*cerrado/i
      );
    }
    const assistants = await listCourseAssistants(teacher, course.id, dependencies);
    assert.equal(assistants.items[0].userId, student.id);
    assert.equal(projections, before);
  } finally {
    await fixture.cleanup();
  }
});
