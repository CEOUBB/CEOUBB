import { zipSync } from "fflate";
import { openMoodleArchive } from "../moodle/archive.ts";
import { fail } from "./errors.ts";

export const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
export const MAX_ENTRY_BYTES = 10 * 1024 * 1024;
export const MAX_PACKAGE_FILES = 1000;
export type ZipEntry = { name: string; bytes: Uint8Array };

export function packageBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer
    : bytes.slice().buffer;
}

function validateZipHeaders(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65557) &&
    (view.getUint32(end, true) !== 0x06054b50 ||
      end + 22 + view.getUint16(end + 20, true) !== bytes.length)
  )
    end--;
  if (end < Math.max(0, bytes.length - 65557)) fail("El directorio ZIP está incompleto.");
  const count = view.getUint16(end + 10, true);
  if (!count || count > MAX_PACKAGE_FILES) fail("El ZIP excede 1000 entradas.", 413);
  let offset = view.getUint32(end + 16, true);
  if (offset + view.getUint32(end + 12, true) !== end) fail("El directorio ZIP no es canónico.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      fail("Cabecera ZIP inválida.");
    const nameEnd = offset + 46 + view.getUint16(offset + 28, true);
    const next = nameEnd + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (next > end) fail("Cabecera ZIP truncada.");
    let name: string;
    try {
      name = decoder.decode(bytes.subarray(offset + 46, nameEnd));
    } catch {
      return fail("El nombre del archivo no usa UTF-8.");
    }
    safePackagePath(name.endsWith("/") ? name.slice(0, -1) : name);
    const type = (view.getUint32(offset + 38, true) >>> 16) & 0xf000;
    if (type && type !== 0x8000 && type !== 0x4000)
      fail("El ZIP contiene enlaces o archivos especiales.");
    const local = view.getUint32(offset + 42, true);
    if (local + 30 > view.getUint32(end + 16, true) || view.getUint32(local, true) !== 0x04034b50)
      fail("Cabecera local ZIP inválida.");
    const localEnd = local + 30 + view.getUint16(local + 26, true);
    if (localEnd > offset) fail("Nombre local ZIP truncado.");
    const localName = bytes.subarray(local + 30, localEnd);
    const centralName = bytes.subarray(offset + 46, nameEnd);
    if (localName.length !== centralName.length || localName.some((b, i) => b !== centralName[i]))
      fail("Los nombres locales y centrales del ZIP difieren.");
    offset = next;
  }
  if (offset !== end) fail("El directorio ZIP contiene entradas inesperadas.");
}

export function safePackagePath(path: string) {
  if (
    !path ||
    path.length > 240 ||
    /[\\%?#:]/.test(path) ||
    [...path].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    path.split("/").length > 16 ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    fail("El paquete contiene una ruta insegura.");
  return path;
}

// Implements: REQ-IO-05
export async function openPackageZip(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_PACKAGE_BYTES)
    fail("El paquete debe ocupar hasta 50 MiB.", 413);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4)
    fail("Selecciona un paquete ZIP estándar.");
  validateZipHeaders(bytes);
  const archive = await openMoodleArchive({
    size: bytes.length,
    arrayBuffer: async () => packageBuffer(bytes),
  });
  if (
    archive.entries.length > MAX_PACKAGE_FILES ||
    archive.entries.reduce((n, e) => n + e.size, 0) > MAX_PACKAGE_BYTES
  )
    fail("El paquete expandido excede 50 MiB o 1000 archivos.", 413);
  for (const entry of archive.entries) {
    safePackagePath(entry.name);
    if (entry.size > MAX_ENTRY_BYTES) fail("Un archivo del paquete supera 10 MiB.", 413);
  }
  return archive;
}

// Implements: REQ-IO-05
export function createZip(entries: ZipEntry[]): Uint8Array {
  if (
    !entries.length ||
    entries.length > MAX_PACKAGE_FILES ||
    new Set(entries.map((e) => e.name)).size !== entries.length
  ) {
    fail("Número de archivos ZIP inválido o rutas repetidas.");
  }
  let total = 0;
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    const name = safePackagePath(entry.name);
    total += entry.bytes.length;
    if (entry.bytes.length > MAX_ENTRY_BYTES || total > MAX_PACKAGE_BYTES) {
      fail("El paquete excede el tamaño permitido.", 413);
    }
    files[name] = entry.bytes;
  }
  const result = zipSync(files, { level: 0 });
  if (result.length > MAX_PACKAGE_BYTES) fail("El ZIP final supera 50 MiB.", 413);
  return result;
}
