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
  { action: "checklist", label: "Lista de tareas", hint: "Lista de verificación con casillas" },
  { action: "quote", label: "Cita", hint: "Texto citado de una fuente" },
  { action: "callout", label: "Nota destacada", hint: "Aviso que no se debe pasar por alto" },
  { action: "warning", label: "Aviso", hint: "Fecha, sala o condición del certamen" },
  { action: "divider", label: "Separador", hint: "Corta el documento en secciones" },
  { action: "table", label: "Tabla", hint: "Pauta, ponderaciones o datos" },
  { action: "formula", label: "Fórmula LaTeX", hint: "Expresión matemática" },
  { action: "code", label: "Bloque de código", hint: "MATLAB, Python, C++ o SQL" },
  { action: "footnote", label: "Nota al pie", hint: "Referencia o aclaración al pie" },
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

/*
  `table` no viaja aquí. Protegerla como HTML crudo la devolvía intacta al
  lienzo, pero el modelo de contenido no la reconocía: la vista previa y la
  publicación ya publicada mostraban las etiquetas en bruto al estudiante.
  Se convierte a tabla Markdown, que `parseRichText` sí entiende.
*/
// Implements: REQ-EDITOR-08
const blockHtmlPattern =
  /<(script|style|iframe|svg|form|section|details|summary|figure|header|footer|nav|main|article)\b[\s\S]*?(?:<\/\1\s*>|\/?>)|<\/?(?:script|style|iframe|svg|form|section|details|summary|figure|header|footer|nav|main|article)\b[^>]*\/?>|<img\b[^>]*\/?>/gi;
const alignedHtmlPattern =
  /<(p|div)\b(?=[^>]*(?:align\s*=\s*["']?(?:center|right|justify)|text-align\s*:\s*(?:center|right|justify)))[^>]*>[\s\S]*?<\/\1\s*>/gi;
const inlineHtmlPattern =
  /<(u|sub|mark|kbd)\b[^>]*>[\s\S]*?<\/\1\s*>|<sup\b(?![^>]*data-footnote)[^>]*>[\s\S]*?<\/sup\s*>/gi;

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
      if (node.type === "underline") return `<u>${renderInline(node.content)}</u>`;
      if (node.type === "strikethrough") return `<del>${renderInline(node.content)}</del>`;
      if (node.type === "mark") return `<mark>${renderInline(node.content)}</mark>`;
      if (node.type === "subscript") return `<sub>${renderInline(node.content)}</sub>`;
      if (node.type === "superscript") return `<sup>${renderInline(node.content)}</sup>`;
      if (node.type === "footnoteRef")
        return `<sup class="editor-footnote-ref" data-footnote="${escapeHtml(node.identifier)}">[${escapeHtml(node.identifier)}]</sup>`;
      const href = node.href ? safeLinkDestination(node.href) : null;
      if (!href) return renderInline(node.content);
      return `<a href="${escapeHtml(href)}">${renderInline(node.content)}</a>`;
    })
    .join("");
}

function renderBlock(block: RichBlock): string {
  if (block.type === "paragraph") {
    const styles: string[] = [];
    if (block.align) styles.push(`text-align: ${block.align};`);
    if (block.indent) styles.push(`margin-left: ${block.indent * 32}px;`);
    const styleAttr = styles.length > 0 ? ` style="${styles.join(" ")}"` : "";
    return `<p${styleAttr}>${renderInline(block.content)}</p>`;
  }
  if (block.type === "heading") {
    const styles: string[] = [];
    if (block.align) styles.push(`text-align: ${block.align};`);
    if (block.indent) styles.push(`margin-left: ${block.indent * 32}px;`);
    const styleAttr = styles.length > 0 ? ` style="${styles.join(" ")}"` : "";
    return `<h${block.level}${styleAttr}>${renderInline(block.content)}</h${block.level}>`;
  }
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
  if (block.type === "checklist") {
    return `<ul data-checklist="true">${block.items
      .map(
        (item) =>
          `<li data-checked="${item.checked}"><input type="checkbox" disabled${item.checked ? ' checked=""' : ""}> ${renderInline(item.content)}</li>`
      )
      .join("")}</ul>`;
  }
  if (block.type === "footnoteDef") {
    return `<div class="editor-footnote-def" data-footnote="${escapeHtml(block.identifier)}"><span class="footnote-id">[${escapeHtml(block.identifier)}]</span> ${renderInline(block.content)}</div>`;
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

/*
  Una tabla del lienzo se escribe como tabla Markdown para que la lea el mismo
  parser que usan la vista previa y la publicación. La primera fila es el
  encabezado, que es lo que inserta la barra de herramientas.
*/
function escapeTableCell(value: string) {
  return value.replace(/\s+/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").trim();
}

function convertTables(value: string) {
  return value.replace(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi, (whole, body) => {
    const rows = Array.from(String(body).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi));
    if (rows.length === 0) return "";
    const grid = rows.map((row) =>
      Array.from(row[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)).map((cell) =>
        /* Una celda no puede contener saltos ni barras: romperían la fila. */
        escapeTableCell(convertHtmlFragment(cell[2]))
      )
    );
    const columns = Math.max(...grid.map((row) => row.length));
    if (columns === 0) return "";
    const pad = (row: string[]) =>
      `| ${Array.from({ length: columns }, (_, index) => row[index] ?? "").join(" | ")} |`;
    const [header, ...rest] = grid;
    const divider = `| ${Array.from({ length: columns }, () => "---").join(" | ")} |`;
    return `\n\n${[pad(header), divider, ...rest.map(pad)].join("\n")}\n\n`;
  });
}

function convertLists(value: string) {
  let converted = value;
  for (let pass = 0; pass < 3; pass += 1) {
    converted = converted.replace(
      /<(ul|ol)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,
      (_, tag, attributes, body) => {
        const isChecklist = /data-checklist/i.test(attributes);
        const items = Array.from(String(body).matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li\s*>/gi));
        if (items.length === 0) return body;
        return `${items
          .map((item, index) => {
            const liAttrs = item[1] || "";
            const liBody = item[2];
            const checkboxMatch = /<input\b[^>]*type=["']checkbox["'][^>]*>/i.exec(liBody);
            const isChecked =
              /checked/i.test(checkboxMatch ? checkboxMatch[0] : "") ||
              /data-checked=["']true["']/i.test(liAttrs);
            const hasCheckbox =
              isChecklist || Boolean(checkboxMatch) || /data-checked/i.test(liAttrs);
            const cleanBody = liBody.replace(/<input\b[^>]*type=["']checkbox["'][^>]*\/?>/gi, "");
            const content = convertHtmlFragment(cleanBody).trim().replace(/\n+/g, " ");
            if (hasCheckbox) {
              const mark = isChecked ? "[x]" : "[ ]";
              return `- ${mark} ${content}`;
            }
            return tag.toLowerCase() === "ol" ? `${index + 1}. ${content}` : `- ${content}`;
          })
          .join("\n")}\n\n`;
      }
    );
  }
  return converted;
}

function convertHtmlFragment(value: string) {
  let converted = value;

  converted = converted.replace(
    /<div\b([^>]*)>([\s\S]*?)<\/div\s*>/gi,
    (whole, attributes, body) => {
      const footnote = attributeValue(attributes, "data-footnote");
      if (footnote) {
        const cleanBody = body.replace(
          /<span\b[^>]*class=["']footnote-id["'][^>]*>.*?<\/span>/gi,
          ""
        );
        return `\n\n[^${footnote}]: ${convertHtmlFragment(cleanBody).trim()}\n\n`;
      }
      return whole;
    }
  );
  converted = converted.replace(/<sup\b([^>]*)>([\s\S]*?)<\/sup\s*>/gi, (whole, attributes) => {
    const footnote = attributeValue(attributes, "data-footnote");
    if (footnote) return `[^${footnote}]`;
    return whole;
  });

  converted = converted.replace(
    /<div\b([^>]*)data-latex\s*=\s*["']display["']([^>]*)>([\s\S]*?)<\/div\s*>/gi,
    (_, _before, _after, expression) => `\n\n$$${textFromHtml(expression).trim()}$$\n\n`
  );
  converted = converted.replace(
    /<span\b([^>]*)data-latex\s*=\s*["']inline["']([^>]*)>([\s\S]*?)<\/span\s*>/gi,
    (_, _before, _after, expression) => `$${textFromHtml(expression).trim()}$`
  );
  converted = converted.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre\s*>/gi, (_, attributes, body) => {
    const codeMatch = /<code\b([^>]*)>([\s\S]*?)<\/code\s*>/i.exec(body);
    const codeAttributes = codeMatch ? codeMatch[1] : "";
    const codeContent = codeMatch ? codeMatch[2] : body;
    const language = (
      attributeValue(codeAttributes, "data-language") || attributeValue(attributes, "data-language")
    ).replace(/[^a-z0-9_+-]/gi, "");
    return `\n\n\`\`\`${language}\n${textFromHtml(codeContent).replace(/^\n+|\n+$/g, "")}\n\`\`\`\n\n`;
  });
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

  converted = convertTables(converted);
  converted = converted.replace(/<hr\b[^>]*\/?>/gi, "\n\n---\n\n");
  converted = convertLists(converted);
  converted = converted.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_, level, body) => {
    return `\n\n${"#".repeat(Number(level))} ${convertHtmlFragment(body).trim()}\n\n`;
  });
  let previousBlockquote = "";
  while (converted !== previousBlockquote) {
    previousBlockquote = converted;
    converted = converted.replace(
      /<blockquote\b([^>]*)>((?:(?!<blockquote\b)[\s\S])*?)<\/blockquote\s*>/gi,
      (_, attributes, body) => {
        const isIndentBlockquote =
          /border\s*:\s*none/i.test(attributes) ||
          /margin\s*:\s*0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+(\d+)px/i.test(attributes);
        if (isIndentBlockquote) {
          const match = attributes.match(/margin\s*:\s*0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+(\d+)px/i);
          const px = match ? match[1] : "32";
          const content = convertHtmlFragment(body).trim();
          return `\n\n<p style="margin-left: ${px}px">${content}</p>\n\n`;
        }
        const content = convertHtmlFragment(body).trim();
        return `\n\n${content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}\n\n`;
      }
    );
  }
  converted = converted.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "**$2**");
  converted = converted.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "*$2*");
  converted = converted.replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "~~$2~~");
  converted = converted.replace(/<mark\b[^>]*>([\s\S]*?)<\/mark\s*>/gi, "<mark>$1</mark>");
  converted = converted.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub\s*>/gi, "<sub>$1</sub>");
  converted = converted.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup\s*>/gi, "<sup>$1</sup>");
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
  converted = converted.replace(
    /<(p|div)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,
    (_, tag, attributes, body) => {
      const styleMatch = attributes.match(/text-align\s*:\s*(center|right|justify|left)/i);
      const alignMatch = attributes.match(/align\s*=\s*["']?(center|right|justify|left)["']?/i);
      const align = styleMatch
        ? styleMatch[1].toLowerCase()
        : alignMatch
          ? alignMatch[1].toLowerCase()
          : null;
      const marginMatch = attributes.match(
        /(?:margin-left|padding-left)\s*:\s*(\d+(?:px|rem|em))/i
      );
      const content = convertHtmlFragment(body).trim();
      if (!content) return "";
      const styles: string[] = [];
      if (align && align !== "left") styles.push(`text-align: ${align}`);
      if (marginMatch) styles.push(`margin-left: ${marginMatch[1]}`);
      if (styles.length > 0) {
        return `\n\n<p style="${styles.join("; ")}">${content}</p>\n\n`;
      }
      return `\n\n${content}\n\n`;
    }
  );
  converted = converted.replace(/<span\b[^>]*>([\s\S]*?)<\/span\s*>/gi, "$1");
  return converted;
}

function decodeOutsideTags(value: string) {
  return value
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") && part.endsWith(">") ? part : decodeHtml(part)))
    .join("");
}

export function htmlToAcademicMarkdown(value: string): string {
  if (!value.trim()) return "";
  const tokens: Array<{ token: string; value: string; block: boolean }> = [];
  let protectedHtml = value.replace(/\r\n?/g, "\n");
  protectedHtml = preserveHtml(protectedHtml, blockHtmlPattern, tokens);
  protectedHtml = preserveHtml(protectedHtml, inlineHtmlPattern, tokens, false);

  let markdown = decodeOutsideTags(convertHtmlFragment(protectedHtml))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  for (const { token, value: raw } of tokens) {
    const cleanRaw = raw.replaceAll(/&nbsp;/gi, " ");
    markdown = markdown.replaceAll(token, cleanRaw);
  }
  return markdown;
}
