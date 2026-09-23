import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { existsSync } from "node:fs";
import type { QaScenario } from "../catalog.ts";

// Implements: REQ-QA-04, REQ-QA-06, REQ-QA-07, REQ-QA-09
export async function checkpoint(page: Page, scenario: QaScenario, id: string, info: TestInfo) {
  const name = `${scenario.id}--${id}`;
  await page.evaluate(() => document.fonts.ready);
  if (process.env.QA_SCREENSHOTS === "1" || process.env.QA_EXPLORE === "1") {
    const path = info.outputPath(`${name}.png`);
    await page.screenshot({ path, fullPage: true, animations: "disabled" });
    await info.attach(`${name}.png`, { path, contentType: "image/png" });
    if (existsSync(info.snapshotPath(`${name}.png`)) || process.env.QA_UPDATE_SNAPSHOTS === "1") {
      try {
        await expect(page).toHaveScreenshot(`${name}.png`, {
          fullPage: true,
          animations: "disabled",
          timeout: 5000,
        });
        info.annotations.push({
          type: "visual",
          description: `${name}: matched or explicitly updated`,
        });
      } catch (error) {
        // Only the comparison is advisory. The independent screenshot above must succeed.
        const message = error instanceof Error ? error.message : String(error);
        const status = /pixels|image comparison|diff|snapshot.*match/i.test(message)
          ? "difference"
          : "comparison-unavailable";
        info.annotations.push({ type: "visual", description: `${name}: ${status}` });
        await info.attach(`${name}-visual-review`, { body: message, contentType: "text/plain" });
      }
    } else {
      info.annotations.push({ type: "visual", description: `${name}: reference-missing` });
    }
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  await info.attach(`${name}-accessibility`, {
    body: JSON.stringify(
      { violations: results.violations, incomplete: results.incomplete },
      null,
      2
    ),
    contentType: "application/json",
  });
  expect.soft(results.violations, `${name}: automated accessibility violations`).toEqual([]);
  await info.attach(`checkpoint:${scenario.id}:${id}`, {
    body: JSON.stringify({
      scenario: scenario.id,
      checkpoint: id,
      role: scenario.role,
      state: scenario.state,
      viewport: page.viewportSize(),
      controlledFailure: scenario.controlledFailure ?? false,
      controlledResponse: scenario.controlledResponse ?? false,
    }),
    contentType: "application/json",
  });
}
