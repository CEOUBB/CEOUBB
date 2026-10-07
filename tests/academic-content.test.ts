import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AcademicContentTooLargeError,
  MAX_ACADEMIC_HTML_LENGTH,
  sanitizeAcademicHtml,
} from "../lib/academic-content.ts";

const componentSource = readFileSync("app/components/AcademicProse.tsx", "utf8");
const globalStyles = readFileSync("app/globals.css", "utf8");

test("REQ-PROSE-01: elimina scripts, eventos, elementos ejecutables y protocolos XSS", () => {
  const result = sanitizeAcademicHtml(`
    <script>globalThis.__academicXss = true</script>
    <p onclick="alert(1)">Contenido seguro</p>
    <img src="/biblioteca/portada.png" onerror="alert(2)">
    <a href="javascript:alert(3)">Enlace peligroso</a>
    <iframe srcdoc="<script>alert(4)</script>"></iframe>
    <svg><script>alert(5)</script></svg>
  `);

  assert.match(result, /Contenido seguro/);
  assert.doesNotMatch(
    result,
    /<script|globalThis|onclick\s*=|onerror\s*=|javascript\s*:|<iframe|<svg/i
  );
});

test("REQ-PROSE-02: conserva solamente la estructura académica permitida", () => {
  const result = sanitizeAcademicHtml(`
    <h2>Unidad 1</h2>
    <p><strong>Importante</strong> y <em>conceptual</em>.</p>
    <ol start="2"><li value="3">Paso</li></ol>
    <blockquote>Definición</blockquote>
    <pre><code>const fuerza = masa * aceleracion;</code></pre>
    <figure><img src="https://cdn.example.edu/figura.png" alt="Diagrama"><figcaption>Figura 1</figcaption></figure>
    <table><caption>Resultados</caption><thead><tr><th scope="col">Caso</th></tr></thead><tbody><tr><td>A</td></tr></tbody></table>
  `);

  for (const tag of [
    "h2",
    "p",
    "strong",
    "em",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "figure",
    "img",
    "figcaption",
    "table",
    "caption",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ]) {
    assert.match(result, new RegExp(`<${tag}(?:\\s|>)`));
  }
  assert.match(result, /scope="col"/);
  assert.match(result, /start="2"/);
  assert.match(result, /value="3"/);
});

test("REQ-PROSE-03: endurece enlaces externos y elimina fuentes de imagen inseguras", () => {
  const result = sanitizeAcademicHtml(`
    <a href="https://externo.example.org/material?q=1">Externo</a>
    <a href="/aula/estatica">Interno</a>
    <a href="#resumen">Ancla</a>
    <img src="https://imagenes.example.org/grafico.png" alt="Gráfico">
    <img src="data:image/svg+xml,<svg onload='alert(1)'></svg>" alt="Peligrosa">
    <img src="http://imagenes.example.org/insegura.png" alt="Mixta">
  `);
  const externalTag = result.match(/<a[^>]*>Externo<\/a>/)?.[0] ?? "";
  const internalTag = result.match(/<a[^>]*>Interno<\/a>/)?.[0] ?? "";

  assert.match(externalTag, /href="https:\/\/externo\.example\.org\/material\?q=1"/);
  assert.match(externalTag, /target="_blank"/);
  assert.match(externalTag, /rel="noopener noreferrer"/);
  assert.match(internalTag, /href="\/aula\/estatica"/);
  assert.doesNotMatch(internalTag, /target=|rel=/);
  assert.match(result, /src="https:\/\/imagenes\.example\.org\/grafico\.png"/);
  assert.doesNotMatch(result, /data:image|insegura\.png|alt="Peligrosa"|alt="Mixta"/);
});

test("REQ-PROSE-04: limpia estilos invasivos de Word y Moodle sin perder la tabla", () => {
  const result = sanitizeAcademicHtml(`
    <div id="page" class="MsoNormal" style="mso-margin-top-alt:auto;font-family:'Times New Roman';font-size:12pt;color:red">
      <table id="horario" class="MsoTableGrid" style="mso-table-layout-alt:fixed;width:900pt">
        <tbody><tr><td style="font-family:Arial;font-size:14pt"><font face="Calibri" size="5">Mecánica</font></td></tr></tbody>
      </table>
    </div>
  `);

  assert.match(result, /<table>/);
  assert.match(result, /<td>Mecánica<\/td>/);
  assert.deepEqual(result.match(/class="[^"]*"/g), ['class="academic-table-scroll"']);
  assert.doesNotMatch(result, /style=|id=|mso-|font-family|\d+pt|<font|face=|size=/i);
});

test("REQ-PROSE-06: envuelve tablas una vez y mantiene salida idempotente", () => {
  const once = sanitizeAcademicHtml(
    "<table><tbody><tr><th>Columna</th><td>Valor</td></tr></tbody></table>"
  );
  const twice = sanitizeAcademicHtml(once);

  assert.equal(twice, once);
  assert.equal(once.match(/academic-table-scroll/g)?.length, 1);
  assert.match(once, /class="academic-table-scroll"/);
  assert.match(once, /role="region"/);
  assert.match(once, /tabindex="0"/);
  assert.match(once, /aria-label="Tabla con desplazamiento horizontal"/);
});

test("REQ-PROSE-07: rechaza contenido sobredimensionado antes de parsear", () => {
  assert.throws(
    () => sanitizeAcademicHtml("x".repeat(MAX_ACADEMIC_HTML_LENGTH + 1)),
    (error: unknown) =>
      error instanceof AcademicContentTooLargeError && /100\.000 caracteres/.test(error.message)
  );
});

test("REQ-PROSE-05/06: AcademicProse es el único sink y consume tokens institucionales", () => {
  assert.match(componentSource, /sanitizeAcademicHtml\(html\)/);
  assert.match(componentSource, /dangerouslySetInnerHTML=\{\{ __html: sanitizedHtml \}\}/);
  assert.match(componentSource, /academic-prose/);
  assert.doesNotMatch(componentSource, /bypass|trustedHtml|skipSanitization/i);
  assert.match(componentSource, /instanceof AcademicContentTooLargeError/);
  assert.match(componentSource, /Divídelo en publicaciones más pequeñas/);

  assert.match(globalStyles, /\.academic-prose\s*\{/);
  assert.match(globalStyles, /\.academic-prose\s*\{[^}]*font-family:\s*var\(--font-core\)/);
  assert.match(
    globalStyles,
    /\.academic-prose\s+:where\(h1, h2, h3, h4, h5, h6\)[^{]*\{[^}]*var\(--font-display\)/
  );
  assert.match(globalStyles, /\.academic-table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(globalStyles, /\.academic-table-scroll:focus-visible/);
});
