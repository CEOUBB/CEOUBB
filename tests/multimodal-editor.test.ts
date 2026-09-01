import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  EDITOR_MODES,
  EDITOR_REQUIREMENTS,
  SLASH_COMMANDS,
  htmlToAcademicMarkdown,
  markdownToEditorHtml,
  matchSlashCommands,
  slashQueryBefore,
} from "../lib/multimodal-editor.ts";
import {
  calloutFromQuote,
  inlineToPlainText,
  isDividerLine,
  parseRichText,
} from "../lib/rich-text.ts";

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
  /* La tabla sí es representable: viaja como tabla Markdown para que la vista
     previa y la publicación la rindan en vez de mostrar sus etiquetas. */
  assert.match(markdown, /^\| Semana 1 \|$/m);
  assert.doesNotMatch(markdown, /<table/);
  /* Lo que el modelo no puede representar sigue inerte y recuperable. */
  assert.match(markdown, /<script>window\.__editorExecuted = true<\/script>/);
  assert.match(markdown, /<section data-layout="custom">/);

  const restored = markdownToEditorHtml(markdown);
  assert.match(restored, /<table>/);
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
  /* La tabla se guarda como tabla Markdown, no como etiquetas crudas. */
  assert.match(markdown, /^\| Magnitud \| Valor \|$/m);
  assert.doesNotMatch(markdown, /<table/);

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
    "Nota destacada",
    "Aviso",
    "Insertar enlace",
    "Título principal",
    "Subtítulo",
    "Apartado",
    "Lista con viñetas",
    "Lista numerada",
    "Cita",
    "Separador",
  ]) {
    assert.ok(source.includes(label), `Falta la herramienta ${label}`);
  }
});

// Implements: REQ-RICH-07
test("el separador temático sobrevive el viaje Markdown → HTML → Markdown", () => {
  const markdown = "Antes del corte\n\n---\n\nDespués del corte";
  const html = markdownToEditorHtml(markdown);
  assert.match(html, /<hr>/);
  assert.equal(htmlToAcademicMarkdown(html), markdown);

  assert.deepEqual(parseRichText("***").at(0), { type: "divider" });
  assert.deepEqual(parseRichText("___").at(0), { type: "divider" });
  assert.equal(isDividerLine("   ---   "), true);
  /* Una lista y un título no son separadores aunque empiecen por guion. */
  assert.equal(isDividerLine("- elemento"), false);
  assert.equal(isDividerLine("--"), false);

  /* La fila de alineación de una tabla se sigue leyendo como tabla. */
  const table = parseRichText("| a | b |\n| --- | --- |\n| 1 | 2 |");
  assert.equal(table.length, 1);
  assert.equal(table[0].type, "table");
});

// Implements: REQ-RICH-08
test("el callout se reconoce una sola vez para el editor y la publicación", () => {
  assert.deepEqual(calloutFromQuote("[!NOTE]\nRevisa la pauta"), {
    tone: "notice",
    body: "Revisa la pauta",
  });
  assert.deepEqual(calloutFromQuote("[!assessment]\nSala 204"), {
    tone: "assessment",
    body: "Sala 204",
  });
  assert.equal(calloutFromQuote("Una cita normal"), null);

  const html = markdownToEditorHtml("> [!ASSESSMENT]\n> Certamen el lunes");
  assert.match(html, /<aside data-callout="assessment">/);
  assert.match(htmlToAcademicMarkdown(html), /> \[!ASSESSMENT\]/);
});

// Implements: REQ-EDITOR-08
test("una tabla del lienzo llega a la vista previa como tabla, no como etiquetas", () => {
  const canvas =
    "<table><tbody><tr><td>Ítem</td><td>Puntaje</td></tr>" +
    "<tr><td>Desarrollo</td><td>20</td></tr></tbody></table>";
  const markdown = htmlToAcademicMarkdown(canvas);

  /* Protegerla como HTML crudo la dejaba como texto plano para el estudiante. */
  assert.match(markdown, /^\| Ítem \| Puntaje \|$/m);
  assert.match(markdown, /^\| --- \| --- \|$/m);
  assert.doesNotMatch(markdown, /<table|<td/);

  const blocks = parseRichText(markdown);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "table");
  assert.match(markdownToEditorHtml(markdown), /<table>/);
});

// Implements: REQ-EDITOR-08
test("una celda con barras o saltos no rompe la fila de la tabla", () => {
  const markdown = htmlToAcademicMarkdown(
    "<table><tbody><tr><td>a | b</td><td>linea1\nlinea2</td></tr></tbody></table>"
  );
  const rows = markdown.split("\n").filter((line) => line.startsWith("|"));
  assert.equal(rows.length, 2);
  for (const row of rows) assert.equal(row.split(/(?<!\\)\|/).length, 4);
});

// Implements: REQ-RICH-09
test("el subrayado se rinde como texto subrayado y no como etiqueta visible", () => {
  const blocks = parseRichText("## <u>Título</u>");
  assert.equal(blocks[0].type, "heading");
  const [node] = blocks[0].type === "heading" ? blocks[0].content : [];
  assert.equal(node?.type, "underline");
  assert.equal(inlineToPlainText(blocks[0].type === "heading" ? blocks[0].content : []), "Título");
  assert.match(markdownToEditorHtml("## <u>Título</u>"), /<h2><u>Título<\/u><\/h2>/);
});

// Implements: REQ-RICH-08
test("el marcador de callout nunca llega al estudiante como texto", () => {
  /* Si el docente rompe la estructura editando, el marcador queda suelto. */
  assert.deepEqual(calloutFromQuote("> [!ASSESSMENT]\nFecha y sala"), {
    tone: "assessment",
    body: "Fecha y sala",
  });
  assert.deepEqual(calloutFromQuote("  [!NOTE]\nRevisa la pauta"), {
    tone: "notice",
    body: "Revisa la pauta",
  });
  assert.equal(calloutFromQuote("Una cita cualquiera"), null);
});

// Implements: REQ-EDITOR-06
test("el menú de comandos rápidos sólo se abre al inicio de una línea", () => {
  assert.equal(slashQueryBefore("/"), "");
  assert.equal(slashQueryBefore("/tab"), "tab");
  assert.equal(slashQueryBefore("Texto previo\n/lista"), "lista");
  /* Una fecha o una fracción no deben abrir el menú. */
  assert.equal(slashQueryBefore("12/03"), null);
  assert.equal(slashQueryBefore("La guía dice x/y"), null);
  assert.equal(
    slashQueryBefore("/tabla con un texto larguísimo que ya no es un comando corto"),
    null
  );

  assert.equal(matchSlashCommands("").length, SLASH_COMMANDS.length);
  assert.deepEqual(
    matchSlashCommands("tabla").map((command) => command.action),
    ["table"]
  );
  /* El emparejamiento ignora tildes: «formula» encuentra «Fórmula LaTeX». */
  assert.deepEqual(
    matchSlashCommands("formula").map((command) => command.action),
    ["formula"]
  );
  assert.deepEqual(matchSlashCommands("no-existe"), []);
  for (const command of SLASH_COMMANDS) {
    assert.ok(source().includes(`"${command.action}"`), `Falta la acción ${command.action}`);
  }
});

test("un bloque de código sin etiqueta code interna sobrevive el viaje a Markdown y de vuelta", () => {
  const canvasHtml = "<pre>al cambiar se rompe</pre>";
  const markdown = htmlToAcademicMarkdown(canvasHtml);
  assert.match(markdown, /```\nal cambiar se rompe\n```/);
  const editorHtml = markdownToEditorHtml(markdown);
  assert.match(editorHtml, /<pre><code/);
  assert.doesNotMatch(editorHtml, /&lt;pre&gt;/);
});

test("los divs y párrafos estándar no introducen etiquetas visibles en Markdown ni vista previa", () => {
  const canvasHtml = "<div>Primera línea</div><div>Segunda línea</div>";
  const markdown = htmlToAcademicMarkdown(canvasHtml);
  assert.doesNotMatch(markdown, /<div/i);
  assert.match(markdown, /Primera línea\n\nSegunda línea/);
});

test("insertTable en el editor visual inserta thead y th semánticos", () => {
  const compSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/MultimodalEditor.tsx"),
    "utf8"
  );
  assert.match(compSource, /createTHead\(\)/);
  assert.match(compSource, /createElement\("th"\)/);
});

test("el editor visual usa el icono Info para nota destacada y etiqueta Markdown sin LaTeX redundante", () => {
  const compSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/MultimodalEditor.tsx"),
    "utf8"
  );
  assert.match(compSource, /action:\s*"callout",\s*label:\s*"Nota destacada",\s*icon:\s*Info/);
  assert.match(compSource, /markdown:\s*\{\s*label:\s*"Markdown"/);
  assert.doesNotMatch(compSource, /LineVertical/);
});

test("el editor usa modales estilizados y no invoca window.prompt", () => {
  const compSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/MultimodalEditor.tsx"),
    "utf8"
  );
  assert.match(compSource, /<CodeModal/);
  assert.match(compSource, /<FormulaModal/);
  assert.match(compSource, /<LinkModal/);
  assert.match(compSource, /<TableModal/);
  assert.doesNotMatch(compSource, /window\.prompt/);
});

test("etiquetas de bloque HTML aisladas y etiquetas de cierre conservan su estructura sin perder caracteres", () => {
  const rawHtml = "<section>\n</section>";
  const markdown = htmlToAcademicMarkdown(rawHtml);
  assert.equal(markdown, "<section>\n</section>");
});

function source() {
  return fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/MultimodalEditor.tsx"),
    "utf8"
  );
}
