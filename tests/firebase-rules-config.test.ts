import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("REQ-EMU-01, REQ-EMU-07: la validación ejecuta ambas reglas en emuladores", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const firebaseConfig = JSON.parse(await readFile("firebase/firebase.json", "utf8"));
  const command = packageJson.scripts["check:rules"];

  assert.equal(packageJson.devDependencies["@firebase/rules-unit-testing"], "5.0.2");
  assert.match(command, /pnpm dlx firebase-tools@15\.28\.2/);
  assert.match(command, /emulators:exec/);
  assert.match(command, /--project demo-ceoubb-rules/);
  assert.match(command, /--only firestore,storage/);
  assert.match(command, /tests\/firebase-rules\.test\.ts/);
  assert.doesNotMatch(command, /rules_version/);
  assert.equal(firebaseConfig.firestore.rules, "firestore.rules");
  assert.equal(firebaseConfig.storage.rules, "storage.rules");
  assert.deepEqual(firebaseConfig.emulators.firestore, {
    host: "127.0.0.1",
    port: 8080,
  });
  assert.deepEqual(firebaseConfig.emulators.storage, {
    host: "127.0.0.1",
    port: 9199,
  });
  assert.equal(firebaseConfig.emulators.ui.enabled, false);
  assert.equal(firebaseConfig.emulators.singleProjectMode, true);
});

test("REQ-EMU-06: CI contiene un gate independiente con Java 21", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");
  const deployWorkflow = await readFile(".github/workflows/deploy.yml", "utf8");
  const start = workflow.indexOf("  firebase_rules:");
  const end = workflow.indexOf("  verify:", start);
  const job = workflow.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.match(job, /name: Firebase Rules Emulator/);
  assert.match(job, /timeout-minutes: 10/);
  assert.match(job, /actions\/setup-java@v4/);
  assert.match(job, /distribution: "temurin"/);
  assert.match(job, /java-version: "21"/);
  assert.match(job, /~\/\.cache\/firebase\/emulators/);
  assert.match(job, /pnpm run check:rules/);
  assert.match(deployWorkflow, /actions\/setup-java@v4/);
  assert.match(deployWorkflow, /java-version: "21"/);
  assert.match(deployWorkflow, /pnpm run check:rules/);
});
