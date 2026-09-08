import { test, expect } from "@playwright/test";

for (const width of [1918, 1440, 900, 390]) {
  test(`campus: alineación y estados a ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const login = await context.request.post("/api/auth/dev-login", {
      data: { role: "student" },
    });
    expect(login.ok()).toBeTruthy();
    await page.goto("/");
    const enter = page.getByRole("button", { name: "Entrar al aula de Termodinámica I" });
    await expect(enter).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: "Tu biblioteca de estudio" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver calendario", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir calendario", exact: true })).toBeVisible();
    const card = page.locator(".course-card").filter({ has: enter });
    const resting = await card.boundingBox();
    await enter.hover();
    await expect(enter).toHaveCSS("text-decoration-line", "underline");
    const hovered = await card.boundingBox();
    expect(resting).not.toBeNull();
    expect(hovered).not.toBeNull();
    expect(hovered?.y).toBe(resting?.y);
    const heading = await card.getByRole("heading").boundingBox();
    const action = await enter.boundingBox();
    expect(action?.x).toBe(heading?.x);
    await page.screenshot({
      path: `.impeccable/review/polish-dashboard-${width}.png`,
      fullPage: true,
    });

    if (width > 767 && width < 901) {
      await page.getByRole("button", { name: "Abrir el menú", exact: true }).click();
    }
    const navigation =
      width <= 767
        ? page.locator(".mobile-nav")
        : page.getByRole("navigation", { name: "Navegación principal" });
    await navigation.getByRole("button", { name: "Calendario", exact: true }).click();
    if (width > 767 && width < 901) {
      await page
        .getByRole("banner")
        .getByRole("button", { name: "Cerrar el menú", exact: true })
        .click();
    }
    await expect(page.getByRole("button", { name: "Nuevo bloque", exact: true })).toBeVisible();
    const grid = page.getByRole("region", { name: "Horario semanal" });
    await expect(grid).toBeVisible();
    if (width > 900) {
      const header = await page
        .locator(".planner-headday")
        .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().x));
      const columns = await page
        .locator(".planner-col")
        .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().x));
      expect(header).toHaveLength(7);
      expect(columns).toHaveLength(7);
      header.forEach((x, index) => expect(Math.abs(x - columns[index])).toBeLessThan(1));
    }
    await grid.focus();
    await expect(grid).toBeFocused();
    await page.screenshot({
      path: `.impeccable/review/polish-calendar-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).toBeTruthy();

    await page.goto("/");
    await enter.click();
    if (width <= 767)
      await page.getByRole("button", { name: "Entrar al aula", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Secciones del aula" })
      .getByRole("button", { name: "Cuestionarios", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Cuestionarios de la sección" })).toBeVisible();
    expect(
      await page
        .locator(".quiz-student-hero")
        .evaluate((node) => getComputedStyle(node, "::before").content)
    ).toBe("none");
    await page.screenshot({
      path: `.impeccable/review/polish-quizzes-${width}.png`,
      fullPage: true,
    });
  });
}
