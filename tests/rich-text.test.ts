import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CLASSROOM_COMPATIBILITY_REQUIREMENTS,
  RICH_TEXT_MAX_LENGTH,
  RICH_TEXT_REQUIREMENTS,
  highlightCode,
  normalizeRichTextBody,
  normalizeCodeLanguage,
  parseRichText,
  safeLinkDestination,
  type RichInline,
} from "../lib/rich-text.ts";

function inlineText(nodes: RichInline[]): string {
  return nodes.map((node) => ("value" in node ? node.value : inlineText(node.content))).join("");
}

test("plain-text legacy posts preserve content and line breaks", () => {
  const blocks = parseRichText("Primera linea\r\nSegunda linea\r\n\r\nParrafo final");
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "paragraph");
  if (blocks[0].type !== "paragraph" || blocks[1].type !== "paragraph") return;
  assert.equal(inlineText(blocks[0].content), "Primera linea\nSegunda linea");
  assert.equal(inlineText(blocks[1].content), "Parrafo final");
});

test("six-column Markdown tables stay semantic and preserve safe inline content", () => {
  const blocks = parseRichText(`| Ramo | Sección | Sala | Horario | Recurso | Nota |
| :--- | :---: | ---: | --- | --- | --- |
| Estática | 1 | AB-201 | 10:00 | [sitio](https://ubiobio.cl) | \`a|b\` |
| Cálculo | 2 | AB-202 | 12:00 | [riesgo](javascript:alert(1)) | <img onerror=alert(2)> |`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "table");
  if (blocks[0].type !== "table") return;

  assert.equal(blocks[0].header.length, 6);
  assert.equal(blocks[0].rows.length, 2);
  assert.ok(blocks[0].rows.every((row) => row.length === 6));
  assert.deepEqual(blocks[0].alignments, ["left", "center", "right", null, null, null]);
  assert.equal(inlineText(blocks[0].rows[0][5]), "a|b");
  assert.match(inlineText(blocks[0].rows[1][5]), /<img onerror=alert\(2\)>/);

  const safeLink = blocks[0].rows[0][4].find((node) => node.type === "link");
  const unsafeLink = blocks[0].rows[1][4].find((node) => node.type === "link");
  assert.equal(safeLink?.type === "link" ? safeLink.href : undefined, "https://ubiobio.cl");
  assert.equal(unsafeLink?.type === "link" ? unsafeLink.href : undefined, null);
});

test("invalid table syntax falls back to plain text without dropping content", () => {
  const source = "| Columna A | Columna B |\n| -- | --- |\nTexto posterior";
  const blocks = parseRichText(source);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");
  if (blocks[0].type === "paragraph") assert.equal(inlineText(blocks[0].content), source);
});

test("fenced code normalizes and highlights every required language", () => {
  const cases = [
    ["matlab", "for i = 1:10\n% suma", "matlab"],
    ["python", "for item in values:\n    print(item)", "python"],
    ["c++", "int main() { return 0; }", "cpp"],
    ["c", "int add(int a, int b) { return a + b; }", "c"],
    ["java", "public class Main { public static void main(String[] args) {} }", "java"],
    ["sql", "SELECT id FROM alumnos WHERE activo = 1;", "sql"],
    ["html", '<div class="alert"><p>Texto</p></div>', "html"],
    ["javascript", "const total = items.reduce((a, b) => a + b, 0);", "javascript"],
    ["typescript", 'interface User { id: string; role: "student" | "teacher"; }', "typescript"],
    ["css", ".container { display: flex; color: #0f172a; }", "css"],
    ["json", '{\n  "version": 1,\n  "active": true\n}', "json"],
    ["bash", "#!/bin/bash\necho $HOME", "bash"],
  ] as const;

  for (const [label, source, expected] of cases) {
    const blocks = parseRichText(`\`\`\`${label}\n${source}\n\`\`\``);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, "code");
    if (blocks[0].type !== "code") continue;
    assert.equal(blocks[0].language, expected);
    const tokens = highlightCode(source, blocks[0].language);
    assert.equal(tokens.map((token) => token.value).join(""), source);
    assert.ok(tokens.some((token) => token.kind !== "plain"));
  }

  assert.equal(normalizeCodeLanguage("cpp linenums"), "cpp");
  assert.equal(normalizeCodeLanguage("desconocido"), "plain");
  assert.equal(normalizeCodeLanguage("html"), "html");
  assert.equal(normalizeCodeLanguage("ts"), "typescript");
  assert.equal(normalizeCodeLanguage("sh"), "bash");
});

test("hostile HTML stays inert and unsafe link destinations are removed", () => {
  const body =
    '<img src=x onerror="alert(1)">\n<script>alert(2)</script>\n[peligro](javascript:alert(3))\n[seguro](https://ubiobio.cl)';
  const blocks = parseRichText(body);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");
  if (blocks[0].type !== "paragraph") return;
  assert.match(inlineText(blocks[0].content), /<script>alert\(2\)<\/script>/);
  const links = blocks[0].content.filter((node) => node.type === "link");
  assert.equal(links[0]?.href, null);
  assert.equal(links[1]?.href, "https://ubiobio.cl");
  assert.equal(safeLinkDestination("javascript:alert(1)"), null);
  assert.equal(safeLinkDestination("data:text/html;base64,WA=="), null);
  assert.equal(safeLinkDestination("https://ubiobio.cl\nmalicioso"), null);
  assert.equal(safeLinkDestination("mailto:docente@ubiobio.cl"), "mailto:docente@ubiobio.cl");
  assert.ok(!JSON.stringify(blocks).includes('"type":"html"'));
});

test("renderer delegates only formulas to locked-down vendored KaTeX", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/RichText.tsx"),
    "utf8"
  );
  const postsSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/PostsSection.tsx"),
    "utf8"
  );
  const classroomSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/ClassroomView.tsx"),
    "utf8"
  );
  const publishStudioSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/PublishView.tsx"),
    "utf8"
  );
  const capacitorSource = fs.readFileSync(path.join(process.cwd(), "capacitor.config.ts"), "utf8");
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /biblioteca\/assets\/vendor\/katex\/katex\.min\.js/);
  assert.match(source, /trust:\s*false/);
  assert.match(source, /strict:\s*"error"/);
  assert.match(source, /maxSize:\s*10/);
  assert.match(source, /maxExpand:\s*1_000/);
  assert.match(source, /throwOnError:\s*true/);
  assert.match(source, /output:\s*"htmlAndMathml"/);
  assert.match(postsSource, /href=\{safePostLink\}/);
  assert.doesNotMatch(postsSource, /href=\{post\.linkUrl\}/);
  assert.match(postsSource, /<RichText body=\{post\.body\}/);
  assert.match(classroomSource, /<PublishView/);
  assert.match(publishStudioSource, /<RichPostEditor[\s\S]*?name="body"/);
  assert.match(capacitorSource, /https:\/\/ceoubb\.com/);
});

test("academic prose confines technical overflow for web and Android", () => {
  const rendererSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/RichText.tsx"),
    "utf8"
  );
  const cssSource = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

  assert.match(rendererSource, /className=\{`academic-prose rich-text /);
  assert.match(rendererSource, /className="rich-table-scroll"/);
  assert.match(rendererSource, /role="region"/);
  assert.match(rendererSource, /<table className="num">/);
  assert.doesNotMatch(rendererSource, /dangerouslySetInnerHTML/);

  assert.match(cssSource, /\.post-list article > div\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(
    cssSource,
    /\.rich-table-scroll\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-x:\s*auto;[\s\S]*?overscroll-behavior-inline:\s*contain;[\s\S]*?touch-action:\s*pan-x pan-y;/
  );
  assert.match(
    cssSource,
    /\.rich-code pre\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-x:\s*auto;[\s\S]*?overscroll-behavior-inline:\s*contain;[\s\S]*?touch-action:\s*pan-x pan-y;/
  );
  assert.match(
    cssSource,
    /\.rich-math-display\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?overscroll-behavior-inline:\s*contain;[\s\S]*?touch-action:\s*pan-x pan-y;/
  );
  assert.match(
    cssSource,
    /\.rich-math-inline\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?overscroll-behavior-inline:\s*contain;[\s\S]*?touch-action:\s*pan-x pan-y;/
  );
});

test("inline and display formulas share the parsed document model", () => {
  const blocks = parseRichText("Equilibrio: $\\sum F_x = 0$.\n\n$$\\int_0^L w(x)\\,dx$$");
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "math");
  if (blocks[0].type === "paragraph")
    assert.ok(blocks[0].content.some((node) => node.type === "math"));
  if (blocks[1].type === "math") assert.equal(blocks[1].value, "\\int_0^L w(x)\\,dx");
});

test("new editor limit and traceability contract stay explicit", () => {
  const editorSource = fs.readFileSync(
    path.join(process.cwd(), "app/views/classroom/RichPostEditor.tsx"),
    "utf8"
  );
  const legacyBody = "x".repeat(RICH_TEXT_MAX_LENGTH + 1);
  const blocks = parseRichText(legacyBody);
  assert.equal(RICH_TEXT_MAX_LENGTH, 40_000);
  assert.throws(() => normalizeRichTextBody(legacyBody), /40\.000 caracteres/);
  assert.equal(normalizeRichTextBody("  contenido  "), "contenido");
  assert.equal(blocks[0].type, "paragraph");
  if (blocks[0].type === "paragraph") assert.equal(inlineText(blocks[0].content), legacyBody);
  assert.match(editorSource, /maxLength=\{RICH_TEXT_MAX_LENGTH\}/);
  assert.equal(RICH_TEXT_REQUIREMENTS.length, 7);
  assert.ok(
    RICH_TEXT_REQUIREMENTS.every((requirement) => requirement.startsWith("Implements: REQ-RICH-"))
  );
  assert.equal(CLASSROOM_COMPATIBILITY_REQUIREMENTS.length, 6);
  assert.ok(
    CLASSROOM_COMPATIBILITY_REQUIREMENTS.every((requirement) =>
      requirement.startsWith("Implements: REQ-CEO61-")
    )
  );
});

test("parseRichText reconoce etiquetas semánticas y Markdown (del, mark, sub, sup, strikethrough)", () => {
  const source = "Texto ~~tachado~~ y <del>borrado</del> con <mark>resaltado</mark>, H<sub>2</sub>O y x<sup>2</sup>.";
  const blocks = parseRichText(source);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");
  if (blocks[0].type !== "paragraph") return;

  const types = blocks[0].content.map((n) => n.type);
  assert.ok(types.includes("strikethrough"), "Debe reconocer tachado");
  assert.ok(types.includes("mark"), "Debe reconocer resaltado");
  assert.ok(types.includes("subscript"), "Debe reconocer subíndice");
  assert.ok(types.includes("superscript"), "Debe reconocer superíndice");
});
