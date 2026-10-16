import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { QA_AREAS, QA_ROLES, QA_SCENARIOS, QA_STATES } from "./catalog.ts";

test("QA catalog IDs, state evidence and source mappings are valid", () => {
  assert.equal(new Set(QA_SCENARIOS.map((scenario) => scenario.id)).size, QA_SCENARIOS.length);
  for (const scenario of QA_SCENARIOS) {
    assert.match(scenario.id, /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/);
    assert.ok(QA_AREAS.includes(scenario.area));
    assert.ok(QA_ROLES.includes(scenario.role));
    assert.ok(QA_STATES.includes(scenario.state));
    assert.ok(scenario.checkpoints.length > 0, `${scenario.id}: missing evidence checkpoints`);
    assert.equal(new Set(scenario.checkpoints).size, scenario.checkpoints.length);
    assert.ok(scenario.sources.length > 0, `${scenario.id}: missing source mapping`);
    for (const source of scenario.sources)
      assert.ok(existsSync(source), `${scenario.id}: source does not exist: ${source}`);
    if (scenario.controlledFailure) assert.ok(["error", "loading"].includes(scenario.state));
  }
});

test("catalog covers shipped account roles, section roles and web feature families", () => {
  for (const role of QA_ROLES)
    assert.ok(
      QA_SCENARIOS.some((scenario) => scenario.role === role),
      `Missing role ${role}`
    );
  for (const area of [
    "auth",
    "shell",
    "courses",
    "communications",
    "calendar",
    "resources",
    "classroom",
    "publications",
    "grades",
    "submissions",
    "quizzes",
    "people",
    "imports",
    "interop",
    "teacher",
    "admin",
    "settings",
    "public",
  ])
    assert.ok(QA_AREAS.includes(area), `Missing area ${area}`);
  for (const area of [
    "auth",
    "courses",
    "communications",
    "calendar",
    "classroom",
    "grades",
    "submissions",
    "quizzes",
    "people",
    "teacher",
    "admin",
    "settings",
  ])
    assert.ok(
      QA_SCENARIOS.some((scenario) => scenario.area === area && scenario.critical),
      `Missing cross-browser critical journey ${area}`
    );
});

test("catalog remains independent from the browser runtime and reports missing evidence", () => {
  assert.doesNotMatch(
    readFileSync("qa/catalog.ts", "utf8"),
    /from ["'](?:@playwright|firebase|\.\/browser)/
  );
  const runner = readFileSync("qa/browser/scenarios.spec.ts", "utf8");
  assert.match(runner, /Missing executable implementation/);
  assert.match(runner, /checkpoint-coverage/);
  assert.doesNotMatch(runner, /test\.skip|test\.fixme/);
});
