import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CAPACITY_REQUIREMENTS,
  aggregateCapacityEvidence,
  assertCapacityTargets,
  buildCapacityShardFixture,
  projectAnnualCost,
} from "../scripts/capacity-config.mjs";
import { capacityBarrierSchedule } from "../scripts/capacity-wait-barrier.mjs";

const canonicalTargets = {
  confirmation: "STAGING_ONLY",
  targetUrl: "https://ceoubb-staging.vercel.app",
  firebaseProjectId: "centro-de-estudio-ubb-staging",
  tursoDatabaseUrl: "libsql://ceoubb-staging-ceoubb.aws-us-east-1.turso.io",
  shardIndex: 0,
  shardCount: 6,
  profile: "full",
};

test("capacity target guard only accepts canonical isolated staging", () => {
  assert.deepEqual(assertCapacityTargets(canonicalTargets), {
    targetUrl: "https://ceoubb-staging.vercel.app/",
    firebaseProjectId: "centro-de-estudio-ubb-staging",
    tursoDatabaseUrl: "libsql://ceoubb-staging-ceoubb.aws-us-east-1.turso.io",
    shardIndex: 0,
    shardCount: 6,
    profile: "full",
  });
  for (const override of [
    { targetUrl: "https://ceoubb.com" },
    { targetUrl: "https://ceoubb-staging.vercel.app.attacker.invalid" },
    { firebaseProjectId: "centro-de-estudio-ubb" },
    { tursoDatabaseUrl: "libsql://ceoubb-production.turso.io" },
    { confirmation: "yes" },
    { shardIndex: 6 },
    { shardCount: 5 },
  ]) {
    assert.throws(
      () => assertCapacityTargets({ ...canonicalTargets, ...override }),
      /CAPACITY_(TARGET_REJECTED|CONFIG_INCOMPLETE)/
    );
  }
});

test("six deterministic shards form the institutional population without overlap", () => {
  const shards = Array.from({ length: 6 }, (_, shardIndex) =>
    buildCapacityShardFixture(shardIndex)
  );
  assert.equal(
    shards.reduce((total, shard) => total + shard.students.length, 0),
    12_000
  );
  assert.equal(
    shards.reduce((total, shard) => total + shard.identities.length, 0),
    15_000
  );
  assert.equal(
    shards.reduce((total, shard) => total + shard.sections.length, 0),
    3_000
  );
  assert.equal(
    shards.reduce((total, shard) => total + shard.enrollments.length, 0),
    72_000
  );
  assert.equal(
    shards.reduce((total, shard) => total + shard.activeStudents.length, 0),
    3_000
  );
  const allIds = shards.flatMap((shard) => shard.identities.map((identity) => identity.uid));
  assert.equal(new Set(allIds).size, allIds.length);
  for (const shard of shards) {
    const byStudent = Map.groupBy(shard.enrollments, (enrollment) => enrollment.studentUid);
    const bySection = Map.groupBy(shard.enrollments, (enrollment) => enrollment.sectionId);
    assert.ok([...byStudent.values()].every((items) => items.length === 6));
    assert.ok([...bySection.values()].every((items) => items.length === 24));
  }
});

test("measured provider operations project a conservative annual cost", () => {
  const projection = projectAnnualCost({
    firestoreReads: 100_000_000,
    firestoreWrites: 10_000_000,
    activeStudents: 12_000,
    academicPeakWindowsPerYear: 20,
  });
  assert.equal(projection.annualBudgetUsd, 6_000);
  assert.equal(projection.annualClpPerStudent, 500);
  assert.equal(projection.verdict, "PASS");
  assert.equal(
    projectAnnualCost({
      firestoreReads: 2_000_000_000,
      firestoreWrites: 200_000_000,
      activeStudents: 12_000,
      academicPeakWindowsPerYear: 20,
    }).verdict,
    "FAIL"
  );
});

test("distributed evidence uses totals and worst-shard percentile gates", () => {
  const summaries = Array.from({ length: 6 }, (_, shardIndex) => ({
    shardIndex,
    profile: "full",
    peakVus: 500,
    steadyStateSeconds: 1_860,
    startedAt: `2026-08-31T00:00:${String(shardIndex).padStart(2, "0")}.000Z`,
    httpRequests: 10_000,
    http5xx: 0,
    authorizationErrors: 0,
    unexpectedResponses: 0,
    httpP95Ms: 1_000 + shardIndex,
    httpP99Ms: 2_000 + shardIndex,
    tursoRequests: 1_000,
    tursoP95Ms: 500 + shardIndex,
    firestoreP95Ms: 700 + shardIndex,
  }));
  const evidence = aggregateCapacityEvidence({
    runId: "run-71",
    summaries,
    firestoreReads: 100_000,
    firestoreWrites: 10_000,
  });
  assert.equal(evidence.executedShards, 6);
  assert.equal(evidence.peakVirtualUsers, 3_000);
  assert.equal(evidence.steadyStateSeconds, 1_855);
  assert.equal(evidence.startSkewSeconds, 5);
  assert.equal(evidence.httpP95Ms, 1_005);
  assert.equal(evidence.httpP99Ms, 2_005);
  assert.equal(evidence.tursoRequests, 6_000);
  assert.equal(evidence.verdict, "PASS");
  assert.equal(evidence.unexpectedResponseRate, 0);
  assert.equal(
    aggregateCapacityEvidence({
      runId: "missing-shard",
      summaries: summaries.slice(0, 5),
      firestoreReads: 100,
      firestoreWrites: 10,
    }).verdict,
    "INCOMPLETE"
  );
  assert.equal(
    aggregateCapacityEvidence({
      runId: "slow",
      summaries: summaries.map((summary) => ({ ...summary, httpP95Ms: 2_001 })),
      firestoreReads: 100,
      firestoreWrites: 10,
    }).verdict,
    "FAIL"
  );
  assert.equal(
    aggregateCapacityEvidence({
      runId: "missing-p99",
      summaries: summaries.map((summary) => ({ ...summary, httpP99Ms: null })),
      firestoreReads: 100,
      firestoreWrites: 10,
    }).verdict,
    "INCOMPLETE"
  );
  assert.equal(
    aggregateCapacityEvidence({
      runId: "transient-errors-within-budget",
      summaries: summaries.map((summary, shardIndex) => ({
        ...summary,
        unexpectedResponses: shardIndex === 0 ? 1 : 0,
      })),
      firestoreReads: 100,
      firestoreWrites: 10,
    }).verdict,
    "PASS"
  );
  assert.equal(
    aggregateCapacityEvidence({
      runId: "exhausted-error-budget",
      summaries: summaries.map((summary) => ({
        ...summary,
        unexpectedResponses: 10,
      })),
      firestoreReads: 100,
      firestoreWrites: 10,
    }).verdict,
    "FAIL"
  );
});

test("k6 scenario covers portal, Turso, Firestore grades and quiz drafts", async () => {
  const source = await readFile("load-tests/institutional-capacity.js", "utf8");
  assert.match(source, /discardResponseBodies:\s*true/);
  assert.match(source, /ramping-vus/);
  assert.match(source, /10m/);
  assert.match(source, /31m/);
  assert.match(source, /api\/auth\/firebase/);
  assert.match(source, /api\/courses\/me/);
  assert.match(source, /documents:runQuery/);
  assert.match(source, /courses\/.*grades/);
  assert.match(source, /quizzes/);
  assert.match(source, /drafts/);
  assert.match(source, /x-vercel-protection-bypass/);
  assert.match(source, /http_req_duration.*p\(95\)<2000/);
  assert.match(source, /http_5xx.*rate<0\.001/);
  assert.match(source, /unexpected_response_rate.*rate<0\.001/);
  assert.match(source, /summaryTrendStats:.*p\(99\)/);
});

test("shared run barrier synchronizes shards and rejects late generators", () => {
  const createdAt = "2026-08-31T00:00:00.000Z";
  assert.deepEqual(
    capacityBarrierSchedule({
      createdAt,
      delaySeconds: 1_200,
      maximumLatenessSeconds: 15,
      now: new Date("2026-08-31T00:10:00.000Z").getTime(),
    }),
    {
      startAt: "2026-08-31T00:20:00.000Z",
      remainingMs: 600_000,
      maximumLatenessSeconds: 15,
    }
  );
  assert.throws(
    () =>
      capacityBarrierSchedule({
        createdAt,
        delaySeconds: 1_200,
        maximumLatenessSeconds: 15,
        now: new Date("2026-08-31T00:20:16.000Z").getTime(),
      }),
    /CAPACITY_BARRIER_MISSED/
  );
});

test("manual workflow distributes six shards and always cleans ephemeral access", async () => {
  const workflow = await readFile(".github/workflows/capacity-load-test.yml", "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_staging/);
  assert.match(workflow, /STAGING_ONLY/);
  assert.match(workflow, /shard:\s*\[0, 1, 2, 3, 4, 5\]/);
  assert.match(workflow, /environment:\s*Staging/);
  assert.match(workflow, /google-github-actions\/auth@v3/);
  assert.match(workflow, /grafana\/setup-k6-action@v1/);
  assert.match(workflow, /capacity-wait-barrier\.mjs/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /revoke/);
  assert.match(workflow, /retention-days:\s*30/);
});

test("capacity harness exposes traceability without adding source comments", () => {
  assert.deepEqual(CAPACITY_REQUIREMENTS, [
    "Implements: REQ-OPS-LOAD-01",
    "Implements: REQ-OPS-LOAD-02",
    "Implements: REQ-OPS-LOAD-03",
    "Implements: REQ-OPS-LOAD-04",
    "Implements: REQ-OPS-LOAD-05",
    "Implements: REQ-OPS-LOAD-06",
    "Implements: REQ-STG-07",
  ]);
});
