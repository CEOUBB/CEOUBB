import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, openSync, closeSync } from "node:fs";
import { mkdir, readFile, writeFile, cp, symlink, rm, lstat, realpath } from "node:fs/promises";
import { resolve, join, delimiter, relative, sep, isAbsolute } from "node:path";
import { resolveQaRuntime } from "../../lib/qa-runtime.ts";

const require = createRequire(import.meta.url);
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

// Implements: REQ-QA-02
export function within(parent, child) {
  const path = relative(resolve(parent), resolve(child));
  if (
    !path ||
    isAbsolute(path) ||
    path === ".." ||
    path.startsWith(`..${sep}`) ||
    resolve(parent, path) !== resolve(child)
  )
    throw new Error("QA_PATH_REFUSED: expected a child of the owned run directory.");
  return resolve(child);
}

export async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Cannot allocate a QA port.");
  const port = address.port;
  await new Promise((done, reject) => server.close((error) => (error ? reject(error) : done())));
  return port;
}

// Implements: REQ-QA-02, REQ-QA-09
/** @param {Record<string, string | undefined>} inherited */
export async function localEnvironment(root, runDir, ports, inherited = process.env) {
  within(join(root, ".qa"), runDir);
  /** @type {Record<string, string | undefined>} */
  const environment = {};
  const osKeys =
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|PNPM_HOME|COREPACK_HOME|JAVA_HOME|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS|CI|GITHUB_ACTIONS|TERM|LANG|LC_ALL)$/i;
  for (const [key, value] of Object.entries(inherited))
    if (osKeys.test(key) && value !== undefined) environment[key] = value;
  // Define dotenv keys as empty so Next cannot reload production credentials from this checkout.
  for (const file of [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.example",
  ]) {
    const body = await readFile(join(root, file), "utf8").catch(() => "");
    for (const match of body.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))
      environment[match[1]] = "";
  }
  const project = "demo-ceoubb-qa";
  const host = (port) => `127.0.0.1:${port}`;
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  Object.assign(environment, {
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
    FIREBASE_CLI_DISABLE_USAGE_REPORTING: "true",
    METADATA_SERVER_DETECTION: "none",
    GCLOUD_PROJECT: project,
    GOOGLE_CLOUD_PROJECT: project,
    CEOUBB_QA: "1",
    NEXT_PUBLIC_CEOUBB_QA: "1",
    CEOUBB_ENVIRONMENT: "development",
    NEXT_PUBLIC_CEOUBB_ENVIRONMENT: "development",
    CEOUBB_QA_DIST_DIR: `${relative(root, runDir).replaceAll("\\", "/")}/next`,
    TURSO_DATABASE_URL: `file:${join(runDir, "local.db").replaceAll("\\", "/")}`,
    TURSO_AUTH_TOKEN: "",
    FIREBASE_PROJECT_ID: project,
    FIREBASE_STORAGE_BUCKET: `${project}.firebasestorage.app`,
    FIREBASE_ACCESS_TOKEN: "",
    FIREBASE_SERVICE_ACCOUNT_EMAIL: "",
    FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: "",
    GOOGLE_APPLICATION_CREDENTIALS: "",
    NEXT_PUBLIC_FIREBASE_API_KEY: "qa-local-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${project}.firebasestorage.app`,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789000",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789000:web:qa-local",
    FIREBASE_AUTH_EMULATOR_HOST: host(ports.auth),
    FIRESTORE_EMULATOR_HOST: host(ports.firestore),
    FIREBASE_STORAGE_EMULATOR_HOST: host(ports.storage),
    FUNCTIONS_EMULATOR_HOST: host(ports.functions),
    SOPORTE_MAIL_DRIVER: "none",
    SOPORTE_MAIL_API_KEY: "",
    TURNSTILE_SECRET_KEY: "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    NEXT_PUBLIC_SENTRY_DSN: "",
    SENTRY_DSN: "",
    SENTRY_AUTH_TOKEN: "",
    GEMINI_API_KEY: "",
    DEV_AUTH_SECRET: "qa-local-only",
    INTEROP_PLATFORM_ORIGIN: `http://${host(ports.app)}`,
    INTEROP_CONTENT_ORIGIN: `http://localhost:${ports.app}`,
    LTI_PRIVATE_JWK: JSON.stringify({
      ...privateKey.export({ format: "jwk" }),
      kid: "qa-local-signing-key",
    }),
    QA_BASE_URL: `http://${host(ports.app)}`,
    NO_PROXY: "localhost,127.0.0.1,::1",
  });
  for (const key of [
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
    "FUNCTIONS_EMULATOR_HOST",
  ])
    environment[`NEXT_PUBLIC_${key}`] = environment[key];
  resolveQaRuntime(environment);
  return environment;
}

function start(executable, args, environment, cwd, log) {
  const fd = log ? openSync(log, "a") : undefined;
  const child = spawn(executable, args, {
    env: environment,
    cwd,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: fd === undefined ? "inherit" : ["ignore", fd, fd],
  });
  if (fd !== undefined) closeSync(fd);
  child.qaError = null;
  child.once("error", (error) => {
    child.qaError = error;
  });
  return child;
}

export function exited(child) {
  return new Promise((done, reject) => {
    if (child.qaError) return reject(child.qaError);
    if (child.exitCode !== null || child.signalCode !== null) return done(child.exitCode ?? 1);
    child.once("error", reject);
    child.once("exit", (code) => done(code ?? 1));
  });
}

// Implements: REQ-QA-02
// Next always writes this file in the project root, even with a custom tsconfigPath.
export async function preserveNextEnv(root, runDir) {
  const file = join(root, "next-env.d.ts");
  const original = await readFile(file, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const expectedFile = join(runDir, "next-env.d.ts");
  if (original !== null) await writeFile(expectedFile, original);
  await require("next/dist/lib/typescript/writeAppTypeDeclarations").writeAppTypeDeclarations({
    baseDir: runDir,
    distDir: `${relative(root, runDir).replaceAll("\\", "/")}/next/dev`,
    imageImportsEnabled: true,
    hasPagesDir: false,
    hasAppDir: true,
    strictRouteTypes: false,
    typedRoutes: false,
  });
  const generated = await readFile(expectedFile, "utf8");
  // Another QA run may finish first; never restore imports into its disposable directory.
  const restored = original?.replace(
    /^(import ["'])\.\/\.qa\/[^/"']+\/next\/dev\/types\//gm,
    "$1./.next/types/"
  );
  return async () => {
    const current = await readFile(file, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    // Exact content ownership prevents cleanup from reverting a user's edit or another run.
    if (current !== generated) return;
    if (original === null) await rm(file);
    else await writeFile(file, restored);
  };
}

async function stop(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    const kill = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    await new Promise((done) => {
      kill.once("error", done);
      kill.once("exit", done);
    });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* Already exited. */
    }
    await Promise.race([exited(child), pause(3000)]);
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* Already exited. */
      }
    }
  }
}

async function ready(url, children, timeout = 180_000, signal) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    signal?.throwIfAborted();
    for (const child of children)
      if (child.qaError || child.exitCode !== null || child.signalCode !== null)
        throw (
          child.qaError ??
          new Error(`QA service exited (${child.exitCode ?? child.signalCode}); inspect its log.`)
        );
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.status < 500) return;
    } catch {
      /* Service is still starting. */
    }
    await pause(300);
  }
  throw new Error(`QA service did not become ready: ${url}`);
}

function firebaseInvocation() {
  const candidates = (process.env.PATH ?? process.env.Path ?? "")
    .split(delimiter)
    .flatMap((path) => [
      join(path, "node_modules/firebase-tools/lib/bin/firebase.js"),
      join(path, "../lib/node_modules/firebase-tools/lib/bin/firebase.js"),
    ]);
  const installed = candidates.find(existsSync);
  if (installed) return { executable: process.execPath, args: [installed] };
  const pnpm = process.env.npm_execpath;
  if (!pnpm)
    throw new Error(
      "Firebase CLI not found. Run through pnpm qa or install the Firebase CLI used by pnpm run check:rules."
    );
  const script = /\.[cm]?js$/i.test(pnpm);
  return {
    executable: script ? process.execPath : pnpm,
    args: [...(script ? [pnpm] : []), "dlx", "firebase-tools@15.28.2"],
  };
}

// Implements: REQ-QA-02, REQ-QA-03, REQ-QA-05
export async function startRuntime(root, runId, output, signal) {
  const runDir = within(join(root, ".qa"), join(root, ".qa", runId));
  await mkdir(join(root, ".qa"), { recursive: true });
  if (
    (await lstat(join(root, ".qa"))).isSymbolicLink() ||
    (await realpath(join(root, ".qa"))) !== join(await realpath(root), ".qa")
  )
    throw new Error("QA_PATH_REFUSED: .qa must be a real workspace directory.");
  await mkdir(runDir);
  const children = [];
  let restoreNextEnv;
  let cleanupPromise;
  const abort = () => {
    // Stop a hung seed immediately; the startup catch removes files after pending writes settle.
    void Promise.all(children.map(stop)).catch(() => undefined);
  };
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      signal?.removeEventListener("abort", abort);
      for (const child of [...children].reverse()) await stop(child);
      await restoreNextEnv?.();
      if ((await lstat(runDir)).isSymbolicLink())
        throw new Error("QA_PATH_REFUSED: run directory was replaced by a link.");
      await rm(within(join(root, ".qa"), runDir), {
        recursive: true,
        force: true,
        maxRetries: 4,
        retryDelay: 250,
      });
    })());
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    const ports = {};
    const allocated = new Set();
    for (const key of [
      "app",
      "auth",
      "firestore",
      "storage",
      "functions",
      "hub",
      "logging",
      "eventarc",
      "pubsub",
      "tasks",
      "websocket",
      "inspect",
    ]) {
      let port;
      do {
        port = await freePort();
      } while (allocated.has(port));
      allocated.add(port);
      ports[key] = port;
    }
    const environment = await localEnvironment(root, runDir, ports);
    await writeFile(join(runDir, "environment.json"), JSON.stringify(environment), { mode: 0o600 });
    const functions = join(runDir, "functions");
    if (!existsSync(join(root, "firebase/functions/node_modules/firebase-functions")))
      throw new Error(
        "Functions dependencies are missing. Run pnpm --dir firebase/functions install --frozen-lockfile."
      );
    await cp(join(root, "firebase/functions"), functions, {
      recursive: true,
      filter: (source) =>
        !/(?:^|[\\/])(?:node_modules|\.env[^\\/]*|\.firebase|pnpm-lock\.yaml|pnpm-workspace\.yaml)(?:[\\/]|$)/.test(
          source
        ),
    });
    await symlink(
      join(root, "firebase/functions/node_modules"),
      join(functions, "node_modules"),
      process.platform === "win32" ? "junction" : "dir"
    );
    const config = {
      functions: { source: "functions", runtime: "nodejs22" },
      firestore: {
        rules: join(root, "firebase/firestore.rules"),
        indexes: join(root, "firebase/firestore.indexes.json"),
      },
      storage: { rules: join(root, "firebase/storage.rules") },
      emulators: {
        ...Object.fromEntries(
          Object.entries(ports)
            .filter(([key]) => !["app", "websocket", "inspect"].includes(key))
            .map(([key, port]) => [key, { host: "127.0.0.1", port }])
        ),
        firestore: { host: "127.0.0.1", port: ports.firestore, websocketPort: ports.websocket },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    };
    const configPath = join(runDir, "firebase.json");
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(
      join(runDir, "tsconfig.json"),
      JSON.stringify(
        {
          extends: "../../tsconfig.json",
          compilerOptions: { paths: { "@/*": ["../../*"] }, incremental: false },
          include: [
            "../../next-env.d.ts",
            "../../app/**/*.ts",
            "../../app/**/*.tsx",
            "../../components/**/*.tsx",
            "../../lib/**/*.ts",
            "../../db/**/*.ts",
            "next/types/**/*.ts",
            "next/dev/types/**/*.ts",
          ],
          exclude: ["../../node_modules", "../../android"],
        },
        null,
        2
      )
    );
    const firebase = firebaseInvocation();
    signal?.throwIfAborted();
    console.log("[qa] Starting isolated Auth, Firestore, Storage and Functions emulators...");
    const emulator = start(
      firebase.executable,
      [
        ...firebase.args,
        "emulators:start",
        "--project",
        "demo-ceoubb-qa",
        "--config",
        configPath,
        "--only",
        "auth,firestore,storage,functions",
        "--non-interactive",
      ],
      environment,
      runDir,
      join(output, "emulators.log")
    );
    children.push(emulator);
    for (const service of ["auth", "firestore", "storage", "functions"])
      await ready(
        `http://127.0.0.1:${ports[service]}${service === "storage" ? "/v0/b/demo-ceoubb-qa.firebasestorage.app/o?maxResults=1" : "/"}`,
        children,
        180_000,
        signal
      );
    console.log("[qa] Seeding synthetic identities, sections and learning data...");
    signal?.throwIfAborted();
    const seed = start(
      process.execPath,
      ["--experimental-strip-types", join(root, "scripts/qa/seed.ts")],
      environment,
      root,
      join(output, "seed.log")
    );
    children.push(seed);
    if ((await exited(seed)) !== 0) throw new Error("QA seed failed; inspect seed.log.");
    signal?.throwIfAborted();
    console.log("[qa] Starting the real web application...");
    restoreNextEnv = await preserveNextEnv(root, runDir);
    signal?.throwIfAborted();
    const next = start(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(ports.app),
      ],
      environment,
      root,
      join(output, "application.log")
    );
    children.push(next);
    await ready(environment.QA_BASE_URL, [emulator, next], 300_000, signal);
    return {
      environment,
      runDir,
      ports,
      cleanup,
      startTest(args, testEnvironment) {
        signal?.throwIfAborted();
        const child = start(
          process.execPath,
          [
            require.resolve("@playwright/test/cli"),
            "test",
            "--config",
            "playwright.qa.config.ts",
            ...args,
          ],
          { ...environment, ...testEnvironment },
          root
        );
        children.push(child);
        return child;
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
