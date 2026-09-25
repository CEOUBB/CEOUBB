import { expect, type Page } from "@playwright/test";
import type { QaScenario } from "../catalog.ts";
import { QA_ASSETS, QA_IDS, QA_SECTIONS, QA_TEAMMATE } from "../fixtures.ts";
import { qaPdf, resetQaFixtures } from "../../scripts/qa/seed.ts";
import {
  classroomTab,
  controlledError,
  course,
  firestoreDocument,
  holdRequest,
} from "./helpers.ts";
import type { Capture } from "./portal-scenarios.ts";

const PRESETS: Record<string, string> = {
  notice: "Aviso o portada del ramo",
  assessment: "Certamen o evaluación",
  guide: "Guía de estudio",
  blank: "En blanco",
};

async function studentGradeDetail(page: Page, name: string) {
  // Mobile grades use a detail sheet; desktop exposes the same controls in the table.
  const row = page.locator(".grades-view .sheet-row").filter({ hasText: name });
  if (await row.first().isVisible()) await row.first().click();
}

export async function classroomScenario(
  page: Page,
  scenario: QaScenario,
  capture: Capture
): Promise<boolean> {
  const id = scenario.id;
  if (
    ![
      "classroom",
      "publication",
      "grades",
      "submissions",
      "quizzes",
      "people",
      "imports",
      "interop",
    ].some((prefix) => id.startsWith(`${prefix}.`))
  )
    return false;
  await course(
    page,
    [
      "classroom.empty",
      "grades.empty",
      "quizzes.empty",
      "interop.empty",
      "submissions.empty",
    ].includes(id)
      ? "empty"
      : "active"
  );
  if (id.startsWith("classroom.")) {
    if (id === "classroom.empty")
      await expect(page.getByText("Todavía no hay publicaciones", { exact: true })).toBeVisible();
    else if (id === "classroom.search-empty") {
      await page
        .getByRole("searchbox", { name: "Buscar publicaciones y archivos del ramo" })
        .fill("no-such-qa-post");
      await expect(page.getByText(/No se encontraron publicaciones/)).toBeVisible();
    } else if (id === "classroom.delete-dialog") {
      await page
        .getByRole("button", { name: 'Eliminar aviso "Bienvenida al aula QA"', exact: true })
        .click();
      await expect(
        page.getByRole("group", { name: "Eliminar aviso Bienvenida al aula QA" })
      ).toBeVisible();
    } else if (id === "classroom.edit-notice") {
      await page
        .getByRole("button", { name: 'Modificar aviso "Bienvenida al aula QA"', exact: true })
        .click();
      await expect(
        page.locator(".post-edit-form").getByLabel("Título", { exact: true })
      ).toHaveValue("Bienvenida al aula QA");
    } else if (id.startsWith("classroom.live")) {
      await page.locator(".live-class-editor summary").click();
      await expect(page.getByLabel("Enlace de la reunión")).toBeVisible();
      if (id === "classroom.live-invalid") {
        await page.getByLabel("Enlace de la reunión").fill("https://example.invalid/not-a-meeting");
        await page.getByRole("button", { name: "Guardar enlace", exact: true }).click();
        await expect(page.getByLabel("Enlace de la reunión")).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        await expect(page.locator("#live-class-feedback")).not.toBeEmpty();
      } else if (id === "classroom.live-persistence") {
        const original = await page.getByLabel("Enlace de la reunión").inputValue();
        await page.getByLabel("Enlace de la reunión").fill("https://zoom.us/j/12345678901");
        await capture("form");
        await page.getByRole("button", { name: "Guardar enlace", exact: true }).click();
        await expect(page.getByRole("link", { name: "Entrar a la clase" })).toHaveAttribute(
          "href",
          "https://zoom.us/j/12345678901"
        );
        await page.reload();
        await course(page);
        await expect(page.getByRole("link", { name: "Entrar a la clase" })).toHaveAttribute(
          "href",
          "https://zoom.us/j/12345678901"
        );
        await capture("persisted");
        await page.locator(".live-class-editor summary").click();
        await page.getByLabel("Enlace de la reunión").fill(original);
        await page.getByRole("button", { name: "Guardar enlace", exact: true }).click();
        await expect(page.getByRole("link", { name: "Entrar a la clase" })).toHaveAttribute(
          "href",
          original
        );
      }
    } else {
      await expect(
        page.getByRole("heading", { name: "Bienvenida al aula QA", exact: true })
      ).toBeVisible();
      if (scenario.role === "student")
        await expect(
          page.getByRole("button", { name: "Nueva publicación", exact: true })
        ).toHaveCount(0);
      else
        await expect(
          page.getByRole("button", { name: "Nueva publicación", exact: true })
        ).toBeVisible();
    }
    return true;
  }
  if (id.startsWith("publication.")) {
    await page.getByRole("button", { name: "Nueva publicación", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "¿Qué vas a publicar en QA Aula activa?" })
    ).toBeVisible();
    if (id !== "publication.presets") {
      await page
        .getByRole("button", { name: new RegExp(`^${PRESETS[id.split(".")[1]] ?? "En blanco"}`) })
        .click();
      await expect(page.getByLabel("Título de la publicación", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("complementary", { name: "Ajustes de la publicación" })
      ).toBeVisible();
      if (id === "publication.discard") {
        await page
          .getByLabel("Título de la publicación", { exact: true })
          .fill("QA borrador para descartar");
        await page.getByRole("button", { name: "Volver al ramo", exact: true }).click();
        await expect(page.getByRole("dialog", { name: "¿Descartar publicación?" })).toBeVisible();
      } else if (
        [
          "publication.markdown",
          "publication.html",
          "publication.preview",
          "publication.notify-confirm",
          "publication.persistence",
        ].includes(id)
      ) {
        await page
          .getByLabel("Título de la publicación", { exact: true })
          .fill("Publicación sintética QA");
        const mode = id === "publication.html" ? "HTML" : "Markdown";
        await page.getByRole("tab", { name: new RegExp(mode), exact: false }).click();
        await page
          .locator("textarea.editor-source")
          .fill(
            mode === "HTML"
              ? "<p>Contenido sintético QA</p>"
              : "## Contenido sintético QA\n\nMaterial para comprobar publicación real."
          );
        if (id === "publication.preview") {
          const preview = page.getByRole("button", { name: "Vista previa", exact: true });
          if ((await preview.getAttribute("aria-pressed")) !== "true") await preview.click();
          await expect(page.locator(".rich-editor-preview")).toContainText(
            "Contenido sintético QA"
          );
        } else if (id === "publication.notify-confirm") {
          await page.locator('input[name="notificationMode"][value="push"]').check();
          await page.locator(".publish-submit").click();
          await expect(
            page.getByRole("dialog", { name: "Confirmar notificación al curso" })
          ).toBeVisible();
        } else if (id === "publication.persistence") {
          await page.locator('input[name="notificationMode"][value="silent"]').check();
          await capture("form");
          await page.locator(".publish-submit").click();
          await expect(
            page.getByRole("heading", { name: "Publicación sintética QA", exact: true })
          ).toBeVisible();
          await page.reload();
          await course(page);
          await expect(
            page.getByRole("heading", { name: "Publicación sintética QA", exact: true })
          ).toBeVisible();
          await capture("persisted");
          await page
            .getByRole("button", { name: 'Eliminar aviso "Publicación sintética QA"', exact: true })
            .click();
          await page
            .getByRole("button", {
              name: 'Confirmar eliminación de "Publicación sintética QA"',
              exact: true,
            })
            .click();
          await expect(
            page.getByRole("heading", { name: "Publicación sintética QA", exact: true })
          ).toHaveCount(0);
        }
      }
    }
    return true;
  }
  if (id.startsWith("grades.")) {
    await classroomTab(page, "Notas");
    if (id === "grades.empty")
      await expect(
        page.getByText("El docente aún no publica la ponderación", { exact: true })
      ).toBeVisible();
    else if (["grades.student", "grades.simulation", "grades.assistant"].includes(id)) {
      await expect(page.getByText("Informe individual QA", { exact: true }).first()).toBeVisible();
      if (id === "grades.simulation") {
        await studentGradeDetail(page, "Proyecto en equipo QA");
        await page
          .getByLabel("Nota simulada de Proyecto en equipo QA", { exact: true })
          .fill("6,5");
        await expect(
          page.getByLabel("Nota simulada de Proyecto en equipo QA", { exact: true })
        ).toHaveValue("6,5");
      }
    } else {
      await expect(
        page.getByRole("heading", { name: "Notas oficiales", exact: true })
      ).toBeVisible();
      if (id === "grades.feedback") {
        await page
          .getByRole("button", {
            name: /retroalimentación de Informe individual QA para Estudiante QA/,
          })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Retroalimentación de Informe individual QA" })
        ).toBeVisible();
      } else if (id === "grades.history") {
        await page
          .getByRole("button", {
            name: "Ver historial de Informe individual QA para Estudiante QA",
            exact: true,
          })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(
          page
            .getByRole("dialog")
            .getByText(/Historial/)
            .first()
        ).toBeVisible();
      } else if (id === "grades.records") {
        await page
          .getByRole("heading", { name: "Cierre de actas", exact: true })
          .scrollIntoViewIfNeeded();
        await expect(page.locator(".final-grade-table")).toBeVisible();
      } else if (id === "grades.persistence") {
        const score = page.getByLabel("Informe individual QA de Estudiante QA", { exact: true });
        const original = await score.inputValue();
        await score.fill("6,1");
        await capture("form");
        await score.press("Tab");
        await expect
          .poll(async () =>
            Number(
              (await firestoreDocument(`courses/${QA_SECTIONS.active}/grades/qa-student`)).fields
                .scores.mapValue.fields[QA_IDS.report].doubleValue
            )
          )
          .toBe(6.1);
        await page.reload();
        await course(page);
        await classroomTab(page, "Notas");
        await expect(score).toHaveValue("6,1");
        await capture("persisted");
        await score.fill(original);
        await score.press("Tab");
        await expect
          .poll(async () =>
            Number(
              (await firestoreDocument(`courses/${QA_SECTIONS.active}/grades/qa-student`)).fields
                .scores.mapValue.fields[QA_IDS.report].doubleValue
            )
          )
          .toBe(Number(original.replace(",", ".")));
      }
    }
    return true;
  }
  if (id.startsWith("submissions.")) {
    if (id === "submissions.upload" || id.endsWith("persistence")) {
      const isTeam = id !== "submissions.individual-persistence";
      const name = isTeam ? "Proyecto en equipo QA" : "Informe individual QA";
      await classroomTab(page, "Notas");
      await studentGradeDetail(page, name);
      const attach = page.getByRole("button", {
        name: new RegExp(`(?:Adjuntar|Reemplazar) la entrega.*${name}`),
      });
      if (isTeam) {
        await attach.click();
        const team = page.getByRole("group", { name: `Equipo para ${name}` });
        await expect(team).toBeVisible();
        if (id === "submissions.upload") return true;
        await team.getByRole("checkbox", { name: new RegExp(QA_TEAMMATE.name) }).check();
      }
      await capture("form");
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        isTeam
          ? page.getByRole("button", { name: "Elegir archivo", exact: true }).click()
          : attach.click(),
      ]);
      const fileName = isTeam ? "qa-team.pdf" : "qa-individual.pdf";
      await chooser.setFiles({ name: fileName, mimeType: "application/pdf", buffer: qaPdf() });
      await expect(page.getByText(fileName, { exact: true })).toBeVisible();
      const evalId = isTeam ? QA_IDS.team : QA_IDS.report;
      const receipt = await firestoreDocument(
        `courses/${QA_SECTIONS.active}/submissions/${evalId}_qa-student`
      );
      expect(receipt.fields.fileName.stringValue).toBe(fileName);
      if (isTeam) {
        const teammate = await firestoreDocument(
          `courses/${QA_SECTIONS.active}/submissions/${evalId}_${QA_TEAMMATE.uid}`
        );
        expect(teammate.fields.storagePath.stringValue).toBe(
          receipt.fields.storagePath.stringValue
        );
      }
      await page.reload();
      await course(page);
      await classroomTab(page, "Notas");
      await studentGradeDetail(page, name);
      await expect(page.getByText(fileName, { exact: true })).toBeVisible();
      await capture("persisted");
      await resetQaFixtures();
    } else {
      await page.getByRole("button", { name: "Corregir entregas", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Bandeja de corrección", exact: true })
      ).toBeVisible();
      if (id === "submissions.empty")
        await expect(
          page.getByText("Guarda primero la ponderación del ramo", { exact: true })
        ).toBeVisible();
      else {
        await page.getByLabel("Evaluación por corregir").selectOption(QA_IDS.report);
        await page
          .getByRole("complementary", { name: "Cola de entregas" })
          .getByRole("button")
          .filter({ hasText: "Estudiante QA" })
          .click();
        await expect(page.locator("#review-grade")).toBeVisible();
        if (id === "submissions.pdf") await expect(page.locator("canvas").first()).toBeVisible();
        if (id === "submissions.feedback") await page.locator("#review-feedback").focus();
      }
    }
    return true;
  }
  if (id.startsWith("quizzes.")) {
    await classroomTab(page, "Cuestionarios");
    if (id === "quizzes.empty")
      await expect(
        page.getByText("No hay cuestionarios disponibles", { exact: true })
      ).toBeVisible();
    else if (["quizzes.teacher", "quizzes.import"].includes(id)) {
      await expect(page.getByLabel("Nombre del cuestionario")).toBeVisible();
      if (id === "quizzes.import") {
        await page.locator('.quiz-dropzone input[type="file"]').setInputFiles(QA_ASSETS.questions);
        await expect(page.getByText("Pregunta importada QA", { exact: true })).toBeVisible();
      }
    } else {
      const quiz = page
        .locator(".quiz-student-card")
        .filter({ hasText: "Cuestionario de práctica QA" });
      await expect(quiz).toBeVisible();
      if (id !== "quizzes.student") {
        // The Functions attempt deadline uses wall time; keep the browser on the same clock.
        await page.clock.setFixedTime(new Date());
        await quiz.getByRole("button", { name: "Rendir ahora", exact: true }).click();
        await expect(page.getByRole("timer")).toBeVisible();
        await expect(page.getByText("¿Cuánto es 2 + 2?", { exact: true })).toBeVisible();
        if (id === "quizzes.submission") {
          await page.getByRole("radio", { name: "4", exact: true }).check();
          await capture("attempt");
          await page.getByRole("button", { name: "Entregar y corregir", exact: true }).click();
          await expect(page.locator(".quiz-grade-seal strong")).toHaveText("7,0");
          const persisted = await firestoreDocument(
            `courses/${QA_SECTIONS.active}/grades/qa-student`
          );
          expect(
            Number(
              persisted.fields.scores.mapValue.fields[QA_IDS.quizEvaluation].doubleValue ??
                persisted.fields.scores.mapValue.fields[QA_IDS.quizEvaluation].integerValue
            )
          ).toBe(7);
          await capture("result");
        }
      }
    }
    return true;
  }
  if (id.startsWith("people.")) {
    let release: (() => Promise<void>) | undefined;
    if (id === "people.error") await controlledError(page, "**/api/sections/*/participants?*");
    if (id === "people.loading")
      release = await holdRequest(page, "**/api/sections/*/participants?*");
    try {
      await classroomTab(page, "Participantes");
      if (id === "people.loading") {
        await expect(page.getByText("Actualizando padrón…", { exact: true })).toBeVisible();
        await capture("loading");
      } else if (id === "people.error")
        await expect(page.locator(".participant-error")).toBeVisible();
      else if (id === "people.search-empty") {
        await page
          .getByPlaceholder("Buscar por nombre o correo", { exact: true })
          .fill("no-such-qa-person");
        await expect(page.getByText("Sin coincidencias", { exact: true })).toBeVisible();
      } else {
        await expect(
          page.getByText("qa.student@alumnos.ubiobio.cl", { exact: true }).first()
        ).toBeVisible();
        if (id === "people.selection") {
          await page.getByRole("checkbox", { name: "Seleccionar a Estudiante QA" }).check();
          await expect(
            page.getByRole("region", { name: "Acciones de participantes seleccionados" })
          ).toBeVisible();
        }
      }
    } finally {
      await release?.();
    }
    return true;
  }
  if (id.startsWith("imports.")) {
    if (id.startsWith("imports.enrollment")) {
      await classroomTab(page, "Participantes");
      await page.locator(".enrollment-import > summary").click();
      await expect(page.getByLabel("Archivo de estudiantes", { exact: true })).toBeVisible();
      if (id.endsWith("persistence")) {
        await page
          .getByLabel("Archivo de estudiantes", { exact: true })
          .setInputFiles(QA_ASSETS.enrollments);
        await page.getByRole("button", { name: "Previsualizar", exact: true }).click();
        await expect(
          page.getByText("qa.pending@alumnos.ubiobio.cl", { exact: true })
        ).toBeVisible();
        await capture("preview");
        const [response] = await Promise.all([
          page.waitForResponse("**/api/enrollments/import/apply"),
          page.getByRole("button", { name: "Aplicar matrículas", exact: true }).click(),
        ]);
        expect(response.status()).toBe(200);
        await expect(page.locator(".enrollment-notice.ok")).toBeVisible();
        await capture("persisted");
      }
    } else {
      const system = id.includes("moodle") ? "Moodle" : "ADECCA";
      const details = page.locator("details.classroom-imports");
      if (
        (await details.count()) > 0 &&
        !(await details.evaluate((el: HTMLDetailsElement) => el.open))
      ) {
        await details.locator("summary").click();
      }
      await page.getByRole("button", { name: new RegExp(`Importar.*${system}`) }).click();
      const dialog = page.getByRole("dialog", { name: `Importar desde ${system} UBB` });
      await expect(dialog).toBeVisible();
      if (id.endsWith("invalid")) {
        await dialog.locator('input[type="file"]').setInputFiles({
          name: system === "Moodle" ? "invalid.mbz" : "invalid.zip",
          mimeType: "application/zip",
          buffer: Buffer.from("invalid archive"),
        });
        await expect(dialog.getByRole("alert")).toBeVisible();
      } else if (id.endsWith("persistence")) {
        await dialog
          .locator('input[type="file"]')
          .setInputFiles(system === "Moodle" ? QA_ASSETS.moodle : QA_ASSETS.adecca);
        const submit = dialog.getByRole("button", {
          name: system === "Moodle" ? "Restaurar en esta sección" : "Importar en esta sección",
          exact: true,
        });
        await expect(submit).toBeEnabled();
        await capture("preview");
        await submit.click();
        await expect(
          dialog.getByRole("button", { name: "Cerrar", exact: true }).last()
        ).toBeVisible();
        await dialog.getByRole("button", { name: "Cerrar", exact: true }).last().click();
        const title = `Aviso importado ${system} QA`;
        await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(1);
        await page.reload();
        await course(page);
        await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(1);
        await capture("persisted");
      }
    }
    return true;
  }
  if (id.startsWith("interop.")) {
    await classroomTab(page, "Recursos externos");
    await expect(
      page.getByRole("heading", { name: "Herramientas y objetos de aprendizaje", exact: true })
    ).toBeVisible();
    if (id === "interop.empty")
      await expect(
        page.getByText("Esta sección aún no tiene recursos externos", { exact: true })
      ).toBeVisible();
    else if (id === "interop.authoring") {
      await page.locator(".interop-authoring:not(.interop-admin) > summary").click();
      await expect(
        page.getByRole("heading", { name: "Objeto de aprendizaje", exact: true })
      ).toBeVisible();
    } else if (id === "interop.registration") {
      await page.locator(".interop-admin > summary").click();
      await expect(page.getByLabel("Nombre de la herramienta", { exact: true })).toBeVisible();
    } else if (id === "interop.resources")
      await expect(page.locator(".interop-resource-list li").first()).toBeVisible();
    else {
      const title = {
        "interop.scorm": "QA SCORM",
        "interop.xapi": "QA xAPI",
        "interop.lti": "QA LTI",
      }[id];
      if (!title) throw new Error(`Unknown interop scenario ${id}`);
      const resource = page.locator(".interop-resource-list li").filter({ hasText: title });
      await expect(resource).toBeVisible();
      if (id === "interop.lti") {
        // The genuine launch endpoint is checked without contacting a third-party provider.
        await page.context().route("https://qa-tool.invalid/**", (route) =>
          route.fulfill({
            contentType: "text/html",
            body: '<!doctype html><html lang="es"><head><title>QA LTI contract</title></head><body><main><h1>Proveedor LTI sintético QA</h1><p>Contrato de lanzamiento recibido; entrega externa no verificada.</p></main></body></html>',
          })
        );
        const [response] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().includes("/interop/") && response.request().method() === "POST"
          ),
          resource.getByRole("button", { name: "Abrir", exact: true }).click(),
        ]);
        expect(response.status()).toBe(200);
        expect(await response.text()).toContain("client_id");
        await expect(
          page.getByRole("heading", { name: "Proveedor LTI sintético QA" })
        ).toBeVisible();
      } else {
        await resource.getByRole("button", { name: "Abrir", exact: true }).click();
        await expect(page.getByRole("region", { name: title, exact: true })).toBeVisible();
        const frame = page.frameLocator(`iframe[title="${title}"]`).frameLocator("iframe#sco");
        await expect(frame.locator("body")).toContainText("QA");
        await capture("activity");
        const [saved] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              (id === "interop.scorm"
                ? response.url().endsWith("/progress")
                : response.url().endsWith("/statements"))
          ),
          frame.getByRole("button", { name: "Completar actividad", exact: true }).click(),
        ]);
        expect(saved.ok()).toBe(true);
        await expect(frame.getByRole("status")).toHaveText("Actividad completada");
        await capture("completed");
      }
    }
    return true;
  }
  return false;
}
