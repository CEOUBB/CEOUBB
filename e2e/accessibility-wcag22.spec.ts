import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("WCAG 2.2 AA DOM Audits", () => {
  test("portal landing satisfies WCAG 2.2 AA accessibility rules", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("accessibility statement page satisfies WCAG rules", async ({ page }) => {
    await page.goto("/accesibilidad");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
