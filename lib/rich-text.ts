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

const KEYWORDS: Record<Exclude<CodeLanguage, "plain" | "html" | "css" | "json">, Set<string>> = {
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
  c: new Set([
    "auto",
    "break",
    "case",
    "char",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extern",
    "float",
    "for",
    "goto",
    "if",
    "inline",
    "int",
    "long",
    "register",
    "restrict",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "struct",
    "switch",
    "typedef",
    "union",
    "unsigned",
    "void",
    "volatile",
    "while",
  ]),
  java: new Set([
    "abstract",
    "assert",
    "boolean",
    "break",
    "byte",
    "case",
    "catch",
    "char",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extends",
    "final",
    "finally",
    "float",
    "for",
    "goto",
    "if",
    "implements",
    "import",
    "instanceof",
    "int",
    "interface",
    "long",
    "native",
    "new",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "short",
    "static",
    "strictfp",
    "super",
    "switch",
    "synchronized",
    "this",
    "throw",
    "throws",
    "transient",
    "try",
    "void",
    "volatile",
    "while",
    "record",
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
  javascript: new Set([
    "async",
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "let",
    "new",
    "of",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "from",
    "as",
  ]),
  typescript: new Set([
    "abstract",
    "any",
    "as",
    "async",
    "await",
    "boolean",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "constructor",
    "continue",
    "debugger",
    "declare",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "finally",
    "for",
    "from",
    "function",
    "get",
    "if",
    "implements",
    "import",
    "in",
    "infer",
    "instanceof",
    "interface",
    "is",
    "keyof",
    "let",
    "module",
    "namespace",
    "never",
    "new",
    "null",
    "number",
    "object",
    "of",
    "package",
    "private",
    "protected",
    "public",
    "readonly",
    "require",
    "return",
    "set",
    "static",
    "string",
    "super",
    "switch",
    "symbol",
    "this",
    "throw",
    "try",
    "type",
    "typeof",
    "undefined",
    "unique",
    "unknown",
    "var",
    "void",
    "while",
    "with",
    "yield",
  ]),
  bash: new Set([
    "case",
    "cat",
    "cd",
    "chmod",
    "cp",
    "do",
    "done",
    "echo",
    "elif",
    "else",
    "esac",
    "exit",
    "export",
    "fi",
    "for",
    "function",
    "grep",
    "if",
    "in",
    "ls",
    "mkdir",
    "mv",
    "read",
    "rm",
    "select",
    "set",
    "sudo",
    "then",
    "time",
    "until",
    "while",
  ]),
};

const TYPES: Record<Exclude<CodeLanguage, "plain" | "html" | "css" | "json" | "bash">, Set<string>> = {
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
  c: new Set([
    "bool",
    "char",
    "double",
    "float",
    "int",
    "long",
    "short",
    "signed",
    "size_t",
    "unsigned",
    "void",
  ]),
  java: new Set([
    "boolean",
    "byte",
    "char",
    "double",
    "float",
    "int",
    "long",
    "short",
    "void",
    "String",
    "Object",
    "List",
    "Map",
    "Set",
    "Boolean",
    "Integer",
    "Double",
    "True",
    "False",
    "null",
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
  javascript: new Set([
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity",
    "Array",
    "Object",
    "Function",
    "Promise",
    "Map",
    "Set",
    "Date",
    "RegExp",
    "Error",
  ]),
  typescript: new Set([
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity",
    "Array",
    "Object",
    "Function",
    "Promise",
    "Map",
    "Set",
    "Date",
    "RegExp",
    "Error",
    "Record",
    "Partial",
    "Required",
    "Readonly",
    "Pick",
    "Omit",
    "Exclude",
    "Extract",
  ]),
};

const TOKEN_PATTERNS: Record<Exclude<CodeLanguage, "plain">, RegExp> = {
  matlab:
    /%\{[\s\S]*?%\}|%[^\n]*|"(?:\\.|[^"\\])*"|'(?:''|[^'])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}]+|./gi,
  python:
    /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}]+|./gi,
  cpp: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}#]+|./gi,
  c: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}#]+|./gi,
  java: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}@]+|./gi,
  sql: /\/\*[\s\S]*?\*\/|--[^\n]*|"(?:""|[^"])*"|'(?:''|[^'])*'|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_]\w*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}]+|./gi,
  html: /<!--[\s\S]*?-->|<\/?[A-Za-z0-9:-]+|\/?>|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][\w-]*\b|\s+|[=<>!/]+|./gi,
  javascript:
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_$][\w$]*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}?#]+|./gi,
  typescript:
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b|[A-Za-z_$][\w$]*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}?#]+|./gi,
  css: /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b|[A-Za-z_-][\w-]*|\s+|[+\-*/:;.,{}()[\]>~]+|./gi,
  json: /"(?:\\.|[^"\\])*"|\b-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\b(?:true|false|null)\b|\s+|[:{},[\]]|./gi,
  bash: /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\$[A-Za-z_0-9]+|\b(?:0x[\da-f]+|\d+)\b|[A-Za-z_][\w-]*|\s+|[+\-*/%=<>!&|^~:.,;()[\]{}#\\]+|./gi,
};

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

function tokenKind(
  language: Exclude<CodeLanguage, "plain">,
  value: string,
  rest: string
): SyntaxTokenKind {
  if (language === "html") {
    if (value.startsWith("<!--")) return "comment";
    if (value.startsWith('"') || value.startsWith("'")) return "string";
    if (value.startsWith("<") || value === ">" || value === "/>") return "tag";
    if (rest.trimStart().startsWith("=")) return "attr";
    return "plain";
  }
  if (language === "css") {
    if (value.startsWith("/*")) return "comment";
    if (value.startsWith('"') || value.startsWith("'")) return "string";
    if (/^#[0-9a-fA-F]+/i.test(value) || /^\d/.test(value)) return "number";
    if (rest.trimStart().startsWith(":")) return "attr";
    return "keyword";
  }
  if (language === "json") {
    if (value.startsWith('"')) {
      if (rest.trimStart().startsWith(":")) return "keyword";
      return "string";
    }
    if (/^-?\d/.test(value)) return "number";
    if (["true", "false", "null"].includes(value)) return "keyword";
    return "plain";
  }
  if (
    (language === "matlab" && (value.startsWith("%") || value.startsWith("%{"))) ||
    (language === "python" && value.startsWith("#")) ||
    ((language === "cpp" || language === "c" || language === "java" || language === "javascript" || language === "typescript") &&
      (value.startsWith("//") || value.startsWith("/*"))) ||
    (language === "sql" && (value.startsWith("--") || value.startsWith("/*"))) ||
    (language === "bash" && value.startsWith("#"))
  )
    return "comment";
  if (/^(?:"|'|'''|"""|`)/.test(value)) return "string";
  if (/^(?:0x[\da-f]+|\d)/i.test(value)) return "number";
  if (value.startsWith("$") && language === "bash") return "attr";
  if (/^[A-Za-z_$][\w$]*$/.test(value)) {
    const comparable = language === "sql" ? value.toLowerCase() : value;
    const keywordsSet = KEYWORDS[language as keyof typeof KEYWORDS];
    if (keywordsSet?.has(comparable)) return "keyword";
    const typesSet = TYPES[language as keyof typeof TYPES];
    if (typesSet?.has(comparable)) return "type";
    if (rest.trimStart().startsWith("(")) return "function";
  }
  if (/^[+\-*/%=<>!&|^~:.,;()[\]{}?#@\\]+$/.test(value)) return "operator";
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
