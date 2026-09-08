import { fail } from "./errors.ts";

export type XmlNode = {
  name: string;
  namespace: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  content: (string | XmlNode)[];
};

function decode(value: string) {
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
  const token =
    /<!--[\s\S]*?-->|<\?xml\s[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[A-Za-z_][\w:.-]*\s*>|<[A-Za-z_][\w:.-]*(?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*\s*\/?>|[^<]+/y;
  const stack: { node: XmlNode; raw: string; namespaces: Record<string, string> }[] = [];
  let root: XmlNode | undefined;
  let nodes = 0;
  while (token.lastIndex < source.length) {
    const pos = token.lastIndex;
    const match = token.exec(source);
    if (!match) fail("El XML está mal formado.");
    const part = match[0];
    if (part.startsWith("<!--")) {
      if (part.slice(4, -3).includes("--")) fail("El comentario XML está mal formado.");
      continue;
    }
    if (part.startsWith("<?")) {
      if (pos !== 0) fail("La declaración XML debe estar al inicio.");
      continue;
    }
    const parent = stack.at(-1);
    if (part.startsWith("</")) {
      if (parent?.raw !== part.slice(2, -1).trim()) fail("El XML cierra etiquetas fuera de orden.");
      stack.pop();
    } else if (part.startsWith("<![CDATA[")) {
      if (!parent) fail("CDATA fuera de la raíz.");
      parent.node.content.push(part.slice(9, -3));
    } else if (!part.startsWith("<")) {
      const text = decode(part);
      if (!parent && text.trim()) fail("Texto fuera de la raíz XML.");
      parent?.node.content.push(text);
    } else {
      // Implements: REQ-QMD-05
      const tagMatch = part.match(/^<([^\s/>]+)/);
      if (!tagMatch || !tagMatch[1]) fail("La etiqueta XML está mal formada.");
      const raw = tagMatch[1];
      const namespaces: Record<string, string> = {
        xml: "http://www.w3.org/XML/1998/namespace",
        ...parent?.namespaces,
      };
      const attributes: Record<string, string> = Object.create(null);
      for (const attr of part.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        if (Object.hasOwn(attributes, attr[1])) fail("El XML repite un atributo.");
        attributes[attr[1]] = decode(attr[2] ?? attr[3]);
        if (attr[1] === "xmlns") namespaces[""] = attributes[attr[1]];
        else if (attr[1].startsWith("xmlns:")) namespaces[attr[1].slice(6)] = attributes[attr[1]];
      }
      const split = raw.split(":");
      if (split.length > 2 || (split.length === 2 && !namespaces[split[0]]))
        fail("Prefijo XML no declarado.");
      for (const key of Object.keys(attributes)) {
        if (key.includes(":") && !key.startsWith("xmlns:") && !namespaces[key.split(":")[0]])
          fail("Prefijo de atributo XML no declarado.");
      }
      const node: XmlNode = {
        name: split.at(-1)!,
        namespace: namespaces[split.length === 2 ? split[0] : ""] ?? "",
        attributes,
        children: [],
        content: [],
      };
      if (parent) {
        parent.node.children.push(node);
        parent.node.content.push(node);
      } else {
        if (root) fail("El XML tiene más de una raíz.");
        root = node;
      }
      if (++nodes > 20000 || stack.length >= 48)
        fail("El XML excede el límite de complejidad.", 413);
      if (!part.endsWith("/>")) stack.push({ node, raw, namespaces });
    }
  }
  if (!root || stack.length) fail("El XML está vacío o incompleto.");
  return root;
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
