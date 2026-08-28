import { normalizeAccessEmail, roleForEmail } from "../access-policy.ts";
import { sanitizeAcademicHtml } from "../academic-content.ts";
import { htmlToAcademicMarkdown } from "../multimodal-editor.ts";
import { RICH_TEXT_MAX_LENGTH, safeLinkDestination } from "../rich-text.ts";
import {
  MAX_MOODLE_XML_BYTES,
  MoodleImportError,
  openMoodleArchive,
  type MoodleArchive,
} from "./archive.ts";
import type {
  CourseImportPreview,
  MoodleImportFile,
  MoodleImportOmission,
  MoodleImportPostDraft,
  MoodleRosterParticipant,
  PreparedCourseImport,
} from "./types.ts";
import {
  parseMoodleXml,
  xmlChild,
  xmlChildren,
  xmlDescendants,
  xmlValue,
  type MoodleXmlNode,
} from "./xml.ts";

const MAX_CSV_BYTES = 1024 * 1024;
const MAX_CSV_ROWS = 5_000;
const ACTIVE_MIME_TYPES = new Set([
  "application/javascript",
  "application/x-httpd-php",
  "image/svg+xml",
  "text/html",
  "text/javascript",
]);
const FILE_MODULES = new Set(["resource", "folder", "scorm"]);
const REPORTED_UNSUPPORTED_MODULES = new Set(["quiz", "forum", "glossary", "workshop"]);
const CSV_EMAIL_HEADERS = new Set(["correo", "email", "mail"]);
const CSV_ROLE_HEADERS = new Set(["rol", "role", "perfil"]);
const CSV_STUDENT_ROLES = new Set(["", "student", "estudiante", "alumno", "alumna"]);
const OMISSION_SIGNATURES = new WeakMap<MoodleImportOmission[], Set<string>>();
const PASSIVE_EXTENSIONS = new Set([
  "7z",
  "c",
  "cpp",
  "csv",
  "doc",
  "docx",
  "gif",
  "h",
  "ipynb",
  "jpeg",
  "jpg",
  "m",
  "m4a",
  "md",
  "mp3",
  "mp4",
  "odp",
  "ods",
  "odt",
  "ogg",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "py",
  "r",
  "rar",
  "sql",
  "txt",
  "wav",
  "webm",
  "webp",
  "xls",
  "xlsx",
  "zip",
]);

type ActivityDescriptor = {
  moduleId: string;
  sectionId: string;
  moduleName: string;
  title: string;
  directory: string;
  folder: string;
  contextId: string;
  visible: boolean;
  added: string;
  data: MoodleXmlNode | null;
};

type MoodleFileRecord = {
  id: string;
  contentHash: string;
  contextId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  timeCreated: string;
};

type MoodleSourceFile = {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

async function digestHex(algorithm: "SHA-1" | "SHA-256", bytes: Uint8Array) {
  const digest = await crypto.subtle.digest(algorithm, bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashText(value: string) {
  return digestHex("SHA-256", new TextEncoder().encode(value));
}

export { stableMoodleDocumentId } from "./ids.ts";

// Implements: REQ-MOODLE-09
export function chunkImportRecords<T>(items: readonly T[], size = 100): T[][] {
  const limit = Math.max(1, Math.min(100, Math.trunc(size)));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += limit) {
    chunks.push(items.slice(index, index + limit));
  }
  return chunks;
}

// Implements: REQ-MOODLE-04
export function fileIsSupported(fileName: string, contentType: string) {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (!PASSIVE_EXTENSIONS.has(extension)) return false;
  const type = contentType.trim().toLowerCase();
  return !ACTIVE_MIME_TYPES.has(type);
}

// Implements: REQ-MOODLE-04
export async function verifyMoodleFileBytes(file: MoodleImportFile, bytes: Uint8Array) {
  if (bytes.length !== file.fileSize) {
    throw new MoodleImportError(
      `${file.fileName} falló su verificación de integridad: el tamaño no coincide.`,
      "INVALID_ARCHIVE"
    );
  }
  const actualHash = await digestHex("SHA-1", bytes);
  if (actualHash !== file.contentHash.toLowerCase()) {
    throw new MoodleImportError(
      `${file.fileName} falló su verificación de integridad SHA-1.`,
      "INVALID_ARCHIVE"
    );
  }
}

function safeFolder(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 60) || "General";
}

function safeTitle(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 140) || fallback;
}

function markdownFromMoodleHtml(value: string) {
  if (!value.trim()) return "";
  const bounded = value.slice(0, 99_999);
  const sanitized = String(sanitizeAcademicHtml(bounded)).replace(/<img\b[^>]*>/gi, "");
  const converted = htmlToAcademicMarkdown(sanitized)
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return converted.slice(0, RICH_TEXT_MAX_LENGTH);
}

function unixIso(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function unixDate(value: string) {
  return unixIso(value)?.slice(0, 10) ?? "";
}

async function readXml(archive: MoodleArchive, path: string) {
  return parseMoodleXml(await archive.read(path, MAX_MOODLE_XML_BYTES), path);
}

async function optionalXml(archive: MoodleArchive, path: string) {
  return archive.has(path) ? readXml(archive, path) : null;
}

function omission(
  omissions: MoodleImportOmission[],
  category: string,
  title: string,
  reason: string
) {
  const normalized = { category, title: safeTitle(title, "Elemento sin título"), reason };
  const signatures = OMISSION_SIGNATURES.get(omissions) ?? new Set<string>();
  OMISSION_SIGNATURES.set(omissions, signatures);
  const signature = `${normalized.category}\u0000${normalized.title}\u0000${normalized.reason}`;
  if (signatures.has(signature)) return;
  signatures.add(signature);
  omissions.push(normalized);
}

function courseInformation(root: MoodleXmlNode) {
  const information = root.name === "information" ? root : xmlChild(root, "information");
  if (!information)
    throw new MoodleImportError("moodle_backup.xml no trae information.", "INVALID_XML");
  return information;
}

// Implements: REQ-QMD-03
async function sectionsFromManifest(
  archive: MoodleArchive,
  information: MoodleXmlNode,
  omissions: MoodleImportOmission[]
) {
  const sectionMap = new Map<string, string>();
  const sections = xmlChildren(xmlChild(xmlChild(information, "contents"), "sections"), "section");
  const parsedSections = await Promise.all(
    sections.map(async (section) => {
      const id = xmlValue(section, "sectionid");
      const directory = xmlValue(section, "directory");
      const title = xmlValue(section, "title");
      if (!id || !directory || !archive.has(`${directory}/section.xml`)) {
        omission(omissions, "section", title || id, "La sección no contiene su section.xml.");
        return null;
      }
      const data = await readXml(archive, `${directory}/section.xml`);
      const name = xmlValue(data, "name") || title || `Sección ${xmlValue(data, "number") || id}`;
      if (xmlValue(data, "visible") === "0") {
        omission(omissions, "hidden-section", name, "La sección estaba oculta en Moodle.");
        return null;
      }
      return { id, folder: safeFolder(name) };
    })
  );
  for (const item of parsedSections) {
    if (item) {
      sectionMap.set(item.id, item.folder);
    }
  }
  return sectionMap;
}

function activityDataNode(root: MoodleXmlNode | null, moduleName: string) {
  if (!root) return null;
  return xmlDescendants(root, moduleName)[0] ?? null;
}

// Implements: REQ-QMD-03
async function activitiesFromManifest(
  archive: MoodleArchive,
  information: MoodleXmlNode,
  sectionMap: Map<string, string>,
  omissions: MoodleImportOmission[]
) {
  const nodes = xmlChildren(xmlChild(xmlChild(information, "contents"), "activities"), "activity");
  const activityItems = await Promise.all(
    nodes.map(async (node): Promise<ActivityDescriptor | null> => {
      const moduleId = xmlValue(node, "moduleid");
      const sectionId = xmlValue(node, "sectionid");
      const moduleName = xmlValue(node, "modulename").toLowerCase();
      const title = safeTitle(xmlValue(node, "title"), `${moduleName || "Actividad"} ${moduleId}`);
      const directory = xmlValue(node, "directory");
      const folder = sectionMap.get(sectionId);
      if (!moduleId || !moduleName || !directory || !folder) {
        omission(
          omissions,
          "activity",
          title,
          "La actividad no pertenece a una sección visible válida."
        );
        return null;
      }
      const moduleXml = await optionalXml(archive, `${directory}/module.xml`);
      const visible = xmlValue(moduleXml ?? undefined, "visible") !== "0";
      if (!visible) {
        omission(omissions, "hidden", title, "La actividad estaba oculta en Moodle.");
        return null;
      }
      const activityXml = await optionalXml(archive, `${directory}/${moduleName}.xml`);
      if (!activityXml) {
        omission(omissions, moduleName, title, `Falta ${moduleName}.xml.`);
        return null;
      }
      return {
        moduleId,
        sectionId,
        moduleName,
        title,
        directory,
        folder,
        contextId: activityXml.attributes.contextid ?? "",
        visible,
        added: xmlValue(moduleXml ?? undefined, "added"),
        data: activityDataNode(activityXml, moduleName),
      };
    })
  );
  return activityItems.filter((item): item is ActivityDescriptor => item !== null);
}

function postsFromActivities(
  activities: ActivityDescriptor[],
  sourceKey: string,
  omissions: MoodleImportOmission[]
) {
  const posts: MoodleImportPostDraft[] = [];
  for (const activity of activities) {
    const { moduleName, data } = activity;
    const name = safeTitle(xmlValue(data ?? undefined, "name"), activity.title);
    const intro = markdownFromMoodleHtml(xmlValue(data ?? undefined, "intro"));
    const base = {
      sourceId: `${sourceKey}:module:${activity.moduleId}`,
      title: name,
      folder: activity.folder,
      sourceCreatedAt: unixIso(activity.added),
    };
    if (moduleName === "label") {
      posts.push({ ...base, body: intro || name, kind: "notice", linkUrl: "", dueDate: "" });
    } else if (moduleName === "page") {
      const body = markdownFromMoodleHtml(xmlValue(data ?? undefined, "content")) || intro;
      posts.push({ ...base, body: body || name, kind: "guide", linkUrl: "", dueDate: "" });
    } else if (moduleName === "url") {
      const rawUrl = xmlValue(data ?? undefined, "externalurl");
      const linkUrl = safeLinkDestination(rawUrl);
      if (!linkUrl || !/^https?:\/\//i.test(linkUrl)) {
        omission(omissions, "url", name, "La URL no usa HTTP o HTTPS válido.");
      } else {
        posts.push({
          ...base,
          body: intro || "Enlace importado desde Moodle.",
          kind: "resource",
          linkUrl,
          dueDate: "",
        });
      }
    } else if (moduleName === "assign") {
      posts.push({
        ...base,
        body: intro || "Actividad importada desde Moodle; las entregas no fueron restauradas.",
        kind: "assessment",
        linkUrl: "",
        dueDate: unixDate(xmlValue(data ?? undefined, "duedate")),
      });
    } else if (moduleName === "book") {
      const chapters = xmlDescendants(data ?? undefined, "chapter");
      if (chapters.length === 0) {
        posts.push({ ...base, body: intro || name, kind: "guide", linkUrl: "", dueDate: "" });
      } else {
        chapters.forEach((chapter, index) => {
          const chapterName = safeTitle(
            xmlValue(chapter, "title"),
            `${name} · capítulo ${index + 1}`
          );
          posts.push({
            ...base,
            sourceId: `${base.sourceId}:chapter:${chapter.attributes.id ?? index + 1}`,
            title: chapterName,
            body: markdownFromMoodleHtml(xmlValue(chapter, "content")) || chapterName,
            kind: "guide",
            linkUrl: "",
            dueDate: "",
          });
        });
      }
    } else if (!FILE_MODULES.has(moduleName)) {
      omission(
        omissions,
        moduleName,
        name,
        REPORTED_UNSUPPORTED_MODULES.has(moduleName)
          ? "La actividad contiene semántica o datos de usuario que CEOUBB no restaura."
          : "El plugin Moodle no posee un adaptador compatible."
      );
    }
  }
  return posts;
}

function fileRecords(root: MoodleXmlNode | null) {
  if (!root) return [];
  return xmlChildren(root, "file").map<MoodleFileRecord>((file) => ({
    id: file.attributes.id ?? xmlValue(file, "id"),
    contentHash: xmlValue(file, "contenthash").toLowerCase(),
    contextId: xmlValue(file, "contextid"),
    fileName: xmlValue(file, "filename"),
    filePath: xmlValue(file, "filepath") || "/",
    fileSize: Number(xmlValue(file, "filesize")),
    contentType: xmlValue(file, "mimetype") || "application/octet-stream",
    timeCreated: xmlValue(file, "timecreated"),
  }));
}

function filesFromCatalog(
  archive: MoodleArchive,
  records: MoodleFileRecord[],
  activities: ActivityDescriptor[],
  sourceKey: string,
  omissions: MoodleImportOmission[]
) {
  const byContext = new Map(activities.map((activity) => [activity.contextId, activity]));
  const files: MoodleImportFile[] = [];
  for (const record of records) {
    const activity = byContext.get(record.contextId);
    if (!activity || !record.fileName || record.fileName === ".") continue;
    const title = safeTitle(record.fileName, "Archivo Moodle");
    if (!/^[a-f0-9]{40}$/.test(record.contentHash)) {
      omission(omissions, "file-integrity", title, "files.xml no declara un SHA-1 válido.");
      continue;
    }
    if (!Number.isSafeInteger(record.fileSize) || record.fileSize <= 0) {
      omission(omissions, "file-size", title, "El archivo está vacío o no declara tamaño válido.");
      continue;
    }
    if (record.fileSize > 50 * 1024 * 1024) {
      omission(omissions, "file-size", title, "El archivo supera 50 MiB.");
      continue;
    }
    if (!fileIsSupported(record.fileName, record.contentType)) {
      omission(omissions, "file-type", title, "La extensión o MIME activo no está permitido.");
      continue;
    }
    const archivePath = `files/${record.contentHash.slice(0, 2)}/${record.contentHash}`;
    if (!archive.has(archivePath)) {
      omission(
        omissions,
        "file-missing",
        title,
        "El blob declarado no existe dentro del respaldo."
      );
      continue;
    }
    files.push({
      sourceId: `${sourceKey}:file:${record.id || record.contentHash}:${record.filePath}:${record.fileName}`,
      title,
      body:
        activity.moduleName === "scorm"
          ? "Paquete SCORM preservado como descarga; CEOUBB todavía no ejecuta su contenido."
          : `Material importado desde la actividad “${activity.title}” de Moodle.`,
      folder: activity.folder,
      archivePath,
      fileName: record.fileName.slice(0, 120),
      contentType: record.contentType.slice(0, 120),
      fileSize: record.fileSize,
      contentHash: record.contentHash,
      sourceCreatedAt: unixIso(record.timeCreated || activity.added),
      scormPackage: activity.moduleName === "scorm",
    });
  }
  return files;
}

function roleDefinitions(root: MoodleXmlNode | null) {
  const roles = new Map<string, string>();
  for (const role of xmlDescendants(root ?? undefined, "role")) {
    const id = role.attributes.id ?? xmlValue(role, "id");
    const archetype = xmlValue(role, "archetype") || xmlValue(role, "shortname");
    if (id && archetype) roles.set(id, archetype.toLowerCase());
  }
  return roles;
}

function courseRoleAssignments(root: MoodleXmlNode | null) {
  const rolesByUser = new Map<string, Set<string>>();
  for (const assignment of xmlDescendants(root ?? undefined, "assignment")) {
    const userId = xmlValue(assignment, "userid");
    const roleId = xmlValue(assignment, "roleid");
    if (!userId || !roleId) continue;
    const roles = rolesByUser.get(userId) ?? new Set<string>();
    roles.add(roleId);
    rolesByUser.set(userId, roles);
  }
  return rolesByUser;
}

function enrolmentAssignments(root: MoodleXmlNode | null, rolesByUser: Map<string, Set<string>>) {
  for (const enrol of xmlDescendants(root ?? undefined, "enrol")) {
    const roleId = xmlValue(enrol, "roleid");
    if (!roleId) continue;
    for (const enrollment of xmlDescendants(enrol, "enrolment")) {
      const userId = xmlValue(enrollment, "userid");
      if (!userId) continue;
      const roles = rolesByUser.get(userId) ?? new Set<string>();
      roles.add(roleId);
      rolesByUser.set(userId, roles);
    }
  }
}

function participantsFromUsers(
  usersRoot: MoodleXmlNode | null,
  roleRoot: MoodleXmlNode | null,
  courseRolesRoot: MoodleXmlNode | null,
  enrolmentsRoot: MoodleXmlNode | null,
  omissions: MoodleImportOmission[]
) {
  const definitions = roleDefinitions(roleRoot);
  const assigned = courseRoleAssignments(courseRolesRoot);
  enrolmentAssignments(enrolmentsRoot, assigned);
  const participants: MoodleRosterParticipant[] = [];
  const participantEmails = new Set<string>();
  for (const user of xmlDescendants(usersRoot ?? undefined, "user")) {
    const sourceUserId = user.attributes.id ?? xmlValue(user, "id");
    const email = normalizeAccessEmail(xmlValue(user, "email"));
    const roles = [...(assigned.get(sourceUserId) ?? [])].map((roleId) => definitions.get(roleId));
    if (roles.length === 0) continue;
    if (roles.some((role) => role !== "student")) {
      omission(
        omissions,
        "participant-role",
        email || sourceUserId,
        "El rol no es estudiante y requiere revisión manual."
      );
      continue;
    }
    if (roleForEmail(email) !== "student") {
      omission(
        omissions,
        "participant-domain",
        email || sourceUserId,
        "El correo no corresponde a una cuenta estudiantil institucional."
      );
      continue;
    }
    if (sourceUserId && !participantEmails.has(email)) {
      participantEmails.add(email);
      participants.push({ sourceUserId, email, role: "student" });
    }
  }
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
  if (quoted)
    throw new MoodleImportError(
      "La nómina CSV termina dentro de una celda con comillas.",
      "INVALID_ARCHIVE"
    );
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizedHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

async function prepareCsv(file: MoodleSourceFile): Promise<PreparedCourseImport> {
  if (file.size <= 0 || file.size > MAX_CSV_BYTES) {
    throw new MoodleImportError("La nómina CSV debe pesar entre 1 byte y 1 MiB.", "ARCHIVE_LIMIT");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    throw new MoodleImportError("La nómina CSV no usa UTF-8 válido.", "INVALID_ARCHIVE");
  }
  const headerLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"].sort(
    (left, right) => headerLine.split(right).length - headerLine.split(left).length
  )[0];
  const rows = csvRows(source, delimiter);
  if (rows.length < 2 || rows.length - 1 > MAX_CSV_ROWS) {
    throw new MoodleImportError(
      "La nómina CSV debe contener entre 1 y 5.000 estudiantes.",
      "ARCHIVE_LIMIT"
    );
  }
  const headers = rows[0].map(normalizedHeader);
  const emailIndex = headers.findIndex((header) => CSV_EMAIL_HEADERS.has(header));
  const roleIndex = headers.findIndex((header) => CSV_ROLE_HEADERS.has(header));
  if (emailIndex < 0)
    throw new MoodleImportError(
      "La nómina CSV necesita una columna Correo o Email.",
      "INVALID_ARCHIVE"
    );
  const omissions: MoodleImportOmission[] = [];
  const participants: MoodleRosterParticipant[] = [];
  const participantEmails = new Set<string>();
  for (let index = 1; index < rows.length; index += 1) {
    const email = normalizeAccessEmail(rows[index][emailIndex] ?? "");
    const role = normalizedHeader(roleIndex >= 0 ? (rows[index][roleIndex] ?? "") : "student");
    if (!CSV_STUDENT_ROLES.has(role)) {
      omission(
        omissions,
        "participant-role",
        email || `Fila ${index + 1}`,
        "El rol no es estudiante y requiere revisión manual."
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
    if (!participantEmails.has(email)) {
      participantEmails.add(email);
      participants.push({ sourceUserId: `csv:${index}`, email, role: "student" });
    }
  }
  const fingerprint = await digestHex("SHA-256", bytes);
  const sourceKey = await hashText(`csv\u0000${fingerprint}`);
  return {
    preview: {
      kind: "csv",
      source: {
        sourceKey,
        fingerprint,
        courseId: "",
        courseName: "Nómina de curso",
        courseShortName: "CSV",
        moodleVersion: "CSV",
        fileName: file.name.slice(0, 160),
      },
      sections: [],
      posts: [],
      files: [],
      participants,
      omissions,
      uploadBytes: 0,
    },
    readArchiveFile: async () => {
      throw new MoodleImportError("Una nómina CSV no contiene archivos.", "UNSUPPORTED_CONTENT");
    },
  };
}

// Implements: REQ-MOODLE-01, REQ-MOODLE-02, REQ-MOODLE-03, REQ-MOODLE-04, REQ-MOODLE-06, REQ-MOODLE-10
async function prepareMoodle(file: MoodleSourceFile): Promise<PreparedCourseImport> {
  const archive = await openMoodleArchive(file);
  if (!archive.has("moodle_backup.xml")) {
    throw new MoodleImportError("El archivo no contiene moodle_backup.xml.", "INVALID_ARCHIVE");
  }
  const manifestBytes = await archive.read("moodle_backup.xml", MAX_MOODLE_XML_BYTES);
  const manifest = parseMoodleXml(manifestBytes, "moodle_backup.xml");
  const information = courseInformation(manifest);
  const courseRoot = await optionalXml(archive, "course/course.xml");
  const filesBytes = archive.has("files.xml")
    ? await archive.read("files.xml", MAX_MOODLE_XML_BYTES)
    : new Uint8Array();
  const filesRoot = filesBytes.length ? parseMoodleXml(filesBytes, "files.xml") : null;
  const courseId =
    xmlValue(information, "original_course_id") || courseRoot?.attributes.id || "unknown";
  const courseName = safeTitle(
    xmlValue(information, "original_course_fullname") ||
      xmlValue(courseRoot ?? undefined, "fullname"),
    "Curso Moodle"
  );
  const courseShortName = safeTitle(
    xmlValue(information, "original_course_shortname") ||
      xmlValue(courseRoot ?? undefined, "shortname"),
    courseId
  );
  const site = xmlValue(information, "original_wwwroot") || "moodle:unknown";
  const moodleVersion =
    xmlValue(information, "moodle_release") ||
    xmlValue(information, "moodle_version") ||
    "Moodle 2+";
  const sourceKey = await hashText(`${site}\u0000${courseId}`);
  const fingerprintSource = new Uint8Array(manifestBytes.length + 1 + filesBytes.length);
  fingerprintSource.set(manifestBytes);
  fingerprintSource[manifestBytes.length] = 0x0a;
  fingerprintSource.set(filesBytes, manifestBytes.length + 1);
  const fingerprint = await digestHex("SHA-256", fingerprintSource);
  const omissions: MoodleImportOmission[] = [];
  const sectionMap = await sectionsFromManifest(archive, information, omissions);
  const activities = await activitiesFromManifest(archive, information, sectionMap, omissions);
  const posts = postsFromActivities(activities, sourceKey, omissions);
  const summary = markdownFromMoodleHtml(xmlValue(courseRoot ?? undefined, "summary"));
  if (summary) {
    posts.unshift({
      sourceId: `${sourceKey}:course-summary`,
      title: `Resumen histórico · ${courseName}`,
      body: summary,
      kind: "notice",
      folder: "General",
      linkUrl: "",
      dueDate: "",
      sourceCreatedAt: unixIso(xmlValue(courseRoot ?? undefined, "startdate")),
    });
  }
  const catalogRecords = fileRecords(filesRoot);
  const files = filesFromCatalog(archive, catalogRecords, activities, sourceKey, omissions);
  for (const activity of activities) {
    if (
      FILE_MODULES.has(activity.moduleName) &&
      !files.some((file) => file.sourceId.includes(`:${activity.contextId}`)) &&
      !catalogRecords.some((file) => file.contextId === activity.contextId)
    ) {
      omission(
        omissions,
        activity.moduleName,
        activity.title,
        "La actividad no contiene archivos compatibles."
      );
    }
  }
  const [rolesRoot, courseRolesRoot, enrolmentsRoot, usersRoot] = await Promise.all([
    optionalXml(archive, "roles.xml"),
    optionalXml(archive, "course/roles.xml"),
    optionalXml(archive, "course/enrolments.xml"),
    optionalXml(archive, "users.xml"),
  ]);
  const participants = participantsFromUsers(
    usersRoot,
    rolesRoot,
    courseRolesRoot,
    enrolmentsRoot,
    omissions
  );
  const preview: CourseImportPreview = {
    kind: "moodle",
    source: {
      sourceKey,
      fingerprint,
      courseId,
      courseName,
      courseShortName,
      moodleVersion,
      fileName: file.name.slice(0, 160),
    },
    sections: [...new Set(sectionMap.values())],
    posts,
    files,
    participants,
    omissions,
    uploadBytes: files.reduce((total, item) => total + item.fileSize, 0),
  };
  return { preview, readArchiveFile: (path) => archive.read(path, 50 * 1024 * 1024) };
}

// Implements: REQ-MOODLE-01, REQ-MOODLE-02, REQ-MOODLE-06
export function prepareCourseImport(file: MoodleSourceFile) {
  if (file.name.toLowerCase().endsWith(".csv")) return prepareCsv(file);
  if (!file.name.toLowerCase().endsWith(".mbz")) {
    throw new MoodleImportError(
      "Selecciona un respaldo .mbz o una nómina .csv.",
      "INVALID_ARCHIVE"
    );
  }
  return prepareMoodle(file);
}
