import { MAX_MOODLE_XML_BYTES, MoodleImportError } from "./archive.ts";

export type MoodleXmlNode = {
  name: string;
  attributes: Readonly<Record<string, string>>;
  children: MoodleXmlNode[];
  content: string[];
};

const MAX_XML_DEPTH = 64;
const MAX_XML_NODES = 100_000;

function invalid(message: string): never {
  throw new MoodleImportError(message, "INVALID_XML");
}

function decodeEntity(value: string) {
  return value.replace(/&(#\d+|#x[\da-f]+|amp|apos|gt|lt|quot);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized === "amp") return "&";
    if (normalized === "apos") return "'";
    if (normalized === "gt") return ">";
    if (normalized === "lt") return "<";
    if (normalized === "quot") return '"';
    const codepoint = normalized.startsWith("#x")
      ? Number.parseInt(normalized.slice(2), 16)
      : Number.parseInt(normalized.slice(1), 10);
    if (!Number.isInteger(codepoint) || codepoint < 0 || codepoint > 0x10ffff) {
      invalid(`El XML contiene una entidad numérica inválida: ${match}.`);
    }
    return String.fromCodePoint(codepoint);
  });
}

function decodeXmlText(value: string) {
  const remaining = value.replace(/&(#\d+|#x[\da-f]+|amp|apos|gt|lt|quot);/gi, "");
  if (/&(?:[a-z][\w.-]*|#\S+);/i.test(remaining)) {
    invalid("El XML contiene una entidad no declarada.");
  }
  return decodeEntity(value);
}

function parseAttributes(source: string) {
  const attributes: Record<string, string> = {};
  let remaining = source.trim();
  while (remaining) {
    const match = remaining.match(/^([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*/);
    if (!match) invalid("El XML contiene un atributo sin comillas o mal formado.");
    if (match[1] in attributes) invalid(`El XML repite el atributo ${match[1]}.`);
    attributes[match[1]] = decodeXmlText(match[2] ?? match[3] ?? "");
    remaining = remaining.slice(match[0].length);
  }
  return attributes;
}

// Implements: REQ-MOODLE-01, REQ-MOODLE-09
export function parseMoodleXml(bytes: Uint8Array, label: string): MoodleXmlNode {
  if (bytes.length > MAX_MOODLE_XML_BYTES) {
    throw new MoodleImportError(`${label} supera el límite XML de 8 MiB.`, "ARCHIVE_LIMIT");
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    invalid(`${label} no usa UTF-8 válido.`);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) invalid(`${label} contiene DTD o entidades externas.`);

  const documentNode: MoodleXmlNode = {
    name: "#document",
    attributes: {},
    children: [],
    content: [],
  };
  const stack = [documentNode];
  const tokens = source.match(
    /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]+>|[^<]+/g
  );
  if (!tokens) invalid(`${label} está vacío.`);
  let nodeCount = 0;

  for (const token of tokens) {
    if (token.startsWith("<?") || token.startsWith("<!--")) continue;
    if (token.startsWith("<![CDATA[")) {
      stack.at(-1)?.content.push(token.slice(9, -3));
      continue;
    }
    if (!token.startsWith("<")) {
      const decoded = decodeXmlText(token);
      if (stack.length === 1 && decoded.trim())
        invalid(`${label} contiene texto fuera de la raíz.`);
      stack.at(-1)?.content.push(decoded);
      continue;
    }
    if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim();
      const current = stack.at(-1);
      if (!current || current.name !== name) invalid(`${label} cierra ${name} fuera de orden.`);
      stack.pop();
      continue;
    }
    if (token.startsWith("<!")) invalid(`${label} contiene una declaración XML no admitida.`);
    const selfClosing = /\/\s*>$/.test(token);
    const inner = token.slice(1, selfClosing ? token.lastIndexOf("/") : -1).trim();
    const nameMatch = inner.match(/^([A-Za-z_][\w:.-]*)([\s\S]*)$/);
    if (!nameMatch) invalid(`${label} contiene una etiqueta mal formada.`);
    const node: MoodleXmlNode = {
      name: nameMatch[1],
      attributes: parseAttributes(nameMatch[2]),
      children: [],
      content: [],
    };
    stack.at(-1)?.children.push(node);
    nodeCount += 1;
    if (nodeCount > MAX_XML_NODES) {
      throw new MoodleImportError(`${label} supera 100.000 nodos XML.`, "ARCHIVE_LIMIT");
    }
    if (!selfClosing) {
      stack.push(node);
      if (stack.length - 1 > MAX_XML_DEPTH) {
        throw new MoodleImportError(`${label} supera 64 niveles XML.`, "ARCHIVE_LIMIT");
      }
    }
  }

  if (stack.length !== 1) invalid(`${label} termina con etiquetas abiertas.`);
  if (documentNode.children.length !== 1) invalid(`${label} debe contener una sola raíz.`);
  return documentNode.children[0];
}

export function xmlChild(node: MoodleXmlNode | undefined, name: string) {
  return node?.children.find((child) => child.name === name);
}

export function xmlChildren(node: MoodleXmlNode | undefined, name: string) {
  return node?.children.filter((child) => child.name === name) ?? [];
}

export function xmlText(node: MoodleXmlNode | undefined) {
  if (!node) return "";
  return node.content.join("").replaceAll("$@NULL@$", "").trim();
}

export function xmlValue(node: MoodleXmlNode | undefined, name: string) {
  return xmlText(xmlChild(node, name));
}

export function xmlDescendants(node: MoodleXmlNode | undefined, name: string) {
  const matches: MoodleXmlNode[] = [];
  const visit = (current: MoodleXmlNode | undefined) => {
    if (!current) return;
    for (const child of current.children) {
      if (child.name === name) matches.push(child);
      visit(child);
    }
  };
  visit(node);
  return matches;
}
