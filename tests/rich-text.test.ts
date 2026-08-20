import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
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
  return nodes.map((node) => "value" in node ? node.value : inlineText(node.content)).join("");
}

test("plain-text legacy posts preserve content and line breaks", () => {
  const blocks = parseRichText("Primera linea\nSegunda linea\n\nParrafo final");
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "paragraph");
  if (blocks[0].type !== "paragraph" || blocks[1].type !== "paragraph") return;
  assert.equal(inlineText(blocks[0].content), "Primera linea\nSegunda linea");
  assert.equal(inlineText(blocks[1].content), "Parrafo final");
});

test("fenced code normalizes and highlights every required language", () => {
  const cases = [
    ["matlab", "for i = 1:10\n% suma", "matlab"],
    ["python", "for item in values:\n    print(item)", "python"],
    ["c++", "int main() { return 0; }", "cpp"],
    ["sql", "SELECT id FROM alumnos WHERE activo = 1;", "sql"],
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
});

test("hostile HTML stays inert and unsafe link destinations are removed", () => {
  const body = '<img src=x onerror="alert(1)">\n<script>alert(2)</script>\n[peligro](javascript:alert(3))\n[seguro](https://ubiobio.cl)';
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
  assert.equal(safeLinkDestination("mailto:docente@ubiobio.cl"), "mailto:docente@ubiobio.cl");
  assert.ok(!JSON.stringify(blocks).includes('"type":"html"'));
});

test("renderer delegates only formulas to locked-down vendored KaTeX", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/views/classroom/RichText.tsx"), "utf8");
  const postsSource = fs.readFileSync(path.join(process.cwd(), "app/views/classroom/PostsSection.tsx"), "utf8");
  const materialsSource = fs.readFileSync(path.join(process.cwd(), "app/views/classroom/MaterialsSection.tsx"), "utf8");
  const capacitorSource = fs.readFileSync(path.join(process.cwd(), "capacitor.config.ts"), "utf8");
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  assert.match(source, /biblioteca\/assets\/vendor\/katex\/katex\.min\.js/);
  assert.match(source, /trust:\s*false/);
  assert.match(source, /strict:\s*"error"/);
  assert.match(source, /maxSize:\s*10/);
  assert.match(postsSource, /href=\{safePostLink\}/);
  assert.doesNotMatch(postsSource, /href=\{post\.linkUrl\}/);
  assert.match(postsSource, /<RichText body=\{post\.body\}/);
  assert.match(materialsSource, /<RichPostEditor name="body"/);
  assert.match(capacitorSource, /https:\/\/ceoubb\.com/);
});

test("inline and display formulas share the parsed document model", () => {
  const blocks = parseRichText("Equilibrio: $\\sum F_x = 0$.\n\n$$\\int_0^L w(x)\\,dx$$");
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "math");
  if (blocks[0].type === "paragraph") assert.ok(blocks[0].content.some((node) => node.type === "math"));
  if (blocks[1].type === "math") assert.equal(blocks[1].value, "\\int_0^L w(x)\\,dx");
});

test("new editor limit and traceability contract stay explicit", () => {
  const editorSource = fs.readFileSync(path.join(process.cwd(), "app/views/classroom/RichPostEditor.tsx"), "utf8");
  const legacyBody = "x".repeat(RICH_TEXT_MAX_LENGTH + 1);
  const blocks = parseRichText(legacyBody);
  assert.equal(RICH_TEXT_MAX_LENGTH, 40_000);
  assert.throws(() => normalizeRichTextBody(legacyBody), /40\.000 caracteres/);
  assert.equal(normalizeRichTextBody("  contenido  "), "contenido");
  assert.equal(blocks[0].type, "paragraph");
  if (blocks[0].type === "paragraph") assert.equal(inlineText(blocks[0].content), legacyBody);
  assert.match(editorSource, /maxLength=\{RICH_TEXT_MAX_LENGTH\}/);
  assert.equal(RICH_TEXT_REQUIREMENTS.length, 7);
  assert.ok(RICH_TEXT_REQUIREMENTS.every((requirement) => requirement.startsWith("Implements: REQ-RICH-")));
});
