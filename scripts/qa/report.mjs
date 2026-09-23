import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

// Implements: REQ-QA-04, REQ-QA-06, REQ-QA-09
export async function writeReport(output, manifest, error, exitCode) {
  const report = await readFile(join(output, "playwright.json"), "utf8")
    .then(JSON.parse)
    .catch(() => null);
  const tests = [];
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        const result = test.results?.at(-1);
        const scenario = manifest.scenarios.find(
          (entry) => spec.title === entry.id || spec.title.startsWith(`${entry.id} `)
        );
        tests.push({
          scenario: scenario?.id ?? spec.title,
          title: spec.title,
          project: test.projectName,
          status: result?.status ?? "not-run",
          errors: (result?.errors ?? []).map((entry) => entry.message ?? entry.value),
          annotations: test.annotations ?? [],
          attachments: (result?.attachments ?? []).map(({ name, contentType, path, body }) => ({
            name,
            contentType,
            ...(path ? { path: relative(output, path).replaceAll("\\", "/") } : {}),
            ...(contentType === "application/json" && body
              ? { data: Buffer.from(body, "base64").toString("utf8") }
              : {}),
          })),
          reproduce: scenario
            ? `pnpm qa --scenario ${scenario.id} --browser ${test.projectName} --screenshots`
            : `pnpm qa --all --browser api`,
        });
      }
    for (const child of suite.suites ?? []) visit(child);
  }
  if (report) for (const suite of report.suites ?? []) visit(suite);
  const coverage = manifest.scenarios.flatMap((scenario) => {
    const projects =
      manifest.browser === "api"
        ? []
        : manifest.browser === "complete-matrix"
          ? [
              "chromium-320",
              "chromium-390",
              "chromium-768",
              "chromium-1440",
              ...(scenario.critical ? ["firefox-critical", "webkit-critical"] : []),
            ]
          : [manifest.browser];
    return projects.map((project) => {
      const runs = tests.filter(
        (test) => test.scenario === scenario.id && test.project === project
      );
      const observed = new Set(
        runs
          .flatMap((test) => test.attachments.map((attachment) => attachment.name))
          .filter((name) => name.startsWith(`checkpoint:${scenario.id}:`))
          .map((name) => name.slice(`checkpoint:${scenario.id}:`.length))
      );
      return {
        id: scenario.id,
        project,
        required: scenario.checkpoints,
        observed: [...observed],
        missing: scenario.checkpoints.filter((id) => !observed.has(id)),
        statuses: [...new Set(runs.map((run) => run.status))],
      };
    });
  });
  const missing = coverage.filter((entry) => entry.missing.length);
  if (!error && !tests.length)
    error = new Error(
      (report?.errors ?? []).map((entry) => entry.message).join("\n") ||
        "No test results were produced; this run did not verify application behavior."
    );
  const failed = tests.filter((test) =>
    ["failed", "timedOut", "interrupted"].includes(test.status)
  ).length;
  const summary = {
    ...manifest,
    finishedAt: new Date().toISOString(),
    status: error
      ? "environment-error"
      : exitCode || failed
        ? "failed"
        : missing.length || tests.some((test) => test.status !== "passed")
          ? "incomplete"
          : "passed",
    error: error?.message,
    totals: {
      tests: tests.length,
      passed: tests.filter((test) => test.status === "passed").length,
      failed,
      uncoveredScenarios: missing.length,
    },
    coverage,
    tests,
  };
  await writeFile(join(output, "summary.json"), JSON.stringify(summary, null, 2));
  const rows = tests
    .map(
      (test) =>
        `<tr><td>${escape(test.scenario)}<br><small>${escape(test.project)}</small></td><td>${escape(test.status)}${test.annotations
          .filter((item) =>
            [
              "visual",
              "external-verification-required",
              "controlled-failure",
              "controlled-response",
            ].includes(item.type)
          )
          .map((item) => `<br><small>${escape(item.description)}</small>`)
          .join(
            ""
          )}</td><td><code>${escape(test.reproduce)}</code>${test.errors.map((message) => `<details><summary>Failure</summary><pre>${escape(message)}</pre></details>`).join("")}</td><td>${test.attachments
          .filter((item) => item.path)
          .map((item) => `<a href="${escape(item.path)}">${escape(item.name)}</a>`)
          .join("<br>")}</td></tr>`
    )
    .join("");
  await writeFile(
    join(output, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CEOUBB QA ${escape(manifest.runId)}</title><style>body{font:16px system-ui;max-width:1300px;margin:40px auto;padding:0 20px;color:#26332d;background:#fafbf8}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd2c9;padding:12px;text-align:left;vertical-align:top}code,pre{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#255a46}small{color:#536157}h1{font-size:26px}</style><h1>CEOUBB QA: ${escape(summary.status)}</h1><p>${escape(manifest.runId)} · ${escape(manifest.selection)} · ${escape(manifest.environment)}</p><p><a href="summary.json">Machine-readable summary</a> · <a href="manifest.json">Run manifest</a>${report ? ' · <a href="html/index.html">Playwright report</a>' : ""}</p>${error ? `<pre>${escape(error.message)}</pre>` : ""}<p>${summary.totals.passed} passed; ${summary.totals.failed} failed; ${missing.length} scenarios missing checkpoint evidence.</p><p>Visual differences are advisory. Simulated provider contracts do not prove external delivery. Automated accessibility checks do not replace manual review.</p>${missing.length ? `<details open><summary>Missing coverage</summary><ul>${missing.map((item) => `<li>${escape(item.id)} (${escape(item.project)}): ${escape(item.missing.join(", "))}</li>`).join("")}</ul></details>` : ""}<table><thead><tr><th>Scenario</th><th>Result</th><th>Reproduce</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></html>`
  );
  return summary;
}
