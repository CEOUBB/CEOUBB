import {
  containsCredentialLikeMaterial,
  containsPersonalData,
  containsUnsafeHttpUrl,
} from "./privacy.ts";

function mimeTypes(...values: string[]) {
  return Object.freeze(values);
}

export const ADECCA_STORAGE_FILE_MIME_TYPES: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    csv: mimeTypes("text/csv"),
    doc: mimeTypes("application/msword"),
    docx: mimeTypes("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    jpeg: mimeTypes("image/jpeg"),
    jpg: mimeTypes("image/jpeg"),
    pdf: mimeTypes("application/pdf"),
    png: mimeTypes("image/png"),
    ppt: mimeTypes("application/vnd.ms-powerpoint"),
    pptx: mimeTypes("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    txt: mimeTypes("text/plain"),
    webp: mimeTypes("image/webp"),
    xls: mimeTypes("application/vnd.ms-excel"),
    xlsx: mimeTypes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    zip: mimeTypes("application/zip", "application/x-zip-compressed"),
  });

function extensionForName(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function asciiPrefix(bytes: Uint8Array, length: number) {
  return new TextDecoder("latin1").decode(bytes.slice(0, length));
}

function hasExecutableSignature(bytes: Uint8Array) {
  return [
    [0x4d, 0x5a],
    [0x7f, 0x45, 0x4c, 0x46],
    [0x00, 0x61, 0x73, 0x6d],
    [0x64, 0x65, 0x78, 0x0a],
    [0xca, 0xfe, 0xba, 0xbe],
    [0xcf, 0xfa, 0xed, 0xfe],
    [0xce, 0xfa, 0xed, 0xfe],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xfe, 0xed, 0xfa, 0xce],
  ].some((signature) => startsWithBytes(bytes, signature));
}

export function adeccaContentTypeForName(name: string) {
  return ADECCA_STORAGE_FILE_MIME_TYPES[extensionForName(name)]?.[0] ?? "application/octet-stream";
}

export function adeccaFileIsSupported(name: string, contentType = adeccaContentTypeForName(name)) {
  const allowed = ADECCA_STORAGE_FILE_MIME_TYPES[extensionForName(name)];
  return Boolean(allowed?.includes(contentType));
}

export function adeccaFileSignatureMatches(name: string, bytes: Uint8Array) {
  if (hasExecutableSignature(bytes)) return false;
  const extension = extensionForName(name);
  const prefix = asciiPrefix(bytes, 1_024);
  if (extension === "pdf") return prefix.includes("%PDF-");
  if (extension === "png") {
    return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (extension === "jpg" || extension === "jpeg") {
    return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
  }
  if (extension === "webp") {
    return prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP";
  }
  if (["zip", "docx", "xlsx", "pptx"].includes(extension)) {
    return startsWithBytes(bytes, [0x50, 0x4b]) && [0x03, 0x05, 0x07].includes(bytes[2] ?? -1);
  }
  if (["doc", "xls", "ppt"].includes(extension)) {
    return (
      startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) ||
      (extension === "doc" && prefix.startsWith("{\\rtf"))
    );
  }
  if (extension === "txt" || extension === "csv") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return !text.includes("\u0000");
    } catch {
      return false;
    }
  }
  return false;
}

export function adeccaTextFileContainsSensitiveData(name: string, bytes: Uint8Array) {
  const extension = extensionForName(name);
  if (extension !== "txt" && extension !== "csv") return false;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return (
      containsPersonalData(text) ||
      containsCredentialLikeMaterial(text) ||
      containsUnsafeHttpUrl(text)
    );
  } catch {
    return true;
  }
}
