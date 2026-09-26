import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs, selectScenarios } from "../scripts/qa/options.mjs";
import { writeReport } from "../scripts/qa/report.mjs";

const scenarios = [
  { id: "login-ready", area: "auth", critical: true, sources: ["app/Portal.tsx"] },
  {
    id: "quiz-ready",
    area: "quizzes",
    critical: false,
    sources: ["app/views/classroom/StudentQuizzes.tsx"],
  },
  { id: "calendar-ready", area: "calendar", critical: false, sources: ["app/views/calendar/"] },
];

test("explicit selection is discoverable and rejects typos and empty matches", () => {
  assert.equal(parseArgs(["--area", "cuestionarios", "--list"]).area, "quizzes");
  assert.equal(parseArgs(["--area", "publicacion"]).area, "publications");
  assert.throws(() => parseArgs(["--explore", "--browser", "api"]), /browser project/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown option/);
  assert.throws(() => parseArgs(["--scenario"]), /value/);
  assert.throws(() => parseArgs(["--all", "--area", "quizzes"]), /together/);
  assert.equal(parseArgs(["--shard", "1/4"]).shard, "1/4");
  assert.throws(() => parseArgs(["--shard", "invalid"]), /format/);
  assert.throws(() => parseArgs(["--shard", "5/4"]), /greater than total/);
  assert.throws(() => selectScenarios(scenarios, { scenario: "typo" }, []), /No scenarios/);
});

test("shard partitioning divides scenarios deterministically", () => {
  assert.deepEqual(selectScenarios(scenarios, { shard: "1/2", list: true }, []).ids, [
    "login-ready",
    "calendar-ready",
  ]);
  assert.deepEqual(selectScenarios(scenarios, { shard: "2/2", list: true }, []).ids, [
    "quiz-ready",
  ]);
  assert.equal(selectScenarios(scenarios, { shard: "4/4", list: true }, []).ids.length, 0);
});

test("affected selection includes critical journeys and falls back for unknown/shared source", () => {
  assert.deepEqual(selectScenarios(scenarios, {}, ["app/views/calendar/CalendarView.tsx"]).ids, [
    "login-ready",
    "calendar-ready",
  ]);
  assert.equal(selectScenarios(scenarios, {}, ["app/new-feature.tsx"]).ids.length, 3);
  assert.equal(selectScenarios(scenarios, {}, ["lib/auth.ts"]).ids.length, 3);
  assert.equal(selectScenarios(scenarios, {}, ["docs/example.md"]).ids.length, 1);
  assert.equal(selectScenarios(scenarios, {}, [".agents/.test-hashes.json"]).ids.length, 1);
  assert.equal(selectScenarios(scenarios, {}, ["tests/grades.test.ts"]).ids.length, 1);
  assert.equal(selectScenarios(scenarios, {}, [".github/workflows/ci.yml"]).ids.length, 1);
  assert.equal(selectScenarios(scenarios, {}, [".jules/bolt.md"]).ids.length, 1);
  assert.equal(selectScenarios(scenarios, {}, null).ids.length, 3);
});

test("an explicit catalog request lists everything without requiring runtime prerequisites", () => {
  assert.equal(selectScenarios(scenarios, { list: true }, []).ids.length, 3);
  assert.deepEqual(selectScenarios(scenarios, { area: "quizzes" }, []).ids, ["quiz-ready"]);
  assert.equal(parseArgs(["--explore", "--scenario", "quiz-ready"]).explore, true);
});

test("reports require evidence per viewport and never turn empty, failed or skipped runs green", async () => {
  const output = await mkdtemp(join(tmpdir(), "ceoubb-qa-report-"));
  const manifest = {
    runId: "report-check",
    browser: "complete-matrix",
    scenarios: [{ id: "auth.session", critical: true, checkpoints: ["ready"] }],
  };
  const result = (projectName, status = "passed") => ({
    projectName,
    annotations: [{ type: "visual", description: "difference" }],
    results: [
      {
        status,
        attachments: [
          {
            name: "checkpoint:auth.session:ready",
            contentType: "application/json",
            body: Buffer.from("{}").toString("base64"),
          },
        ],
      },
    ],
  });
  const writeResults = (tests) =>
    writeFile(
      join(output, "playwright.json"),
      JSON.stringify({ suites: [{ specs: [{ title: "auth.session @critical", tests }] }] })
    );
  try {
    assert.equal((await writeReport(output, manifest, undefined, 0)).status, "environment-error");
    await writeResults([result("chromium-1440")]);
    const partial = await writeReport(output, manifest, undefined, 0);
    assert.equal(partial.status, "incomplete");
    assert.equal(partial.totals.uncoveredScenarios, 5);
    assert.deepEqual(partial.coverage.find((entry) => entry.project === "chromium-320").missing, [
      "ready",
    ]);
    const single = { ...manifest, browser: "chromium-1440" };
    assert.equal(
      (await writeReport(output, single, undefined, 0)).status,
      "passed",
      "visual differences alone are advisory"
    );
    await writeResults([result("chromium-1440", "failed")]);
    assert.equal((await writeReport(output, single, undefined, 0)).status, "failed");
    await writeResults([result("api", "skipped")]);
    assert.equal(
      (await writeReport(output, { ...manifest, browser: "api" }, undefined, 0)).status,
      "incomplete"
    );
    assert.match(await readFile(join(output, "index.html"), "utf8"), /incomplete/);
  } finally {
    // mkdtemp returns the exact absolute directory created exclusively by this test.
    await rm(output, { recursive: true, force: true });
  }
});
