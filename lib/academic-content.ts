import type { Element as HastElement, ElementContent, Root } from "hast";
import c from "highlight.js/lib/languages/c";
import matlab from "highlight.js/lib/languages/matlab";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import sql from "highlight.js/lib/languages/sql";
import DOMPurify from "isomorphic-dompurify";
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

const academicProcessors: Readonly<
  Record<AcademicContentFormat, ReturnType<typeof createAcademicProcessor>>
> = {
  html: createAcademicProcessor(),
  markdown: createAcademicProcessor(),
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
// ---------------------------------------------------------------------------

const ACADEMIC_BASE_URL = new URL("https://ceoubb.com");

export const MAX_ACADEMIC_HTML_LENGTH = 100_000;

const ALLOWED_TAGS = [
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "samp",
  "small",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "var",
];

const ALLOWED_ATTRIBUTES = [
  "abbr",
  "alt",
  "colspan",
  "dir",
  "height",
  "href",
  "lang",
  "reversed",
  "rowspan",
  "scope",
  "span",
  "src",
  "start",
  "title",
  "value",
  "width",
];

const FORBIDDEN_TAGS = [
  "audio",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
];

const GLOBAL_ATTRIBUTES = new Set(["dir", "lang", "title"]);
const ELEMENT_ATTRIBUTES = new Map<string, ReadonlySet<string>>([
  ["a", new Set(["href"])],
  ["abbr", new Set(["title"])],
  ["col", new Set(["span"])],
  ["img", new Set(["alt", "height", "src", "width"])],
  ["li", new Set(["value"])],
  ["ol", new Set(["reversed", "start"])],
  ["td", new Set(["abbr", "colspan", "rowspan"])],
  ["th", new Set(["abbr", "colspan", "rowspan", "scope"])],
]);

declare const sanitizedAcademicHtmlBrand: unique symbol;

export type SanitizedAcademicHtml = string & {
  readonly [sanitizedAcademicHtmlBrand]: true;
};

// Implements: REQ-PROSE-07
export class AcademicContentTooLargeError extends RangeError {
  constructor() {
    super("El contenido académico supera el límite de 100.000 caracteres.");
    this.name = "AcademicContentTooLargeError";
  }
}

type NormalizedUrl = {
  value: string;
  external: boolean;
};

function normalizeWebUrl(value: string): NormalizedUrl | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, ACADEMIC_BASE_URL);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;

    const hasExplicitOrigin = /^([a-z][a-z\d+.-]*:)?\/\//i.test(trimmed);
    return {
      value: hasExplicitOrigin ? parsed.href : trimmed,
      external: parsed.origin !== ACADEMIC_BASE_URL.origin,
    };
  } catch {
    return null;
  }
}

function normalizeImageUrl(value: string): NormalizedUrl | null {
  const normalized = normalizeWebUrl(value);
  if (!normalized) return null;

  const parsed = new URL(normalized.value, ACADEMIC_BASE_URL);
  if (parsed.protocol !== "https:") return null;
  return normalized;
}

function isAllowedAttribute(element: Element, attributeName: string): boolean {
  return (
    GLOBAL_ATTRIBUTES.has(attributeName) ||
    ELEMENT_ATTRIBUTES.get(element.tagName.toLowerCase())?.has(attributeName) === true
  );
}

function isValidAttributeValue(element: Element, attributeName: string, value: string): boolean {
  if (attributeName === "dir") return new Set(["auto", "ltr", "rtl"]).has(value.toLowerCase());
  if (attributeName === "lang") return /^[a-z]{2,8}(?:-[a-z\d]{1,8})*$/i.test(value);
  if (["colspan", "height", "rowspan", "span", "width"].includes(attributeName)) {
    return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 10_000;
  }
  if (["start", "value"].includes(attributeName)) return /^-?\d+$/.test(value);
  if (attributeName === "scope") {
    return new Set(["col", "colgroup", "row", "rowgroup"]).has(value.toLowerCase());
  }
  if (attributeName === "reversed") return element.tagName.toLowerCase() === "ol";
  return true;
}

function cleanAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (
      !isAllowedAttribute(element, name) ||
      !isValidAttributeValue(element, name, attribute.value)
    ) {
      element.removeAttribute(attribute.name);
    }
  }
}

function hardenAnchor(anchor: Element): void {
  const href = anchor.getAttribute("href");
  const normalized = href ? normalizeWebUrl(href) : null;

  anchor.removeAttribute("target");
  anchor.removeAttribute("rel");

  if (!normalized) {
    anchor.removeAttribute("href");
    return;
  }

  anchor.setAttribute("href", normalized.value);
  if (normalized.external) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }
}

function hardenImage(image: Element): void {
  const src = image.getAttribute("src");
  const normalized = src ? normalizeImageUrl(src) : null;
  if (!normalized) {
    image.remove();
    return;
  }

  image.setAttribute("src", normalized.value);
  image.setAttribute("loading", "lazy");
  image.setAttribute("decoding", "async");
  if (normalized.external) image.setAttribute("referrerpolicy", "no-referrer");
}

function wrapTables(fragment: DocumentFragment): void {
  const document = fragment.ownerDocument;
  for (const table of Array.from(fragment.querySelectorAll("table"))) {
    const parent = table.parentNode;
    if (!parent) continue;

    const wrapper = document.createElement("div");
    wrapper.setAttribute("class", "academic-table-scroll");
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", "Tabla con desplazamiento horizontal");
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }
}

// Implements: REQ-PROSE-01, REQ-PROSE-02, REQ-PROSE-03, REQ-PROSE-04, REQ-PROSE-06
export function sanitizeAcademicHtml(input: string): SanitizedAcademicHtml {
  if (input.length > MAX_ACADEMIC_HTML_LENGTH) throw new AcademicContentTooLargeError();

  const fragment = DOMPurify.sanitize(input, {
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOWED_TAGS,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["class", "id", "srcset", "style"],
    FORBID_TAGS: FORBIDDEN_TAGS,
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
    RETURN_TRUSTED_TYPE: false,
  });

  for (const element of Array.from(fragment.querySelectorAll("*"))) {
    cleanAttributes(element);
    if (element.tagName.toLowerCase() === "a") hardenAnchor(element);
    if (element.tagName.toLowerCase() === "img") hardenImage(element);
  }

  wrapTables(fragment);

  const container = fragment.ownerDocument.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML as SanitizedAcademicHtml;
}
