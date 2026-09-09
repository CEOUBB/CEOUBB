import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`PR 168: búsqueda, pestañas, copiado y calendario a ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const login = await context.request.post("/api/auth/dev-login", { data: { role: "teacher" } });
    expect(login.ok()).toBeTruthy();
    await page.goto("/");
    const enter = page.getByRole("button", { name: "Entrar al aula de Termodinámica I" });
    await expect(enter).toBeVisible();

    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Buscar en Centro de Estudio UBB" });
    const search = dialog.getByRole("combobox", { name: "Buscar ramos y vistas" });
    await expect(dialog).toBeVisible();
    await expect(search).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBeTruthy();
    await search.fill("Termodinámica");
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await page.screenshot({ path: `.impeccable/review/pr168-search-${width}.png` });
    await search.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(search).toBeFocused();
    await page.keyboard.press("Control+k");
    await expect(dialog).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await search.fill("Termodinámica");
    await search.press("Enter");
    if (width <= 767) {
      const mobileEnter = page.getByRole("button", { name: "Entrar al aula", exact: true });
      if (await mobileEnter.isVisible()) await mobileEnter.click();
    }

    const tabs = page.getByRole("tablist", { name: "Secciones del aula" });
    await expect(tabs).toBeVisible();
    await expect(tabs).toHaveCSS("flex-direction", "row");
    expect(
      await page
        .locator(".classroom-meta > button")
        .evaluateAll((buttons) =>
          buttons.every((button) => button.scrollWidth <= button.clientWidth)
        )
    ).toBeTruthy();
    const selected = tabs.getByRole("tab", { selected: true });
    await expect(selected.locator(".course-tab-indicator")).toHaveCSS("height", "3px");
    await expect(selected.locator("span").first()).toHaveCSS("padding-top", "0px");
    await selected.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Notas", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    const copy = page.getByRole("button", { name: /^Copiar código/ });
    await expect(copy).toBeVisible();
    const before = await copy.boundingBox();
    await copy.focus();
    await copy.press("Enter");
    const copied = page.getByRole("button", { name: "Código copiado", exact: true });
    await expect(copied).toBeVisible();
    await expect(copied).toBeFocused();
    const after = await copied.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    await page.screenshot({
      path: `.impeccable/review/pr168-classroom-${width}.png`,
      fullPage: true,
    });
    await expect(page.getByRole("button", { name: /^Copiar código/ })).toBeVisible();

    await page.keyboard.press("Control+k");
    await search.fill("Calendario");
    await search.press("Enter");
    await expect(page.getByRole("region", { name: "Horario semanal" })).toBeVisible();
    const labels = await page.locator(".planner-hours > span").allTextContents();
    const slots = await page
      .locator(".planner-col")
      .first()
      .locator(".planner-slot")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")?.slice(-5)));
    expect(labels).toEqual(slots);
    await page.screenshot({
      path: `.impeccable/review/pr168-calendar-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).toBeTruthy();
  });
}
