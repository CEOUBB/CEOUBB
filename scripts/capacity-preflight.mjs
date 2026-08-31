import { assertCapacityTargets, CAPACITY_REQUIREMENTS } from "./capacity-config.mjs";

const requiredSecrets = ["TURSO_AUTH_TOKEN", "NEXT_PUBLIC_FIREBASE_API_KEY"];

export function capacityPreflight(environment) {
  const targets = assertCapacityTargets({
    confirmation: environment.CONFIRM_STAGING,
    targetUrl: environment.TARGET_URL,
    firebaseProjectId: environment.FIREBASE_PROJECT_ID,
    tursoDatabaseUrl: environment.TURSO_DATABASE_URL,
    shardIndex: Number(environment.CAPACITY_SHARD_INDEX),
    shardCount: Number(environment.CAPACITY_SHARD_COUNT),
    profile: environment.CAPACITY_PROFILE,
  });
  const missing = requiredSecrets.filter((name) => !environment[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`CAPACITY_CONFIG_INCOMPLETE: faltan ${missing.join(", ")}.`);
  }
  return { requirements: CAPACITY_REQUIREMENTS, ...targets };
}

try {
  const result = capacityPreflight(process.env);
  process.stdout.write(
    `${JSON.stringify({
      requirements: result.requirements,
      targetUrl: result.targetUrl,
      firebaseProjectId: result.firebaseProjectId,
      shardIndex: result.shardIndex,
      shardCount: result.shardCount,
      profile: result.profile,
    })}\n`
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "CAPACITY_CONFIG_INCOMPLETE"}\n`
  );
  process.exitCode = 1;
}
