import { expect, test } from "@playwright/test";
import { build } from "esbuild";

// Datos sintéticos y transporte aislado: nunca escribe en Firebase.
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CommunicationsCenter } from './app/views/CommunicationsCenter';
import { COURSES } from './lib/courses';
const courses = COURSES.slice(0, 2);
const root = document.createElement('div');
document.querySelector('.communications-center').replaceWith(root);
const user = {id:'student-demo', name:'Estudiante de prueba', email:'demo@alumnos.ubiobio.cl', role:'student'};
createRoot(root).render(<CommunicationsCenter user={user} courses={courses}
 memberships={courses.map(c => ({sectionId:c.id,role:'student'}))}
 activity={courses.map((c,i) => ({id:'notice-'+i,courseId:c.id,kind:i ? 'assessment' : 'notice',title:i ? 'Evaluación de la unidad: contenidos y orientaciones' : 'Material de apoyo para la próxima clase',dueDate:'',createdAt:'2026-09-08T14:00:00Z'}))}
 threads={courses.slice(0,1).map(c => ({id:user.id,courseId:c.id,studentId:user.id,studentName:user.name,studentEmail:user.email,latestBody:'Puedes revisar el desarrollo en la guía de esta semana.',latestAuthorId:'teacher',latestAuthorName:'Equipo docente',createdAt:'2026-09-08T13:00:00Z',updatedAt:'2026-09-08T14:00:00Z'}))}
 cursors={[]} connectionError='' openCourse={() => { document.querySelector('h1').textContent='Aula abierta'; }} />);
`;

const transport = `
let notify;
let messages = [];
export function watchDirectMessages(courseId, threadId, onChange) {
 messages = courseId === 'estatica' ? [
 {id:'1',authorId:threadId,authorName:'Estudiante',body:'Tengo una duda con el equilibrio de fuerzas del ejercicio 3. ¿Debemos considerar el peso de la barra?',createdAt:'2026-09-08T13:00:00Z'},
 {id:'2',authorId:'teacher',authorName:'Equipo docente',body:'Sí, considera el peso aplicado en su centro de gravedad. Puedes revisar el desarrollo en la guía de esta semana.',createdAt:'2026-09-08T14:00:00Z'}] : [];
 notify = onChange; onChange([...messages]); return () => { notify = undefined; };
}
export async function markCommunicationRead() {}
export async function sendDirectMessage(courseId, threadId, body) {
 if(body === 'Simular error') throw new Error('No se pudo enviar el mensaje. Inténtalo nuevamente.');
 messages.push({id:'sent-'+messages.length,authorId:threadId,authorName:'Estudiante',body,createdAt:'2026-09-08T14:05:00Z'});
 notify?.([...messages]);
}
`;

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: fixture, loader: "jsx", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "communications-test-transport",
        setup(builder) {
          builder.onLoad({ filter: /firebase-classroom-client\.ts$/ }, () => ({
            contents: transport,
            loader: "js",
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});

for (const width of [1918, 1440, 900, 390]) {
  test(`comunicaciones: bandeja, teclado y redactor a ${width}px`, async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const login = await context.request.post("/api/auth/dev-login", { data: { role: "student" } });
    expect(login.ok()).toBeTruthy();
    await page.goto("/");
    await page.getByRole("button", { name: "Entrar al aula de Termodinámica I" }).waitFor();
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: "Buscar ramos y vistas" }).fill("Avisos");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Novedades de tus ramos" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `.impeccable/review/communications-empty-${width}.png`,
      fullPage: true,
    });
    await page.addScriptTag({ content: bundle });
    const center = page.locator(".communications-center");
    await expect(center.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      width <= 1000 ? "horizontal" : "vertical"
    );
    await expect(center.getByRole("button", { name: /Material de apoyo/ })).toBeVisible();
    await page.screenshot({
      path: `.impeccable/review/communications-announcements-${width}.png`,
      fullPage: true,
    });
    await center.getByRole("tab", { name: /Avisos/ }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(center.getByRole("tab", { name: /Mensajes/ })).toBeFocused();
    const search = center.getByRole("searchbox", { name: "Buscar conversaciones" });
    await search.fill("sin coincidencias");
    await expect(center.getByText("No hay conversaciones para", { exact: false })).toBeVisible();
    await center.getByRole("button", { name: "Limpiar búsqueda" }).click();
    await expect(center.locator(".conversation-row")).toHaveCount(2);
    await center.locator(".conversation-row").first().click();
    await expect(center.getByText("Sí, considera el peso", { exact: false })).toBeVisible();
    const send = center.getByRole("button", { name: "Enviar mensaje" });
    await expect(send).toBeDisabled();
    const body = center.getByLabel("Mensaje", { exact: true });
    await body.fill("Simular error");
    await send.click();
    await expect(center.getByRole("alert")).toContainText("No se pudo enviar");
    await expect(body).toHaveValue("Simular error");
    await body.fill("Gracias, ahora entiendo cómo plantear el equilibrio.");
    await send.click();
    await expect(center.getByRole("status")).toContainText("Mensaje enviado");
    await expect(body).toHaveValue("");
    await expect(body).toBeFocused();
    await expect(center.locator(".message-bubble").last()).toContainText("Gracias, ahora entiendo");
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width <= 700) {
      const composer = await send.boundingBox();
      const navigation = await page.locator(".mobile-nav").boundingBox();
      expect(composer).not.toBeNull();
      expect(navigation).not.toBeNull();
      expect(composer!.y + composer!.height).toBeLessThanOrEqual(navigation!.y);
    }
    await page.screenshot({
      path: `.impeccable/review/communications-messages-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).toBeTruthy();
    await body.fill("Consulta de prueba para verificar el desplazamiento. ".repeat(30));
    await send.click();
    await expect(body).toHaveValue("");
    const history = center.locator(".message-history");
    await expect
      .poll(() => history.evaluate((node) => node.scrollHeight > node.clientHeight))
      .toBe(true);
    await expect
      .poll(() =>
        history.evaluate((node) => Math.abs(node.scrollHeight - node.clientHeight - node.scrollTop))
      )
      .toBeLessThan(2);
    if (width <= 700)
      await center.getByRole("button", { name: "Volver a las conversaciones" }).click();
    await center.locator(".conversation-row").nth(1).click();
    await expect(
      center.getByRole("heading", { name: "La conversación empieza aquí" })
    ).toBeVisible();
    await expect(body).toBeVisible();
  });
}
