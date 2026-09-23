import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { QA_SCENARIOS, QA_AREAS } from "../qa/catalog.ts";
import { parseArgs, selectScenarios, changedFiles } from "./qa/options.mjs";
import { startRuntime, exited } from "./qa/runtime.mjs";
import { writeReport } from "./qa/report.mjs";

const help = `CEOUBB agent QA

pnpm qa                                  Verify affected areas and critical journeys
pnpm qa --list [--json]                   Discover scenario IDs and states
pnpm qa --area cuestionarios             Verify a selected area
pnpm qa --scenario auth.session          Verify one reproducible state
pnpm qa --all --screenshots               Run the complete catalog and capture states
pnpm qa --explore --scenario grades.teacher  Keep the prepared browser open
pnpm qa --browser chromium-1440           Select one browser/viewport project
pnpm qa --base origin/main               Choose the change-comparison base
pnpm qa --reference PATH --screenshots    Compare reviewed, platform-matched references
pnpm qa --screenshots --update-snapshots  Explicitly record reviewed references
pnpm qa --staging                        Verify configured staging test integrations

Areas: ${QA_AREAS.join(", ")}
Projects: chromium-320, chromium-390, chromium-768, chromium-1440, firefox-critical, webkit-critical, api
Local prerequisites: pnpm install; pnpm --dir firebase/functions install --frozen-lockfile;
Java 21+; pnpm exec playwright install chromium firefox webkit.
`;

// Implements: REQ-QA-01, REQ-QA-02, REQ-QA-05, REQ-QA-09, REQ-QA-10
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(help);
    return;
  }
  const root = fileURLToPath(new URL("../", import.meta.url));
  process.chdir(root);
  const selection = selectScenarios(
    QA_SCENARIOS,
    options,
    options.all || options.area || options.scenario || options.list
      ? []
      : changedFiles(options.base)
  );
  if (options.list) {
    console.log(
      options.json
        ? JSON.stringify(selection, null, 2)
        : selection.scenarios
            .map(
              (entry) =>
                `${entry.id.padEnd(38)} ${entry.role.padEnd(12)} ${entry.state.padEnd(10)} ${entry.critical ? "critical" : ""}`
            )
            .join("\n")
    );
    return;
  }
  if (
    options.browser &&
    !/^(chromium-(320|390|768|1440)|firefox-critical|webkit-critical|api)$/.test(options.browser)
  )
    throw new Error("Unknown browser project. Use pnpm qa --help.");
  if (options.browser?.endsWith("-critical")) {
    selection.scenarios = selection.scenarios.filter((scenario) => scenario.critical);
    selection.ids = selection.scenarios.map((scenario) => scenario.id);
    if (!selection.ids.length)
      throw new Error(
        "This project only runs critical journeys. Use a Chromium project for this scenario."
      );
  }
  if (options.explore && !options.scenario) {
    selection.scenarios = [selection.scenarios[0]];
    selection.ids = selection.scenarios.map((entry) => entry.id);
    selection.reason = "interactive-first-selected-scenario";
  }
  const runId = `${new Date().toISOString().replace(/[^0-9TZ]/g, "")}-${randomUUID().slice(0, 8)}`;
  const output = resolve(root, "qa-results", runId);
  await mkdir(output, { recursive: true });
  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    environment: options.staging ? "staging" : "local-emulators",
    selection: selection.reason,
    changedFiles: selection.changed,
    scenarios: selection.scenarios,
    browser: options.browser ?? (options.explore ? "chromium-1440" : "complete-matrix"),
    screenshots: !!(options.screenshots || options.explore),
    mode: options.explore ? "explore" : "verify",
    reference: resolve(options.reference ?? ".qa/references"),
  };
  await writeFile(join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(
    `[qa] ${selection.scenarios.length} scenarios selected (${selection.reason}). Evidence: ${output}`
  );
  if (options.staging) {
    const { runStaging } = await import("./qa/staging.mjs");
    await runStaging(output, manifest);
    return;
  }
  let runtime;
  let failure;
  let exitCode = 1;
  const controller = new AbortController();
  const interrupted = () => {
    controller.abort(new Error("QA interrupted by the caller."));
    void runtime?.cleanup();
  };
  process.once("SIGINT", interrupted);
  process.once("SIGTERM", interrupted);
  try {
    runtime = await startRuntime(root, runId, output, controller.signal);
    const environment = {
      QA_OUTPUT_DIR: output,
      QA_SCENARIOS: selection.ids.join(","),
      QA_AREAS: [...new Set(selection.scenarios.map((scenario) => scenario.area))].join(","),
      QA_SCREENSHOTS: options.screenshots ? "1" : "0",
      QA_EXPLORE: options.explore ? "1" : "0",
      QA_CDP_PORT: options.explore ? String(runtime.ports.inspect) : "",
      QA_REFERENCE_DIR: resolve(options.reference ?? ".qa/references"),
      QA_UPDATE_SNAPSHOTS: options["update-snapshots"] ? "1" : "0",
    };
    const args = [];
    if (options.browser || options.explore)
      args.push("--project", options.browser ?? "chromium-1440");
    console.log(`[qa] Application: ${runtime.environment.QA_BASE_URL}`);
    if (options.explore) {
      const endpoint = `http://127.0.0.1:${runtime.ports.inspect}`;
      await writeFile(
        join(output, "explore.json"),
        JSON.stringify(
          {
            scenario: selection.ids[0],
            application: runtime.environment.QA_BASE_URL,
            cdp: endpoint,
          },
          null,
          2
        )
      );
      console.log(
        `[qa] Agent browser attachment: ${endpoint} (available when the browser opens). Ctrl+C stops this run and its services.`
      );
    }
    exitCode = await exited(runtime.startTest(args, environment));
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error));
  } finally {
    try {
      await runtime?.cleanup();
    } catch (error) {
      failure ??= error instanceof Error ? error : new Error(String(error));
    }
    process.removeListener("SIGINT", interrupted);
    process.removeListener("SIGTERM", interrupted);
    const summary = await writeReport(output, manifest, failure, exitCode);
    console.log(`[qa] ${summary.status}. Report: ${join(output, "index.html")}`);
    if (failure) console.error(failure.message);
    process.exitCode = summary.status === "passed" ? 0 : 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
