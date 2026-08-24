export const MAX_MOODLE_ARCHIVE_BYTES = 250 * 1024 * 1024;
export const MAX_MOODLE_EXPANDED_BYTES = 512 * 1024 * 1024;
export const MAX_MOODLE_ENTRIES = 20_000;
export const MAX_MOODLE_XML_BYTES = 8 * 1024 * 1024;

type ArchiveEntry = {
  name: string;
  size: number;
  read: () => Promise<Uint8Array>;
};

export type MoodleArchive = {
  entries: readonly { name: string; size: number }[];
  has: (name: string) => boolean;
  read: (name: string, limit?: number) => Promise<Uint8Array>;
};

export class MoodleImportError extends Error {
  readonly code: "INVALID_ARCHIVE" | "ARCHIVE_LIMIT" | "UNSUPPORTED_CONTENT" | "INVALID_XML";

  constructor(
    message: string,
    code: "INVALID_ARCHIVE" | "ARCHIVE_LIMIT" | "UNSUPPORTED_CONTENT" | "INVALID_XML"
  ) {
    super(message);
    this.name = "MoodleImportError";
    this.code = code;
  }
}

function fail(message: string, code: MoodleImportError["code"] = "INVALID_ARCHIVE"): never {
  throw new MoodleImportError(message, code);
}

function safeArchivePath(value: string) {
  const path = value.replace(/\0[\s\S]*$/, "");
  if (
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    /^[a-z]:/i.test(path) ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail(`El archivo contiene una ruta no segura: ${value || "(vacía)"}.`);
  }
  return path;
}

function archiveFromEntries(entries: ArchiveEntry[]): MoodleArchive {
  const byName = new Map<string, ArchiveEntry>();
  for (const entry of entries) {
    if (byName.has(entry.name)) fail(`El archivo repite la ruta ${entry.name}.`);
    byName.set(entry.name, entry);
  }
  return {
    entries: entries.map(({ name, size }) => ({ name, size })),
    has: (name) => byName.has(name),
    read: async (name, limit = MAX_MOODLE_EXPANDED_BYTES) => {
      const entry = byName.get(name);
      if (!entry) fail(`El archivo no contiene ${name}.`);
      if (entry.size > limit) {
        fail(`La entrada ${name} supera el límite permitido.`, "ARCHIVE_LIMIT");
      }
      const bytes = await entry.read();
      if (bytes.length !== entry.size) fail(`La entrada ${name} quedó incompleta.`);
      return bytes;
    },
  };
}

function text(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/\0+$/g, "");
  } catch {
    fail("El respaldo contiene texto que no usa UTF-8 válido.");
  }
}

function octal(bytes: Uint8Array, label: string) {
  const value = text(bytes).split("\0", 1)[0].trim();
  if (!value) return 0;
  if (!/^[0-7]+$/.test(value)) fail(`La cabecera TAR trae un ${label} inválido.`);
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(`La cabecera TAR excede ${label}.`);
  return parsed;
}

function tarChecksum(header: Uint8Array) {
  let sum = 0;
  for (let index = 0; index < header.length; index += 1) {
    sum += index >= 148 && index < 156 ? 0x20 : header[index];
  }
  return sum;
}

function allZero(bytes: Uint8Array) {
  return bytes.every((value) => value === 0);
}

function paxPath(bytes: Uint8Array) {
  const source = text(bytes);
  for (const record of source.split("\n")) {
    const match = record.match(/^\d+ path=(.*)$/);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Implements: REQ-MOODLE-01, REQ-MOODLE-09
function openTar(bytes: Uint8Array): MoodleArchive {
  const entries: ArchiveEntry[] = [];
  let offset = 0;
  let total = 0;
  let pendingPath: string | null = null;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (allZero(header)) break;
    const declaredChecksum = octal(header.subarray(148, 156), "checksum");
    if (declaredChecksum !== tarChecksum(header)) fail("La cabecera TAR no supera su checksum.");
    const rawName = text(header.subarray(0, 100));
    const prefix = text(header.subarray(345, 500));
    const headerName = prefix ? `${prefix}/${rawName}` : rawName;
    const size = octal(header.subarray(124, 136), "tamaño");
    const type = String.fromCharCode(header[156] || 0);
    const contentOffset = offset + 512;
    const contentEnd = contentOffset + size;
    if (contentEnd > bytes.length) fail(`La entrada TAR ${headerName} está truncada.`);
    const content = bytes.subarray(contentOffset, contentEnd);

    if (type === "x" || type === "g") {
      pendingPath = paxPath(content) ?? pendingPath;
    } else if (type === "L") {
      pendingPath = text(content);
    } else if (type === "0" || type === "\0") {
      const name = safeArchivePath(pendingPath ?? headerName);
      pendingPath = null;
      total += size;
      if (total > MAX_MOODLE_EXPANDED_BYTES) {
        fail("El respaldo expandido supera 512 MiB.", "ARCHIVE_LIMIT");
      }
      entries.push({
        name,
        size,
        read: async () => new Uint8Array(content),
      });
      if (entries.length > MAX_MOODLE_ENTRIES) {
        fail("El respaldo supera 20.000 entradas.", "ARCHIVE_LIMIT");
      }
    } else if (type !== "5") {
      fail(`El TAR usa un tipo de entrada no compatible en ${headerName}.`);
    }

    offset = contentOffset + Math.ceil(size / 512) * 512;
  }

  if (entries.length === 0) fail("El TAR no contiene archivos restaurables.");
  return archiveFromEntries(entries);
}

async function readStreamWithLimit(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) fail("El respaldo expandido supera 512 MiB.", "ARCHIVE_LIMIT");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

async function decompress(bytes: Uint8Array, format: "gzip" | "deflate-raw", limit: number) {
  try {
    const source = new Blob([bytes.slice().buffer]).stream();
    const stream = source.pipeThrough(new DecompressionStream(format));
    return await readStreamWithLimit(stream, limit);
  } catch (cause) {
    if (cause instanceof MoodleImportError) throw cause;
    throw new MoodleImportError(
      "El respaldo usa compresión dañada o no compatible.",
      "INVALID_ARCHIVE"
    );
  }
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const start = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  fail("El ZIP no contiene un directorio central válido.");
}

// Implements: REQ-MOODLE-01, REQ-MOODLE-09
function openZip(bytes: Uint8Array): MoodleArchive {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(bytes);
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    fail("Los ZIP divididos en varios discos no son compatibles.");
  }
  if (entryCount > MAX_MOODLE_ENTRIES) {
    fail("El respaldo supera 20.000 entradas.", "ARCHIVE_LIMIT");
  }
  if (centralOffset + centralSize > eocd) fail("El directorio central ZIP está truncado.");

  const entries: ArchiveEntry[] = [];
  let offset = centralOffset;
  let expandedTotal = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      fail("El directorio central ZIP contiene una cabecera inválida.");
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const checksum = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      fail("Los respaldos ZIP64 no caben dentro del límite admitido.", "ARCHIVE_LIMIT");
    }
    if ((flags & 1) !== 0) fail("Los respaldos ZIP cifrados no son compatibles.");
    if (method !== 0 && method !== 8) fail(`El ZIP usa el método de compresión ${method}.`);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.length) fail("El nombre de una entrada ZIP está truncado.");
    const rawName = text(bytes.subarray(nameStart, nameEnd));
    offset = nameEnd + extraLength + commentLength;
    if (offset > bytes.length) fail(`La entrada ZIP ${rawName} está truncada.`);
    if (rawName.endsWith("/")) continue;
    const name = safeArchivePath(rawName);
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      fail(`La entrada ZIP ${name} no tiene cabecera local válida.`);
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) fail(`La entrada ZIP ${name} está truncada.`);
    expandedTotal += uncompressedSize;
    if (expandedTotal > MAX_MOODLE_EXPANDED_BYTES) {
      fail("El respaldo expandido supera 512 MiB.", "ARCHIVE_LIMIT");
    }
    entries.push({
      name,
      size: uncompressedSize,
      read: async () => {
        const compressed = bytes.subarray(dataStart, dataEnd);
        const output =
          method === 0
            ? new Uint8Array(compressed)
            : await decompress(compressed, "deflate-raw", uncompressedSize);
        if (output.length !== uncompressedSize || crc32(output) !== checksum) {
          fail(`La entrada ZIP ${name} no supera su CRC.`);
        }
        return output;
      },
    });
  }
  if (entries.length === 0) fail("El ZIP no contiene archivos restaurables.");
  return archiveFromEntries(entries);
}

// Implements: REQ-MOODLE-01, REQ-MOODLE-09
export async function openMoodleArchive(file: {
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<MoodleArchive> {
  if (file.size <= 0) fail("Selecciona un respaldo que no esté vacío.");
  if (file.size > MAX_MOODLE_ARCHIVE_BYTES) {
    fail("El respaldo supera el máximo de 250 MiB.", "ARCHIVE_LIMIT");
  }
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const signature = sourceBytes.subarray(0, 4);
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    const bytes = await readStreamWithLimit(
      new Blob([sourceBytes.slice().buffer]).stream().pipeThrough(new DecompressionStream("gzip")),
      MAX_MOODLE_EXPANDED_BYTES
    );
    return openTar(bytes);
  }
  if (
    signature[0] === 0x50 &&
    signature[1] === 0x4b &&
    (signature[2] === 0x03 || signature[2] === 0x05 || signature[2] === 0x07)
  ) {
    return openZip(sourceBytes);
  }
  return openTar(sourceBytes);
}
