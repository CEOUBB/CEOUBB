export type QaEnvironment = Record<string, string | undefined>;

type EmulatorEndpoint = { host: string; port: number; origin: string };
export type QaRuntime = {
  projectId: string;
  auth: EmulatorEndpoint;
  firestore: EmulatorEndpoint;
  storage: EmulatorEndpoint;
  functions: EmulatorEndpoint;
};

function endpoint(value: string | undefined): EmulatorEndpoint {
  const match = /^(localhost|127\.0\.0\.1):([1-9]\d{0,4})$/.exec(value ?? "");
  if (!match || Number(match[2]) > 65535) {
    throw new Error("QA_CONFIG_INVALID: emulator endpoints must be loopback host:port values.");
  }
  return { host: match[1], port: Number(match[2]), origin: `http://${value}` };
}

// Implements: REQ-QA-02, REQ-QA-03
export function resolveQaClientRuntime(
  environment: QaEnvironment,
  hostname?: string
): QaRuntime | null {
  if (environment.NEXT_PUBLIC_CEOUBB_QA !== "1") return null;
  if (hostname !== undefined && hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error("QA_CONFIG_INVALID: the QA browser must use a loopback origin.");
  }
  const projectId = environment.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  if (!/^demo-ceoubb-qa(?:-[a-z0-9]+)*$/.test(projectId)) {
    throw new Error("QA_CONFIG_INVALID: a demo-ceoubb-qa Firebase project is required.");
  }
  if (environment.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET !== `${projectId}.firebasestorage.app`) {
    throw new Error("QA_CONFIG_INVALID: the Storage bucket must belong to the QA project.");
  }
  return {
    projectId,
    auth: endpoint(environment.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST),
    firestore: endpoint(environment.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST),
    storage: endpoint(environment.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST),
    functions: endpoint(environment.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST),
  };
}

export function qaClientRuntime(): QaRuntime | null {
  return resolveQaClientRuntime(
    {
      NEXT_PUBLIC_CEOUBB_QA: process.env.NEXT_PUBLIC_CEOUBB_QA,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST,
      NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST,
      NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST: process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST,
    },
    typeof window === "undefined" ? undefined : window.location.hostname
  );
}

// Server callers validate the complete target before acquiring credentials or mutating data.
export function resolveQaRuntime(environment: QaEnvironment = process.env): QaRuntime | null {
  if (environment.CEOUBB_QA !== "1" && environment.NEXT_PUBLIC_CEOUBB_QA !== "1") return null;
  if (environment.CEOUBB_QA !== "1" || environment.NEXT_PUBLIC_CEOUBB_QA !== "1") {
    throw new Error("QA_CONFIG_INVALID: both server and browser QA opt-ins are required.");
  }
  const runtime = resolveQaClientRuntime(environment)!;
  if (
    environment.FIREBASE_PROJECT_ID !== runtime.projectId ||
    environment.FIREBASE_STORAGE_BUCKET !== `${runtime.projectId}.firebasestorage.app`
  ) {
    throw new Error("QA_CONFIG_INVALID: server and browser Firebase targets must match.");
  }
  for (const key of [
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
    "FUNCTIONS_EMULATOR_HOST",
  ]) {
    endpoint(environment[key]);
    if (environment[key] !== environment[`NEXT_PUBLIC_${key}`]) {
      throw new Error("QA_CONFIG_INVALID: server and browser emulator endpoints must match.");
    }
  }
  const database = environment.TURSO_DATABASE_URL ?? "";
  if (
    !/^file:(?:\/(?!\/)|[a-z]:[\\/])/i.test(database) ||
    /[?#\0]/.test(database) ||
    database.split(/[\\/]/).includes("..")
  ) {
    throw new Error("QA_CONFIG_INVALID: an absolute local file database is required.");
  }
  return runtime;
}

export function qaDistDir(environment: QaEnvironment = process.env): string | undefined {
  const directory = environment.CEOUBB_QA_DIST_DIR;
  if (!directory) return undefined;
  if (!resolveQaRuntime(environment) || !/^\.qa\/[a-zA-Z0-9_-]+\/next$/.test(directory)) {
    throw new Error("QA_CONFIG_INVALID: build output must be .qa/<run>/next in QA mode.");
  }
  return directory;
}
