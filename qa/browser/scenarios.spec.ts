import { expect, test } from "@playwright/test";
import { QA_SCENARIOS } from "../catalog.ts";
import { QA_NOW } from "../fixtures.ts";
import { resetQaFixtures } from "../../scripts/qa/seed.ts";
import { login, removeQaMutationDocuments } from "./helpers.ts";
import { portalScenario } from "./portal-scenarios.ts";
import { classroomScenario } from "./classroom-scenarios.ts";
import { stateScenario } from "./state-scenarios.ts";
import { checkpoint } from "./visual.ts";

// Implements: REQ-QA-03, REQ-QA-04, REQ-QA-05, REQ-QA-06
const selected = process.env.QA_SCENARIOS?.split(",").filter(Boolean);
for (const scenario of QA_SCENARIOS.filter((entry) => !selected || selected.includes(entry.id))) {
  test(`${scenario.id} @${scenario.area}${scenario.critical ? " @critical" : ""}`, async ({
    page,
    baseURL,
  }, testInfo) => {
    if (!baseURL) throw new Error("QA_BASE_URL is required.");
    const errors: string[] = [];
    const mutates =
      scenario.id.endsWith("persistence") ||
      [
        "communications.reply",
        "quizzes.attempt",
        "quizzes.submission",
        "interop.scorm",
        "interop.xapi",
      ].includes(scenario.id);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date(QA_NOW));
    const executed = new Set<string>();
    const capture = async (id: string) => {
      expect(scenario.checkpoints, `Undeclared checkpoint ${scenario.id}:${id}`).toContain(id);
      await checkpoint(page, scenario, id, testInfo);
      executed.add(id);
      if (process.env.QA_EXPLORE === "1" && id === scenario.checkpoints.at(-1)) {
        console.log(`[qa] Prepared scenario: ${scenario.id}. Ready for agent inspection.`);
        await page.pause();
      }
    };
    testInfo.annotations.push({ type: "scenario", description: JSON.stringify(scenario) });
    if (scenario.controlledFailure)
      testInfo.annotations.push({
        type: "controlled-failure",
        description:
          "Only the named failure/loading transport is controlled; successful operations use the local backend.",
      });
    if (scenario.externalVerification)
      testInfo.annotations.push({
        type: "external-verification-required",
        description: scenario.externalVerification,
      });
    if (scenario.controlledResponse)
      testInfo.annotations.push({
        type: "controlled-response",
        description:
          "This UI state uses an explicitly simulated external delivery response; actual delivery is not verified.",
      });
    try {
      if (mutates) {
        await removeQaMutationDocuments();
        await resetQaFixtures();
      }
      if (scenario.role !== "public") await login(page, scenario.role, baseURL);
      const handled =
        (await stateScenario(page, scenario, capture)) ||
        (await portalScenario(page, scenario, capture)) ||
        (await classroomScenario(page, scenario, capture));
      expect(handled, `Missing executable implementation for ${scenario.id}`).toBe(true);
      if (scenario.checkpoints.length === 1 && !executed.has(scenario.checkpoints[0]))
        await capture(scenario.checkpoints[0]);
      expect(
        scenario.checkpoints.filter((id) => !executed.has(id)),
        "Missing declared checkpoints"
      ).toEqual([]);
      const intentionalError =
        scenario.id === "public.sentry-client-error"
          ? "Sentry Client-Side Test Error — CEOUBB"
          : scenario.id === "public.global-error"
            ? "QA controlled root render failure"
            : null;
      if (intentionalError) {
        expect(errors.length, "The real diagnostic must emit its declared error").toBeGreaterThan(
          0
        );
        expect(
          errors.every((error) => error === intentionalError),
          "Unexpected error in diagnostic scenario"
        ).toBe(true);
      } else expect(errors, "Unhandled browser errors").toEqual([]);
    } catch (error) {
      if (!page.isClosed()) {
        const path = testInfo.outputPath("failure-before-cleanup.png");
        try {
          await page.screenshot({ path, fullPage: true, animations: "disabled", timeout: 5000 });
          await testInfo.attach("failure-before-cleanup.png", { path, contentType: "image/png" });
        } catch {
          testInfo.annotations.push({
            type: "evidence-unavailable",
            description: "The browser could not capture the failure before fixture cleanup.",
          });
        }
      }
      throw error;
    } finally {
      await testInfo.attach("checkpoint-coverage", {
        body: JSON.stringify({
          scenario: scenario.id,
          expected: scenario.checkpoints,
          executed: [...executed],
          missing: scenario.checkpoints.filter((id) => !executed.has(id)),
        }),
        contentType: "application/json",
      });
      if (errors.length)
        await testInfo.attach("browser-errors", {
          body: JSON.stringify(errors),
          contentType: "application/json",
        });
      if (mutates) {
        await removeQaMutationDocuments();
        await resetQaFixtures();
      }
    }
  });
}
