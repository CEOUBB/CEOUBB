export const RICH_TEXT_MAX_LENGTH = 40_000;

export const RICH_TEXT_REQUIREMENTS = [
  "Implements: REQ-RICH-01",
  "Implements: REQ-RICH-02",
  "Implements: REQ-RICH-03",
  "Implements: REQ-RICH-04",
  "Implements: REQ-RICH-05",
  "Implements: REQ-RICH-06",
  "Implements: REQ-RICH-07",
] as const;

export const CLASSROOM_COMPATIBILITY_REQUIREMENTS = [
  "Implements: REQ-CEO61-01",
  "Implements: REQ-CEO61-02",
  "Implements: REQ-CEO61-03",
  "Implements: REQ-CEO61-04",
  "Implements: REQ-CEO61-05",
  "Implements: REQ-CEO61-06",
] as const;

export type CodeLanguage =
  | "matlab"
  | "python"
  | "cpp"
  | "c"
  | "java"
  | "sql"
  | "html"
  | "javascript"
  | "typescript"
  | "css"
  | "json"
  | "bash"
  | "plain";

export type SyntaxTokenKind =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "function"
  | "operator"
  | "tag"
  | "attr";

export type SyntaxToken = {
  kind: SyntaxTokenKind;
  value: string;
};

export type RichInline =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "math"; value: string }
  | { type: "strong"; content: RichInline[] }
  | { type: "emphasis"; content: RichInline[] }
  | { type: "underline"; content: RichInline[] }
  | { type: "link"; href: string | null; content: RichInline[] };

export type TableAlignment = "left" | "center" | "right" | null;

export type RichTableBlock = {
  type: "table";
  alignments: TableAlignment[];
  header: RichInline[][];
  rows: RichInline[][][];
};

export type RichBlock =
  | { type: "paragraph"; content: RichInline[] }
  | { type: "quote"; content: RichInline[] }
  | { type: "heading"; level: number; content: RichInline[] }
  | { type: "list"; ordered: boolean; items: RichInline[][] }
  | { type: "code"; language: CodeLanguage; value: string }
  | { type: "math"; display: true; value: string }
  | { type: "divider" }
  | RichTableBlock;

/*
  Un aviso o una guía se leen en bloques: el separador temático marca dónde
  termina una idea y empieza la siguiente sin gastar un encabezado en ello.
*/
// Implements: REQ-RICH-07
export function isDividerLine(value: string) {
  return /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(value);
}

export function inlineToPlainText(nodes: RichInline[]): string {
  return nodes
    .map((node) => ("value" in node ? node.value : inlineToPlainText(node.content)))
    .join("");
}

export type RichCallout = { tone: "notice" | "assessment"; body: string };

/*
  Los callouts viajan como citas con marcador `[!NOTE]` / `[!ASSESSMENT]`, la
  misma convención que usa GitHub. Reconocerlos en un solo sitio evita que el
  editor pinte un aviso y la publicación publicada muestre el marcador crudo.
*/
// Implements: REQ-RICH-08
export function calloutFromQuote(plainText: string): RichCallout | null {
  /*
    El `>` inicial se tolera a propósito. Si el docente rompe la estructura del
    callout mientras edita —basta aplicar un título dentro—, el marcador queda
    como texto suelto; reconocerlo igual evita que el estudiante lea
    «> [!ASSESSMENT]» en la publicación.
  */
  // Implements: REQ-RICH-08
  const match = plainText.trim().match(/^>?\s*\[!(NOTE|ASSESSMENT)\]\s*\n?([\s\S]*)$/i);
  if (!match) return null;
  return {
    tone: match[1].toLowerCase() === "assessment" ? "assessment" : "notice",
    body: match[2].trim(),
  };
}

const LANGUAGE_ALIASES: Record<string, CodeLanguage> = {
  matlab: "matlab",
  m: "matlab",
  python: "python",
  py: "python",
  cpp: "cpp",
  "c++": "cpp",
  cxx: "cpp",
  c: "c",
  java: "java",
  sql: "sql",
  html: "html",
  htm: "html",
  xml: "html",
  svg: "html",
  markup: "html",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
  json: "json",
  jsonc: "json",
  bash: "bash",
  sh: "bash",
  zsh: "bash",
  shell: "bash",
};

import { Prism } from "prism-react-renderer";

if (typeof Prism !== "undefined" && Prism.languages) {
  if (!Prism.languages.matlab) {
    Prism.languages.matlab = {
      comment: [/%\{[\s\S]*?%\}|%[^\n]*/],
      string: { pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/, greedy: true },
      number: /\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i,
      keyword:
        /\b(?:break|case|catch|classdef|continue|else|elseif|end|for|function|global|if|methods|otherwise|parfor|persistent|properties|return|spmd|switch|try|while)\b/,
      function: /\b[a-z_]\w*(?=\s*\()/i,
      operator: /[+\-*/%=<>!&|^~:.,;()[\]{}]+/,
    };
  }
  if (!Prism.languages.bash) {
    Prism.languages.bash = {
      comment: { pattern: /(^|[^#])#.*/, lookbehind: true },
      string: { pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/, greedy: true },
      variable: /\$[a-zA-Z_0-9]+/,
      number: /\b\d+\b/,
      operator: /[|&;()<>$`\\=!]/,
      keyword: /\b(?:if|then|else|elif|fi|for|while|in|do|done|case|esac|function|return|echo)\b/,
    };
  }
  if (!Prism.languages.java && Prism.languages.clike) {
    Prism.languages.java = Prism.languages.clike;
  }
}

export function normalizeCodeLanguage(value: string): CodeLanguage {
  const label = value.trim().toLowerCase().split(/\s+/, 1)[0] ?? "";
  return LANGUAGE_ALIASES[label] ?? "plain";
}

export function codeLanguageLabel(language: CodeLanguage) {
  if (language === "cpp") return "C++";
  if (language === "c") return "C";
  if (language === "java") return "Java";
  if (language === "sql") return "SQL";
  if (language === "matlab") return "MATLAB";
  if (language === "python") return "Python";
  if (language === "html") return "HTML";
  if (language === "javascript") return "JavaScript";
  if (language === "typescript") return "TypeScript";
  if (language === "css") return "CSS";
  if (language === "json") return "JSON";
  if (language === "bash") return "Bash";
  return "Código";
}

export function safeLinkDestination(value: string): string | null {
  const candidate = value.trim();
  if (
    !candidate ||
    [...candidate].some(
      (character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127
    )
  )
    return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:"
      ? candidate
      : null;
  } catch {
    return null;
  }
}

export function normalizeRichTextBody(value: string) {
  const body = value.trim();
  if (body.length > RICH_TEXT_MAX_LENGTH) {
    throw new Error(
      `La publicación no puede superar ${RICH_TEXT_MAX_LENGTH.toLocaleString("es-CL")} caracteres.`
    );
  }
  return body;
}

function mapPrismGrammar(language: CodeLanguage) {
  if (!Prism?.languages) return null;
  switch (language) {
    case "c":
      return Prism.languages.c ?? Prism.languages.clike;
    case "cpp":
      return Prism.languages.cpp ?? Prism.languages.clike;
    case "java":
      return Prism.languages.java ?? Prism.languages.clike;
    case "python":
      return Prism.languages.python;
    case "sql":
      return Prism.languages.sql;
    case "html":
      return Prism.languages.markup ?? Prism.languages.html;
    case "javascript":
      return Prism.languages.javascript ?? Prism.languages.js;
    case "typescript":
      return Prism.languages.typescript ?? Prism.languages.ts;
    case "css":
      return Prism.languages.css;
    case "json":
      return Prism.languages.json;
    case "bash":
      return Prism.languages.bash;
    case "matlab":
      return Prism.languages.matlab;
    default:
      return Prism.languages.plain;
  }
}

function flattenPrismTokens(
  tokens: Array<string | { type: string; content: unknown }>
): SyntaxToken[] {
  const result: SyntaxToken[] = [];
  for (const token of tokens) {
    if (typeof token === "string") {
      result.push({ kind: "plain", value: token });
    } else if (Array.isArray(token.content)) {
      result.push(
        ...flattenPrismTokens(token.content as Array<string | { type: string; content: unknown }>)
      );
    } else if (
      typeof token.content === "object" &&
      token.content !== null &&
      "type" in token.content
    ) {
      result.push(...flattenPrismTokens([token.content as { type: string; content: unknown }]));
    } else {
      let kind: SyntaxTokenKind = "plain";
      const type = token.type;
      if (type === "comment" || type === "prolog" || type === "doctype" || type === "cdata") {
        kind = "comment";
      } else if (type === "string" || type === "char" || type === "attr-value") {
        kind = "string";
      } else if (type === "number" || type === "boolean") {
        kind = "number";
      } else if (
        type === "keyword" ||
        type === "builtin" ||
        type === "important" ||
        type === "atrule"
      ) {
        kind = "keyword";
      } else if (type === "class-name" || type === "type") {
        kind = "type";
      } else if (type === "function") {
        kind = "function";
      } else if (type === "operator" || type === "punctuation") {
        kind = "operator";
      } else if (type === "tag") {
        kind = "tag";
      } else if (type === "attr-name" || type === "property" || type === "variable") {
        kind = "attr";
      }
      result.push({ kind, value: String(token.content ?? "") });
    }
  }
  return result;
}

export function highlightCode(value: string, language: CodeLanguage): SyntaxToken[] {
  if (!value) return [];
  if (language === "plain") return [{ kind: "plain", value }];
  const grammar = mapPrismGrammar(language);
  if (!grammar) return [{ kind: "plain", value }];
  const rawTokens = Prism.tokenize(value, grammar);
  const flat = flattenPrismTokens(rawTokens as Array<string | { type: string; content: unknown }>);
  const merged: SyntaxToken[] = [];
  for (const token of flat) {
    const previous = merged.at(-1);
    if (previous && previous.kind === token.kind) {
      previous.value += token.value;
    } else {
      merged.push({ kind: token.kind, value: token.value });
    }
  }
  return merged;
}

function appendText(nodes: RichInline[], value: string) {
  if (!value) return;
  const previous = nodes.at(-1);
  if (previous?.type === "text") previous.value += value;
  else nodes.push({ type: "text", value });
}

function closingDelimiter(value: string, delimiter: string, start: number) {
  let cursor = start;
  while (cursor < value.length) {
    const found = value.indexOf(delimiter, cursor);
    if (found < 0) return -1;
    let slashes = 0;
    for (let index = found - 1; index >= 0 && value[index] === "\\"; index -= 1) slashes += 1;
    if (slashes % 2 === 0) return found;
    cursor = found + delimiter.length;
  }
  return -1;
}

export function parseRichInline(value: string, depth = 0): RichInline[] {
  if (!value || depth > 6) return value ? [{ type: "text", value }] : [];
  const nodes: RichInline[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    /*
      El subrayado no existe en Markdown y viajaba como `<u>` crudo, que la
      vista previa escapaba: el estudiante veía la etiqueta en vez del texto.
    */
    // Implements: REQ-RICH-09
    if (value.startsWith("<u", cursor)) {
      const underline = /^<u\b[^>]*>([\s\S]*?)<\/u\s*>/i.exec(value.slice(cursor));
      if (underline) {
        nodes.push({
          type: "underline",
          content: parseRichInline(underline[1], depth + 1),
        });
        cursor += underline[0].length;
        continue;
      }
    }

    if (value.startsWith("\\(", cursor)) {
      const close = closingDelimiter(value, "\\)", cursor + 2);
      if (close > cursor + 2) {
        nodes.push({ type: "math", value: value.slice(cursor + 2, close) });
        cursor = close + 2;
        continue;
      }
    }

    if (value[cursor] === "`" && !value.startsWith("```", cursor)) {
      const close = closingDelimiter(value, "`", cursor + 1);
      if (close > cursor + 1) {
        nodes.push({ type: "code", value: value.slice(cursor + 1, close) });
        cursor = close + 1;
        continue;
      }
    }

    if (value[cursor] === "$" && value[cursor + 1] !== "$") {
      const close = closingDelimiter(value, "$", cursor + 1);
      if (close > cursor + 1 && value[close - 1] !== "\\") {
        nodes.push({ type: "math", value: value.slice(cursor + 1, close) });
        cursor = close + 1;
        continue;
      }
    }

    const strongDelimiter = value.startsWith("**", cursor)
      ? "**"
      : value.startsWith("__", cursor)
        ? "__"
        : null;
    if (strongDelimiter) {
      const close = closingDelimiter(value, strongDelimiter, cursor + 2);
      if (close > cursor + 2) {
        nodes.push({
          type: "strong",
          content: parseRichInline(value.slice(cursor + 2, close), depth + 1),
        });
        cursor = close + 2;
        continue;
      }
    }

    if (value[cursor] === "[") {
      const labelEnd = closingDelimiter(value, "]", cursor + 1);
      if (labelEnd > cursor + 1 && value[labelEnd + 1] === "(") {
        const destinationEnd = closingDelimiter(value, ")", labelEnd + 2);
        if (destinationEnd > labelEnd + 2) {
          nodes.push({
            type: "link",
            href: safeLinkDestination(value.slice(labelEnd + 2, destinationEnd)),
            content: parseRichInline(value.slice(cursor + 1, labelEnd), depth + 1),
          });
          cursor = destinationEnd + 1;
          continue;
        }
      }
    }

    if (value[cursor] === "*" || value[cursor] === "_") {
      const delimiter = value[cursor];
      const close = closingDelimiter(value, delimiter, cursor + 1);
      if (close > cursor + 1) {
        nodes.push({
          type: "emphasis",
          content: parseRichInline(value.slice(cursor + 1, close), depth + 1),
        });
        cursor = close + 1;
        continue;
      }
    }

    if (
      value[cursor] === "\\" &&
      cursor + 1 < value.length &&
      /[\\`*_[\]()$]/.test(value[cursor + 1])
    ) {
      appendText(nodes, value[cursor + 1]);
      cursor += 2;
      continue;
    }

    const next = value.slice(cursor + 1).search(/[\\`$[*_]/);
    const end = next < 0 ? value.length : cursor + 1 + next;
    appendText(nodes, value.slice(cursor, end));
    cursor = end;
  }

  return nodes;
}

function startsBlock(line: string) {
  const trimmed = line.trim();
  return (
    /^ {0,3}```/.test(line) ||
    /^#{1,6}\s+/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^(?:[-+*]|\d+\.)\s+/.test(trimmed) ||
    isDividerLine(trimmed) ||
    trimmed === "$$" ||
    trimmed === "\\["
  );
}

function isEscapedAt(value: string, index: number) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    slashes += 1;
  }
  return slashes % 2 === 1;
}

function splitTableRow(line: string, minCells = 2) {
  let value = line.trim();
  if (!value.includes("|")) return null;
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|") && !isEscapedAt(value, value.length - 1)) value = value.slice(0, -1);

  const cells: string[] = [];
  let cell = "";
  let codeTicks = 0;

  for (let cursor = 0; cursor < value.length; cursor += 1) {
    const character = value[cursor];
    if (character === "\\" && value[cursor + 1] === "|") {
      cell += "|";
      cursor += 1;
      continue;
    }
    if (character === "`") {
      let run = 1;
      while (value[cursor + run] === "`") run += 1;
      if (codeTicks === 0) codeTicks = run;
      else if (codeTicks === run) codeTicks = 0;
      cell += "`".repeat(run);
      cursor += run - 1;
      continue;
    }
    if (character === "|" && codeTicks === 0) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += character;
  }

  cells.push(cell.trim());
  return cells.length >= minCells ? cells : null;
}

function tableHeaderAt(lines: string[], cursor: number) {
  if (cursor + 1 >= lines.length) return null;
  const header = splitTableRow(lines[cursor], 1);
  const separator = splitTableRow(lines[cursor + 1], 1);
  if (!header || !separator || header.length !== separator.length) return null;
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;

  const alignments = separator.map<TableAlignment>((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return null;
  });

  return { alignments, header };
}

function sameLineDisplayMath(line: string) {
  const trimmed = line.trim();
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4)
    return trimmed.slice(2, -2).trim();
  if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4)
    return trimmed.slice(2, -2).trim();
  return null;
}

export function parseRichText(value: string): RichBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    const trimmed = line.trim();
    if (!trimmed) {
      cursor += 1;
      continue;
    }

    const tableHeader = tableHeaderAt(lines, cursor);
    if (tableHeader) {
      const rows: RichInline[][][] = [];
      cursor += 2;
      while (cursor < lines.length) {
        const cells = splitTableRow(lines[cursor], 1);
        if (!cells || cells.length !== tableHeader.header.length) break;
        rows.push(cells.map((cell) => parseRichInline(cell)));
        cursor += 1;
      }
      blocks.push({
        type: "table",
        alignments: tableHeader.alignments,
        header: tableHeader.header.map((cell) => parseRichInline(cell)),
        rows,
      });
      continue;
    }

    if (isDividerLine(line)) {
      blocks.push({ type: "divider" });
      cursor += 1;
      continue;
    }

    const fence = line.match(/^ {0,3}```\s*([^\s`]*)?.*$/);
    if (fence) {
      const code: string[] = [];
      cursor += 1;
      while (cursor < lines.length && !/^ {0,3}```\s*$/.test(lines[cursor])) {
        code.push(lines[cursor]);
        cursor += 1;
      }
      if (cursor < lines.length) cursor += 1;
      blocks.push({
        type: "code",
        language: normalizeCodeLanguage(fence[1] ?? ""),
        value: code.join("\n"),
      });
      continue;
    }

    const sameLineMath = sameLineDisplayMath(line);
    if (sameLineMath !== null) {
      blocks.push({ type: "math", display: true, value: sameLineMath });
      cursor += 1;
      continue;
    }

    if (trimmed === "$$" || trimmed === "\\[") {
      const closing = trimmed === "$$" ? "$$" : "\\]";
      const math: string[] = [];
      let end = cursor + 1;
      while (end < lines.length && lines[end].trim() !== closing) {
        math.push(lines[end]);
        end += 1;
      }
      if (end < lines.length) {
        blocks.push({ type: "math", display: true, value: math.join("\n").trim() });
        cursor = end + 1;
        continue;
      }
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        content: parseRichInline(heading[2]),
      });
      cursor += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (cursor < lines.length && /^>\s?/.test(lines[cursor].trim())) {
        quote.push(lines[cursor].trim().replace(/^>\s?/, ""));
        cursor += 1;
      }
      blocks.push({ type: "quote", content: parseRichInline(quote.join("\n")) });
      continue;
    }

    const listItem = trimmed.match(/^([-+*]|\d+\.)\s+(.+)$/);
    if (listItem) {
      const ordered = /^\d/.test(listItem[1]);
      const items: RichInline[][] = [];
      while (cursor < lines.length) {
        const match = lines[cursor].trim().match(/^([-+*]|\d+\.)\s+(.+)$/);
        if (!match || /^\d/.test(match[1]) !== ordered) break;
        items.push(parseRichInline(match[2]));
        cursor += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [line];
    cursor += 1;
    while (
      cursor < lines.length &&
      lines[cursor].trim() &&
      !startsBlock(lines[cursor]) &&
      !tableHeaderAt(lines, cursor) &&
      sameLineDisplayMath(lines[cursor]) === null
    ) {
      paragraph.push(lines[cursor]);
      cursor += 1;
    }
    blocks.push({ type: "paragraph", content: parseRichInline(paragraph.join("\n")) });
  }

  return blocks;
}
