import { XMLParser, XMLValidator } from "fast-xml-parser";
import { fail } from "./errors.ts";

export type XmlNode = {
  name: string;
  namespace: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  content: (string | XmlNode)[];
};

function decode(value: string): string {
  if (/<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(value))
    fail("El XML contiene entidades o caracteres inválidos.");
  return value.replace(/&([^;]+);/g, (_, entity: string) => {
    const fixed: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (fixed[entity]) return fixed[entity];
    const cp = entity.startsWith("#x") ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    if (
      !Number.isInteger(cp) ||
      cp === 0 ||
      cp > 0x10ffff ||
      (cp >= 0xd800 && cp <= 0xdfff) ||
      (cp < 32 && ![9, 10, 13].includes(cp))
    )
      fail("El XML contiene una entidad numérica inválida.");
    return String.fromCodePoint(cp);
  });
}

const interopParser = new XMLParser({
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

// Implements: REQ-IO-05, REQ-IO-09, REQ-QMD-05
export function parseXml(bytes: Uint8Array): XmlNode {
  if (bytes.length > 1024 * 1024) fail("El XML supera 1 MiB.", 413);
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return fail("El XML debe usar UTF-8.");
  }
  if (
    /<!DOCTYPE|<!ENTITY/i.test(source) ||
    [...source].some((c) => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)))
  )
    fail("El XML contiene declaraciones o caracteres no permitidos.");

  const xmlDeclIndex = source.indexOf("<?xml");
  if (xmlDeclIndex > 0) {
    fail("La declaración XML debe estar al inicio.");
  }
  if (xmlDeclIndex !== -1 && source.indexOf("<?xml", xmlDeclIndex + 1) !== -1) {
    fail("La declaración XML debe estar al inicio.");
  }

  for (const match of source.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (match[1].includes("--")) {
      fail("El comentario XML está mal formado.");
    }
  }

  const validation = XMLValidator.validate(source);
  if (validation !== true) {
    fail("El XML está mal formado.");
  }

  let parsed: unknown;
  try {
    parsed = interopParser.parse(source);
  } catch {
    fail("El XML está mal formado.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail("El XML está vacío o incompleto.");
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
      fail("Texto fuera de la raíz XML.");
    }
  }

  if (rootElements.length !== 1) {
    fail("El XML tiene más de una raíz.");
  }

  const rootEntry = rootElements[0];
  const meta = getMetaData(rootEntry);
  if (meta) {
    const before = source
      .slice(0, meta.startIndex)
      .replace(/<\?[\s\S]*?\?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    if (before.trim().length > 0) {
      fail("Texto fuera de la raíz XML.");
    }
    const after = source.slice(meta.endIndex).replace(/<!--[\s\S]*?-->/g, "");
    if (after.trim().length > 0) {
      fail("Texto fuera de la raíz XML.");
    }
  }

  let nodes = 0;

  function mapNode(
    item: Record<string, unknown>,
    depth: number,
    parentNamespaces: Record<string, string>
  ): XmlNode {
    if (++nodes > 20000 || depth >= 48) {
      fail("El XML excede el límite de complejidad.", 413);
    }

    const rawTag = Object.keys(item).find((k) => k !== ":@" && !k.startsWith("?"));
    if (!rawTag) {
      fail("La etiqueta XML está mal formada.");
    }

    const rawAttrs = (
      typeof item[":@"] === "object" && item[":@"] !== null ? item[":@"] : {}
    ) as Record<string, unknown>;

    const namespaces: Record<string, string> = {
      xml: "http://www.w3.org/XML/1998/namespace",
      ...parentNamespaces,
    };

    const attributes: Record<string, string> = Object.create(null);

    for (const [k, v] of Object.entries(rawAttrs)) {
      const attrName = k.startsWith("@_") ? k.slice(2) : k;
      const attrVal = decode(String(v ?? ""));
      attributes[attrName] = attrVal;
      if (attrName === "xmlns") {
        namespaces[""] = attrVal;
      } else if (attrName.startsWith("xmlns:")) {
        namespaces[attrName.slice(6)] = attrVal;
      }
    }

    const split = rawTag.split(":");
    if (split.length > 2 || (split.length === 2 && !namespaces[split[0]])) {
      fail("Prefijo XML no declarado.");
    }
    for (const key of Object.keys(attributes)) {
      if (key.includes(":") && !key.startsWith("xmlns:") && !namespaces[key.split(":")[0]]) {
        fail("Prefijo de atributo XML no declarado.");
      }
    }

    const node: XmlNode = {
      name: split.at(-1)!,
      namespace: namespaces[split.length === 2 ? split[0] : ""] ?? "",
      attributes,
      children: [],
      content: [],
    };

    const rawChildren = Array.isArray(item[rawTag]) ? (item[rawTag] as unknown[]) : [];

    for (const childItem of rawChildren) {
      if (typeof childItem !== "object" || childItem === null) continue;
      const record = childItem as Record<string, unknown>;
      if ("#text" in record) {
        const text = decode(String(record["#text"] ?? ""));
        node.content.push(text);
      } else if ("__cdata" in record) {
        const cdataVal = record["__cdata"];
        if (Array.isArray(cdataVal)) {
          for (const c of cdataVal) {
            if (typeof c === "object" && c !== null && "#text" in c) {
              node.content.push(String((c as Record<string, unknown>)["#text"] ?? ""));
            } else if (typeof c === "string") {
              node.content.push(c);
            }
          }
        } else if (typeof cdataVal === "string") {
          node.content.push(cdataVal);
        }
      } else {
        const childTag = Object.keys(record).find((k) => k !== ":@" && !k.startsWith("?"));
        if (childTag) {
          const childNode = mapNode(record, depth + 1, namespaces);
          node.children.push(childNode);
          node.content.push(childNode);
        }
      }
    }

    return node;
  }

  return mapNode(rootEntry, 1, {});
}

export const child = (node: XmlNode | undefined, name: string) =>
  node?.children.find((item) => item.name === name);
export const children = (node: XmlNode | undefined, name: string) =>
  node?.children.filter((item) => item.name === name) ?? [];
export function descendants(node: XmlNode, name: string): XmlNode[] {
  return node.children.flatMap((item) => [
    ...(item.name === name ? [item] : []),
    ...descendants(item, name),
  ]);
}
export function nodeText(node: XmlNode | undefined): string {
  return (
    node?.content.map((part) => (typeof part === "string" ? part : nodeText(part))).join("") ?? ""
  );
}
