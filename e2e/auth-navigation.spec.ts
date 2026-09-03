import { test, expect } from "@playwright/test";

test.describe("Auth & Navigation Critical Paths", () => {
  test("loads landing page and renders primary elements without console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/CEOUBB|Centro de Estudio UBB/i);
    await expect(page.locator("body")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("loads teacher workspace preview when enabled", async ({ page }) => {
    await page.goto("/preview/docente");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=404")).not.toBeVisible();
  });

  test("navigates to accessibility statement page", async ({ page }) => {
    await page.goto("/accesibilidad");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).toContainText("Web Content Accessibility Guidelines");
  });
});
