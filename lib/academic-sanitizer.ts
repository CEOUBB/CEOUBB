import DOMPurify from "isomorphic-dompurify";

export const ACADEMIC_BASE_URL = new URL("https://ceoubb.com");
export const MAX_ACADEMIC_HTML_LENGTH = 100_000;

export const ALLOWED_TAGS = [
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

export const ALLOWED_ATTRIBUTES = [
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

export const FORBIDDEN_TAGS = [
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
