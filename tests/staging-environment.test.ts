import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createClient } from "@libsql/client";
import { PRODUCTION_FIREBASE_CONFIG, resolveFirebaseConfig } from "../lib/firebase-config.ts";
import {
  STAGING_FIXTURES,
  assertStagingTargets,
  fixtureCounts,
} from "../scripts/staging-environment.mjs";
import { seedTursoWithClient } from "../scripts/seed-staging.mjs";

test("REQ-STG-01: staging rejects every production or incomplete target before writing", () => {
  assert.throws(
    () =>
      assertStagingTargets({
        environment: "production",
        firebaseProjectId: "centro-de-estudio-ubb-staging",
        tursoDatabaseUrl: "libsql://ceoubb-staging.example.turso.io",
      }),
    /STAGING_ENV_REQUIRED/
  );
  assert.throws(
    () =>
      assertStagingTargets({
        environment: "staging",
        firebaseProjectId: "centro-de-estudio-ubb",
        tursoDatabaseUrl: "libsql://ceoubb-staging.example.turso.io",
      }),
    /PRODUCTION_TARGET_REJECTED.*FIREBASE_PROJECT_ID/
  );
  assert.throws(
    () =>
      assertStagingTargets({
        environment: "staging",
        firebaseProjectId: "centro-de-estudio-ubb-staging",
        tursoDatabaseUrl: "libsql://ceoubb-production.example.turso.io",
      }),
    /PRODUCTION_TARGET_REJECTED.*TURSO_DATABASE_URL/
  );
  assert.doesNotThrow(() =>
    assertStagingTargets({
      environment: "staging",
      firebaseProjectId: "centro-de-estudio-ubb-staging",
      tursoDatabaseUrl: "libsql://ceoubb-staging.example.turso.io",
    })
  );
});

test("REQ-STG-02, REQ-STG-06: the ordinary fixture is synthetic, deterministic and bounded", () => {
  const counts = fixtureCounts(STAGING_FIXTURES);
  assert.deepEqual(counts, {
    users: 4,
    sections: 2,
    enrollments: 8,
    firestoreWrites: 24,
  });
  assert.ok(counts.users < 20);
  assert.ok(counts.sections < 20);
  assert.ok(counts.firestoreWrites < 200);
  const serialized = JSON.stringify(STAGING_FIXTURES);
  assert.doesNotMatch(serialized, /gmail\.com|@ubiobio\.cl"|@alumnos\.ubiobio\.cl"/i);
  assert.doesNotMatch(serialized, /12[.,]?000|72[.,]?000|3[.,]?000 sesiones/i);
  for (const user of STAGING_FIXTURES.users) {
    assert.match(user.id, /^firebase:staging-/);
    assert.match(user.email, /@example\.invalid$/);
  }
});

test("REQ-STG-02: Turso migrations and fixtures converge after two seed executions", async () => {
  const client = createClient({ url: "file::memory:" });
  try {
    const first = await seedTursoWithClient(client);
    const second = await seedTursoWithClient(client);
    assert.deepEqual(first, second);
    assert.deepEqual(second, {
      users: 4,
      sections: 2,
      enrollments: 8,
    });
  } finally {
    await client.close();
  }
});

test("REQ-STG-04: Firebase config is complete per build and never mixes staging with fallback", () => {
  assert.deepEqual(resolveFirebaseConfig({}), PRODUCTION_FIREBASE_CONFIG);
  assert.throws(
    () =>
      resolveFirebaseConfig({
        CEOUBB_ENVIRONMENT: "staging",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "centro-de-estudio-ubb-staging",
      }),
    /STAGING_CONFIG_INCOMPLETE/
  );
  const staging = resolveFirebaseConfig({
    CEOUBB_ENVIRONMENT: "staging",
    NEXT_PUBLIC_FIREBASE_API_KEY: "staging-public-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "centro-de-estudio-ubb-staging.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "centro-de-estudio-ubb-staging",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "centro-de-estudio-ubb-staging.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:staging",
  });
  assert.equal(staging.projectId, "centro-de-estudio-ubb-staging");
  assert.notEqual(staging.apiKey, PRODUCTION_FIREBASE_CONFIG.apiKey);
});

test("REQ-STG-03, REQ-STG-05: release workflow gates production on same-run staging", async () => {
  const release = await readFile(".github/workflows/firebase-release.yml", "utf8");
  const webDeploy = await readFile(".github/workflows/deploy.yml", "utf8");
  const aliases = JSON.parse(await readFile("firebase/.firebaserc", "utf8"));

  assert.deepEqual(aliases.projects, {
    staging: "centro-de-estudio-ubb-staging",
    production: "centro-de-estudio-ubb",
  });
  assert.doesNotMatch(release, /--project\s+centro-de-estudio-ubb(?:\s|$)/);
  assert.match(release, /deploy_staging:/);
  assert.match(release, /deploy_production:/);
  assert.match(release, /needs:\s*deploy_staging/);
  assert.match(release, /promote_to_production/);
  assert.match(release, /--project staging/);
  assert.match(release, /--project production/);
  assert.match(release, /southamerica-west1/);
  assert.match(release, /id-token:\s*write/);
  assert.match(release, /google-github-actions\/auth@v3/);
  assert.match(release, /workloadIdentityPools\/github-actions\/providers\/github/);
  assert.match(release, /FIREBASE_ACCESS_TOKEN/);
  const stagingJob = release.slice(
    release.indexOf("  deploy_staging:"),
    release.indexOf("  deploy_production:")
  );
  assert.doesNotMatch(stagingJob, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(webDeploy, /uses:\s*\.\/\.github\/workflows\/firebase-release\.yml/);
  assert.match(webDeploy, /id-token:\s*write/);
  assert.match(webDeploy, /needs:\s*staging/);
  assert.match(webDeploy, /needs\.staging\.result == 'success'/);
});
