import {
  calloutFromQuote,
  inlineToPlainText,
  parseRichInline,
  parseRichText,
  safeLinkDestination,
  type RichBlock,
  type RichInline,
} from "./rich-text.ts";

export const EDITOR_MODES = ["visual", "markdown", "html"] as const;
export type EditorMode = (typeof EDITOR_MODES)[number];

/*
  Menú de comandos rápidos del lienzo visual. Escribir `/` al empezar una línea
  abre la misma lista de bloques que ofrece la barra, sin levantar la mano del
  teclado. Vive aquí, y no en el componente, porque el emparejamiento es lógica
  pura y se prueba sin montar un editor.
*/
// Implements: REQ-EDITOR-06
export type SlashCommand = {
  action: string;
  label: string;
  hint: string;
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { action: "heading1", label: "Título principal", hint: "Encabezado de nivel 1" },
  { action: "heading2", label: "Subtítulo", hint: "Encabezado de nivel 2" },
  { action: "heading3", label: "Apartado", hint: "Encabezado de nivel 3" },
  { action: "insertUnorderedList", label: "Lista con viñetas", hint: "Enumera sin orden" },
  { action: "insertOrderedList", label: "Lista numerada", hint: "Pasos en orden" },
  { action: "quote", label: "Cita", hint: "Texto citado de una fuente" },
  { action: "callout", label: "Nota destacada", hint: "Aviso que no se debe pasar por alto" },
  { action: "warning", label: "Aviso de evaluación", hint: "Fecha, sala o condición del certamen" },
  { action: "divider", label: "Separador", hint: "Corta el documento en secciones" },
  { action: "table", label: "Tabla", hint: "Pauta, ponderaciones o datos" },
  { action: "formula", label: "Fórmula LaTeX", hint: "Expresión matemática" },
  { action: "code", label: "Bloque de código", hint: "MATLAB, Python, C++ o SQL" },
  { action: "link", label: "Enlace", hint: "Drive, video o recurso externo" },
];

function foldForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchSlashCommands(query: string): SlashCommand[] {
  const normalized = foldForSearch(query);
  if (!normalized) return [...SLASH_COMMANDS];
  return SLASH_COMMANDS.filter((command) => foldForSearch(command.label).includes(normalized));
}

/*
  Detecta el disparador `/` justo antes del cursor. Sólo cuenta al principio de
  la línea: una fecha `12/03` o una fracción no deben abrir el menú.
*/
// Implements: REQ-EDITOR-06
export function slashQueryBefore(textBeforeCaret: string): string | null {
  const line = textBeforeCaret.split("\n").at(-1) ?? "";
  const match = line.match(/^\/([\p{L}\p{N} ]{0,24})$/u);
  return match ? match[1] : null;
}

export const EDITOR_REQUIREMENTS = [
  "REQ-EDITOR-01",
  "REQ-EDITOR-02",
  "REQ-EDITOR-03",
  "REQ-EDITOR-04",
  "REQ-EDITOR-05",
] as const;

type ProtectedSource = {
  source: string;
  tokens: Array<{ token: string; value: string; block: boolean }>;
};

const blockHtmlPattern =
  /<(table|script|style|iframe|svg|form|section)\b[\s\S]*?<\/\1\s*>|<img\b[^>]*\/?>/gi;
const alignedHtmlPattern = /<(p|div)\b(?=[^>]*(?:align\s*=|text-align))[^>]*>[\s\S]*?<\/\1\s*>/gi;
const inlineHtmlPattern = /<(u|sub|sup|mark|kbd)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (match, decimal, hex, name) => {
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return named[String(name).toLowerCase()] ?? match;
  });
}

function protectPattern(
  current: ProtectedSource,
  pattern: RegExp,
  block: boolean
): ProtectedSource {
  const tokens = [...current.tokens];
  const source = current.source.replace(pattern, (value) => {
    const token = `CEOUEDITORRAW${tokens.length}QXZ`;
    tokens.push({ token, value, block });
    return token;
  });
  return { source, tokens };
}

function protectRawHtml(value: string): ProtectedSource {
  let protectedSource: ProtectedSource = { source: value, tokens: [] };
  protectedSource = protectPattern(protectedSource, blockHtmlPattern, true);
  protectedSource = protectPattern(protectedSource, alignedHtmlPattern, true);
  return protectPattern(protectedSource, inlineHtmlPattern, false);
}

function restoreRawHtml(value: string, tokens: ProtectedSource["tokens"]) {
  let restored = value;
  for (const { token, value: raw, block } of tokens) {
    if (block) restored = restored.replaceAll(`<p>${token}</p>`, raw);
    restored = restored.replaceAll(token, raw);
  }
  return restored;
}

function renderInline(nodes: RichInline[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return escapeHtml(node.value).replaceAll("\n", "<br>");
      if (node.type === "code") return `<code>${escapeHtml(node.value)}</code>`;
      if (node.type === "math") return `<span data-latex="inline">${escapeHtml(node.value)}</span>`;
      if (node.type === "strong") return `<strong>${renderInline(node.content)}</strong>`;
      if (node.type === "emphasis") return `<em>${renderInline(node.content)}</em>`;
      const href = node.href ? safeLinkDestination(node.href) : null;
      if (!href) return renderInline(node.content);
      return `<a href="${escapeHtml(href)}">${renderInline(node.content)}</a>`;
    })
    .join("");
}

function renderBlock(block: RichBlock): string {
  if (block.type === "paragraph") return `<p>${renderInline(block.content)}</p>`;
  if (block.type === "heading")
    return `<h${block.level}>${renderInline(block.content)}</h${block.level}>`;
  if (block.type === "divider") return "<hr>";
  if (block.type === "quote") {
    const callout = calloutFromQuote(inlineToPlainText(block.content));
    if (callout) {
      return `<aside data-callout="${callout.tone}"><p>${renderInline(parseRichInline(callout.body))}</p></aside>`;
    }
    return `<blockquote>${renderInline(block.content)}</blockquote>`;
  }
  if (block.type === "code")
    return `<pre><code data-language="${escapeHtml(block.language)}">${escapeHtml(block.value)}</code></pre>`;
  if (block.type === "math") return `<div data-latex="display">${escapeHtml(block.value)}</div>`;
  if (block.type === "table") {
    const headCells = block.header
      .map((cell, index) => {
        const align = block.alignments[index];
        const alignAttr = align ? ` align="${align}"` : "";
        return `<th${alignAttr}>${renderInline(cell)}</th>`;
      })
      .join("");
    const bodyRows = block.rows
      .map((row) => {
        const cells = row
          .map((cell, index) => {
            const align = block.alignments[index];
            const alignAttr = align ? ` align="${align}"` : "";
            return `<td${alignAttr}>${renderInline(cell)}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }
  const tag = block.ordered ? "ol" : "ul";
  return `<${tag}>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`;
}

export function markdownToEditorHtml(value: string): string {
  if (!value.trim()) return "";
  const protectedSource = protectRawHtml(value.replace(/\r\n?/g, "\n"));
  const html = parseRichText(protectedSource.source).map(renderBlock).join("\n");
  return restoreRawHtml(html, protectedSource.tokens);
}

function attributeValue(attributes: string, name: string) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function textFromHtml(value: string) {
  let cleaned = value.replace(/<br\s*\/?>/gi, "\n");
  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(/<[^>]*>/g, "");
  }
  return decodeHtml(cleaned);
}

function preserveHtml(
  source: string,
  pattern: RegExp,
  tokens: Array<{ token: string; value: string; block: boolean }>,
  block = true
) {
  return source.replace(pattern, (value) => {
    const token = `CEOUEDITORHTML${tokens.length}WVJ`;
    tokens.push({ token, value, block });
    return token;
  });
}

function convertLists(value: string) {
  let converted = value;
  for (let pass = 0; pass < 3; pass += 1) {
    converted = converted.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (_, tag, body) => {
      const items = Array.from(String(body).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi));
      if (items.length === 0) return body;
      return `${items
        .map((item, index) => {
          const content = convertHtmlFragment(item[1]).trim().replace(/\n+/g, " ");
          return tag.toLowerCase() === "ol" ? `${index + 1}. ${content}` : `- ${content}`;
        })
        .join("\n")}\n\n`;
    });
  }
  return converted;
}

function convertHtmlFragment(value: string) {
  let converted = value;

  converted = converted.replace(
    /<div\b([^>]*)data-latex\s*=\s*["']display["']([^>]*)>([\s\S]*?)<\/div\s*>/gi,
    (_, _before, _after, expression) => `\n\n$$${textFromHtml(expression).trim()}$$\n\n`
  );
  converted = converted.replace(
    /<span\b([^>]*)data-latex\s*=\s*["']inline["']([^>]*)>([\s\S]*?)<\/span\s*>/gi,
    (_, _before, _after, expression) => `$${textFromHtml(expression).trim()}$`
  );
  converted = converted.replace(
    /<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code\s*>\s*<\/pre\s*>/gi,
    (_, attributes, code) => {
      const language = attributeValue(attributes, "data-language").replace(/[^a-z0-9_+-]/gi, "");
      return `\n\n\`\`\`${language}\n${textFromHtml(code).replace(/^\n+|\n+$/g, "")}\n\`\`\`\n\n`;
    }
  );
  converted = converted.replace(
    /<aside\b([^>]*)>([\s\S]*?)<\/aside\s*>/gi,
    (_, attributes, body) => {
      const tone = attributeValue(attributes, "data-callout").toLowerCase();
      const label = tone === "assessment" ? "ASSESSMENT" : "NOTE";
      const content = convertHtmlFragment(body).trim();
      return `\n\n> [!${label}]\n${content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    }
  );

  converted = converted.replace(/<hr\b[^>]*\/?>/gi, "\n\n---\n\n");
  converted = convertLists(converted);
  converted = converted.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_, level, body) => {
    return `\n\n${"#".repeat(Number(level))} ${convertHtmlFragment(body).trim()}\n\n`;
  });
  converted = converted.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi, (_, body) => {
    const content = convertHtmlFragment(body).trim();
    return `\n\n${content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}\n\n`;
  });
  converted = converted.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "**$2**");
  converted = converted.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "*$2*");
  converted = converted.replace(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi, (_, code) => {
    const source = textFromHtml(code);
    const fence = source.includes("`") ? "``" : "`";
    return `${fence}${source}${fence}`;
  });
  converted = converted.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (_, attributes, body) => {
    const label = convertHtmlFragment(body).trim();
    const href = safeLinkDestination(decodeHtml(attributeValue(attributes, "href")));
    return href ? `[${label}](${href})` : label;
  });
  converted = converted.replace(/<br\s*\/?>/gi, "\n");
  converted = converted.replace(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi, (_, body) => {
    return `\n\n${convertHtmlFragment(body).trim()}\n\n`;
  });
  converted = converted.replace(/<div\b[^>]*>([\s\S]*?)<\/div\s*>/gi, (_, body) => {
    return `\n\n${convertHtmlFragment(body).trim()}\n\n`;
  });
  converted = converted.replace(/<span\b[^>]*>([\s\S]*?)<\/span\s*>/gi, "$1");
  return converted;
}

function decodeOutsideTags(value: string) {
  return value
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") ? part : decodeHtml(part)))
    .join("");
}

export function htmlToAcademicMarkdown(value: string): string {
  if (!value.trim()) return "";
  const tokens: Array<{ token: string; value: string; block: boolean }> = [];
  let protectedHtml = value.replace(/\r\n?/g, "\n");
  protectedHtml = preserveHtml(protectedHtml, blockHtmlPattern, tokens);
  protectedHtml = preserveHtml(protectedHtml, alignedHtmlPattern, tokens);
  protectedHtml = preserveHtml(protectedHtml, inlineHtmlPattern, tokens, false);

  let markdown = decodeOutsideTags(convertHtmlFragment(protectedHtml))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  for (const { token, value: raw } of tokens) markdown = markdown.replaceAll(token, raw);
  return markdown;
}
