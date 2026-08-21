import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  EDITOR_MODES,
  EDITOR_REQUIREMENTS,
  htmlToAcademicMarkdown,
  markdownToEditorHtml,
} from "../lib/multimodal-editor.ts";

test("Markdown académico se convierte a HTML y vuelve sin perder estructuras", () => {
  const markdown = [
    "## Equilibrio estático",
    "",
    "Texto **importante** con *énfasis* y [referencia](https://ubiobio.cl).",
    "",
    "$$\\sum F_x = 0$$",
    "",
    "```python",
    "for item in valores:",
    "    print(item)",
    "```",
  ].join("\n");

  const html = markdownToEditorHtml(markdown);
  assert.match(html, /<h2>Equilibrio estático<\/h2>/);
  assert.match(html, /<strong>importante<\/strong>/);
  assert.match(html, /data-latex="display"/);
  assert.match(html, /<pre><code data-language="python">/);

  const restored = htmlToAcademicMarkdown(html);
  assert.match(restored, /^## Equilibrio estático/m);
  assert.match(restored, /\*\*importante\*\*/);
  assert.match(restored, /\$\$\\sum F_x = 0\$\$/);
  assert.match(restored, /```python[\s\S]*print\(item\)[\s\S]*```/);
});

test("HTML libre no representable permanece inerte y recuperable", () => {
  const html = [
    '<table data-course="estatica"><tbody><tr><td>Semana 1</td></tr></tbody></table>',
    "<script>window.__editorExecuted = true</script>",
    '<section data-layout="custom"><u>Contenido propio</u></section>',
  ].join("\n");

  const markdown = htmlToAcademicMarkdown(html);
  assert.match(markdown, /<table data-course="estatica">/);
  assert.match(markdown, /<script>window\.__editorExecuted = true<\/script>/);
  assert.match(markdown, /<section data-layout="custom">/);

  const restored = markdownToEditorHtml(markdown);
  assert.match(restored, /<table data-course="estatica">/);
  assert.match(restored, /<script>window\.__editorExecuted = true<\/script>/);
  assert.match(restored, /<u>Contenido propio<\/u>/);
});

test("tablas, alineación, subrayado y callouts conservan su intención", () => {
  const html = [
    '<p style="text-align: center"><u>Resultado central</u></p>',
    '<aside data-callout="notice"><p>Revisa las unidades.</p></aside>',
    "<table><tbody><tr><td>Magnitud</td><td>Valor</td></tr></tbody></table>",
  ].join("\n");

  const markdown = htmlToAcademicMarkdown(html);
  assert.match(markdown, /text-align: center/);
  assert.match(markdown, /<u>Resultado central<\/u>/);
  assert.match(markdown, /> \[!NOTE\]/);
  assert.match(markdown, /<table>/);

  const restored = markdownToEditorHtml(markdown);
  assert.match(restored, /text-align: center/);
  assert.match(restored, /<aside data-callout="notice">/);
  assert.match(restored, /<table>/);
});

test("el contrato multimodal enumera tres modos y cinco requisitos trazables", () => {
  assert.deepEqual(EDITOR_MODES, ["visual", "markdown", "html"]);
  assert.deepEqual(EDITOR_REQUIREMENTS, [
    "REQ-EDITOR-01",
    "REQ-EDITOR-02",
    "REQ-EDITOR-03",
    "REQ-EDITOR-04",
    "REQ-EDITOR-05",
  ]);
});

test("el componente expone pestañas, toolbar y atajos WCAG sin inyectar HTML en React", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/MultimodalEditor.tsx"),
    "utf8"
  );
  const wrapperSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/RichPostEditor.tsx"),
    "utf8"
  );

  assert.match(componentSource, /role="tablist"/);
  assert.match(componentSource, /role="tabpanel"/);
  assert.match(componentSource, /role="toolbar"/);
  assert.match(componentSource, /aria-selected=/);
  assert.match(componentSource, /aria-pressed=/);
  assert.match(componentSource, /ArrowLeft/);
  assert.match(componentSource, /ArrowRight/);
  assert.match(componentSource, /"Home"/);
  assert.match(componentSource, /"End"/);
  assert.match(componentSource, /event\.key\.toLowerCase\(\) === "b"/);
  assert.match(componentSource, /event\.key\.toLowerCase\(\) === "i"/);
  assert.match(componentSource, /event\.key\.toLowerCase\(\) === "k"/);
  assert.match(componentSource, /replaceChildren/);
  assert.match(componentSource, /new DOMParser\(\)/);
  assert.match(componentSource, /blockedVisualTags\.has\(tag\)/);
  assert.match(componentSource, /owner\.createElement\(tag\)/);
  assert.match(componentSource, /safeElement\.textContent/);
  assert.doesNotMatch(componentSource, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(componentSource, /\.innerHTML\s*=/);
  assert.match(wrapperSource, /<MultimodalEditor/);
});

test("la barra visual incluye todas las herramientas académicas solicitadas", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/MultimodalEditor.tsx"),
    "utf8"
  );

  for (const label of [
    "Negrita",
    "Cursiva",
    "Subrayado",
    "Alinear a la izquierda",
    "Centrar",
    "Alinear a la derecha",
    "Insertar tabla",
    "Insertar fórmula LaTeX",
    "Insertar bloque de código",
    "Insertar callout",
    "Insertar enlace",
  ]) {
    assert.ok(source.includes(label), `Falta la herramienta ${label}`);
  }
});
