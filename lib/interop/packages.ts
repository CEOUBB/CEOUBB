import { z } from "zod";
import { child, children, descendants, nodeText, parseXml } from "./xml.ts";
import { openPackageZip, safePackagePath } from "./zip.ts";
import { fail } from "./errors.ts";

export const packageManifestSchema = z.object({
  kind: z.enum(["scorm12", "scorm2004", "xapi"]),
  title: z.string().min(1).max(160),
  launchPath: z.string().max(240),
  activityId: z.string().max(1000),
  files: z
    .array(
      z.object({
        name: z.string().max(240),
        size: z
          .number()
          .int()
          .min(0)
          .max(10 * 1024 * 1024),
      })
    )
    .max(1000),
});
export type PackageManifest = z.infer<typeof packageManifestSchema>;

export async function inspectLearningPackage(bytes: Uint8Array) {
  const archive = await openPackageZip(bytes);
  let kind: PackageManifest["kind"];
  let title: string;
  let launchPath: string;
  let activityId = "";
  if (archive.has("imsmanifest.xml")) {
    const root = parseXml(await archive.read("imsmanifest.xml", 1024 * 1024));
    if (root.name !== "manifest") fail("Falta el manifiesto SCORM.");
    const version = nodeText(child(child(root, "metadata"), "schemaversion")).trim();
    kind =
      version === "1.2"
        ? "scorm12"
        : /^2004(?:\s+(?:2nd|3rd|4th) Edition)?$/.test(version)
          ? "scorm2004"
          : fail("La versión SCORM no es compatible.");
    if (descendants(root, "sequencing").length || descendants(root, "sequencingCollection").length)
      fail("La secuenciación SCORM no está soportada.");
    const organizations = children(child(root, "organizations"), "organization");
    if (organizations.length !== 1) fail("Se requiere una única organización SCORM.");
    const items = descendants(organizations[0], "item").filter((i) => i.attributes.identifierref);
    if (items.length !== 1) fail("El reproductor admite un único SCO por paquete.");
    const resources = children(child(root, "resources"), "resource");
    const sco = resources.filter((r) =>
      Object.entries(r.attributes).some(
        ([key, value]) => key.toLowerCase().endsWith(":scormtype") && value === "sco"
      )
    );
    if (sco.length !== 1 || sco[0].attributes.identifier !== items[0].attributes.identifierref)
      fail("El paquete debe declarar un único SCO válido.");
    if (items[0].attributes.parameters)
      fail("Los parámetros de lanzamiento SCORM no están soportados.");
    if ([root, ...descendants(root, "resource")].some((n) => n.attributes["xml:base"]))
      fail("Las bases de URL externas no son compatibles.");
    for (const file of descendants(root, "file")) {
      if (!archive.has(safePackagePath(file.attributes.href ?? "")))
        fail("El manifiesto referencia un archivo ausente.");
    }
    launchPath = safePackagePath(sco[0].attributes.href ?? "");
    title = nodeText(child(organizations[0], "title")).trim() || "Objeto SCORM";
  } else if (archive.has("tincan.xml")) {
    const root = parseXml(await archive.read("tincan.xml", 1024 * 1024));
    const activities = children(child(root, "activities"), "activity");
    if (root.name !== "tincan" || activities.length !== 1)
      fail("Se requiere una actividad Tin Can.");
    const activity = activities[0];
    kind = "xapi";
    launchPath = safePackagePath(nodeText(child(activity, "launch")).trim());
    activityId = activity.attributes.id ?? "";
    if (!/^https?:\/\/[^\s]+$/.test(activityId) || activityId.length > 1000)
      fail("La actividad xAPI debe tener un identificador URL.");
    title = nodeText(child(activity, "name")).trim() || "Actividad xAPI";
  } else fail("El ZIP no contiene imsmanifest.xml ni tincan.xml.");
  if (!/\.html?$/i.test(launchPath) || !archive.has(launchPath))
    fail("El documento de lanzamiento HTML no existe.");
  // Implements: REQ-QMD-06
  await Promise.all(archive.entries.map((entry) => archive.read(entry.name)));
  const manifest = packageManifestSchema.parse({
    kind,
    title: title.slice(0, 160),
    launchPath,
    activityId,
    files: archive.entries,
  });
  return { archive, manifest };
}

export function packageContentType(path: string) {
  const extension = path.split(".").at(-1)?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    ogg: "audio/ogg",
    woff: "font/woff",
    woff2: "font/woff2",
    pdf: "application/pdf",
  };
  return types[extension ?? ""] ?? "application/octet-stream";
}
