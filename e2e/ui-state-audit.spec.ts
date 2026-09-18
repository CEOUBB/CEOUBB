import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";

// Isolated transport: these checks never write academic data to Firebase.
const fixture = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CommunicationsCenter} from './app/views/CommunicationsCenter';
import {GradebookSettingsEditor} from './app/views/classroom/GradebookSettingsEditor';
import {InteropSection} from './app/views/classroom/InteropSection';
import {QuizzesSection} from './app/views/classroom/QuizzesSection';
import {COURSES} from './lib/courses';
function Fixture() {
 const [ready,setReady] = useState(false);
 const [error,setError] = useState('');
 return <main style={{padding:16}}>
  <button onClick={()=>setError('No se pudieron actualizar los avisos.')}>Simular desconexión</button>
  <CommunicationsCenter user={{id:'demo',name:'Estudiante',email:'demo@alumnos.ubiobio.cl',role:'student'}}
   courses={[COURSES[0]]} memberships={[{sectionId:COURSES[0].id,role:'student'}]} activity={[]} threads={[]} cursors={[]}
   ready={ready} connectionError={error} retry={()=>{setError('');setReady(true);}} openCourse={()=>{}} />
  <GradebookSettingsEditor courseId='fixture' disabled={!ready || !!error}
   gradebook={[{id:'one',name:'Certamen',weight:100,date:''}]} exemption={5.5} />
  <InteropSection sectionId='fixture' canTeach={false} readOnly={false} note={()=>{}} />
  <section aria-label='Cuestionarios de prueba'><QuizzesSection course={COURSES[0]} classroom={{}} canTeach={false} readOnly={false} note={()=>{}} /></section>
 </main>;
}
createRoot(document.getElementById('fixture')).render(<Fixture/>);
`;
const transport = `
export async function saveGradebook(){ document.body.dataset.saved = 'true'; }
let messageAttempts = 0, quizAttempts = 0;
export function watchDirectMessages(_,__,onChange,onError){
 if(messageAttempts++ === 0) onError('No se pudo cargar esta conversación.'); else onChange([]);
 return ()=>{};
}
export async function markCommunicationRead(){}
export async function sendDirectMessage(){}
export function watchQuizzes(_,__,onChange,onError){
 if(quizAttempts++ === 0) onError('No se pudieron cargar los controles.'); else onChange([]);
 return ()=>{};
}
export async function publishQuiz(){}
export async function loadOwnQuizResult(){}
export async function saveQuizAnswer(){}
export async function startQuizAttempt(){}
export async function submitQuizAttempt(){}
`;
let bundle: string;
let subscriptionsBundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: fixture, loader: "jsx", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
    plugins: [
      {
        name: "isolated-academic-transport",
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
  const subscriptions = await build({
    stdin: {
      loader: "js",
      resolveDir: process.cwd(),
      contents: `
      import {watchCommunications} from './lib/firebase/communications';
      import {watchCourseActivity, watchClassroom} from './lib/firebase/posts';
      import {listeners} from './lib/firebase/sdk';
      window.checkSubscriptions = async () => {
        const check = (value, message) => {if (!value) throw new Error(message);};
        const tick = () => new Promise(resolve=>setTimeout(resolve,0));
        let state, error;
        const stop = watchCommunications([{sectionId:'one',role:'student'},{sectionId:'two',role:'student'}], 'student', value=>state=value, value=>error=value);
        await tick();
        listeners.get('users/demo/notificationReads').next({docs:[]});
        listeners.get('courses/one/messageThreads/demo').next({exists:()=>false});
        check(!state.ready, 'A partial snapshot must not mark the inbox ready');
        listeners.get('courses/two/messageThreads/demo').error({code:'permission-denied'});
        listeners.get('courses/one/messageThreads/demo').next({exists:()=>false});
        check(!state.ready && error, 'A healthy section must not clear another section failure');
        listeners.get('courses/two/messageThreads/demo').next({exists:()=>false});
        check(state.ready && !error, 'All snapshots must recover before marking the inbox ready');
        stop(); listeners.clear();
        let ready;
        const stopActivity = watchCourseActivity(['one','two'], (_,value)=>ready=value, value=>error=value);
        await tick();
        listeners.get('courses/one/posts').next({docs:[]});
        check(!ready, 'Partial announcements must stay pending');
        listeners.get('courses/two/posts').error({});
        listeners.get('courses/one/posts').next({docs:[]});
        check(!ready && error, 'Announcement failures must survive healthy section updates');
        listeners.get('courses/two/posts').next({docs:[]});
        check(ready && !error, 'Announcements recover when every section succeeds');
        stopActivity(); listeners.clear();
        let classroom = {};
        const stopClassroom = watchClassroom('one', false, patch=>Object.assign(classroom,patch), ()=>{});
        check(classroom.gradebookStatus==='loading', 'Gradebook begins unavailable for editing');
        await tick();
        const gradebook = listeners.get('courses/one/meta/gradebook');
        gradebook.error({});
        check(classroom.gradebookStatus==='error', 'Gradebook failure must not become an empty ready scheme');
        gradebook.next({exists:()=>false});
        check(classroom.gradebookStatus==='ready' && classroom.gradebook.length===0, 'A confirmed absent scheme is genuinely empty');
        stopClassroom();
      };
    `,
    },
    bundle: true,
    write: false,
    format: "iife",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "isolated-firestore",
        setup(builder) {
          builder.onLoad({ filter: /firebase[\\/]sdk\.ts$/ }, () => ({
            loader: "js",
            contents: `
        export const listeners = new Map();
        const sdk = {
          collection: (_, ...parts)=>parts.join('/'), doc: (_, ...parts)=>parts.join('/'),
          query: value=>value, orderBy: ()=>{}, limit: ()=>{},
          onSnapshot: (key,next,error)=>{listeners.set(key,{next,error});return ()=>listeners.delete(key);}
        };
        export const firestore = async()=>({sdk,db:{}});
        export const currentUser = async()=>({uid:'demo',email:'demo@alumnos.ubiobio.cl'});
        export const isDevOrLocalEnvironment = ()=>false;
        export const emailOf = user=>user.email;
        export const authorFields = ()=>({});
        export const cloudStorage = ()=>{};
        export const cloudFunctions = ()=>{};
      `,
          }));
          builder.onLoad({ filter: /firebase[\\/]profile\.ts$/ }, () => ({
            loader: "js",
            contents: `export const syncProfile = async()=>({uid:'demo',email:'demo@alumnos.ubiobio.cl'});`,
          }));
        },
      },
    ],
  });
  subscriptionsBundle = subscriptions.outputFiles[0].text;
});

test("suscripciones: parciales, errores independientes y recuperación", async ({ page }) => {
  await page.goto("/preview/docente");
  await page.addScriptTag({ content: subscriptionsBundle });
  await page.evaluate("window.checkSubscriptions()");
});

for (const width of [320, 390, 1440]) {
  test(`diálogo docente: cerrado, abierto y Escape a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/preview/docente");
    const dialog = page.locator("dialog").filter({ has: page.locator("#student-preview-title") });
    await expect(dialog).toBeHidden();
    const trigger = page.getByRole("button", { name: "Vista estudiante", exact: true });
    await trigger.click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((node) => node.matches(":modal"))).toBe(true);
    const close = dialog.getByRole("button", { name: "Cerrar Vista estudiante" });
    await expect(close).toBeInViewport();
    await expect(
      dialog.getByRole("heading", { name: "Vista del estudiante", exact: true })
    ).toBeVisible();
    const activities = await dialog
      .getByRole("region", { name: "Actividades del ramo", exact: true })
      .boundingBox();
    const result = await dialog
      .getByRole("region", { name: "Calificación", exact: true })
      .boundingBox();
    if (width < 768) expect(result!.y).toBeGreaterThan(activities!.y + activities!.height);
    else expect(result!.x).toBeGreaterThan(activities!.x + activities!.width);
    const firstActivity = dialog.locator("ol li").first();
    const title = await firstActivity.locator("strong").boundingBox();
    const deadline = await firstActivity.locator("time").boundingBox();
    expect(deadline!.y).toBeGreaterThan(title!.y + title!.height);
    const scrollAudit = await new AxeBuilder({ page })
      .include("dialog:modal")
      .withRules(["scrollable-region-focusable", "color-contrast"])
      .analyze();
    expect(scrollAudit.violations).toEqual([]);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(width < 768 ? 0 : 15);
    // Desktop Chrome reserves the root's stable scrollbar gutter at mobile widths.
    if (width < 768)
      expect(bounds!.width).toBe(
        await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).width))
      );
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    await page.screenshot({ path: `.impeccable/review/audit-dialog-${width}.png` });
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test(`aula: acciones agrupadas y directorio a ${width}px`, async ({ page, context }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      (await context.request.post("/api/auth/dev-login", { data: { role: "teacher" } })).ok()
    ).toBe(true);
    await page.goto("/");
    await page.locator(".account-menu summary").click();
    const targets = await page
      .locator(".account-popover button")
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((height) => height >= 44)).toBe(true);
    await page.locator(".account-menu summary").click();
    await page.getByRole("button", { name: "Entrar al aula de Termodinámica I" }).click();
    if (width < 768)
      await page.getByRole("button", { name: "Entrar al aula", exact: true }).click();
    await expect(page.getByRole("tablist", { name: "Secciones del aula" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Moodle", exact: true })).toBeHidden();
    await page.locator(".classroom-imports summary").click();
    await page.locator(".classroom-import-actions button").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Ningún archivo seleccionado")).toBeVisible();
    await dialog.locator("input[type=file]").setInputFiles({
      name: "curso-de-prueba.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid archive"),
    });
    await expect(dialog.getByText("curso-de-prueba.txt", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.locator(".classroom-imports summary").click();
    await page.getByRole("button", { name: "Ver participantes", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Participantes", exact: true })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(
      page.getByRole("region", { name: "Personas del ramo", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Sin estudiantes", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: `.impeccable/review/audit-classroom-${width}.png`,
      fullPage: true,
    });
  });
}

for (const width of [390, 1440]) {
  test(`carga, error y recuperación sin guardado accidental a ${width}px`, async ({ page }) => {
    page.on("pageerror", (error) => {
      throw error;
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/preview/docente");
    const styles = await page
      .locator("link[rel=stylesheet]")
      .evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join(""));
    await page.route("**/ui-state-fixture", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html lang="es"><head><meta charset="utf-8">${styles}<style>${readFileSync("app/views/classroom/interop.css", "utf8")}</style></head><body><div id="fixture"></div></body></html>`,
      })
    );
    let unavailable = true;
    await page.route("**/api/courses/fixture/interop", (route) =>
      route.fulfill({
        status: unavailable ? 403 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          unavailable ? { error: "Origen no autorizado" } : { items: [], nextCursor: null }
        ),
      })
    );
    await page.goto("/ui-state-fixture");
    await page.addScriptTag({ content: bundle });
    const save = page.getByRole("button", { name: "Guardar esquema", exact: true });
    await expect(page.getByRole("heading", { name: "Cargando avisos…" })).toBeVisible();
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Simular desconexión" }).click();
    await expect(page.getByRole("heading", { name: "Avisos no disponibles" })).toBeVisible();
    await expect(page.getByText("Todo al día", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Evaluación", { exact: true })).toHaveValue("Certamen");
    await expect(save).toBeDisabled();
    expect(await page.locator("body").getAttribute("data-saved")).toBeNull();
    await expect(
      page.getByText("No se pudieron cargar los recursos externos", { exact: false })
    ).toBeVisible();
    await page.screenshot({ path: `.impeccable/review/audit-error-${width}.png`, fullPage: true });
    await page
      .locator(".communications-center")
      .getByRole("button", { name: "Reintentar" })
      .click();
    await expect(page.getByRole("heading", { name: "Todo al día" })).toBeVisible();
    const quizzes = page.getByRole("region", { name: "Cuestionarios de prueba" });
    await expect(
      quizzes.getByRole("heading", { name: "No se pudieron actualizar los cuestionarios" })
    ).toBeVisible();
    await expect(
      quizzes.getByText("No hay cuestionarios disponibles", { exact: true })
    ).toHaveCount(0);
    await quizzes.getByRole("button", { name: "Reintentar" }).click();
    await expect(
      quizzes.getByText("No hay cuestionarios disponibles", { exact: true })
    ).toBeVisible();
    const center = page.locator(".communications-center");
    await center.getByRole("tab", { name: /Mensajes/ }).click();
    await center.locator(".conversation-row").first().click();
    await expect(
      center.getByRole("heading", { name: "No se pudo cargar la conversación" })
    ).toBeVisible();
    await center.getByLabel("Mensaje", { exact: true }).fill("Borrador que debe conservarse");
    await center.getByRole("button", { name: "Reintentar conversación" }).click();
    await expect(
      center.getByRole("heading", { name: "La conversación empieza aquí" })
    ).toBeVisible();
    await expect(center.getByLabel("Mensaje", { exact: true })).toHaveValue(
      "Borrador que debe conservarse"
    );
    if (width < 700)
      await center.getByRole("button", { name: "Volver a las conversaciones" }).click();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.locator("body")).toHaveAttribute("data-saved", "true");
    unavailable = false;
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(
      page.getByText("No se pudieron cargar los recursos externos", { exact: false })
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}
