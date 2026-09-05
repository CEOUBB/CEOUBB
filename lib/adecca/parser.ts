import { normalizeAccessEmail, roleForEmail } from "../access-policy.ts";
import { sanitizeAcademicHtml } from "../academic-content.ts";
import { htmlToAcademicMarkdown } from "../multimodal-editor.ts";
import {
  MAX_MOODLE_ARCHIVE_BYTES,
  MAX_MOODLE_ENTRIES,
  MAX_MOODLE_EXPANDED_BYTES,
  MAX_MOODLE_XML_BYTES,
  MoodleImportError,
  openMoodleArchive,
  type MoodleArchive,
} from "../moodle/archive.ts";
import { RICH_TEXT_MAX_LENGTH } from "../rich-text.ts";
import {
  adeccaContentTypeForName,
  adeccaFileIsSupported as storageFileIsSupported,
  adeccaFileSignatureMatches,
  adeccaTextFileContainsSensitiveData,
} from "./file-policy.ts";
import { sha256Bytes, sha256Text, stableAdeccaDocumentId } from "./ids.ts";
import {
  containsCredentialLikeMaterial,
  isSecretFieldName,
  redactSensitiveText,
  safeAdeccaHttpUrl,
} from "./privacy.ts";
import type {
  AdeccaCourseImportPreview,
  AdeccaImportFile,
  AdeccaImportOmission,
  AdeccaImportPostDraft,
  AdeccaImportSource,
  AdeccaRosterParticipant,
  PreparedAdeccaCourseImport,
} from "./types.ts";

export const MAX_ADECCA_ARCHIVE_BYTES = MAX_MOODLE_ARCHIVE_BYTES;
export const MAX_ADECCA_EXPANDED_BYTES = MAX_MOODLE_EXPANDED_BYTES;
export const MAX_ADECCA_ENTRIES = MAX_MOODLE_ENTRIES;
export const MAX_ADECCA_MANIFEST_BYTES = MAX_MOODLE_XML_BYTES;
export const MAX_ADECCA_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_ADECCA_CSV_BYTES = 1024 * 1024;
export const MAX_ADECCA_CSV_ROWS = 5_000;

type AdeccaErrorCode =
  "INVALID_ADECCA_PACKAGE" | "ADECCA_PACKAGE_LIMIT" | "UNSUPPORTED_ADECCA_CONTENT";

type SourceFile = {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type LogicalArchiveEntry = {
  archivePath: string;
  logicalPath: string;
  size: number;
};

type ManifestItem = {
  sourceId: string;
  title: string;
  kind: string;
  folder: string;
  body: string;
  bodyHtml: string;
  linkUrl: string;
  dueDate: string;
  filePath: string;
  sha256: string;
  visible: boolean;
};

type ParsedManifest = {
  courseId: string;
  courseName: string;
  courseShortName: string;
  adeccaVersion: string;
  items: ManifestItem[];
  participants: unknown[];
  extraFields: string[];
};

const POST_KINDS = new Set(["notice", "guide", "assessment", "resource"]);
const DESCRIPTION_FILES = new Set([
  "readme.md",
  "readme.txt",
  "descripcion.html",
  "descripcion.htm",
]);
const ROSTER_FILES = new Set(["nomina.csv", "participantes.csv", "estudiantes.csv"]);
const CSV_EMAIL_HEADERS = new Set(["correo", "correo electronico", "email", "e mail", "mail"]);
const CSV_ROLE_HEADERS = new Set(["rol", "role", "perfil", "tipo"]);
const CSV_STUDENT_ROLES = new Set(["", "student", "estudiante", "alumno", "alumna"]);
const MANIFEST_KEYS = new Set(["format", "version", "source", "items", "participants"]);
const SOURCE_KEYS = new Set(["courseId", "courseName", "courseShortName", "adeccaVersion"]);
const ITEM_KEYS = new Set([
  "sourceId",
  "title",
  "kind",
  "folder",
  "body",
  "bodyHtml",
  "linkUrl",
  "dueDate",
  "filePath",
  "sha256",
  "visible",
]);
const PARTICIPANT_KEYS = new Set(["sourceUserId", "email", "role"]);

export class AdeccaImportError extends Error {
  readonly code: AdeccaErrorCode;

  constructor(message: string, code: AdeccaErrorCode = "INVALID_ADECCA_PACKAGE") {
    super(message);
    this.name = "AdeccaImportError";
    this.code = code;
  }
}

function fail(message: string, code: AdeccaErrorCode = "INVALID_ADECCA_PACKAGE"): never {
  throw new AdeccaImportError(redactSensitiveText(message), code);
}

function normalizedKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scanForSecrets(value: unknown) {
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    nodes += 1;
    if (nodes > 100_000 || current.depth > 64) {
      fail("El manifiesto ADECCA excede su complejidad permitida.", "ADECCA_PACKAGE_LIMIT");
    }
    if (typeof current.value === "string") {
      if (containsCredentialLikeMaterial(current.value)) {
        fail("El paquete contiene material de credencial o secreto que no se admite.");
      }
      continue;
    }
    if (Array.isArray(current.value)) {
      for (const item of current.value) pending.push({ value: item, depth: current.depth + 1 });
      continue;
    }
    if (!isRecord(current.value)) continue;
    for (const [key, child] of Object.entries(current.value)) {
      if (isSecretFieldName(key)) {
        fail("El paquete contiene un campo de credencial o secreto que no se admite.");
      }
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
}

function utf8(bytes: Uint8Array, label: string) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    fail(`${label} no usa UTF-8 válido.`);
  }
}

function boundedString(value: unknown, label: string, maximum: number, required = false) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") fail(`${label} debe ser texto.`);
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maximum) {
    fail(`${label} no cumple el largo permitido.`);
  }
  return normalized;
}

function safeTitle(value: string, fallback: string) {
  return redactSensitiveText(value).trim().replace(/\s+/g, " ").slice(0, 140) || fallback;
}

function safeFolder(value: string) {
  return (
    redactSensitiveText(value)
      .trim()
      .replace(/[\\/]+/g, " / ")
      .replace(/\s+/g, " ")
      .slice(0, 60) || "General"
  );
}

function safeLogicalPath(value: string) {
  const path = value.replace(/\0[\s\S]*$/, "").replace(/^\.\//, "");
  if (
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    /^[a-z]:/i.test(path) ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail(`El paquete contiene una ruta no segura: ${value || "(vacía)"}.`);
  }
  return path;
}

function fileName(path: string) {
  return path.split("/").at(-1) ?? path;
}

function safePersistentFileName(value: string, maximum: number, fallback: string) {
  const leaf = value.replace(/\\/g, "/").split("/").at(-1) ?? value;
  const extension = leaf.match(/\.[a-z0-9]{1,10}$/i)?.[0] ?? "";
  let sanitized = Array.from(redactSensitiveText(leaf), (character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f || character === "/" || character === "\\"
      ? " "
      : character;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (extension) {
    const stem = sanitized.toLowerCase().endsWith(extension.toLowerCase())
      ? sanitized.slice(0, -extension.length)
      : sanitized;
    sanitized = `${stem.slice(0, Math.max(0, maximum - extension.length)).trim()}${extension}`;
  } else {
    sanitized = sanitized.slice(0, maximum);
  }
  return sanitized || fallback;
}

function folderForPath(path: string) {
  const segments = path.split("/");
  segments.pop();
  return safeFolder(segments.join(" / "));
}

export function adeccaFileIsSupported(name: string, contentType = adeccaContentTypeForName(name)) {
  return storageFileIsSupported(name, contentType);
}

export function chunkAdeccaImportRecords<T>(values: readonly T[], size = 100): T[][] {
  const bounded = Math.max(1, Math.min(100, Math.trunc(size)));
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += bounded) {
    chunks.push(values.slice(index, index + bounded));
  }
  return chunks;
}

export async function verifyAdeccaFileBytes(file: AdeccaImportFile, bytes: Uint8Array) {
  if (bytes.length !== file.fileSize) {
    fail(`${file.fileName} falló su verificación de integridad: el tamaño no coincide.`);
  }
  const hash = await sha256Bytes(bytes);
  if (hash !== file.contentHash.toLowerCase()) {
    fail(`${file.fileName} falló su verificación de integridad SHA-256.`);
  }
}

function omission(
  omissions: AdeccaImportOmission[],
  category: string,
  title: string,
  reason: string
) {
  const normalized = {
    category: redactSensitiveText(category).slice(0, 80),
    title: safeTitle(title, "Elemento sin título"),
    reason: redactSensitiveText(reason).slice(0, 500),
  };
  if (omissions.length >= MAX_ADECCA_ENTRIES) return;
  omissions.push(normalized);
}

function markdownContent(value: string) {
  if (!value.trim()) return "";
  if (containsCredentialLikeMaterial(value)) {
    fail("Una descripción textual contiene material de credencial o secreto.");
  }
  const bounded = value.slice(0, 99_999);
  const sanitized = String(sanitizeAcademicHtml(bounded)).replace(/<img\b[^>]*>/gi, "");
  const markdown = htmlToAcademicMarkdown(sanitized)
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[([^\]\n]{0,500})\]\((https?:\/\/[^)\s]+)\)/gi, (full, label, url) =>
      safeHttpLink(url) ? full : label
    )
    .replace(/<(https?:\/\/[^>\s]+)>/gi, (full, url) =>
      safeHttpLink(url) ? full : "[enlace omitido]"
    )
    .replace(/(^|[\s(])(https?:\/\/[^\s<>)]+)/gi, (full, prefix, url) =>
      safeHttpLink(url) ? full : `${prefix}[enlace omitido]`
    )
    .trim();
  return redactSensitiveText(markdown).slice(0, RICH_TEXT_MAX_LENGTH);
}

function safeHttpLink(value: string) {
  return safeAdeccaHttpUrl(value);
}

function safeDueDate(value: string) {
  if (!value) return "";
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (calendarDate) {
    const year = Number(calendarDate[1]);
    const month = Number(calendarDate[2]);
    const day = Number(calendarDate[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
      ? value
      : "";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function extraKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>) {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function parseManifest(bytes: Uint8Array, label: string): ParsedManifest {
  if (bytes.length <= 0 || bytes.length > MAX_ADECCA_MANIFEST_BYTES) {
    fail("El manifiesto ADECCA debe pesar entre 1 byte y 8 MiB.", "ADECCA_PACKAGE_LIMIT");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(utf8(bytes, label));
  } catch (error) {
    if (error instanceof AdeccaImportError) throw error;
    fail(`${label} no contiene JSON válido.`);
  }
  scanForSecrets(parsed);
  if (!isRecord(parsed)) fail("El manifiesto ADECCA debe ser un objeto JSON.");
  if (parsed.format !== "ceoubb-adecca-package" || parsed.version !== 1) {
    fail("El manifiesto no usa el formato ceoubb-adecca-package versión 1.");
  }
  if (!isRecord(parsed.source)) fail("El manifiesto no contiene un origen ADECCA válido.");
  const courseId = redactSensitiveText(
    boundedString(parsed.source.courseId, "source.courseId", 500, true)
  );
  const courseName = redactSensitiveText(
    boundedString(parsed.source.courseName, "source.courseName", 140, true)
  );
  const courseShortName = redactSensitiveText(
    boundedString(parsed.source.courseShortName, "source.courseShortName", 140)
  );
  const adeccaVersion = redactSensitiveText(
    boundedString(parsed.source.adeccaVersion, "source.adeccaVersion", 100)
  );
  const rawItems = parsed.items ?? [];
  if (!Array.isArray(rawItems) || rawItems.length > MAX_ADECCA_ENTRIES) {
    fail("El manifiesto supera 20.000 elementos.", "ADECCA_PACKAGE_LIMIT");
  }
  const sourceIds = new Set<string>();
  const items = rawItems.map((value, index): ManifestItem => {
    if (!isRecord(value)) fail(`items[${index}] no es un objeto válido.`);
    const sourceId = boundedString(value.sourceId, `items[${index}].sourceId`, 500, true);
    if (sourceIds.has(sourceId)) fail(`El manifiesto repite sourceId ${sourceId}.`);
    sourceIds.add(sourceId);
    const title = redactSensitiveText(
      boundedString(value.title, `items[${index}].title`, 140, true)
    );
    const kind = boundedString(value.kind, `items[${index}].kind`, 80, true).toLowerCase();
    const folder = redactSensitiveText(boundedString(value.folder, `items[${index}].folder`, 500));
    const body = boundedString(value.body, `items[${index}].body`, 100_000);
    const bodyHtml = boundedString(value.bodyHtml, `items[${index}].bodyHtml`, 100_000);
    const linkUrl = boundedString(value.linkUrl, `items[${index}].linkUrl`, 2_000);
    const dueDate = boundedString(value.dueDate, `items[${index}].dueDate`, 100);
    const rawFilePath = boundedString(value.filePath, `items[${index}].filePath`, 1_000);
    const filePath = rawFilePath ? safeLogicalPath(rawFilePath) : "";
    const sha256 = boundedString(value.sha256, `items[${index}].sha256`, 64).toLowerCase();
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) {
      fail(`items[${index}].sha256 no es un SHA-256 completo.`);
    }
    if (value.visible !== undefined && typeof value.visible !== "boolean") {
      fail(`items[${index}].visible debe ser booleano.`);
    }
    return {
      sourceId,
      title,
      kind,
      folder,
      body,
      bodyHtml,
      linkUrl,
      dueDate,
      filePath,
      sha256,
      visible: value.visible !== false,
    };
  });
  const participants = parsed.participants ?? [];
  if (!Array.isArray(participants) || participants.length > MAX_ADECCA_CSV_ROWS) {
    fail("El manifiesto supera 5.000 participantes.", "ADECCA_PACKAGE_LIMIT");
  }
  return {
    courseId,
    courseName,
    courseShortName,
    adeccaVersion,
    items,
    participants,
    extraFields: [
      ...extraKeys(parsed, MANIFEST_KEYS),
      ...extraKeys(parsed.source, SOURCE_KEYS).map((key) => `source.${key}`),
      ...rawItems.flatMap((value, index) =>
        isRecord(value) ? extraKeys(value, ITEM_KEYS).map((key) => `items[${index}].${key}`) : []
      ),
    ],
  };
}

function participantsFromManifest(values: unknown[], omissions: AdeccaImportOmission[]) {
  const participants: AdeccaRosterParticipant[] = [];
  const emails = new Set<string>();
  values.forEach((value, index) => {
    if (!isRecord(value)) {
      omission(omissions, "participant", `Participante ${index + 1}`, "La fila no es válida.");
      return;
    }
    for (const key of extraKeys(value, PARTICIPANT_KEYS)) {
      omission(
        omissions,
        "participant-field",
        `Participante ${index + 1}`,
        `El campo ${key} no es necesario y no se conserva.`
      );
    }
    const sourceUserId = typeof value.sourceUserId === "string" ? value.sourceUserId.trim() : "";
    const email = normalizeAccessEmail(typeof value.email === "string" ? value.email : "");
    if (value.role !== "student") {
      omission(omissions, "participant-role", email || sourceUserId, "El rol no es estudiante.");
      return;
    }
    if (!sourceUserId || sourceUserId.length > 500 || roleForEmail(email) !== "student") {
      omission(
        omissions,
        "participant-domain",
        email || sourceUserId || `Participante ${index + 1}`,
        "El correo no corresponde a una cuenta estudiantil institucional."
      );
      return;
    }
    if (!emails.has(email)) {
      emails.add(email);
      participants.push({
        sourceUserId: stableAdeccaDocumentId("participant", email),
        email,
        role: "student",
      });
    }
  });
  return participants;
}

function csvRows(source: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) fail("La nómina CSV termina dentro de una celda con comillas.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizedHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function rosterFromCsv(bytes: Uint8Array, omissions: AdeccaImportOmission[]) {
  if (bytes.length <= 0 || bytes.length > MAX_ADECCA_CSV_BYTES) {
    fail("La nómina CSV debe pesar entre 1 byte y 1 MiB.", "ADECCA_PACKAGE_LIMIT");
  }
  const source = utf8(bytes, "La nómina CSV");
  const headerLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"].sort(
    (left, right) => headerLine.split(right).length - headerLine.split(left).length
  )[0];
  const rows = csvRows(source, delimiter);
  if (rows.length < 2 || rows.length - 1 > MAX_ADECCA_CSV_ROWS) {
    fail("La nómina CSV debe contener entre 1 y 5.000 estudiantes.", "ADECCA_PACKAGE_LIMIT");
  }
  const headers = rows[0].map(normalizedHeader);
  if (
    containsCredentialLikeMaterial(source) ||
    headers.some((header) => header !== "rut" && isSecretFieldName(header))
  ) {
    fail("La nómina CSV contiene un campo de credencial o secreto que no se admite.");
  }
  const emailIndex = headers.findIndex((header) => CSV_EMAIL_HEADERS.has(header));
  const roleIndex = headers.findIndex((header) => CSV_ROLE_HEADERS.has(header));
  if (emailIndex < 0) fail("La nómina CSV necesita una columna Correo o Email.");
  const participants: AdeccaRosterParticipant[] = [];
  const emails = new Set<string>();
  for (let index = 1; index < rows.length; index += 1) {
    const email = normalizeAccessEmail(rows[index][emailIndex] ?? "");
    const role = normalizedHeader(roleIndex >= 0 ? (rows[index][roleIndex] ?? "") : "student");
    if (!CSV_STUDENT_ROLES.has(role)) {
      omission(
        omissions,
        "participant-role",
        email || `Fila ${index + 1}`,
        "El rol no es estudiante."
      );
      continue;
    }
    if (roleForEmail(email) !== "student") {
      omission(
        omissions,
        "participant-domain",
        email || `Fila ${index + 1}`,
        "El correo no corresponde a una cuenta estudiantil institucional."
      );
      continue;
    }
    if (!emails.has(email)) {
      emails.add(email);
      participants.push({ sourceUserId: `csv:${index}`, email, role: "student" });
    }
  }
  return participants;
}

function semanticCategory(path: string) {
  const tokens = normalizedText(path.replace(/\[(?:correo|rut) omitido\]/gi, " "))
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  const compact = tokens.join("");
  const has = (...values: string[]) => values.some((value) => tokens.includes(value));
  if (has("nomina", "participantes", "roster")) return "roster-data";
  if (has("nota", "notas", "grade", "grades", "calificacion", "calificaciones")) return "grades";
  if (has("entrega", "entregas", "submission", "submissions")) return "submissions";
  if (has("intento", "intentos", "attempt", "attempts")) return "attempts";
  if (has("foro", "foros", "forum", "forums", "respuesta", "respuestas")) return "forum";
  if (
    compact.includes("peerreview") ||
    compact.includes("coevaluacion") ||
    compact.includes("revisionentrepares")
  ) {
    return "peer-review";
  }
  if (has("diario", "diarios", "journal", "journals")) return "journal";
  if (has("log", "logs", "bitacora", "bitacoras")) return "logs";
  if (
    compact.includes("apikey") ||
    has(
      "rut",
      "password",
      "contrasena",
      "clave",
      "cookie",
      "token",
      "apikey",
      "credencial",
      "credenciales"
    )
  ) {
    return "sensitive-data";
  }
  return "";
}

function logicalEntries(archive: MoodleArchive) {
  const paths = archive.entries.map((entry) => safeLogicalPath(entry.name));
  const firstSegments = paths.map((path) => path.split("/"));
  const commonRoot = firstSegments.every(
    (segments) => segments.length > 1 && segments[0] === firstSegments[0]?.[0]
  )
    ? firstSegments[0][0]
    : "";
  const result = archive.entries.map<LogicalArchiveEntry>((entry, index) => ({
    archivePath: entry.name,
    logicalPath: commonRoot ? paths[index].slice(commonRoot.length + 1) : paths[index],
    size: entry.size,
  }));
  const seen = new Set<string>();
  for (const entry of result) {
    if (!entry.logicalPath || seen.has(entry.logicalPath)) {
      fail(`El ZIP repite la ruta lógica ${entry.logicalPath || "(vacía)"}.`);
    }
    seen.add(entry.logicalPath);
  }
  return result;
}

function sourceFromManifest(
  manifest: ParsedManifest,
  fingerprint: string,
  file: SourceFile,
  sourceFormat: "zip" | "json",
  sourceKey: string
): AdeccaImportSource {
  return {
    sourceKey,
    fingerprint,
    courseId: manifest.courseId,
    courseName: safeTitle(manifest.courseName, "Curso ADECCA"),
    courseShortName: safeTitle(manifest.courseShortName, manifest.courseId),
    adeccaVersion: redactSensitiveText(manifest.adeccaVersion).slice(0, 100) || "Paquete local",
    fileName: safePersistentFileName(file.name, 160, `paquete-adecca.${sourceFormat}`),
    sourceFormat,
  };
}

function sourceNameFromFile(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "").trim();
  return safeTitle(withoutExtension, "Curso ADECCA");
}

function guideFile(name: string) {
  const normalized = normalizedText(name);
  return /(^|[^a-z])(guia|programa)([^a-z]|$)/.test(normalized);
}

function addFolder(folders: Set<string>, folder: string) {
  folders.add(safeFolder(folder));
}

async function materialFromEntry(
  entry: LogicalArchiveEntry,
  archive: MoodleArchive,
  sourceKey: string,
  omissions: AdeccaImportOmission[],
  overrides?: {
    sourceId: string;
    title: string;
    body: string;
    kind: string;
    folder: string;
    linkUrl: string;
    dueDate: string;
    sha256: string;
  }
) {
  const title = safeTitle(overrides?.title ?? fileName(entry.logicalPath), "Archivo ADECCA");
  if (entry.size <= 0) {
    omission(omissions, "file-size", title, "El archivo está vacío.");
    return null;
  }
  if (entry.size > MAX_ADECCA_FILE_BYTES) {
    omission(omissions, "file-size", title, "El archivo supera 50 MiB.");
    return null;
  }
  const bytes = await archive.read(entry.archivePath, MAX_ADECCA_FILE_BYTES);
  const category = semanticCategory(entry.logicalPath);
  if (category) {
    omission(
      omissions,
      category,
      title,
      "El archivo representa datos personales o semántica académica que no se restaura."
    );
    return null;
  }
  const contentType = adeccaContentTypeForName(entry.logicalPath);
  if (!adeccaFileIsSupported(entry.logicalPath, contentType)) {
    omission(omissions, "file-type", title, "La extensión o MIME activo no está permitido.");
    return null;
  }
  if (!adeccaFileSignatureMatches(entry.logicalPath, bytes)) {
    omission(
      omissions,
      "file-signature",
      title,
      "El contenido no coincide con el tipo de archivo declarado o parece ejecutable."
    );
    return null;
  }
  if (adeccaTextFileContainsSensitiveData(entry.logicalPath, bytes)) {
    omission(
      omissions,
      "sensitive-data",
      title,
      "El archivo de texto contiene datos personales, credenciales o enlaces inseguros."
    );
    return null;
  }
  const contentHash = await sha256Bytes(bytes);
  if (overrides?.sha256 && overrides.sha256 !== contentHash) {
    omission(
      omissions,
      "file-integrity",
      title,
      "El archivo no coincide con su SHA-256 declarado."
    );
    return null;
  }
  const kind = POST_KINDS.has(overrides?.kind ?? "")
    ? (overrides?.kind as AdeccaImportFile["kind"])
    : guideFile(entry.logicalPath)
      ? "guide"
      : "resource";
  return {
    sourceId: overrides?.sourceId ?? stableAdeccaDocumentId(sourceKey, `file:${entry.logicalPath}`),
    title,
    body:
      overrides?.body ||
      (kind === "guide"
        ? "Guía o programa preservado desde un paquete local ADECCA."
        : "Material preservado desde un paquete local ADECCA."),
    kind,
    folder: safeFolder(overrides?.folder || folderForPath(entry.logicalPath)),
    linkUrl: overrides?.linkUrl ?? "",
    dueDate: overrides?.dueDate ?? "",
    archivePath: entry.archivePath,
    fileName: safePersistentFileName(
      fileName(entry.logicalPath),
      120,
      `archivo.${entry.logicalPath.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "bin"}`
    ),
    contentType,
    fileSize: entry.size,
    contentHash,
    sourceCreatedAt: null,
  } satisfies AdeccaImportFile;
}

function mergeParticipants(
  destination: AdeccaRosterParticipant[],
  incoming: AdeccaRosterParticipant[]
) {
  const emails = new Set(destination.map((entry) => entry.email));
  for (const participant of incoming) {
    if (!emails.has(participant.email)) {
      emails.add(participant.email);
      destination.push(participant);
    }
  }
}

async function buildManifestContent(
  manifest: ParsedManifest,
  source: AdeccaImportSource,
  archive: MoodleArchive | null,
  entriesByPath: Map<string, LogicalArchiveEntry>,
  omissions: AdeccaImportOmission[],
  folders: Set<string>,
  consumed: Set<string>
) {
  const posts: AdeccaImportPostDraft[] = [];
  const files: AdeccaImportFile[] = [];
  for (const extra of manifest.extraFields) {
    omission(
      omissions,
      "manifest-field",
      extra,
      "El campo no pertenece al contrato y no se conserva."
    );
  }
  for (const item of manifest.items) {
    if (item.filePath) consumed.add(item.filePath);
    if (!item.visible) {
      omission(omissions, "hidden", item.title, "El elemento estaba marcado como oculto.");
      continue;
    }
    if (!POST_KINDS.has(item.kind)) {
      omission(
        omissions,
        item.kind,
        item.title,
        "La semántica interactiva no posee un adaptador seguro."
      );
      continue;
    }
    const folder = safeFolder(
      item.folder || (item.filePath ? folderForPath(item.filePath) : "General")
    );
    const body = markdownContent(item.bodyHtml || item.body);
    const dueDate = safeDueDate(item.dueDate);
    if (item.dueDate && !dueDate) {
      omission(omissions, "date", item.title, "La fecha de la actividad no es válida.");
      continue;
    }
    const sourceCategory = semanticCategory(`${item.title} ${item.filePath}`);
    if (sourceCategory) {
      omission(
        omissions,
        sourceCategory,
        item.title,
        "El elemento representa datos personales o semántica académica que no se restaura."
      );
      continue;
    }
    const linkUrl = item.linkUrl ? safeHttpLink(item.linkUrl) : "";
    if (item.linkUrl && !linkUrl) {
      omission(omissions, "url", item.title, "El enlace HTTP o HTTPS no es válido o es inseguro.");
      continue;
    }
    if (item.filePath) {
      const entry = entriesByPath.get(item.filePath);
      if (!archive || !entry) {
        omission(
          omissions,
          "file-missing",
          item.title,
          "El manifiesto declara un archivo que no está disponible en este origen."
        );
        if (!body && !linkUrl && !dueDate) continue;
      } else {
        const material = await materialFromEntry(entry, archive, source.sourceKey, omissions, {
          sourceId: stableAdeccaDocumentId(source.sourceKey, `item:${item.sourceId}`),
          title: item.title,
          body,
          kind: item.kind,
          folder,
          linkUrl,
          dueDate,
          sha256: item.sha256,
        });
        consumed.add(entry.logicalPath);
        if (material) {
          addFolder(folders, material.folder);
          files.push(material);
          continue;
        }
        if (!body && !linkUrl && !dueDate) continue;
      }
    }
    const kind = item.kind as AdeccaImportPostDraft["kind"];
    addFolder(folders, folder);
    posts.push({
      sourceId: stableAdeccaDocumentId(source.sourceKey, `item:${item.sourceId}`),
      title: safeTitle(item.title, "Contenido ADECCA"),
      body:
        body ||
        (kind === "assessment"
          ? "Actividad descriptiva importada sin entregas históricas."
          : item.title),
      kind,
      folder,
      linkUrl,
      dueDate,
      sourceCreatedAt: null,
    });
  }
  return { posts, files };
}

function descriptionPost(
  entry: LogicalArchiveEntry,
  bytes: Uint8Array,
  sourceKey: string
): AdeccaImportPostDraft {
  const folder = folderForPath(entry.logicalPath);
  const body = markdownContent(utf8(bytes, entry.logicalPath));
  return {
    sourceId: stableAdeccaDocumentId(sourceKey, `description:${entry.logicalPath}`),
    title: folder === "General" ? "Descripción del curso" : `Descripción · ${folder}`,
    body: body || "Descripción histórica sin contenido legible.",
    kind: "guide",
    folder,
    linkUrl: "",
    dueDate: "",
    sourceCreatedAt: null,
  };
}

function toAdeccaError(error: unknown): never {
  if (error instanceof AdeccaImportError) throw error;
  if (error instanceof MoodleImportError) {
    throw new AdeccaImportError(
      error.message,
      error.code === "ARCHIVE_LIMIT" ? "ADECCA_PACKAGE_LIMIT" : "INVALID_ADECCA_PACKAGE"
    );
  }
  throw error;
}

async function prepareZip(file: SourceFile): Promise<PreparedAdeccaCourseImport> {
  if (file.size <= 0 || file.size > MAX_ADECCA_ARCHIVE_BYTES) {
    fail("El ZIP ADECCA debe pesar entre 1 byte y 250 MiB.", "ADECCA_PACKAGE_LIMIT");
  }
  const packageBytes = new Uint8Array(await file.arrayBuffer());
  if (
    packageBytes[0] !== 0x50 ||
    packageBytes[1] !== 0x4b ||
    ![0x03, 0x05, 0x07].includes(packageBytes[2] ?? -1)
  ) {
    fail("El paquete ADECCA no contiene un ZIP válido.");
  }
  try {
    const archive = await openMoodleArchive({
      size: packageBytes.length,
      arrayBuffer: async () => packageBytes.buffer,
    });
    const entries = logicalEntries(archive);
    const entriesByPath = new Map(entries.map((entry) => [entry.logicalPath, entry]));
    const manifestEntries = entries.filter(
      (entry) => entry.logicalPath.toLowerCase() === "adecca-manifest.json"
    );
    if (manifestEntries.length > 1) fail("El ZIP contiene más de un manifiesto ADECCA.");
    const fingerprint = await sha256Bytes(packageBytes);
    const omissions: AdeccaImportOmission[] = [];
    const folders = new Set<string>();
    const consumed = new Set<string>();
    const participants: AdeccaRosterParticipant[] = [];
    let source: AdeccaImportSource;
    let posts: AdeccaImportPostDraft[] = [];
    let files: AdeccaImportFile[] = [];

    if (manifestEntries[0]) {
      const manifestBytes = await archive.read(
        manifestEntries[0].archivePath,
        MAX_ADECCA_MANIFEST_BYTES
      );
      const manifest = parseManifest(manifestBytes, manifestEntries[0].logicalPath);
      const sourceKey = await sha256Text(`adecca\u0000${manifest.courseId}`);
      source = sourceFromManifest(manifest, fingerprint, file, "zip", sourceKey);
      consumed.add(manifestEntries[0].logicalPath);
      const content = await buildManifestContent(
        manifest,
        source,
        archive,
        entriesByPath,
        omissions,
        folders,
        consumed
      );
      posts = content.posts;
      files = content.files;
      mergeParticipants(participants, participantsFromManifest(manifest.participants, omissions));
    } else {
      const courseName = sourceNameFromFile(file.name);
      const courseId = normalizedKey(courseName) || fingerprint.slice(0, 16);
      const sourceKey = await sha256Text(`adecca\u0000zip\u0000${courseId}`);
      source = {
        sourceKey,
        fingerprint,
        courseId,
        courseName,
        courseShortName: courseName,
        adeccaVersion: "Paquete local",
        fileName: safePersistentFileName(file.name, 160, "paquete-adecca.zip"),
        sourceFormat: "zip",
      };
    }

    for (const entry of entries) {
      if (consumed.has(entry.logicalPath)) continue;
      const baseName = normalizedText(fileName(entry.logicalPath));
      if (DESCRIPTION_FILES.has(baseName)) {
        const category = semanticCategory(entry.logicalPath);
        if (category) {
          omission(
            omissions,
            category,
            fileName(entry.logicalPath),
            "El archivo representa datos personales o semántica académica que no se restaura."
          );
          consumed.add(entry.logicalPath);
          continue;
        }
        const bytes = await archive.read(entry.archivePath, MAX_ADECCA_FILE_BYTES);
        const post = descriptionPost(entry, bytes, source.sourceKey);
        addFolder(folders, post.folder);
        posts.push(post);
        consumed.add(entry.logicalPath);
        continue;
      }
      if (ROSTER_FILES.has(baseName)) {
        const bytes = await archive.read(entry.archivePath, MAX_ADECCA_CSV_BYTES);
        mergeParticipants(participants, rosterFromCsv(bytes, omissions));
        consumed.add(entry.logicalPath);
        continue;
      }
      const material = await materialFromEntry(entry, archive, source.sourceKey, omissions);
      consumed.add(entry.logicalPath);
      if (material) {
        addFolder(folders, material.folder);
        files.push(material);
      }
    }

    const preview: AdeccaCourseImportPreview = {
      kind: "adecca",
      source,
      folders: [...folders],
      posts,
      files,
      participants,
      omissions,
      uploadBytes: files.reduce((total, entry) => total + entry.fileSize, 0),
    };
    return {
      preview,
      readArchiveFile: async (path) => {
        try {
          return await archive.read(path, MAX_ADECCA_FILE_BYTES);
        } catch (error) {
          return toAdeccaError(error);
        }
      },
    };
  } catch (error) {
    return toAdeccaError(error);
  }
}

async function prepareJson(file: SourceFile): Promise<PreparedAdeccaCourseImport> {
  if (file.size <= 0 || file.size > MAX_ADECCA_MANIFEST_BYTES) {
    fail("El manifiesto ADECCA debe pesar entre 1 byte y 8 MiB.", "ADECCA_PACKAGE_LIMIT");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const manifest = parseManifest(bytes, file.name);
  const fingerprint = await sha256Bytes(bytes);
  const sourceKey = await sha256Text(`adecca\u0000${manifest.courseId}`);
  const source = sourceFromManifest(manifest, fingerprint, file, "json", sourceKey);
  const omissions: AdeccaImportOmission[] = [];
  const folders = new Set<string>();
  const content = await buildManifestContent(
    manifest,
    source,
    null,
    new Map(),
    omissions,
    folders,
    new Set()
  );
  const preview: AdeccaCourseImportPreview = {
    kind: "adecca",
    source,
    folders: [...folders],
    posts: content.posts,
    files: [],
    participants: participantsFromManifest(manifest.participants, omissions),
    omissions,
    uploadBytes: 0,
  };
  return {
    preview,
    readArchiveFile: async () =>
      fail(
        "Un manifiesto JSON sin ZIP no contiene archivos restaurables.",
        "UNSUPPORTED_ADECCA_CONTENT"
      ),
  };
}

async function prepareCsv(file: SourceFile): Promise<PreparedAdeccaCourseImport> {
  if (file.size <= 0 || file.size > MAX_ADECCA_CSV_BYTES) {
    fail("La nómina CSV debe pesar entre 1 byte y 1 MiB.", "ADECCA_PACKAGE_LIMIT");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const omissions: AdeccaImportOmission[] = [];
  const participants = rosterFromCsv(bytes, omissions);
  const fingerprint = await sha256Bytes(bytes);
  const sourceKey = await sha256Text(`adecca\u0000csv\u0000${fingerprint}`);
  return {
    preview: {
      kind: "csv",
      source: {
        sourceKey,
        fingerprint,
        courseId: "",
        courseName: "Nómina ADECCA",
        courseShortName: "CSV",
        adeccaVersion: "CSV",
        fileName: safePersistentFileName(file.name, 160, "nomina-adecca.csv"),
        sourceFormat: "csv",
      },
      folders: [],
      posts: [],
      files: [],
      participants,
      omissions,
      uploadBytes: 0,
    },
    readArchiveFile: async () =>
      fail("Una nómina CSV no contiene archivos restaurables.", "UNSUPPORTED_ADECCA_CONTENT"),
  };
}

export async function prepareAdeccaCourseImport(file: File): Promise<PreparedAdeccaCourseImport> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) return prepareZip(file);
  if (name.endsWith(".json")) return prepareJson(file);
  if (name.endsWith(".csv")) return prepareCsv(file);
  fail("Selecciona un ZIP, manifiesto JSON o nómina CSV local de ADECCA.");
}

export { stableAdeccaDocumentId };
