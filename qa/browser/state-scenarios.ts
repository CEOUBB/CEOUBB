import { expect, type Page, type Route } from "@playwright/test";
import type { QaScenario } from "../catalog.ts";
import { QA_STATE_SCENARIOS } from "../state-catalog.ts";
import { QA_IDS, QA_NOW, QA_SECTIONS } from "../fixtures.ts";
import { qaPdf, resetQaFixtures } from "../../scripts/qa/seed.ts";
import {
  accountMenu,
  classroomTab,
  controlledError,
  course,
  firestoreDocument,
  holdRequest,
  login,
  navigate,
  settings,
} from "./helpers.ts";
import type { Capture } from "./portal-scenarios.ts";

const ids = new Set(QA_STATE_SCENARIOS.map((scenario) => scenario.id));
const skeletons: Record<string, [string, string]> = {
  "calendar.loading": ["Calendario", "Cargando calendario…"],
  "resources.loading": ["Recursos", "Cargando recursos de estudio…"],
  "communications.loading": ["Avisos y mensajes", "Cargando avisos y mensajes…"],
  "admin.loading": ["Administración", "Cargando administración de cuentas…"],
  "teacher.loading": ["Administrar ramos", "Cargando espacio docente…"],
  "settings.loading": ["Configuración", "Cargando configuración de la cuenta…"],
  "classroom.loading": ["QA Aula activa", "Abriendo aula virtual…"],
};

async function loadingSkeleton(page: Page, id: string, capture: Capture) {
  const [label, announcement] = skeletons[id];
  // Prepare navigation first: the command palette may itself be a lazy chunk.
  if (id === "settings.loading") await accountMenu(page);
  else if (id !== "classroom.loading") {
    await page.getByRole("button", { name: "Buscar ramos y vistas", exact: true }).click();
    await page.getByRole("combobox", { name: "Buscar en Centro de Estudio UBB" }).fill(label);
    await expect(page.getByRole("option").filter({ hasText: label }).first()).toBeVisible();
  }
  const release = await holdRequest(page, "**/_next/static/chunks/**");
  try {
    if (id === "settings.loading")
      await page
        .locator(".account-popover")
        .getByRole("button", { name: label, exact: true })
        .click();
    else if (id === "classroom.loading") {
      await page.getByRole("button", { name: `Entrar al aula de ${label}` }).click();
      const enter = page.getByRole("button", { name: "Entrar al aula", exact: true });
      if (await enter.isVisible()) await enter.click();
    } else await page.getByRole("option").filter({ hasText: label }).first().click();
    await expect(page.getByRole("status", { name: announcement, exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: announcement, exact: true })).toHaveAttribute(
      "aria-busy",
      "true"
    );
    await capture("loading");
  } finally {
    await release();
  }
}

async function callableFailure(route: Route) {
  await route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      error: { status: "UNAVAILABLE", message: "QA controlled save failure" },
    }),
  });
}

async function openFeedback(page: Page) {
  await page
    .getByRole("button", { name: /retroalimentación de Informe individual QA para Estudiante QA/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Retroalimentación de Informe individual QA" });
  await expect(dialog).toBeVisible();
  return dialog;
}

function storageEndpoint() {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (!host || !/^127\.0\.0\.1:\d+$/.test(host))
    throw new Error("QA_STORAGE_CONFIG: loopback storage emulator required.");
  return `http://${host}/v0/b/**`;
}

async function selectSubmission(page: Page) {
  const name = "Informe individual QA";
  const row = page.locator(".grades-view .sheet-row").filter({ hasText: name }).first();
  if (await row.isVisible()) await row.click();
  const attach = page.getByRole("button", {
    name: new RegExp(`(?:Adjuntar|Reemplazar) la entrega.*${name}`),
  });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), attach.click()]);
  await chooser.setFiles({
    name: "qa-individual.pdf",
    mimeType: "application/pdf",
    buffer: qaPdf(),
  });
}

// Implements: REQ-QA-03, REQ-QA-04, REQ-QA-05
export async function stateScenario(
  page: Page,
  scenario: QaScenario,
  capture: Capture
): Promise<boolean> {
  const id = scenario.id;
  if (!ids.has(id)) return false;
  if (skeletons[id]) {
    await loadingSkeleton(page, id, capture);
    return true;
  }

  if (id === "calendar.delete-dialog") {
    await navigate(page, "Calendario");
    await page.getByRole("button", { name: "Eliminar “Preparar informe QA”", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "¿Eliminar bloque?", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("Preparar informe QA", { exact: true })
    ).toBeVisible();
    return true;
  }

  if (id.startsWith("settings.sessions-") || id === "settings.session-revoke-error") {
    if (id === "settings.session-revoke-error") {
      // Create a second ordinary session; GET still reads the real local database.
      await login(page, "student", new URL(page.url()).origin, { preserveSessions: true });
      await page.route("**/api/profile/sessions", (route) =>
        route.request().method() === "DELETE"
          ? route.fulfill({
              status: 503,
              contentType: "application/json",
              body: JSON.stringify({ error: "QA controlled session revocation failure" }),
            })
          : route.continue()
      );
    }
    if (id === "settings.sessions-error") await controlledError(page, "**/api/profile/sessions");
    const release =
      id === "settings.sessions-loading"
        ? await holdRequest(page, "**/api/profile/sessions")
        : undefined;
    try {
      await settings(page);
      if (id === "settings.sessions-loading") {
        await expect(page.getByText("Leyendo tus sesiones…", { exact: true })).toBeVisible();
        await capture("loading");
      } else {
        if (id === "settings.session-revoke-error")
          await page
            .getByRole("button", { name: /^Cerrar sesión iniciada el/ })
            .first()
            .click();
        await expect(page.locator("#settings-sessions-error")).toContainText("QA controlled");
      }
    } finally {
      await release?.();
    }
    return true;
  }

  if (id.startsWith("grades.")) {
    await course(page);
    await classroomTab(page, "Notas");
    if (id === "grades.cell-save-error") {
      await page.route("**/saveAuditedStudentScores", callableFailure);
      const score = page.getByLabel("Informe individual QA de Estudiante QA", { exact: true });
      await score.fill("6,2");
      await score.press("Tab");
      await expect(score).toHaveAttribute("aria-invalid", "true");
      await expect(score).toHaveAttribute("data-status", "error");
      return true;
    }
    const dialog = await openFeedback(page);
    const feedback = "QA feedback state verification";
    await dialog.getByLabel("Comentario privado para el estudiante").fill(feedback);
    if (id === "grades.feedback-error") {
      await page.route("**/saveAuditedGradeFeedback", callableFailure);
      await dialog.getByRole("button", { name: "Guardar retroalimentación", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText("QA controlled save failure");
      await expect(dialog.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
      return true;
    }
    const release =
      id === "grades.feedback-saving"
        ? await holdRequest(page, "**/saveAuditedGradeFeedback")
        : undefined;
    try {
      await dialog.getByRole("button", { name: "Guardar retroalimentación", exact: true }).click();
      if (release) {
        await expect(
          dialog.getByRole("button", { name: "Guardando…", exact: true })
        ).toBeDisabled();
        await capture("loading");
        await release();
      } else {
        await expect(
          dialog.getByRole("button", { name: "Retroalimentación guardada", exact: true })
        ).toBeDisabled();
        // Freeze the two-second success state after the real callable resolves.
        await page.clock.pauseAt(new Date(QA_NOW));
        await capture("success");
        await page.clock.resume();
      }
      await expect
        .poll(
          async () =>
            (await firestoreDocument(`courses/${QA_SECTIONS.active}/grades/qa-student`)).fields
              .feedback.mapValue.fields[QA_IDS.report].stringValue
        )
        .toBe(feedback);
      await page.reload();
      await course(page);
      await classroomTab(page, "Notas");
      await openFeedback(page);
      await expect(page.getByLabel("Comentario privado para el estudiante")).toHaveValue(feedback);
      await capture("persisted");
    } finally {
      await release?.();
      if (id === "grades.feedback-success") await page.clock.resume();
      await resetQaFixtures();
    }
    return true;
  }

  if (id.startsWith("submissions.")) {
    await course(page);
    const endpoint = storageEndpoint();
    if (id === "submissions.document-error") {
      await page.route(endpoint, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({
              status: 403,
              contentType: "application/json",
              body: JSON.stringify({
                error: { code: 403, message: "QA controlled storage failure" },
              }),
            })
          : route.continue()
      );
      await page.getByRole("button", { name: "Corregir entregas", exact: true }).click();
      await page.getByLabel("Evaluación por corregir").selectOption(QA_IDS.report);
      await page
        .getByRole("complementary", { name: "Cola de entregas" })
        .getByRole("button")
        .filter({ hasText: "Estudiante QA" })
        .click();
      await expect(page.locator(".review-doc-error")).toContainText(
        "No fue posible obtener el archivo"
      );
      await expect(page.getByText("Enlace no disponible", { exact: true })).toBeVisible();
      return true;
    }
    await classroomTab(page, "Notas");
    let rejectUpload = id === "submissions.upload-retry";
    let unblock: (() => void) | undefined;
    const paused = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const handler = async (route: Route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      if (rejectUpload) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: 403, message: "QA controlled upload failure" } }),
        });
      } else {
        if (id === "submissions.uploading") await paused;
        await route.continue().catch(() => undefined);
      }
    };
    await page.route(endpoint, handler);
    try {
      await selectSubmission(page);
      if (rejectUpload) {
        await expect(page.locator(".tool-status.bad")).toBeVisible();
        await capture("error");
        rejectUpload = false;
        await selectSubmission(page);
      } else {
        await expect(page.getByText("Subiendo", { exact: true })).toBeVisible();
        await capture("loading");
        unblock?.();
      }
      await expect
        .poll(
          async () =>
            (
              await firestoreDocument(
                `courses/${QA_SECTIONS.active}/submissions/${QA_IDS.report}_qa-student`
              )
            ).fields.fileName.stringValue
        )
        .toBe("qa-individual.pdf");
      await page.reload();
      await course(page);
      await classroomTab(page, "Notas");
      const row = page
        .locator(".grades-view .sheet-row")
        .filter({ hasText: "Informe individual QA" })
        .first();
      if (await row.isVisible()) await row.click();
      await expect(page.getByText("qa-individual.pdf", { exact: true })).toBeVisible();
      await capture(id === "submissions.upload-retry" ? "recovered" : "persisted");
    } finally {
      unblock?.();
      await page.unroute(endpoint, handler);
      await resetQaFixtures();
    }
    return true;
  }

  if (id === "public.global-error") {
    // Fail the exact browser capability read synchronously by the real root's
    // CommandPalette/useTouchCapable render; the actual Next boundary must render.
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === "(any-pointer: coarse)") throw new Error("QA controlled root render failure");
        return original(query);
      };
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Application error: a client-side exception has occurred/ })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    return true;
  }

  if (id.startsWith("public.sentry")) {
    await page.goto("/sentry-example-page");
    await expect(page.getByRole("heading", { name: "Verificación Sentry (CEOUBB)" })).toBeVisible();
    if (id === "public.sentry-client-error") {
      await page.getByRole("button", { name: /Disparar Error de Cliente/ }).click();
      await expect(page.getByText(/^Error de cliente enviado\. Event ID:/)).toBeVisible();
    } else if (id !== "public.sentry") {
      if (id === "public.sentry-server-error") await controlledError(page, "**/api/sentry-test");
      const release =
        id === "public.sentry-server-loading"
          ? await holdRequest(page, "**/api/sentry-test")
          : undefined;
      try {
        await page.getByRole("button", { name: /Enviar Error de Servidor/ }).click();
        if (release) {
          await expect(
            page.getByRole("button", { name: "Enviando error…", exact: true })
          ).toBeDisabled();
          await capture("loading");
        } else await expect(page.getByText(/Error al contactar la API: HTTP 503/)).toBeVisible();
      } finally {
        await release?.();
      }
    }
    return true;
  }

  return false;
}
