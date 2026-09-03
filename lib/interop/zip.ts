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

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(entries: ZipEntry[]) {
  if (
    !entries.length ||
    entries.length > MAX_PACKAGE_FILES ||
    new Set(entries.map((e) => e.name)).size !== entries.length
  )
    fail("Número de archivos ZIP inválido o rutas repetidas.");
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  let total = 0;
  for (const entry of entries) {
    const name = encoder.encode(safePackagePath(entry.name));
    total += entry.bytes.length;
    if (entry.bytes.length > MAX_ENTRY_BYTES || total > MAX_PACKAGE_BYTES)
      fail("El paquete excede el tamaño permitido.", 413);
    const crc = crc32(entry.bytes);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x800, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, entry.bytes.length, true);
    lv.setUint32(22, entry.bytes.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const header = new Uint8Array(46 + name.length);
    const cv = new DataView(header.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.bytes.length, true);
    cv.setUint32(24, entry.bytes.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    header.set(name, 46);
    chunks.push(local, entry.bytes);
    central.push(header);
    offset += local.length + entry.bytes.length;
  }
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  const centralSize = central.reduce((n, e) => n + e.length, 0);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const result = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const chunk of [...chunks, ...central, end]) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  if (result.length > MAX_PACKAGE_BYTES) fail("El ZIP final supera 50 MiB.", 413);
  return result;
}
