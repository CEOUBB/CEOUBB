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

export type CodeLanguage = "matlab" | "python" | "cpp" | "sql" | "plain";
export type SyntaxTokenKind =
  "plain" | "comment" | "string" | "number" | "keyword" | "type" | "function" | "operator";

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
  | { type: "link"; href: string | null; content: RichInline[] };

export type RichBlock =
  | { type: "paragraph"; content: RichInline[] }
  | { type: "quote"; content: RichInline[] }
  | { type: "heading"; level: number; content: RichInline[] }
  | { type: "list"; ordered: boolean; items: RichInline[][] }
  | { type: "code"; language: CodeLanguage; value: string }
  | { type: "math"; display: true; value: string };

const LANGUAGE_ALIASES: Record<string, CodeLanguage> = {
  matlab: "matlab",
  m: "matlab",
  python: "python",
  py: "python",
  cpp: "cpp",
  "c++": "cpp",
  cxx: "cpp",
  sql: "sql",
};

const KEYWORDS: Record<Exclude<CodeLanguage, "plain">, Set<string>> = {
  matlab: new Set([
    "break",
    "case",
    "catch",
    "classdef",
    "continue",
    "else",
    "elseif",
    "end",
    "for",
    "function",
    "global",
    "if",
    "otherwise",
    "parfor",
    "persistent",
    "return",
    "spmd",
    "switch",
    "try",
    "while",
  ]),
  python: new Set([
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "case",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "match",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield",
  ]),
  cpp: new Set([
    "alignas",
    "alignof",
    "asm",
    "auto",
    "break",
    "case",
    "catch",
    "class",
    "concept",
    "const",
    "consteval",
    "constexpr",
    "constinit",
    "continue",
    "co_await",
    "co_return",
    "co_yield",
    "decltype",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "explicit",
    "export",
    "extern",
    "for",
    "friend",
    "goto",
    "if",
    "inline",
    "namespace",
    "new",
    "noexcept",
    "operator",
    "private",
    "protected",
    "public",
    "requires",
    "return",
    "sizeof",
    "static",
    "struct",
    "switch",
    "template",
    "this",
    "throw",
    "try",
    "typedef",
    "typename",
    "union",
    "using",
    "virtual",
    "volatile",
    "while",
  ]),
  sql: new Set([
    "add",
    "all",
    "alter",
    "and",
    "as",
    "asc",
    "between",
    "by",
    "case",
    "check",
    "column",
    "constraint",
    "create",
    "database",
    "default",
    "delete",
    "desc",
    "distinct",
    "drop",
    "else",
    "end",
    "exists",
    "foreign",
    "from",
    "full",
    "group",
    "having",
    "in",
    "index",
    "inner",
    "insert",
    "into",
    "is",
    "join",
    "key",
    "left",
    "like",
    "limit",
    "not",
    "null",
    "on",
    "or",
    "order",
    "outer",
    "primary",
    "references",
    "right",
    "select",
    "set",
    "table",
    "then",
    "union",
    "unique",
    "update",
    "values",
    "view",
    "when",
    "where",
    "with",
  ]),
};

const TYPES: Record<Exclude<CodeLanguage, "plain">, Set<string>> = {
  matlab: new Set([
    "cell",
    "char",
    "double",
    "int8",
    "int16",
    "int32",
    "int64",
    "logical",
    "single",
    "string",
    "struct",
    "table",
    "uint8",
    "uint16",
    "uint32",
    "uint64",
  ]),
  python: new Set([
    "bool",
    "bytes",
    "dict",
    "float",
    "frozenset",
    "int",
    "list",
    "None",
    "set",
    "str",
    "tuple",
    "True",
    "False",
  ]),
  cpp: new Set([
    "bool",
    "char",
    "char8_t",
    "char16_t",
    "char32_t",
    "double",
    "float",
    "int",
    "long",
    "short",
    "signed",
    "size_t",
    "string",
    "unsigned",
    "void",
    "wchar_t",
  ]),
  sql: new Set([
    "bigint",
    "binary",
    "bit",
    "blob",
    "boolean",
    "char",
    "date",
    "datetime",
    "decimal",
    "float",
    "int",
    "integer",
    "json",
    "numeric",
    "real",
    "text",
    "time",
    "timestamp",
    "uuid",
    "varchar",
  ]),
};

const TOKEN_PATTERNS: Record<Exclude<CodeLanguage, "plain">, RegExp> = {
  matlab:
    /%\{[\s\S]*?%\}|%[^\n]*|"(?:\\.|[^"\\])*"|'(?:''|[^'])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}]+|./gi,
  python:
    /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}]+|./gi,
  cpp: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}#]+|./gi,
  sql: /\/\*[\s\S]*?\*\/|--[^\n]*|"(?:""|[^"])*"|'(?:''|[^'])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}]+|./gi,
};

export function normalizeCodeLanguage(value: string): CodeLanguage {
  const label = value.trim().toLowerCase().split(/\s+/, 1)[0] ?? "";
  return LANGUAGE_ALIASES[label] ?? "plain";
}

export function codeLanguageLabel(language: CodeLanguage) {
  if (language === "cpp") return "C++";
  if (language === "sql") return "SQL";
  if (language === "matlab") return "MATLAB";
  if (language === "python") return "Python";
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

function tokenKind(
  language: Exclude<CodeLanguage, "plain">,
  value: string,
  rest: string
): SyntaxTokenKind {
  if (
    (language === "matlab" && (value.startsWith("%") || value.startsWith("%{"))) ||
    (language === "python" && value.startsWith("#")) ||
    (language === "cpp" && (value.startsWith("//") || value.startsWith("/*"))) ||
    (language === "sql" && (value.startsWith("--") || value.startsWith("/*")))
  )
    return "comment";
  if (/^(?:"|'|'''|""")/.test(value)) return "string";
  if (/^(?:0x[\da-f]+|\d)/i.test(value)) return "number";
  if (/^[A-Za-z_]\w*$/.test(value)) {
    const comparable = language === "sql" ? value.toLowerCase() : value;
    if (KEYWORDS[language].has(comparable)) return "keyword";
    if (TYPES[language].has(comparable)) return "type";
    if (rest.trimStart().startsWith("(")) return "function";
  }
  if (/^[+\-*/%=<>!&|^~:.,;()[\]{}#]+$/.test(value)) return "operator";
  return "plain";
}

export function highlightCode(value: string, language: CodeLanguage): SyntaxToken[] {
  if (language === "plain") return value ? [{ kind: "plain", value }] : [];
  const pattern = new RegExp(TOKEN_PATTERNS[language].source, TOKEN_PATTERNS[language].flags);
  const tokens: SyntaxToken[] = [];
  for (const match of value.matchAll(pattern)) {
    const token = match[0];
    const kind = tokenKind(language, token, value.slice((match.index ?? 0) + token.length));
    const previous = tokens.at(-1);
    if (previous?.kind === kind) previous.value += token;
    else tokens.push({ kind, value: token });
  }
  return tokens;
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
    trimmed === "$$" ||
    trimmed === "\\["
  );
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
      sameLineDisplayMath(lines[cursor]) === null
    ) {
      paragraph.push(lines[cursor]);
      cursor += 1;
    }
    blocks.push({ type: "paragraph", content: parseRichInline(paragraph.join("\n")) });
  }

  return blocks;
}
