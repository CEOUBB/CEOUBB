import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { dirname } from "node:path";
import { readFile } from "node:fs/promises";

// UI, agregador, validación, mappers y adaptador de calendario reales.
// Sólo el SDK de transporte se sustituye; nunca escribe datos de producción.
const transport = `
let sequence = 0, fail = false;
const rows = new Map();
const listeners = new Set();
function emit(listener) {
 if (!listeners.has(listener)) return;
 let docs = [...rows].map(([id, value]) => ({id, data:()=>value}));
 for (const c of listener.q) if (c.type==='where') docs = docs.filter(d=>c.op==='>='?d.data()[c.field]>=c.value:d.data()[c.field]<=c.value);
 docs.sort((a,b)=>a.data().date.localeCompare(b.data().date)||a.id.localeCompare(b.id));
 const cursor=listener.q.find(c=>c.type==='cursor');
 if(cursor) docs=docs.filter(d=>d.data().date>cursor.value.data().date || (d.data().date===cursor.value.data().date && d.id>cursor.value.id));
 docs=docs.slice(0,listener.q.find(c=>c.type==='limit').value);
 listener.next({docs,size:docs.length});
}
function notify(){for(const l of [...listeners])queueMicrotask(()=>emit(l));}
function check(){if(fail){fail=false;throw {code:'unavailable'};}}
export function failNext(){fail=true;}
export function remote(){rows.set('remote',{title:'Cambio desde otro dispositivo',detail:'',date:'2026-09-15',startTime:'14:00',endTime:'15:00',courseId:null,kind:'study',completed:false});notify();}
export function bulk(){for(let i=0;i<205;i++)rows.set('bulk-'+String(i).padStart(3,'0'),{title:'Sesión '+i,detail:'',date:'2026-09-15',startTime:'14:00',endTime:'15:00',courseId:null,kind:'study',completed:false});notify();}
export function clear(){rows.clear();notify();}
export function count(){return rows.size;}
export const currentUser=async()=>({uid:'demo'});
export const firestore=async()=>({db:{},sdk:{
 collection:(_db,...path)=>path.join('/'), doc:(parent,id)=>({id:id??'event-'+String(++sequence).padStart(4,'0')}),
 where:(field,op,value)=>({type:'where',field,op,value}), orderBy:()=>({type:'order'}), documentId:()=> '__name__',
 limit:value=>({type:'limit',value}), startAfter:value=>({type:'cursor',value}),query:(...args)=>args.slice(1),serverTimestamp:()=>0,
 onSnapshot:(q,next)=>{const l={q,next};listeners.add(l);queueMicrotask(()=>emit(l));return()=>listeners.delete(l);},
 writeBatch:()=>{const pending=[];return {set:(ref,value)=>pending.push([ref.id,value]),commit:async()=>{check();for(const [id,v]of pending)rows.set(id,v);notify();}};},
 updateDoc:async(ref,value)=>{check();rows.set(ref.id,{...rows.get(ref.id),...value});notify();},
 deleteDoc:async(ref)=>{check();rows.delete(ref.id);notify();}
}});
`;

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {LazyMotion,domAnimation} from 'motion/react';
import {CalendarView} from './app/views/calendar/CalendarView';import {failNext,remote,bulk,clear,count} from './lib/firebase/sdk';
const courses=[{id:'edo',name:'Ecuaciones Diferenciales',tone:'#7351b5'}];
createRoot(document.getElementById('root')).render(<LazyMotion features={domAnimation}><div className='app-shell' style={{display:'block'}}><main style={{padding:20,maxWidth:1440,margin:'auto'}}><CalendarView courses={courses} gradebooks={[{courseId:'edo',items:[{id:'c1',name:'Certamen 1',weight:30,date:'2026-09-15'}]}]} activity={[{id:'p1',courseId:'edo',title:'Informe de laboratorio',dueDate:'2026-09-15'}]} openCourse={()=>{document.getElementById('course').textContent='Aula abierta';}}/><p id='course'/><div aria-label='Controles de prueba'><button onClick={failNext}>Simular fallo</button><button onClick={remote}>Cambio remoto</button><button onClick={bulk}>Cargar 205 sesiones</button><button onClick={clear}>Vaciar transporte</button><button onClick={()=>document.getElementById('count').textContent=String(count())}>Contar documentos</button><output id='count'/></div></main></div></LazyMotion>);
`,
      loader: "jsx",
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "calendar-transport",
        setup(builder) {
          builder.onLoad({ filter: /firebase-classroom-client\.ts$/ }, ({ path }) => ({
            contents: 'export * from "./firebase/calendar.ts";',
            loader: "ts",
            resolveDir: dirname(path),
          }));
          builder.onLoad({ filter: /firebase[\\/]sdk\.ts$/ }, () => ({
            contents: transport,
            loader: "js",
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const styles = await page.evaluate(() => ({
    head: [...document.querySelectorAll('link[rel="stylesheet"],style')]
      .map((node) => node.outerHTML)
      .join(""),
    body: document.body.className,
    html: document.documentElement.className,
  }));
  await page.route("**/__calendar", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html class="${styles.html}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${styles.head}</head><body class="${styles.body}"><div id="root"></div></body></html>`,
    })
  );
  await page.goto("/__calendar");
  await page.addScriptTag({ content: bundle });
  await page.addStyleTag({ content: await readFile("app/campus.css", "utf8") });
  await page.getByLabel("Ir a una fecha").fill("2026-09-15");
  await expect(page.getByText("Sincronizando bloques…")).toHaveCount(0);
});

test("gesto táctil nativo crea un intervalo y conserva desplazamiento fuera del modo selección", async ({
  page,
}) => {
  await expect(page.locator(".planner-slot").first()).toHaveCSS("touch-action", "auto");
  await page.getByRole("button", { name: "Selección táctil desactivada" }).click();
  const slot = page.locator('.planner-col[data-day="2026-09-15"] .planner-slot').nth(1);
  await slot.scrollIntoViewIfNeeded();
  await expect(slot).toHaveCSS("touch-action", "none");
  const box = await slot.boundingBox();
  if (!box) throw new Error("Falta hora táctil");
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: box.y + 2 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: box.y + box.height * 1.5 }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Desde", { exact: true })).toHaveValue("09:00");
  await expect(page.getByLabel("Hasta", { exact: true })).toHaveValue("10:45");
  await page.getByLabel("Título", { exact: true }).fill("Bloque táctil");
  await page.getByRole("button", { name: "Guardar bloque" }).click();
  const handle = page.getByRole("button", { name: "Mover “Bloque táctil”", exact: true });
  const from = await handle.boundingBox();
  if (!from) throw new Error("Falta control táctil");
  const moveX = from.x + from.width / 2;
  const moveY = from.y + from.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: moveX, y: moveY }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: moveX, y: moveY + box.height }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(".planner-block small")).toContainText("10:00–11:45");
  await session.detach();
});

test("mes, teclado, recurrencia atómica, error y páginas reactivas", async ({ page }, info) => {
  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await expect(page.locator(".planner-month-day")).toHaveCount(35);
  await expect(page.locator(".planner-day-agenda")).toContainText("Certamen 1");
  await expect(page.locator(".planner-day-agenda")).toContainText("Informe de laboratorio");
  await page.locator('.planner-month-day[aria-pressed="true"]').press("ArrowRight");
  await expect(page.locator('.planner-month-day[aria-pressed="true"]')).toHaveAttribute(
    "aria-label",
    /2026-09-16/
  );
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(page.getByLabel("Ir a una fecha")).toHaveValue("2026-10-01");
  await page.getByLabel("Ir a una fecha").fill("2026-09-15");
  await page.getByRole("button", { name: "Añadir bloque" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Clase de EDO");
  await page.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("clase");
  await page.getByRole("combobox", { name: "Repetición", exact: true }).selectOption("weekly");
  await page.getByLabel("Repetir hasta").fill("2026-09-29");
  await page.getByRole("button", { name: "Guardar bloque" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Contar documentos" }).click();
  await expect(page.locator("#count")).toHaveText("3");
  await page.getByRole("button", { name: "Cambio remoto", exact: true }).click();
  await expect(page.locator(".planner-day-agenda")).toContainText("Cambio desde otro dispositivo");
  await page.screenshot({
    path: `test-results/ceo72-month-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBeTruthy();
  await page.getByRole("button", { name: "Simular fallo" }).click();
  await page.getByRole("button", { name: "Añadir bloque" }).click();
  await page.getByLabel("Título", { exact: true }).fill("No debe guardarse");
  await page.getByRole("combobox", { name: "Repetición", exact: true }).selectOption("weekly");
  await page.getByLabel("Repetir hasta").fill("2026-09-29");
  await page.getByRole("button", { name: "Guardar bloque" }).click();
  await expect(page.getByRole("alert")).toContainText("Sin conexión");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Contar documentos" }).click();
  await expect(page.locator("#count")).toHaveText("4");
  await page.getByRole("button", { name: "Cargar 205 sesiones" }).click();
  await expect(page.locator(".planner-day-agenda li")).toHaveCount(209);
  await page.getByRole("button", { name: "Vaciar transporte" }).click();
  await expect(page.locator(".planner-day-agenda li")).toHaveCount(2);
});

test("crear y mover por puntero, teclado y cancelación", async ({ page }, info) => {
  const slot = page.locator('.planner-col[data-day="2026-09-15"] .planner-slot').nth(1);
  await slot.scrollIntoViewIfNeeded();
  const bounds = await slot.boundingBox();
  if (!bounds) throw new Error("Falta hora visible");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height * 1.5, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Desde", { exact: true })).toHaveValue("09:00");
  await expect(page.getByLabel("Hasta", { exact: true })).toHaveValue("10:45");
  await page.getByLabel("Título", { exact: true }).fill("Preparar certamen");
  await page.getByRole("button", { name: "Guardar bloque" }).click();
  const handle = page.getByRole("button", { name: "Mover “Preparar certamen”", exact: true });
  await expect(handle).toBeVisible();
  const from = await handle.boundingBox();
  if (!from) throw new Error("Falta control Mover");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + bounds.height, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator(".planner-block small")).toContainText("10:00–11:45");
  await page.screenshot({
    path: `test-results/ceo72-week-${info.project.name}.png`,
    fullPage: true,
  });
  await handle.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Fecha", { exact: true }).fill("2026-09-16");
  await page.getByRole("button", { name: "Guardar bloque" }).click();
  await slot.scrollIntoViewIfNeeded();
  const cancelBounds = await slot.boundingBox();
  if (!cancelBounds) throw new Error("Falta hora para cancelar");
  await page.mouse.move(cancelBounds.x + 20, cancelBounds.y + 5);
  await page.mouse.down();
  await page.mouse.move(cancelBounds.x + 20, cancelBounds.y + cancelBounds.height, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".planner-drag-preview")).toHaveCount(0);
  await slot.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
});
