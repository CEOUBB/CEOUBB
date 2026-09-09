import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";

// Componentes reales; datos sintéticos y callbacks sin escrituras remotas.
const fixture = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {StudentGradesSummary, TeacherStudentRow} from './app/views/classroom/GradesSection';
import {SubmissionSlot} from './app/views/classroom/SubmissionSlot';
import {PostsSection} from './app/views/classroom/PostsSection';
import {BlockDialog} from './app/views/calendar/BlockDialog';
import {PublishConfirmDialog} from './app/views/classroom/PublishPanels';
const user = {id:'demo',name:'Docente Demo',email:'docente@ubiobio.cl',role:'teacher'};
const item = {id:'exam',name:'Certamen 1',weight:35,date:'2026-09-25',submissionMode:'individual'};
function Fixture() {
 const [dialog,setDialog] = useState('');
 const [deleted,setDeleted] = useState(false);
 return <main style={{maxWidth:1040,margin:'24px auto',padding:20}}>
 <h1>Revisión de los elementos de la PR 178</h1>
 <section style={{maxWidth:340,margin:'24px 0'}}><StudentGradesSummary summary={{average:6.8,gradedWeight:70,totalWeight:100,complete:false}} passing={{state:'secured'}} exempt={{state:'required',grade:2.6}} exemptionTarget={5.5} status={{text:'',tone:'ok'}} /></section>
 <section style={{width:200,marginBottom:24}}><SubmissionSlot item={item} receipt={{fileName:'informe_laboratorio_termodinamica.pdf',contentType:'application/pdf',size:1024000,createdAt:'2026-09-08T12:00:00Z',memberIds:['demo'],sha256:'e3b0c44298fc123456789'}} percent={null} onPick={()=>{}} readOnly={false}/></section>
 <div className='grades-matrix'><TeacherStudentRow student={{userId:'demo',name:'Estudiante Demo',email:'estudiante@alumnos.ubiobio.cl'}} gradebook={[item]} scores={{}} feedback={{}} readOnly={false} onEditFeedback={()=>{}} onViewHistory={()=>{}} onSetScore={async(_u,_i,v)=>{await new Promise(r=>setTimeout(r,400)); return v !== '99';}} /></div>
 <PostsSection posts={deleted?[]:[{id:'post',kind:'notice',title:'Bienvenida e inicio de clases',body:'Revisa las guías y las fechas de evaluación del semestre.',authorId:'demo',authorName:user.name,authorEmail:user.email,createdAt:'2026-09-09T12:00:00Z',folder:'Avisos',attachments:[]}]} user={user} canManageContent={true} editPost={async()=>true} deletePost={()=>setDeleted(true)} openAttachment={()=>{}} startPublication={()=>{}} />
 <div className='confirmation-actions' style={{marginTop:24}}><button onClick={()=>setDialog('block')}>Editar bloque de prueba</button><button onClick={()=>setDialog('discard')}>Descartar borrador de prueba</button></div>
 {dialog==='block' && <BlockDialog draft={{id:'block',title:'Preparar certamen',detail:'',date:'2026-09-10',startTime:'10:00',endTime:'11:00',courseId:'',kind:'study'}} courses={[]} onClose={()=>setDialog('')} onFail={()=>{}}/>}
 {dialog==='discard' && <PublishConfirmDialog title='¿Descartar publicación?' message={<p>Los cambios no guardados se perderán.</p>} isDestructive confirmLabel='Descartar' cancelLabel='Seguir editando' onConfirm={()=>setDialog('')} onCancel={()=>setDialog('')} />}
 </main>;
}
const root=document.createElement('div');
document.body.replaceChildren(root);
createRoot(root).render(<Fixture/>);
`;

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: fixture, loader: "jsx", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    loader: { ".css": "empty", ".module.css": "empty" },
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
    plugins: [
      {
        name: "expose-existing-grade-components",
        setup(builder) {
          builder.onLoad({ filter: /GradesSection\.tsx$/ }, async ({ path }) => ({
            contents: `${await readFile(path, "utf8")}\nexport { StudentGradesSummary, TeacherStudentRow };`,
            loader: "tsx",
            resolveDir: dirname(path),
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});

for (const width of [1440, 390]) {
  test(`PR 178: comprobante, guardado y confirmaciones a ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => document.styleSheets.length > 0);
    const documentStyles = await page.evaluate(() => ({
      head: [...document.querySelectorAll('link[rel="stylesheet"], style')]
        .map((el) => el.outerHTML)
        .join(""),
      bodyClass: document.body.className,
      htmlClass: document.documentElement.className,
    }));
    await page.route("**/__pr178_fixture", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html class="${documentStyles.htmlClass}"><head>${documentStyles.head}</head><body class="${documentStyles.bodyClass}"></body></html>`,
      })
    );
    await page.goto("/__pr178_fixture");
    await page.addScriptTag({ content: bundle });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".receipt-confirmed-badge")).toHaveCSS("font-size", "12px");
    await expect(page.locator(".receipt-confirmed-badge")).toHaveText("Entrega recibida");
    expect(
      await page
        .locator(".receipt-confirmed-badge")
        .evaluate((el) => el.scrollWidth <= el.clientWidth)
    ).toBeTruthy();
    await expect(page.locator(".grades-target.secured")).toContainText(
      "valores de esta simulación"
    );
    const grade = page.getByRole("textbox", { name: "Certamen 1 de Estudiante Demo" });
    await grade.fill("55");
    await grade.press("Tab");
    await expect(page.locator(".grade-save-status")).toHaveText("Guardando…");
    await expect(page.locator(".grade-save-status")).toHaveText("Guardada");
    await grade.fill("99");
    await grade.press("Tab");
    await expect(grade).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".grade-save-status")).toContainText("No guardada");
    await page
      .getByRole("button", { name: 'Eliminar aviso "Bienvenida e inicio de clases"', exact: true })
      .click();
    await expect(page.locator(".context-confirmation")).toContainText(
      "Esta acción no se puede deshacer"
    );
    await page.screenshot({ path: `.impeccable/review/pr178-states-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByText("Bienvenida e inicio de clases", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Editar bloque de prueba" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Guardar bloque" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.impeccable/review/pr178-block-${width}.png` });
    await dialog.getByRole("button", { name: "Conservar bloque" }).click();
    await expect(dialog.getByRole("button", { name: "Guardar bloque" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Descartar borrador de prueba" }).click();
    await expect(dialog.getByRole("button", { name: "Seguir editando" })).toBeFocused();
    await page.screenshot({ path: `.impeccable/review/pr178-discard-${width}.png` });
    await dialog.getByRole("button", { name: "Seguir editando" }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).toBeTruthy();
  });
}
