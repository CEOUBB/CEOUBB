import { XMLParser, XMLValidator } from "fast-xml-parser";
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

function decodeEntity(value: string): string {
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

function decodeXmlText(value: string): string {
  const remaining = value.replace(/&(#\d+|#x[\da-f]+|amp|apos|gt|lt|quot);/gi, "");
  if (/&(?:[a-z][\w.-]*|#\S+);/i.test(remaining)) {
    invalid("El XML contiene una entidad no declarada.");
  }
  return decodeEntity(value);
}

const moodleParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  captureMetaData: true,
  processEntities: false,
});

type XmlMetaData = { startIndex: number; endIndex: number };

function getMetaData(node: Record<PropertyKey, unknown>): XmlMetaData | undefined {
  for (const sym of Object.getOwnPropertySymbols(node)) {
    const val = node[sym];
    if (
      typeof val === "object" &&
      val !== null &&
      "startIndex" in val &&
      "endIndex" in val &&
      typeof val.startIndex === "number" &&
      typeof val.endIndex === "number"
    ) {
      return { startIndex: val.startIndex, endIndex: val.endIndex };
    }
  }
  return undefined;
}

function hasNonWhitespaceOrComments(s: string): boolean {
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
    } else if (s.startsWith("<!--", i)) {
      const end = s.indexOf("-->", i + 4);
      if (end === -1) return true;
      i = end + 3;
    } else if (s.startsWith("<?", i)) {
      const end = s.indexOf("?>", i + 2);
      if (end === -1) return true;
      i = end + 2;
    } else {
      return true;
    }
  }
  return false;
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
  if (!source.trim()) invalid(`${label} está vacío.`);

  const validation = XMLValidator.validate(source);
  if (validation !== true) {
    invalid(`${label} contiene XML malformado.`);
  }

  let parsed: unknown;
  try {
    parsed = moodleParser.parse(source);
  } catch {
    invalid(`${label} contiene XML malformado.`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    invalid(`${label} está vacío.`);
  }

  const rootElements: Record<PropertyKey, unknown>[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const keys = Object.keys(record);
    const tagKey = keys.find((k) => k !== ":@" && !k.startsWith("?"));
    if (tagKey) {
      rootElements.push(record);
    } else if ("#text" in record && typeof record["#text"] === "string" && record["#text"].trim()) {
      invalid(`${label} contiene texto fuera de la raíz.`);
    }
  }

  if (rootElements.length !== 1) {
    invalid(`${label} debe contener una sola raíz.`);
  }

  const rootEntry = rootElements[0];
  const meta = getMetaData(rootEntry);
  if (meta) {
    if (
      hasNonWhitespaceOrComments(source.slice(0, meta.startIndex)) ||
      hasNonWhitespaceOrComments(source.slice(meta.endIndex))
    ) {
      invalid(`${label} contiene texto fuera de la raíz.`);
    }
  }

  let nodeCount = 0;

  function mapNode(item: Record<string, unknown>, depth: number): MoodleXmlNode {
    if (depth > MAX_XML_DEPTH) {
      throw new MoodleImportError(`${label} supera 64 niveles XML.`, "ARCHIVE_LIMIT");
    }
    nodeCount += 1;
    if (nodeCount > MAX_XML_NODES) {
      throw new MoodleImportError(`${label} supera 100.000 nodos XML.`, "ARCHIVE_LIMIT");
    }

    const tagKey = Object.keys(item).find(
      (k) => k !== ":@" && !k.startsWith("?") && typeof item[k] === "object"
    );
    if (!tagKey) {
      invalid(`${label} contiene una etiqueta mal formada.`);
    }

    const rawAttrs = (
      typeof item[":@"] === "object" && item[":@"] !== null ? item[":@"] : {}
    ) as Record<string, unknown>;
    const attributes: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawAttrs)) {
      const attrName = k.startsWith("@_") ? k.slice(2) : k;
      attributes[attrName] = decodeXmlText(String(v ?? ""));
    }

    const rawChildren = Array.isArray(item[tagKey]) ? (item[tagKey] as unknown[]) : [];
    const children: MoodleXmlNode[] = [];
    const content: string[] = [];

    for (const childItem of rawChildren) {
      if (typeof childItem !== "object" || childItem === null) continue;
      const record = childItem as Record<string, unknown>;
      if ("#text" in record) {
        content.push(decodeXmlText(String(record["#text"] ?? "")));
      } else if ("__cdata" in record) {
        const cdataVal = record["__cdata"];
        if (Array.isArray(cdataVal)) {
          for (const c of cdataVal) {
            if (typeof c === "object" && c !== null && "#text" in c) {
              content.push(String((c as Record<string, unknown>)["#text"] ?? ""));
            } else if (typeof c === "string") {
              content.push(c);
            }
          }
        } else if (typeof cdataVal === "string") {
          content.push(cdataVal);
        }
      } else {
        const childTag = Object.keys(record).find((k) => k !== ":@" && !k.startsWith("?"));
        if (childTag) {
          children.push(mapNode(record, depth + 1));
        }
      }
    }

    return {
      name: tagKey,
      attributes: Object.freeze(attributes),
      children,
      content,
    };
  }

  return mapNode(rootEntry, 1);
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
