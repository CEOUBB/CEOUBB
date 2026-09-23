import { expect, type Page } from "@playwright/test";
import type { QaScenario } from "../catalog.ts";
import {
  accountMenu,
  controlledError,
  course,
  navigate,
  removeQaMessage,
  settings,
} from "./helpers.ts";
import { resetQaFixtures } from "../../scripts/qa/seed.ts";

export type Capture = (id: string) => Promise<void>;

export async function portalScenario(
  page: Page,
  scenario: QaScenario,
  capture: Capture
): Promise<boolean> {
  const id = scenario.id;
  if (id.startsWith("public.") || id === "auth.login") {
    const routes: Record<string, string> = {
      "auth.login": "/",
      "public.faq": "/faq",
      "public.contact": "/contacto",
      "public.contact-invalid": "/contacto",
      "public.privacy": "/privacidad",
      "public.terms": "/terminos",
      "public.accessibility": "/accesibilidad",
      "public.preview": "/preview/docente",
      "public.not-found": "/qa-missing-page",
    };
    await page.goto(routes[id]);
    if (id === "auth.login")
      await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    else if (id === "public.preview") await expect(page.locator(".app-header")).toBeVisible();
    else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (id === "public.contact-invalid") {
      await page
        .locator("form")
        .getByRole("button", { name: /Enviar/ })
        .click();
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
    }
    if (id === "public.faq") {
      const first = page.locator("details summary").first();
      await expect(first).toBeVisible();
      await first.click();
      await expect(page.locator("details[open]").first()).toBeVisible();
    }
    if (id === "public.not-found")
      await expect(page.getByText(/404|encontr/i).first()).toBeVisible();
    return true;
  }
  if (id === "auth.session") {
    const session = await page.request.get("/api/auth/me");
    expect(session.status()).toBe(200);
    expect((await session.json()).user.id).toBe("firebase:qa-student");
    await page.reload();
    await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();
    await expect(page.getByText("4 publicaciones", { exact: true })).toBeVisible();
    return true;
  }
  if (id === "auth.logout") {
    await accountMenu(page);
    await page.locator(".account-popover").getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    const response = await page.request.get("/api/auth/me");
    expect((await response.json()).user ?? null).toBeNull();
    return true;
  }
  if (id.startsWith("shell.")) {
    if (id === "shell.sidebar") {
      const toggle = page.getByRole("button", { name: /^(Abrir|Cerrar) el menú$/ });
      if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    } else if (id === "shell.account") await accountMenu(page);
    else if (id === "shell.notifications") {
      await page.locator(".notifications-menu > summary").click();
      await expect(page.locator(".notification-popover")).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Buscar ramos y vistas", exact: true }).click();
      const search = page.getByRole("combobox", { name: "Buscar en Centro de Estudio UBB" });
      await expect(search).toBeFocused();
      await search.fill(id.endsWith("empty") ? "no-such-qa-result" : "QA Aula activa");
      if (id.endsWith("empty")) await expect(page.getByRole("option")).toHaveCount(0);
      else await expect(page.getByRole("option")).toHaveCount(1);
    }
    return true;
  }
  if (id.startsWith("courses.")) {
    if (id === "courses.isolation") {
      await expect(
        page.getByRole("button", { name: "Entrar al aula de QA Otra aula" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Entrar al aula de QA Aula activa" })
      ).toHaveCount(0);
      expect((await page.request.get("/api/sections/qa-active/participants")).status()).toBe(403);
    } else if (id === "courses.archive") {
      await course(page, "archived");
      await expect(page.getByText("Solo lectura.", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Nueva publicación", exact: true })
      ).toHaveCount(0);
    } else if (id === "courses.filter-empty") {
      await page.getByRole("searchbox", { name: "Filtrar cursos" }).fill("no-such-qa-course");
      await expect(page.locator(".course-card")).toHaveCount(0);
      await expect(page.getByRole("searchbox", { name: "Filtrar cursos" })).toHaveValue(
        "no-such-qa-course"
      );
    } else if (id === "courses.agenda" || id === "courses.agenda-cold") {
      if (id === "courses.agenda") {
        // Gradebook subscriptions begin when the calendar opens; return to capture the populated agenda.
        await navigate(page, "Calendario");
        await expect(page.getByText(/Informe individual QA/).first()).toBeVisible();
        await navigate(page, "Área personal");
      }
      await expect(page.getByRole("heading", { name: "En tu agenda" })).toBeVisible();
      await expect(page.locator(".next-eval-title")).toBeVisible();
    } else
      await expect(
        page.getByRole("button", { name: "Entrar al aula de QA Aula activa" })
      ).toBeVisible();
    return true;
  }
  if (id.startsWith("communications.")) {
    await navigate(page, "Avisos y mensajes");
    await expect(
      page.getByRole("heading", { name: "Avisos y mensajes", exact: true })
    ).toBeVisible();
    if (id === "communications.announcements") {
      await expect(page.locator(".announcement-list")).toBeVisible();
    } else {
      await page.getByRole("tab", { name: /Mensajes/ }).click();
      const list = page.getByRole("complementary", { name: "Conversaciones" });
      await expect(list).toBeVisible();
      if (id === "communications.search-empty") {
        await page
          .getByRole("searchbox", { name: "Buscar conversaciones" })
          .fill("no-such-qa-conversation");
        await expect(page.locator(".conversation-no-results")).toBeVisible();
      } else {
        await list.locator("li button").first().click();
        await expect(page.getByLabel("Mensaje", { exact: true })).toBeVisible();
        if (id === "communications.reply") {
          const text = "Mensaje sintético de verificación QA";
          await removeQaMessage(text);
          await page.getByLabel("Mensaje", { exact: true }).fill(text);
          await capture("form");
          await page.getByRole("button", { name: /Enviar mensaje|Enviar/ }).click();
          await expect(page.getByText(text, { exact: true })).toBeVisible();
          await page.reload();
          await navigate(page, "Avisos y mensajes");
          await page.getByRole("tab", { name: /Mensajes/ }).click();
          await page
            .getByRole("complementary", { name: "Conversaciones" })
            .locator("li button")
            .first()
            .click();
          await expect(page.getByText(text, { exact: true })).toBeVisible();
          await capture("persisted");
          await removeQaMessage(text);
          await resetQaFixtures();
        }
      }
    }
    return true;
  }
  if (id.startsWith("calendar.")) {
    await navigate(page, "Calendario");
    await expect(page.getByRole("heading", { name: "Calendario", exact: true })).toBeVisible();
    if (id === "calendar.week")
      await expect(page.getByRole("region", { name: "Horario semanal" })).toBeVisible();
    else if (id === "calendar.month") {
      await page.getByRole("button", { name: "Mes", exact: true }).click();
      await expect(page.locator(".planner-month")).toBeVisible();
    } else {
      await page.getByRole("button", { name: /Nuevo bloque|Agregar bloque/ }).click();
      const dialog = page.getByRole("dialog", { name: "Nuevo bloque" });
      await expect(dialog).toBeVisible();
      if (id === "calendar.recurrence") {
        await dialog.getByLabel("Repetición").selectOption("weekly");
        await expect(dialog.getByLabel("Repetir hasta")).toBeVisible();
      } else if (id === "calendar.invalid") {
        await dialog.getByLabel("Título", { exact: true }).fill("QA horario inválido");
        await dialog.getByLabel("Desde", { exact: true }).fill("15:00");
        await dialog.getByLabel("Hasta", { exact: true }).fill("14:00");
        await dialog.getByRole("button", { name: /Guardar/ }).click();
        await expect(dialog.getByRole("alert")).toBeVisible();
      } else if (id === "calendar.persistence") {
        const title = "QA bloque de verificación";
        await dialog.getByLabel("Título", { exact: true }).fill(title);
        await capture("form");
        await dialog.getByRole("button", { name: /Guardar/ }).click();
        await expect(dialog).not.toBeVisible();
        await page.reload();
        await navigate(page, "Calendario");
        await expect(page.getByText(title, { exact: true })).toBeVisible();
        await capture("persisted");
        await page.getByText(title, { exact: true }).click();
        const edit = page.getByRole("dialog", { name: "Editar bloque" });
        await edit.getByRole("button", { name: /Eliminar/ }).click();
        await edit.getByRole("button", { name: /Sí, eliminar|Confirmar|Eliminar bloque/ }).click();
        await expect(page.getByText(title, { exact: true })).toHaveCount(0);
      }
    }
    return true;
  }
  if (id === "resources.index") {
    await navigate(page, "Recursos");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Recursos/);
    await expect(page.locator(".res-row").first()).toBeVisible();
    return true;
  }
  if (id.startsWith("teacher.")) {
    if (id === "teacher.error") await controlledError(page, "**/api/teacher/courses?*");
    await navigate(page, "Administrar ramos");
    await expect(
      page.getByRole("heading", { name: "Administrar ramos", exact: true })
    ).toBeVisible();
    if (id === "teacher.error")
      await expect(page.locator(".teacher-manager-status")).not.toBeEmpty();
    else if (id === "teacher.create") {
      await page.getByRole("button", { name: "Crear ramo", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Datos académicos esenciales" })
      ).toBeVisible();
    } else {
      await page
        .getByRole("complementary", { name: "Ramos administrados" })
        .getByRole("button")
        .filter({ hasText: "QA Aula activa" })
        .click();
      if (id === "teacher.assistants") {
        await page.getByRole("tab", { name: "Ayudantes", exact: true }).click();
        await expect(page.getByPlaceholder("nombre@alumnos.ubiobio.cl")).toBeVisible();
      } else if (id === "teacher.evaluations") {
        await page.getByRole("tab", { name: "Evaluaciones", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Evaluaciones", exact: true })
        ).toBeVisible();
      } else
        await expect(
          page.getByRole("heading", { name: "Datos del ramo", exact: true })
        ).toBeVisible();
    }
    return true;
  }
  if (id.startsWith("admin.")) {
    if (id === "admin.forbidden") {
      await accountMenu(page);
      await expect(
        page
          .locator(".account-popover")
          .getByRole("button", { name: "Administración", exact: true })
      ).toHaveCount(0);
      expect((await page.request.get("/api/admin/users")).status()).toBe(403);
      return true;
    }
    if (id === "admin.error") await controlledError(page, "**/api/admin/users?*");
    await navigate(page, "Administración");
    await expect(page.getByRole("heading", { name: "Administración de cuentas" })).toBeVisible();
    if (id === "admin.search-empty") {
      await page.getByRole("searchbox", { name: "Buscar cuentas" }).fill("no-such-qa-user");
      await expect(
        page.getByText(/No se encontraron|No hay cuentas|Sin resultados/).first()
      ).toBeVisible();
    } else if (id === "admin.error")
      await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    else if (id === "admin.periods")
      await expect(page.getByRole("heading", { name: "Períodos académicos" })).toBeVisible();
    else
      await expect(
        page.locator(".admin-row").getByText("qa.student@alumnos.ubiobio.cl", { exact: true })
      ).toBeVisible();
    return true;
  }
  if (id.startsWith("settings.")) {
    if (id === "settings.error") await controlledError(page, "**/api/profile/preferences");
    await settings(page);
    if (id === "settings.error")
      await expect(page.locator("#settings-preferences-error")).toBeVisible();
    else if (id === "settings.sessions")
      await expect(page.locator(".settings-sessions li").first()).toBeVisible();
    else if (id === "settings.preferences")
      await expect(
        page.getByRole("switch", { name: "Reducir el movimiento del portal" })
      ).toBeVisible();
    else if (id === "settings.persistence") {
      const toggle = page.getByRole("switch", { name: "Reducir el movimiento del portal" });
      await expect(toggle).toBeEnabled();
      const original = await toggle.isChecked();
      await capture("form");
      const [response] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/profile/preferences") &&
            response.request().method() === "PUT"
        ),
        toggle.setChecked(!original),
      ]);
      expect(response.status()).toBe(200);
      await page.reload();
      await settings(page);
      await expect(toggle).toBeChecked({ checked: !original });
      await capture("persisted");
      const [restored] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/profile/preferences") &&
            response.request().method() === "PUT"
        ),
        toggle.setChecked(original),
      ]);
      expect(restored.status()).toBe(200);
    } else if (id === "settings.photo-invalid") {
      await page.locator("#settings-photo-file").setInputFiles({
        name: "invalid.png",
        mimeType: "image/png",
        buffer: Buffer.from("not an image"),
      });
      await expect(page.locator("#settings-photo-error")).toBeVisible();
    } else if (["settings.photo-crop", "settings.photo-persistence"].includes(id)) {
      const fixture = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable for synthetic photo fixture.");
        context.fillStyle = "#265c85";
        context.fillRect(0, 0, 640, 480);
        context.fillStyle = "#f4e6c6";
        context.fillRect(160, 80, 320, 320);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await page.locator("#settings-photo-file").setInputFiles({
        name: "qa-avatar.png",
        mimeType: "image/png",
        buffer: Buffer.from(fixture, "base64"),
      });
      await expect(
        page.getByRole("img", { name: /Vista previa del recorte cuadrado/ })
      ).toBeVisible();
      if (id === "settings.photo-persistence") {
        await capture("crop");
        const [saved] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().endsWith("/api/profile/photo") &&
              response.request().method() === "POST"
          ),
          page.getByRole("button", { name: "Guardar recorte", exact: true }).click(),
        ]);
        expect(saved.status()).toBe(200);
        const photo = (await saved.json()).photoUrl;
        expect(photo).toBeTruthy();
        await page.reload();
        await settings(page);
        await expect(page.locator(".settings-photo-current img")).toHaveAttribute("src", photo);
        await capture("persisted");
        const [reset] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().endsWith("/api/profile/photo") &&
              response.request().method() === "DELETE"
          ),
          page.getByRole("button", { name: "Restablecer la foto de Google", exact: true }).click(),
        ]);
        expect(reset.status()).toBe(200);
      }
    } else await expect(page.locator("#settings-photo-title")).toBeVisible();
    return true;
  }
  return false;
}
