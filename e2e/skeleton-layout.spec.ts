import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Playwright normally emits component-test descriptors; this fixture renders React HTML.
Object.assign(require("playwright/jsx-runtime"), require("react/jsx-runtime"));
// Phosphor 2.x ships its CommonJS entry with an ESM extension; use its ESM entry.
const iconsPath = require.resolve("../node_modules/@phosphor-icons/react/dist/index.es.js");
require(iconsPath);
require.cache[require.resolve("@phosphor-icons/react")] = require.cache[iconsPath];
const { LoadingScreen }: typeof import("../app/LoadingScreen") = require("../app/LoadingScreen");
const skeletons: typeof import("../app/views/ViewSkeletons") = require("../app/views/ViewSkeletons");
const {
  NotificationSkeleton,
}: typeof import("../app/notification-panel") = require("../app/notification-panel");

const { CourseCard }: typeof import("../app/views/CourseCard") = require("../app/views/CourseCard");
const { COURSES }: typeof import("../lib/courses") = require("../lib/courses");

// Implements: REQ-SKELETON-01
// Render the production components against the production CSS, without adding a preview route.
for (const width of [1440, 390]) {
  test(`skeletons: geometría y movimiento reducido a ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const styles = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join(""));
    const rootClass = await page.locator("html").getAttribute("class");
    const base = page.url();

    const variants = {
      LoadingScreen,
      ...skeletons,
      NotificationSkeleton,
      TeacherQuizSkeleton: () =>
        createElement<{ teacher?: boolean }>(skeletons.QuizListSkeleton, { teacher: true }),
    };
    for (const [name, Component] of Object.entries(variants)) {
      const markup = renderToStaticMarkup(createElement(Component));
      const fixture = new URL("/__skeleton_fixture__", base).href;
      await page.route(fixture, (route) =>
        route.fulfill({
          contentType: "text/html; charset=utf-8",
          body: `<html class="${rootClass ?? ""}"><head><meta charset="utf-8">${styles}</head><body>${name === "LoadingScreen" ? markup : `<div class="app-shell"><main class="portal-main" style="grid-column: 1 / -1">${markup}</main></div>`}</body></html>`,
        })
      );
      await page.goto(fixture);
      await page.unroute(fixture);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
      expect(await page.locator("body").innerText(), `${name}: codificación`).not.toMatch(
        /\u00c3|\u00c2|\ufffd/
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        name
      ).toBeTruthy();
      await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
      const bones = await page.locator(".sk:visible").evaluateAll((nodes) =>
        nodes.map((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
          animation: getComputedStyle(node).animationName,
          shimmer: getComputedStyle(node, "::after").display,
        }))
      );
      for (const bone of bones) {
        expect(bone.width, `${name}: ancho`).toBeGreaterThan(0);
        expect(bone.height, `${name}: alto`).toBeGreaterThan(0);
        expect(bone.animation, name).toBe("none");
        expect(bone.shimmer, name).toBe("none");
      }
      if (name === "LoadingScreen") {
        await expect(page.locator(".course-card")).toHaveCount(2);
        const courses = await page.locator(".dashboard-courses").boundingBox();
        const agenda = await page.locator(".dashboard-agenda").boundingBox();
        expect(courses).not.toBeNull();
        expect(agenda).not.toBeNull();
        if (width > 700) expect(agenda!.x).toBeGreaterThan(courses!.x + courses!.width);
        else expect(agenda!.y).toBeGreaterThan(courses!.y + courses!.height);
      }
      if (name === "ClassroomSkeleton") {
        expect(await page.locator(".course-tabs button").allTextContents()).toEqual([
          "Portada",
          "Notas",
          "Cuestionarios",
          "Recursos externos",
          "Participantes",
        ]);
        const tab = await page.locator(".course-tabs button").first().boundingBox();
        expect(tab!.height).toBeGreaterThanOrEqual(48);
      }
      if (name === "TeacherQuizSkeleton") {
        await expect(page.locator(".quiz-card-list .quiz-card")).toHaveCount(3);
        await expect(page.locator(".quiz-student-card")).toHaveCount(0);
      }
      if (name === "CalendarSkeleton") {
        await expect(page.locator(".planner-col:visible")).toHaveCount(width > 900 ? 7 : 1);
        await expect(page.locator(".planner-block")).toHaveCount(0);
        if (width > 767) await expect(page.locator(".planner-controls input")).toBeVisible();
        else await expect(page.locator(".planner-controls input")).toBeHidden();
      }
      await page.screenshot({
        path: `.impeccable/review/skeleton-${name}-${width}.png`,
        fullPage: true,
      });
      if (name === "LoadingScreen") {
        const card = page.locator(".course-card").first();
        const before = await card.boundingBox();
        const actual = renderToStaticMarkup(
          createElement(CourseCard, {
            course: { ...COURSES[0], name: "Estática" },
            shouldReduceMotion: true,
            onOpen: () => {},
          })
        );
        await card.evaluate((node, html) => {
          node.outerHTML = html;
        }, actual);
        const after = await page.locator(".course-card").first().boundingBox();
        expect(after!.width).toBe(before!.width);
        expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(4);
      }
    }
  });
}
