import assert from "node:assert/strict";
import test from "node:test";
import {
  ACADEMIC_RENDERER_REQUIREMENTS,
  renderAcademicContentToHtml,
} from "../lib/academic-content.ts";

test("REQ-RENDER-01 renderiza Markdown y HTML seguro con una salida semántica común", () => {
  const markdown = renderAcademicContentToHtml(
    "## Resultados\n\n| Ensayo | Valor |\n| --- | ---: |\n| A | 7.0 |",
    "markdown"
  );
  const html = renderAcademicContentToHtml(
    "<section><h2>Objetivos</h2><ul><li>Modelar</li><li>Verificar</li></ul></section>",
    "html"
  );

  assert.match(markdown, /<h2>Resultados<\/h2>/);
  assert.match(markdown, /<table>/);
  assert.match(html, /<section>/);
  assert.match(html, /<li>Modelar<\/li>/);
});

test("REQ-RENDER-01 elimina scripts, handlers y protocolos ejecutables", () => {
  const html = renderAcademicContentToHtml(
    '<script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">Abrir</a>',
    "html"
  );

  assert.doesNotMatch(html, /<script|onerror|javascript:/i);
  assert.match(html, />Abrir<\/a>/);
});

test("REQ-RENDER-02 entrega la integral gaussiana como KaTeX de bloque con MathML", () => {
  const html = renderAcademicContentToHtml(
    String.raw`$$\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`
  );

  assert.match(html, /class="katex-display"/);
  assert.match(html, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
  assert.match(html, /<annotation encoding="application\/x-tex">/);
});

test("REQ-RENDER-02 conserva las fórmulas inline dentro del párrafo", () => {
  const html = renderAcademicContentToHtml("La energía es $E = mc^2$ en reposo.");
  const richHtml = renderAcademicContentToHtml(
    '<aside class="callout-notice">La energía es $E = mc^2$ en reposo.</aside>',
    "html"
  );

  assert.match(html, /^<p>La energía es <span class="katex">/);
  assert.doesNotMatch(html, /katex-display/);
  assert.match(richHtml, /^<aside class="callout-notice">La energía es <span class="katex">/);
});

test("REQ-RENDER-03 resalta sólo los cinco lenguajes científicos declarados", () => {
  const samples = {
    python: "def energia(m, c):\n    return m * c ** 2",
    matlab: "function y = energia(m, c)\ny = m * c^2;\nend",
    c: "int main(void) { return 0; }",
    sql: "SELECT promedio FROM notas WHERE seccion = 1;",
    r: "promedio <- mean(notas)",
  };

  for (const [language, source] of Object.entries(samples)) {
    const html = renderAcademicContentToHtml(`\`\`\`${language}\n${source}\n\`\`\``);
    assert.match(html, new RegExp(`language-${language}`));
    assert.match(html, /class="hljs-/);
  }
});

test("REQ-RENDER-03 degrada un lenguaje desconocido a texto escapado", () => {
  const html = renderAcademicContentToHtml("```brainfuck\n<script>+[-]</script>\n```");

  assert.match(html, /&lt;script>\+\[-\]&lt;\/script>/);
  assert.doesNotMatch(html, /class="hljs-/);
  assert.doesNotMatch(html, /<script>/);
});

test("REQ-RENDER-04 incorpora una acción accesible de copia por bloque", () => {
  const html = renderAcademicContentToHtml('```python\nprint("UBB")\n```');

  assert.match(html, /class="academic-code-block"/);
  assert.match(html, /data-academic-copy="true"/);
  assert.match(html, /aria-label="Copiar código Python"/);
  assert.match(html, />Copiar<\/span>/);
  assert.match(html, /print\(<span class="hljs-string">"UBB"<\/span>\)/);
});

test("REQ-RENDER-05 preserva callouts académicos y descarta clases arbitrarias", () => {
  const html = renderAcademicContentToHtml(
    '<aside class="callout-notice"><h3>Aviso</h3><p>Traer formulario.</p></aside><div class="callout-assessment"><h3>Certamen</h3></div><div class="destructive-layout">No heredar</div>',
    "html"
  );

  assert.match(html, /class="callout-notice"/);
  assert.match(html, /class="callout-assessment"/);
  assert.doesNotMatch(html, /destructive-layout/);
});

test("los requisitos del renderer permanecen trazables sin comentarios fuente nuevos", () => {
  assert.deepEqual(ACADEMIC_RENDERER_REQUIREMENTS, [
    "REQ-RENDER-01",
    "REQ-RENDER-02",
    "REQ-RENDER-03",
    "REQ-RENDER-04",
    "REQ-RENDER-05",
  ]);
});
