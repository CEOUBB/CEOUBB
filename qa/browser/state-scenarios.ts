import { expect, type Page, type Route } from "@playwright/test";
import type { QaScenario } from "../catalog.ts";
import { QA_STATE_SCENARIOS } from "../state-catalog.ts";
import { QA_IDS, QA_SECTIONS, QA_SUPPORT_SUBJECT } from "../fixtures.ts";
import { qaPdf, qaSupportRequests, resetQaFixtures } from "../../scripts/qa/seed.ts";
import { DURACION_MINIMA_MS } from "../../lib/support-request.ts";
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
  studentGradeDetail,
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

export async function callableFailure(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "*",
      },
    });
    return;
  }
  await route.fulfill({
    status: 503,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
    },
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
  await studentGradeDetail(page, name);
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

async function fillContactForm(
  page: Page,
  overrides: Partial<{
    email: string;
    nombre: string;
    asunto: string;
    mensaje: string;
    categoria: string;
  }> = {}
) {
  await page.goto("/contacto");
  await expect(page.getByRole("heading", { name: "Contacto y soporte" })).toBeVisible();
  await page.locator("#soporte-nombre").fill(overrides.nombre ?? "Estudiante QA");
  await page.locator("#soporte-email").fill(overrides.email ?? "estudiante.qa@alumnos.ubiobio.cl");
  await page.locator("#soporte-categoria").selectOption(overrides.categoria ?? "soporte-tecnico");
  await page.locator("#soporte-asunto").fill(overrides.asunto ?? "Consulta sobre verificación QA");
  await page
    .locator("#soporte-mensaje")
    .fill(
      overrides.mensaje ??
        "Mensaje detallado para verificar el flujo de soporte en pruebas automatizadas."
    );
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

  if (id === "shell.notifications-loading" || id === "communications.conversation-loading") {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    const project = process.env.FIREBASE_PROJECT_ID;

    if (!host || !/^127\.0\.0\.1:\d+$/.test(host) || !project?.startsWith("demo-"))
      throw new Error("QA_FIRESTORE_CONFIG: local emulator required.");
    const endpoint = `http://${host}/google.firestore.v1.Firestore/Listen/channel`;
    const notification = id === "shell.notifications-loading";

    if (!notification) {
      await navigate(page, "Avisos y mensajes");
      await page.getByRole("tab", { name: /Mensajes/ }).click();
      await expect(page.getByRole("complementary", { name: "Conversaciones" })).toBeVisible();
      await expect(
        page.getByRole("complementary", { name: "Conversaciones" }).locator("li button").first()
      ).toBeVisible();
    }
    const release = await holdRequest(page, `${endpoint}**`);
    const panel = notification
      ? page.locator(".notification-popover")
      : page.getByRole("region", { name: "Conversación seleccionada" });
    const skeleton = panel.getByRole("status", {
      name: notification ? "Cargando notificaciones" : "Cargando conversación…",
      exact: true,
    });

    try {
      await Promise.all([
        page.waitForRequest(
          (request) => request.method() !== "OPTIONS" && request.url().startsWith(`${endpoint}?`)
        ),
        notification
          ? page.reload()
          : page
              .getByRole("complementary", { name: "Conversaciones" })
              .locator("li button")
              .first()
              .click(),
      ]);

      if (notification) await page.locator(".notifications-menu > summary").click();
      await expect(panel).toBeVisible();
      await expect(skeleton).toBeVisible();
      await expect(skeleton).toHaveAttribute("aria-busy", "true");

      if (!notification)
        await expect(panel.locator(".message-history")).toHaveAttribute("aria-busy", "true");
      await capture("loading");
    } finally {
      await release();
    }
    await expect(skeleton).not.toBeVisible();
    await expect(
      panel.locator(notification ? ".notification-row" : ".message-list").first()
    ).toBeVisible();
    return true;
  }

  if (id === "auth.loading") {
    await page.context().clearCookies();
    await page.goto("/");
    const release = await holdRequest(page, "**/api/auth/dev-login");

    try {
      await page.getByRole("button", { name: "Entrar como estudiante", exact: true }).click();
      await expect(page.locator(".google-button")).toHaveText("Verificando cuenta…");
      await expect(page.locator(".google-button")).toBeDisabled();
      await capture("loading");
    } finally {
      await release();
    }
    return true;
  }

  if (id.startsWith("interop.")) {
    await course(page);
    if (id === "interop.loading") {
      const release = await holdRequest(page, "**/api/courses/*/interop*");
      try {
        await classroomTab(page, "Recursos externos");
        const skeleton = page.getByRole("status", { name: "Cargando recursos externos…" });
        await expect(skeleton).toBeVisible();
        await expect(skeleton).toHaveAttribute("aria-busy", "true");
        await capture("loading");
      } finally {
        await release();
      }
      return true;
    }
    if (id === "interop.load-error") {
      const pattern = "**/api/courses/*/interop*";
      const handler = (route: Route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "QA controlled service failure" }),
        });
      await page.route(pattern, handler);
      try {
        await classroomTab(page, "Recursos externos");
        await expect(page.locator(".interop-alert")).toBeVisible();
        await capture("error");
        await page.unroute(pattern, handler);
        await page.locator(".interop-alert").getByRole("button", { name: "Reintentar" }).click();
        await expect(page.locator(".interop-resource-list li").first()).toBeVisible();
        await capture("recovered");
      } finally {
        await page.unroute(pattern, handler).catch(() => undefined);
      }
      return true;
    }
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
    if (id.startsWith("grades.history-")) {
      const release =
        id === "grades.history-loading" ? await holdRequest(page, "**/grade-history*") : undefined;
      if (id === "grades.history-error") {
        await page.route("**/grade-history*", (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "No se pudo cargar el historial." }),
          })
        );
      }
      try {
        await page
          .getByRole("button", {
            name: "Ver historial de Informe individual QA para Estudiante QA",
            exact: true,
          })
          .click();
        const historyDialog = page.getByRole("dialog", {
          name: "Historial de cambios",
          exact: true,
        });
        await expect(historyDialog).toBeVisible();
        if (id === "grades.history-loading") {
          await capture("loading");
        } else {
          await expect(historyDialog.getByRole("alert")).toBeVisible();
          await capture("error");
        }
      } finally {
        await release?.();
        await resetQaFixtures();
      }
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
        await capture("success");
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
    if (id === "submissions.file-loading" || id === "submissions.viewer-loading") {
      const release =
        id === "submissions.file-loading"
          ? await holdRequest(page, endpoint)
          : await holdRequest(page, "**/pdf.worker*");
      try {
        await page.getByRole("button", { name: "Corregir entregas", exact: true }).click();
        await page.getByLabel("Evaluación por corregir").selectOption(QA_IDS.report);
        await page
          .getByRole("complementary", { name: "Cola de entregas" })
          .getByRole("button")
          .filter({ hasText: "Estudiante QA" })
          .click();
        if (id === "submissions.file-loading") {
          await expect(page.locator(".review-doc-loading")).toBeVisible();
        }
        await capture("loading");
      } finally {
        await release();
        await resetQaFixtures();
      }
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
      await studentGradeDetail(page, "Informe individual QA");
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
      page.getByRole("heading", { name: "No pudimos abrir Centro de Estudio UBB" })
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

  if (id.startsWith("public.contact-")) {
    if (id === "public.contact-domain-warning") {
      await fillContactForm(page, { email: "usuario@gmail.com" });
      await expect(page.locator("#aviso-email")).toBeVisible();
      await capture("form");
      return true;
    }
    if (id === "public.contact-sending") {
      const release = await holdRequest(page, "**/api/soporte");
      try {
        await fillContactForm(page);
        await page
          .locator("form")
          .getByRole("button", { name: /Enviar mensaje/ })
          .click();
        await expect(
          page.locator("form").getByRole("button", { name: /Enviando…/ })
        ).toBeDisabled();
        await capture("loading");
      } finally {
        await release();
      }
      return true;
    }
    if (id === "public.contact-server-error") {
      await controlledError(page, "**/api/soporte");
      await fillContactForm(page);
      await page
        .locator("form")
        .getByRole("button", { name: /Enviar mensaje/ })
        .click();
      await expect(page.locator(".policy-form-error")).toBeVisible();
      await capture("error");
      return true;
    }
    if (id === "public.contact-network-error") {
      await page.route("**/api/soporte", (route) => route.abort());
      await fillContactForm(page);
      await page
        .locator("form")
        .getByRole("button", { name: /Enviar mensaje/ })
        .click();
      await expect(page.locator(".policy-form-error")).toBeVisible();
      await capture("error");
      return true;
    }
    if (id === "public.contact-server-validation") {
      await page.route("**/api/soporte", (route) =>
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Datos no válidos.",
            campos: { mensaje: "El mensaje no cumple los requisitos." },
          }),
        })
      );
      await fillContactForm(page);
      await page
        .locator("form")
        .getByRole("button", { name: /Enviar mensaje/ })
        .click();
      await expect(page.locator("#error-mensaje")).toBeVisible();
      await capture("error");
      return true;
    }
    if (id === "public.contact-delivered" || id === "public.contact-deferred") {
      const isDelivered = id === "public.contact-delivered";
      if (isDelivered)
        await page.route("**/api/soporte", (route) =>
          route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, deferred: false }),
          })
        );
      else await qaSupportRequests(true);

      try {
        await fillContactForm(page, isDelivered ? {} : { asunto: QA_SUPPORT_SUBJECT });

        if (!isDelivered) {
          const earliestSubmit =
            (await page.evaluate(() => performance.now())) + DURACION_MINIMA_MS;
          await page.waitForFunction((earliest) => performance.now() >= earliest, earliestSubmit);
        }
        const [response] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().endsWith("/api/soporte") && response.request().method() === "POST"
          ),
          page
            .locator("form")
            .getByRole("button", { name: /Enviar mensaje/ })
            .click(),
        ]);
        expect(response.status()).toBe(isDelivered ? 201 : 202);

        if (!isDelivered) {
          expect(await response.json()).toEqual({ estado: "recibido", entregado: false });
          const saved = await qaSupportRequests();
          expect(saved).toHaveLength(1);
          expect(saved[0]).toMatchObject({
            email: "estudiante.qa@alumnos.ubiobio.cl",
            estado: "pendiente",
          });
        }
        await expect(page.locator(".policy-confirm")).toBeVisible();

        if (!isDelivered)
          await expect(page.locator(".policy-confirm")).toContainText(
            "su envío al buzón institucional está pendiente"
          );
        await capture("success");
      } finally {
        if (!isDelivered) await qaSupportRequests(true);
      }
      return true;
    }
  }

  return false;
}
