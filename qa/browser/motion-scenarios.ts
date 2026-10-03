import { expect, type Page } from "@playwright/test";
import { classroomTab, course, navigate, settings } from "./helpers.ts";
import type { Capture } from "./portal-scenarios.ts";

async function setMotionReduction(page: Page, enabled: boolean) {
  await settings(page);
  const toggle = page.getByRole("switch", { name: "Reducir el movimiento del portal" });
  await expect(toggle).toBeEnabled();

  if ((await toggle.isChecked()) !== enabled) {
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/profile/preferences") &&
          response.request().method() === "PUT"
      ),
      toggle.press("Space"),
    ]);
    expect(response.status()).toBe(200);
  }

  await expect(toggle).toBeChecked({ checked: enabled });

  if (enabled) {
    await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
  } else {
    await expect(page.locator("html")).not.toHaveAttribute("data-reduced-motion");
  }
}

export async function shellMotionScenario(page: Page, capture: Capture) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: "Buscar en Centro de Estudio UBB" });
  await expect(search).toBeFocused();
  const panel = page.locator("[cmdk-root]").locator("..");
  expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
  await capture("keyboard");
  await page.keyboard.press("Escape");
  await expect(search).toHaveCount(0);
  await navigate(page, "Calendario");
  await expect(page.getByRole("heading", { name: "Calendario", exact: true })).toBeVisible();
  const wrapper = page.locator(".app-main > div");
  expect(await wrapper.evaluate((element) => element.getAnimations().length)).toBe(0);
  expect(await wrapper.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  expect(
    await page
      .locator(".app-shell")
      .evaluate((element) => getComputedStyle(element).transitionProperty)
  ).not.toContain("grid-template-columns");
  await navigate(page, "Área personal");
  await course(page);
  const tabs = page.locator(".course-tabs [role=tab]");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  const tabPanel = page.getByRole("tabpanel");
  await expect(tabPanel).toHaveCount(1);
  expect(await tabPanel.locator("..").evaluate((element) => element.getAnimations().length)).toBe(
    0
  );
  await capture("navigation");
  await setMotionReduction(page, true);
  await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.id = "qa-motion-probe";
    probe.setAttribute("aria-hidden", "true");
    probe.className = "animate-spin";
    probe.textContent = "QA";
    probe.style.transition = "transform 150ms";
    document.body.append(probe);
  });
  const probe = page.locator("#qa-motion-probe");
  expect(await probe.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await probe.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    "0s"
  );
  await capture("reduced");
  await page.evaluate(() => document.querySelector("#qa-motion-probe")?.remove());
  await setMotionReduction(page, false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.id = "qa-motion-probe";
    probe.setAttribute("aria-hidden", "true");
    probe.className = "animate-spin";
    document.body.append(probe);
  });
  expect(
    await page.locator("#qa-motion-probe").evaluate((element) =>
      element.getAnimations().every((animation) => {
        const duration = animation.effect?.getTiming().duration;
        return typeof duration === "number" && duration <= 0.01;
      })
    )
  ).toBe(true);
  await page.evaluate(() => document.querySelector("#qa-motion-probe")?.remove());
  await capture("restored");
}

export async function importMotionScenario(page: Page, capture: Capture) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await course(page);
  await page.locator(".classroom-imports > summary").click();

  for (const system of ["Moodle", "ADECCA"]) {
    const trigger = page.getByRole("button", { name: `Importar ${system}`, exact: true });
    const dialog = page.getByRole("dialog", { name: `Importar desde ${system} UBB` });

    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
      await trigger.tap();
    } else {
      await trigger.click();
    }
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-motion", "pointer");
    expect(await dialog.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe(
      "opacity, transform"
    );
    expect(await dialog.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
      "0.15s, 0.15s"
    );

    if (system === "Moodle") await capture("pointer");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await expect(dialog).toHaveAttribute("data-motion", "instant");
    expect(await dialog.evaluate((element) => element.getAnimations().length)).toBe(0);

    if (system === "Moodle") await capture("keyboard");
    await page.keyboard.press("Escape");
  }

  await page.locator(".classroom-imports > summary").click();
  await classroomTab(page, "Participantes");
  const checkbox = page.getByRole("checkbox", { name: "Seleccionar a Estudiante QA" });
  await checkbox.check();
  const bar = page.getByRole("region", { name: "Acciones de participantes seleccionados" });
  await expect(bar).toBeVisible();
  await bar.getByRole("button").first().focus();
  const controls = bar.locator(":scope > div > div");
  expect(
    await controls.evaluate((element) => element.getAnimations({ subtree: true }).length)
  ).toBe(0);
  await setMotionReduction(page, true);
  await navigate(page, "Área personal");
  await course(page);
  await page.locator(".classroom-imports > summary").click();
  await page.getByRole("button", { name: "Importar Moodle", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Importar desde Moodle UBB" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    "0s"
  );
  expect(await dialog.evaluate((element) => element.getAnimations().length)).toBe(0);
  await capture("reduced");
  await page.keyboard.press("Escape");
  await setMotionReduction(page, false);
}
