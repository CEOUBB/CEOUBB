import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { localEnvironment, preserveNextEnv, startRuntime, within } from "../scripts/qa/runtime.mjs";
import { runStaging, stagingConfig } from "../scripts/qa/staging.mjs";
import { firebaseRestOrigins } from "../lib/firebase-endpoints.ts";
import { PRODUCTION_FIREBASE_CONFIG, resolveFirebaseConfig } from "../lib/firebase-config.ts";
import { qaDistDir, resolveQaClientRuntime, resolveQaRuntime } from "../lib/qa-runtime.ts";

const environment = {
  CEOUBB_QA: "1",
  NEXT_PUBLIC_CEOUBB_QA: "1",
  FIREBASE_PROJECT_ID: "demo-ceoubb-qa-check",
  FIREBASE_STORAGE_BUCKET: "demo-ceoubb-qa-check.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ceoubb-qa-check",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-ceoubb-qa-check.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_API_KEY: "qa-synthetic-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
  NEXT_PUBLIC_FIREBASE_APP_ID: "qa-synthetic-app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
  NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
  TURSO_DATABASE_URL: "file:/tmp/ceoubb-qa/database.sqlite",
  CEOUBB_QA_DIST_DIR: ".qa/check/next",
};

// Implements: REQ-QA-02, REQ-QA-03
test("QA runtime preserves production defaults and rejects every unsafe local target", () => {
  assert.equal(resolveQaRuntime({}), null);
  assert.equal(resolveFirebaseConfig({}), PRODUCTION_FIREBASE_CONFIG);
  assert.deepEqual(firebaseRestOrigins({}), {
    auth: "https://identitytoolkit.googleapis.com",
    firestore: "https://firestore.googleapis.com",
    storage: "https://storage.googleapis.com",
    storageDownload: "https://firebasestorage.googleapis.com",
  });
  assert.equal(resolveQaRuntime(environment)?.projectId, "demo-ceoubb-qa-check");
  assert.equal(resolveFirebaseConfig(environment).authDomain, "localhost");
  assert.equal(qaDistDir(environment), ".qa/check/next");
  assert.equal(
    firebaseRestOrigins(environment).auth,
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com"
  );
  assert.equal(
    resolveQaRuntime({ ...environment, TURSO_DATABASE_URL: "file:C:/qa/data.sqlite" })?.projectId,
    environment.FIREBASE_PROJECT_ID
  );
  for (const key of ["CEOUBB_QA", "NEXT_PUBLIC_CEOUBB_QA"]) {
    assert.throws(() => resolveQaRuntime({ ...environment, [key]: "0" }), /QA_CONFIG_INVALID/);
  }
  for (const key of [
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
    "FUNCTIONS_EMULATOR_HOST",
  ]) {
    for (const host of [
      "example.com:9099",
      "127.0.0.1:65536",
      "localhost:0",
      "http://127.0.0.1:9099",
      "127.0.0.1:9099@evil.test",
      "[::1]:9099",
      "",
    ]) {
      assert.throws(
        () => resolveQaRuntime({ ...environment, [key]: host, [`NEXT_PUBLIC_${key}`]: host }),
        /QA_CONFIG_INVALID/
      );
    }
    assert.throws(
      () => resolveQaRuntime({ ...environment, [key]: "127.0.0.1:9999" }),
      /QA_CONFIG_INVALID/
    );
  }
  for (const projectId of ["centro-de-estudio-ubb", "demo-unrelated", "demo-ceoubb-qa/other"]) {
    assert.throws(
      () => resolveQaRuntime({ ...environment, NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId }),
      /QA_CONFIG_INVALID/
    );
  }
  for (const database of [
    "libsql://remote.turso.io",
    "file:relative.db",
    "file://remote/share.db",
    "file:/tmp/../production.db",
    "file:/tmp/data.db?mode=rw",
  ]) {
    assert.throws(
      () => resolveQaRuntime({ ...environment, TURSO_DATABASE_URL: database }),
      /QA_CONFIG_INVALID/
    );
  }
  for (const directory of [".next", "../next", ".qa/../next", "C:/next"]) {
    assert.throws(
      () => qaDistDir({ ...environment, CEOUBB_QA_DIST_DIR: directory }),
      /QA_CONFIG_INVALID/
    );
  }
  assert.throws(() => resolveQaClientRuntime(environment, "ceoubb.com"), /QA_CONFIG_INVALID/);
  assert.throws(
    () => resolveQaRuntime({ ...environment, FIREBASE_STORAGE_BUCKET: "production" }),
    /QA_CONFIG_INVALID/
  );
  assert.throws(
    () =>
      resolveFirebaseConfig({ ...environment, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "example.com" }),
    /QA_CONFIG_INVALID/
  );
});

test("QA projections and revocation checks use local admin transport without service credentials", async () => {
  const keys = [
    ...Object.keys(environment),
    "FIREBASE_SERVICE_ACCOUNT_EMAIL",
    "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  try {
    Object.assign(process.env, environment);
    delete process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.equal(new URL(url).hostname, "127.0.0.1");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer owner");
      calls.push(url);
      return Response.json(
        url.includes("authRevocations")
          ? { fields: { revokedAt: { integerValue: "100" }, disabled: { booleanValue: false } } }
          : {}
      );
    };
    const { googleAccessToken, projectUserRoleToFirestore } =
      await import("../lib/services/enrollment-projection.ts");
    assert.equal(await googleAccessToken(), "owner");
    await projectUserRoleToFirestore("firebase:qa-student", "student");
    assert.match(calls[0], /demo-ceoubb-qa-check\/databases\/\(default\)\/documents:commit$/);
    const { firebaseCredentialIsActive } = await import("../lib/services/firebase-revocation.ts");
    const token = `header.${Buffer.from(JSON.stringify({ sub: "qa-student", auth_time: 100 })).toString("base64url")}.signature`;
    assert.equal(await firebaseCredentialIsActive(token, "qa-student"), false);
    assert.equal(
      calls.length,
      2,
      "revocation must be checked even without production service credentials"
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("QA launcher strips inherited and dotenv credentials and contains its run directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "ceoubb-qa-runtime-"));
  try {
    const run = join(root, ".qa", "check");
    await mkdir(run, { recursive: true });
    await writeFile(
      join(root, ".env.local"),
      "TURSO_DATABASE_URL=libsql://production.invalid\nGITHUB_TOKEN=remote-sentinel\n"
    );
    await writeFile(
      join(root, ".env.development.local"),
      "export LINEAR_API_KEY = remote-sentinel\n"
    );
    const child = await localEnvironment(
      root,
      run,
      {
        app: 3000,
        auth: 9099,
        firestore: 8080,
        storage: 9199,
        functions: 5001,
      },
      {
        NODE_ENV: "development",
        PATH: "synthetic-path",
        NODE_OPTIONS: "--require unsafe.cjs",
        FIREBASE_TOKEN: "remote-sentinel",
        GITHUB_TOKEN: "remote-sentinel",
        GOOGLE_APPLICATION_CREDENTIALS: "/remote/key.json",
      }
    );
    const values = new Map(Object.entries(child));
    assert.equal(values.get("PATH"), "synthetic-path");
    for (const key of ["NODE_OPTIONS", "FIREBASE_TOKEN"]) assert.equal(values.has(key), false);
    for (const key of [
      "GITHUB_TOKEN",
      "LINEAR_API_KEY",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "TURSO_AUTH_TOKEN",
    ])
      assert.equal(values.get(key), "");
    assert.equal(resolveQaRuntime(child)?.projectId, "demo-ceoubb-qa");
    assert.equal(within(root, run), run);
    for (const target of [root, join(root, ".."), `${root}-sibling`]) {
      assert.throws(() => within(root, target), /QA_PATH_REFUSED/);
    }
  } finally {
    await rm(within(tmpdir(), root), { recursive: true, force: true });
  }
});

test("Next cleanup restores only its own generated next-env declarations", async () => {
  const root = await mkdtemp(join(tmpdir(), "ceoubb-qa-next-env-"));
  const run = join(root, ".qa", "check");
  const file = join(root, "next-env.d.ts");
  const original = '/// <reference types="next" />\r\n// Existing project declaration\r\n';
  const require = createRequire(import.meta.url);
  const { writeAppTypeDeclarations } = require("next/dist/lib/typescript/writeAppTypeDeclarations");
  const generate = (distDir = ".qa/check/next/dev") =>
    writeAppTypeDeclarations({
      baseDir: root,
      distDir,
      imageImportsEnabled: true,
      hasPagesDir: false,
      hasAppDir: true,
      strictRouteTypes: false,
      typedRoutes: false,
    });
  try {
    await mkdir(run, { recursive: true });
    await writeFile(file, original);
    const restore = await preserveNextEnv(root, run);
    await generate();
    assert.match(await readFile(file, "utf8"), /\.qa\/check\/next\/dev\/types\/routes/);
    await restore();
    assert.equal(await readFile(file, "utf8"), original);
    await generate();
    const edited = `${await readFile(file, "utf8")}// Concurrent user edit\r\n`;
    await writeFile(file, edited);
    await restore();
    assert.equal(await readFile(file, "utf8"), edited);
    await generate(".qa/other-run/next/dev");
    const other = await readFile(file, "utf8");
    await restore();
    assert.equal(await readFile(file, "utf8"), other);
    const restoreAfterOtherRun = await preserveNextEnv(root, run);
    await generate();
    await restoreAfterOtherRun();
    const restored = await readFile(file, "utf8");
    assert.doesNotMatch(restored, /\.qa\/other-run/);
    assert.match(restored, /\.next\/types\/routes/);
  } finally {
    await rm(within(tmpdir(), root), { recursive: true, force: true });
  }
});

test("an aborted startup removes its owned run before starting services", async () => {
  const root = await mkdtemp(join(tmpdir(), "ceoubb-qa-abort-"));
  try {
    await assert.rejects(
      startRuntime(root, "aborted", root, AbortSignal.abort(new Error("QA test cancellation"))),
      /QA test cancellation/
    );
    await assert.rejects(stat(join(root, ".qa", "aborted")), {
      code: "ENOENT",
    });
  } finally {
    await rm(within(tmpdir(), root), { recursive: true, force: true });
  }
});

test("the actual publication hook records simulated QA delivery and refuses malformed QA", async () => {
  const sourceUrl = new URL("../firebase/functions/index.js", import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const require = createRequire(sourceUrl);
  for (const config of [
    { CEOUBB_QA: "1", FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-ceoubb-qa" },
    { CEOUBB_QA: "1", FUNCTIONS_EMULATOR: "false", GCLOUD_PROJECT: "demo-ceoubb-qa" },
    { CEOUBB_QA: "1", FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "production" },
    {},
  ]) {
    let handler: ((event: object) => Promise<void>) | undefined;
    const writes: { collection: string; data: Record<string, unknown> }[] = [];
    let messagingCalls = 0;
    const query = {
      where: () => query,
      select: () => query,
      get: async () => ({ docs: [{ ref: { parent: { parent: { id: "qa-student" } } } }] }),
    };
    const db = {
      collectionGroup: () => query,
      collection: (collection: string) => ({
        doc: () => ({
          set: async (data: Record<string, unknown>) => {
            writes.push({ collection, data });
          },
        }),
      }),
      getAll: async () => [
        {
          exists: true,
          get: (key: string) => (key === "fcmToken" ? "synthetic-device-token" : {}),
          ref: {},
        },
      ],
    };
    runInNewContext(source, {
      exports: {},
      process: { env: config },
      console,
      require: (module: string) => {
        if (module === "firebase-admin/app") return { initializeApp() {} };
        if (module === "firebase-admin/firestore") return { getFirestore: () => db };
        if (module === "firebase-admin/messaging")
          return {
            getMessaging: () => {
              messagingCalls++;
              throw new Error("PRODUCTION_MESSAGING_PATH");
            },
          };
        if (module === "firebase-functions/v2") return { setGlobalOptions() {} };
        if (module === "firebase-functions/v2/https") return { HttpsError: Error, onCall() {} };
        if (module === "firebase-functions/v2/firestore")
          return {
            onDocumentCreated: (_path: string, callback: typeof handler) => {
              handler = callback;
            },
          };
        return require(module);
      },
    });
    assert.ok(handler);
    const event = {
      data: { data: () => ({ title: "QA publication", body: "Synthetic" }) },
      params: { courseId: "qa-course", postId: "qa-post" },
    };
    if (!("CEOUBB_QA" in config)) {
      await assert.rejects(handler(event), /PRODUCTION_MESSAGING_PATH/);
      assert.equal(messagingCalls, 1);
    } else if (config.FUNCTIONS_EMULATOR === "true" && config.GCLOUD_PROJECT === "demo-ceoubb-qa") {
      await handler(event);
      assert.equal(messagingCalls, 0);
      assert.equal(writes.length, 1);
      assert.equal(writes[0].collection, "_qa_outbox");
      assert.equal(writes[0].data.deliveryVerified, false);
      assert.equal(writes[0].data.recipientCount, 1);
    } else {
      await assert.rejects(handler(event), /QA_CONFIG_INVALID/);
      assert.equal(messagingCalls, 0);
      assert.equal(writes.length, 0);
    }
  }
});

test("staging refuses production before login and never reports external delivery as passed", async () => {
  const root = await mkdtemp(join(tmpdir(), "ceoubb-qa-staging-"));
  const previousExitCode = process.exitCode;
  const credentials = {
    NODE_ENV: "development" as const,
    QA_STAGING_EMAIL: "qa-staging-student@alumnos.ubiobio.cl",
    QA_STAGING_PASSWORD: "synthetic-secret-password",
    QA_STAGING_API_KEY: "synthetic-secret-api-key",
  };
  const manifest = { runId: "test-staging", startedAt: "2026-09-22T12:00:00.000Z" };
  try {
    for (const url of [
      "https://ceoubb.com",
      "https://staging.ceoubb.com.evil.test",
      "http://staging.ceoubb.com",
      "https://staging.ceoubb.com/?redirect=production",
    ]) {
      assert.throws(
        () => stagingConfig({ ...credentials, QA_STAGING_URL: url }),
        /QA_STAGING_TARGET_REFUSED/
      );
    }
    assert.throws(
      () => stagingConfig({ ...credentials, QA_STAGING_EMAIL: "someone@ubiobio.cl" }),
      /QA_STAGING_IDENTITY_REFUSED/
    );
    const missing = await runStaging(root, manifest, { NODE_ENV: "development" }, async (url) => {
      assert.equal(String(url), "https://staging.ceoubb.com/");
      return new Response("staging");
    });
    assert.equal(missing.status, "requires-external-verification");
    assert.equal(missing.checks.at(-1)?.status, "requires-external-verification");
    const calls: string[] = [];
    const productionKey: typeof fetch = async (url, init) => {
      calls.push(String(url));
      assert.equal(
        init?.method,
        undefined,
        "credentials must not be posted before the project check"
      );
      return String(url).includes("identitytoolkit")
        ? Response.json({ projectId: "centro-de-estudio-ubb" })
        : new Response("staging");
    };
    const refused = await runStaging(root, manifest, credentials, productionKey);
    assert.equal(refused.status, "failed");
    assert.equal(calls.length, 2);
    const idToken = `header.${Buffer.from(
      JSON.stringify({
        aud: "centro-de-estudio-ubb-staging",
        iss: "https://securetoken.google.com/centro-de-estudio-ubb-staging",
        sub: "qa-staging-student",
        email: credentials.QA_STAGING_EMAIL,
        email_verified: true,
      })
    ).toString("base64url")}.signature`;
    let loggedOut = false;
    const liveShape: typeof fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      assert.equal(init?.redirect, "error");
      if (path === "/") return new Response("staging");
      if (path === "/v1/projects")
        return Response.json({ projectId: "centro-de-estudio-ubb-staging" });
      if (path.endsWith("accounts:signInWithPassword"))
        return Response.json({ idToken, localId: "qa-staging-student" });
      if (path === "/api/auth/firebase")
        return Response.json(
          { user: { id: "firebase:qa-staging-student", email: credentials.QA_STAGING_EMAIL } },
          {
            headers: {
              "Set-Cookie": "centro_estudio_session=synthetic-cookie; HttpOnly; Secure; Path=/",
            },
          }
        );
      if (path === "/api/auth/me")
        return Response.json({
          user: { id: "firebase:qa-staging-student" },
          sectionIds: ["staging-sec-001"],
        });
      if (path.endsWith("/posts"))
        return Response.json({ documents: [{ name: "synthetic-post" }] });
      if (path === "/api/auth/logout") {
        loggedOut = true;
        return Response.json({ ok: true });
      }
      throw new Error("Unexpected staging request");
    };
    const smoke = await runStaging(root, manifest, credentials, liveShape);
    assert.equal(smoke.status, "requires-external-verification");
    assert.equal(loggedOut, true);
    assert.ok(smoke.checks.every((check) => check.status === "passed"));
    assert.ok(
      smoke.externalVerification.every((check) => check.status === "requires-external-verification")
    );
    const report = await readFile(join(root, "summary.json"), "utf8");
    for (const secret of [
      credentials.QA_STAGING_EMAIL,
      credentials.QA_STAGING_PASSWORD,
      credentials.QA_STAGING_API_KEY,
      idToken,
      "synthetic-cookie",
    ])
      assert.equal(report.includes(secret), false);
  } finally {
    process.exitCode = previousExitCode;
    await rm(within(tmpdir(), root), { recursive: true, force: true });
  }
});
