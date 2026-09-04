import type { Element as HastElement, ElementContent, Root } from "hast";
import c from "highlight.js/lib/languages/c";
import matlab from "highlight.js/lib/languages/matlab";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import sql from "highlight.js/lib/languages/sql";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";

export const ACADEMIC_RENDERER_REQUIREMENTS = [
  "REQ-RENDER-01",
  "REQ-RENDER-02",
  "REQ-RENDER-03",
  "REQ-RENDER-04",
  "REQ-RENDER-05",
] as const;

export type AcademicContentFormat = "markdown" | "html";

const languageLabels: Readonly<Record<string, string>> = {
  c: "C",
  m: "MATLAB",
  matlab: "MATLAB",
  py: "Python",
  python: "Python",
  r: "R",
  sql: "SQL",
};

const mathExcludedTags = new Set(["code", "kbd", "pre", "samp", "style", "textarea"]);

const academicSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "aside", "section"],
  attributes: {
    ...defaultSchema.attributes,
    aside: [["className", "callout-notice", "callout-assessment"]],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["className", "callout-notice", "callout-assessment"],
    ],
  },
};

function classesOf(node: HastElement): string[] {
  const value = node.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function languageOf(code: HastElement): { key: string; label: string } {
  const languageClass = classesOf(code).find((className) => className.startsWith("language-"));
  const key = languageClass?.slice("language-".length).toLowerCase() ?? "";
  return { key, label: languageLabels[key] ?? "Código" };
}

function createCodeToolbar(language: { key: string; label: string }): HastElement {
  const labelSuffix = language.label === "Código" ? "" : ` ${language.label}`;
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["academic-code-toolbar"] },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["academic-code-language"] },
        children: [{ type: "text", value: language.label }],
      },
      {
        type: "element",
        tagName: "button",
        properties: {
          ariaLabel: `Copiar código${labelSuffix}`,
          className: ["academic-code-copy"],
          dataAcademicCopy: "true",
          dataLanguage: language.key,
          type: "button",
        },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { dataCopyLabel: "true" },
            children: [{ type: "text", value: "Copiar" }],
          },
        ],
      },
    ],
  };
}

function rehypeCodeToolbar() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || index === undefined || !parent) return;
      const code = node.children.find(
        (child): child is HastElement => child.type === "element" && child.tagName === "code"
      );
      if (!code) return;

      const language = languageOf(code);
      const children: ElementContent[] = [createCodeToolbar(language), node];
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["academic-code-block"] },
        children,
      };
      return SKIP;
    });
  };
}

function rehypeNormalizeHighlight() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (
        node.tagName !== "span" ||
        index === undefined ||
        !parent ||
        !classesOf(node).includes("hljs-built_in")
      ) {
        return;
      }
      parent.children.splice(index, 1, ...node.children);
      return [SKIP, index];
    });
  };
}

function isEscaped(value: string, index: number): boolean {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function closingMathDelimiter(value: string, start: number, delimiter: "$" | "$$"): number {
  for (let cursor = start; cursor < value.length; cursor += 1) {
    if (delimiter === "$" && value[cursor] === "\n") return -1;
    if (value.startsWith(delimiter, cursor) && !isEscaped(value, cursor)) return cursor;
  }
  return -1;
}

function mathNodesFromText(value: string): ElementContent[] {
  const nodes: ElementContent[] = [];
  let textStart = 0;
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "$" || isEscaped(value, cursor)) {
      cursor += 1;
      continue;
    }

    const delimiter: "$" | "$$" = value.startsWith("$$", cursor) ? "$$" : "$";
    const expressionStart = cursor + delimiter.length;
    const expressionEnd = closingMathDelimiter(value, expressionStart, delimiter);
    if (expressionEnd < 0) {
      cursor += delimiter.length;
      continue;
    }

    const expression = value.slice(expressionStart, expressionEnd).trim();
    if (expression.length === 0) {
      cursor = expressionEnd + delimiter.length;
      continue;
    }

    if (cursor > textStart) nodes.push({ type: "text", value: value.slice(textStart, cursor) });
    nodes.push({
      type: "element",
      tagName: "code",
      properties: { className: [delimiter === "$$" ? "math-display" : "math-inline"] },
      children: [{ type: "text", value: expression }],
    });
    cursor = expressionEnd + delimiter.length;
    textStart = cursor;
  }

  if (nodes.length === 0) return [{ type: "text", value }];
  if (textStart < value.length) nodes.push({ type: "text", value: value.slice(textStart) });
  return nodes;
}

function transformRawHtmlMath(parent: Root | HastElement): void {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];
    if (child.type === "text" && child.value.includes("$")) {
      const replacements = mathNodesFromText(child.value);
      parent.children.splice(index, 1, ...replacements);
      index += replacements.length - 1;
      continue;
    }
    if (
      child.type === "element" &&
      !mathExcludedTags.has(child.tagName) &&
      !classesOf(child).some(
        (className) => className === "math-inline" || className === "math-display"
      )
    ) {
      transformRawHtmlMath(child);
    }
  }
}

function rehypeRawHtmlMath() {
  return (tree: Root) => transformRawHtmlMath(tree);
}

function normalizeDisplayMath(content: string): string {
  if (!content.includes("$$")) return content;
  let openFence: "`" | "~" | null = null;
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const fence = /^(`{3,}|~{3,})/.exec(trimmed)?.[1]?.[0];
      if (fence === "`" || fence === "~") {
        openFence = openFence === fence ? null : (openFence ?? fence);
        return line;
      }
      if (openFence || !trimmed.startsWith("$$") || !trimmed.endsWith("$$")) return line;

      const expression = trimmed.slice(2, -2).trim();
      if (expression.length === 0) return line;
      const indentation = line.slice(0, line.indexOf(trimmed));
      return `${indentation}$$\n${expression}\n${indentation}$$`;
    })
    .join("\n");
}

function createAcademicProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, academicSchema)
    .use(rehypeRawHtmlMath)
    .use(rehypeKatex)
    .use(rehypeHighlight, {
      aliases: { matlab: ["m"], python: ["py"] },
      detect: false,
      languages: { c, matlab, python, r, sql },
    })
    .use(rehypeNormalizeHighlight)
    .use(rehypeCodeToolbar)
    .use(rehypeStringify, { characterReferences: { useNamedReferences: true } });
}

const academicProcessor = createAcademicProcessor();

const academicProcessors: Readonly<
  Record<AcademicContentFormat, ReturnType<typeof createAcademicProcessor>>
> = {
  html: academicProcessor,
  markdown: academicProcessor,
};

export function renderAcademicContentToHtml(
  content: string,
  format: AcademicContentFormat = "markdown"
): string {
  if (content.length === 0) return "";
  return String(academicProcessors[format].processSync(normalizeDisplayMath(content)));
}

// ---------------------------------------------------------------------------
// HTML Sanitization & Institutional Prose Hardening (CEO-57 / SPEC-015)
// Segregated to lib/academic-sanitizer.ts (Plan 060 / leaf-bundle-splitting)
// ---------------------------------------------------------------------------

export {
  AcademicContentTooLargeError,
  ACADEMIC_BASE_URL,
  ALLOWED_ATTRIBUTES,
  ALLOWED_TAGS,
  FORBIDDEN_TAGS,
  MAX_ACADEMIC_HTML_LENGTH,
  sanitizeAcademicHtml,
  type SanitizedAcademicHtml,
} from "./academic-sanitizer.ts";
