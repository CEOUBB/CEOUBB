import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

const require = createRequire(resolve("package.json"));
const { resolveQaRuntime } = require("./lib/qa-runtime.ts");
const { SESSION_COOKIE } = require("./lib/session-cookie.ts");
const source = await readFile(resolve("lib/auth.ts"), "utf8");
const compiled = transformSync(source, { loader: "ts", format: "cjs" }).code;
const qa = {
  CEOUBB_QA: "1",
  NEXT_PUBLIC_CEOUBB_QA: "1",
  FIREBASE_PROJECT_ID: "demo-ceoubb-qa-cookie",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ceoubb-qa-cookie",
  FIREBASE_STORAGE_BUCKET: "demo-ceoubb-qa-cookie.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-ceoubb-qa-cookie.firebasestorage.app",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
  NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
  TURSO_DATABASE_URL: "file:/tmp/ceoubb-qa-cookie/database.sqlite",
};

function loadAuth(environment, calls) {
  const authModule = { exports: {} };
  const database = {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => ({ limit: async () => [] }) }),
      }),
    }),
    insert: () => ({
      values: async () => {
        calls.insert += 1;
      },
    }),
    delete: () => ({
      where: async () => {
        calls.delete += 1;
      },
    }),
  };
  const load = (specifier) => {
    if (specifier === "../db/index.ts") {
      return {
        getDb: () => {
          calls.getDb += 1;
          return database;
        },
      };
    }
    if (specifier === "../db/schema.ts") return { sessions: {}, users: {} };
    if (specifier === "./services/academic-catalog.ts") return {};
    if (specifier === "./session-cookie.ts") return { SESSION_COOKIE };
    if (specifier === "./qa-runtime.ts") {
      return { resolveQaRuntime: () => resolveQaRuntime(environment) };
    }
    return require(specifier);
  };
  runInNewContext(compiled, {
    require: load,
    module: authModule,
    exports: authModule.exports,
    process: { env: environment },
    crypto: globalThis.crypto,
    TextEncoder,
    Uint8Array,
    btoa,
    Math: { ...Math, random: () => 1 },
  });
  return authModule.exports;
}

// Implements: REQ-QA-02
test("session creation and deletion retain Secure except in a complete disposable QA target", async () => {
  for (const [label, environment, secure] of [
    ["ordinary production", { NODE_ENV: "production" }, true],
    ["ordinary development", { NODE_ENV: "development" }, false],
    ["valid production QA", { ...qa, NODE_ENV: "production" }, false],
  ]) {
    const calls = { getDb: 0, insert: 0, delete: 0 };
    const { createSession, destroySession } = loadAuth(environment, calls);
    const created = await createSession("qa-cookie-principal");
    const deleted = await destroySession(
      new Request("http://localhost/api/auth/logout", {
        headers: { cookie: created.split(";")[0] },
      })
    );

    for (const cookie of [created, deleted]) {
      assert.equal(/(?:^|;)\s*Secure(?:;|$)/.test(cookie), secure, label);
      assert.match(cookie, /; HttpOnly(?:;|$)/, label);
      assert.match(cookie, /; SameSite=Lax(?:;|$)/, label);
      assert.match(cookie, /; Path=\/(?:;|$)/, label);
      assert.ok(cookie.startsWith(`${SESSION_COOKIE}=`), label);
    }
    assert.match(created, /; Max-Age=2592000$/, label);
    assert.match(deleted, /; Max-Age=0$/, label);
    assert.equal(calls.insert, 1, label);
    assert.equal(calls.delete, 1, label);
  }
});

// Implements: REQ-QA-02
test("unsafe QA opt-ins fail before session creation or deletion reaches the database", () => {
  for (const [label, override] of [
    ["missing browser opt-in", { NEXT_PUBLIC_CEOUBB_QA: "0" }],
    ["missing server opt-in", { CEOUBB_QA: "0" }],
    ["non-demo project", { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "remote-project" }],
    ["remote emulator", { FIRESTORE_EMULATOR_HOST: "remote.test:8080" }],
    ["remote database", { TURSO_DATABASE_URL: "libsql://remote.test" }],
  ]) {
    for (const NODE_ENV of ["production", "development"]) {
      const calls = { getDb: 0, insert: 0, delete: 0 };
      assert.throws(
        () => loadAuth({ ...qa, ...override, NODE_ENV }, calls),
        /QA_CONFIG_INVALID/,
        label
      );
      assert.deepEqual(calls, { getDb: 0, insert: 0, delete: 0 }, label);
    }
  }
});
