import type { ClassroomAttachment, ClassroomPostKind, CoursePost } from "./firebase/mappers.ts";
import { safeLinkDestination } from "./rich-text.ts";

// Implements: REQ-PAGE-12
export const PAGE_POSTS_LIMIT = 300;
export const PAGE_SECTIONS_LIMIT = 100;
export const HIDDEN_ITEMS_LIMIT = 300;
export const TRASH_LIMIT = 100;
export const TRASH_RETENTION_DAYS = 30;
export const SECTION_TITLE_MAX = 120;
export const ITEM_TITLE_MAX = 140;
export const POSITION_STEP = 1024;
export const UNDO_LIMIT = 50;

export const PAGE_COLLECTIONS = {
  sections: "pageSections",
  hidden: "hiddenItems",
  trash: "trash",
} as const;

export type Placement = "page" | "notice";
export type PageItemType = "text" | "file" | "link" | "image";
export type ItemLocation = "posts" | "hiddenItems";

export const PAGE_ITEM_TYPES: readonly PageItemType[] = ["text", "file", "link", "image"];

export type PageSection = {
  id: string;
  title: string;
  position: number;
  hidden: boolean;
  publishAt: string;
  virtual: boolean;
};

export type PageSectionView = PageSection & { items: CoursePost[] };

export type CoursePage = {
  sections: PageSectionView[];
  announcements: CoursePost[];
};

export type PageAudience = "team" | "student";

// Implements: REQ-PAGE-13
export const CONTENT_FIELDS = [
  "authorId",
  "authorName",
  "authorEmail",
  "courseId",
  "title",
  "body",
  "kind",
  "folder",
  "dueDate",
  "fileUrl",
  "linkUrl",
  "fileName",
  "storagePath",
  "contentType",
  "fileSize",
  "attachments",
  "attachmentPaths",
  "notifyStudents",
  "createdAt",
  "updatedAt",
  "updatedBy",
  "placement",
  "sectionId",
  "position",
  "itemType",
  "hidden",
  "publishAt",
  "sourceSystem",
  "sourceId",
  "sourceKey",
  "importFingerprint",
  "contentHash",
] as const;

export const TRASH_FIELDS = [
  "deletedAt",
  "deletedBy",
  "trashKind",
  "trashedWithSection",
  "sectionTitle",
  "itemCount",
] as const;

export function pickContentFields(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    CONTENT_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]])
  );
}

export function isPageItemType(value: unknown): value is PageItemType {
  return PAGE_ITEM_TYPES.includes(value as PageItemType);
}

// Implements: REQ-PAGE-11
export function placementFor(value: {
  placement?: unknown;
  kind: ClassroomPostKind;
  storagePath: string;
  sourceSystem?: unknown;
}): Placement {
  if (value.placement === "page" || value.placement === "notice") return value.placement;
  if (value.storagePath || value.sourceSystem === "moodle") return "page";
  return value.kind === "notice" ? "notice" : "page";
}

// Implements: REQ-PAGE-02, REQ-PAGE-11
export function itemTypeFor(value: {
  itemType?: unknown;
  storagePath: string;
  attachments: readonly ClassroomAttachment[];
  linkUrl: string | null;
  body: string;
}): PageItemType {
  if (isPageItemType(value.itemType)) return value.itemType;
  if (value.storagePath) return "file";
  if (value.body.trim()) return "text";
  if (value.linkUrl) return "link";
  const [only] = value.attachments;
  if (value.attachments.length === 1 && only)
    return only.contentType.startsWith("image/") ? "image" : "file";
  return "text";
}

export function attachmentPathsOf(value: { storagePath?: unknown; attachments?: unknown }) {
  const paths = new Set<string>();
  if (typeof value.storagePath === "string" && value.storagePath) paths.add(value.storagePath);
  if (Array.isArray(value.attachments)) {
    for (const entry of value.attachments) {
      const path =
        typeof entry === "object" && entry !== null
          ? (entry as { storagePath?: unknown }).storagePath
          : null;
      if (typeof path === "string" && path) paths.add(path);
    }
  }
  return [...paths];
}

// Implements: REQ-PAGE-01
export function cleanSectionTitle(value: string) {
  const title = value.trim().slice(0, SECTION_TITLE_MAX);
  if (!title) throw new Error("La sección necesita un nombre.");
  return title;
}

// Implements: REQ-PAGE-02
export function cleanLink(value: string) {
  const destination = safeLinkDestination(value.trim());
  if (!destination || !/^https?:\/\//i.test(destination))
    throw new Error("El enlace debe comenzar con http:// o https://.");
  return destination;
}

export function copyTitle(title: string) {
  return `${title} (copia)`.slice(0, ITEM_TITLE_MAX);
}

export type FileKind = "pdf" | "image" | "archive" | "slides" | "sheet" | "document" | "file";

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  pdf: "PDF",
  image: "Imagen",
  archive: "Archivo comprimido",
  slides: "Presentación",
  sheet: "Planilla",
  document: "Documento",
  file: "Archivo",
};

// Implements: REQ-PAGE-02
export function fileKind(contentType: string, name: string): FileKind {
  const type = contentType.toLowerCase();
  const extension = name.toLowerCase().split(".").pop() ?? "";
  const matches = (needles: string[], extensions: string[]) =>
    needles.some((needle) => type.includes(needle)) || extensions.includes(extension);
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(extension))
    return "image";
  if (matches(["pdf"], ["pdf"])) return "pdf";
  if (matches(["zip", "compressed"], ["zip", "rar", "7z"])) return "archive";
  if (matches(["presentation", "powerpoint"], ["ppt", "pptx", "odp"])) return "slides";
  if (matches(["sheet", "excel"], ["xls", "xlsx", "ods", "csv"])) return "sheet";
  if (matches(["word", "document"], ["doc", "docx", "odt"])) return "document";
  return "file";
}

export function displayName(fileName: string) {
  return fileName.replace(/\.[a-z0-9]{1,5}$/i, "").trim() || fileName;
}

// Implements: REQ-PAGE-09
export function plainExcerpt(body: string, max = 160) {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[![A-Z]+\]/g, " ")
    .replace(/[#>*_`|~$]/g, " ")
    .replace(/^\s*[-+]\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function locationFor(itemHidden: boolean, sectionHidden: boolean): ItemLocation {
  return itemHidden || sectionHidden ? "hiddenItems" : "posts";
}

// Implements: REQ-PAGE-04
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_STEP;
  if (before === undefined) return (after as number) - POSITION_STEP;
  if (after === undefined) return before + POSITION_STEP;
  return before + (after - before) / 2;
}

export function positionFits(
  position: number,
  before: number | undefined,
  after: number | undefined
) {
  return (before === undefined || position > before) && (after === undefined || position < after);
}

export function renumber(ids: readonly string[]): Map<string, number> {
  return new Map(ids.map((id, index) => [id, (index + 1) * POSITION_STEP]));
}

// Implements: REQ-PAGE-04
export function positionForIndex(
  list: readonly { id: string; position: number }[],
  movedId: string,
  index: number
): number | null {
  const rest = list.filter((entry) => entry.id !== movedId);
  const before = rest[index - 1]?.position;
  const after = rest[index]?.position;
  const position = positionBetween(before, after);
  return positionFits(position, before, after) ? position : null;
}

export function moveId(ids: readonly string[], id: string, index: number): string[] {
  const rest = ids.filter((entry) => entry !== id);
  const target = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, target), id, ...rest.slice(target)];
}

// Implements: REQ-PAGE-04
export function movedEntry(previous: readonly string[], next: readonly string[]) {
  if (previous.length !== next.length) return null;
  const start = previous.findIndex((id, index) => id !== next[index]);
  if (start === -1) return null;
  let end = previous.length - 1;
  while (end > start && previous[end] === next[end]) end -= 1;
  const id = next[start] === previous[end] ? next[start] : next[end];
  if (id === undefined) return null;
  return { id, index: next.indexOf(id) };
}

function byPosition(left: { position: number; createdAt?: string }, right: typeof left) {
  return (
    left.position - right.position || (left.createdAt ?? "").localeCompare(right.createdAt ?? "")
  );
}

const ORPHAN_SECTION_ID = "virtual:orphan";

export function isVirtualSectionId(id: string) {
  return id.startsWith("virtual:");
}

function earliest(items: readonly CoursePost[]) {
  return items.reduce(
    (first, item) => (item.createdAt < first ? item.createdAt : first),
    items[0]?.createdAt ?? ""
  );
}

// Implements: REQ-PAGE-01, REQ-PAGE-05, REQ-PAGE-09, REQ-PAGE-11
export function buildCoursePage({
  sections,
  posts,
  hiddenItems,
  audience,
}: {
  sections: readonly PageSection[];
  posts: readonly CoursePost[];
  hiddenItems: readonly CoursePost[];
  audience: PageAudience;
}): CoursePage {
  const team = audience === "team";
  const announcements = posts
    .filter((post) => post.placement === "notice")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const real = sections
    .filter((section) => team || !section.hidden)
    .map((section) => ({ ...section, items: [] as CoursePost[] }))
    .sort(byPosition);
  const known = new Set(sections.map((section) => section.id));
  const byId = new Map(real.map((section) => [section.id, section]));
  const virtual = new Map<string, PageSectionView>();
  const items = [
    ...posts.filter((post) => post.placement === "page" && (team || !post.hidden)),
    ...(team ? hiddenItems.filter((item) => item.placement === "page") : []),
  ];

  for (const item of items) {
    const section = byId.get(item.sectionId);
    if (section) {
      section.items.push(item);
      continue;
    }

    if (item.sectionId && (known.has(item.sectionId) || !team)) continue;
    const id = item.sectionId ? ORPHAN_SECTION_ID : `virtual:${item.folder}`;
    const group = virtual.get(id) ?? {
      id,
      title: item.sectionId ? "Sin sección" : item.folder,
      position: 0,
      hidden: false,
      publishAt: "",
      virtual: true,
      items: [],
    };
    group.items.push(item);
    virtual.set(id, group);
  }

  const lastPosition = real.at(-1)?.position ?? 0;
  const virtualSections = [...virtual.values()]
    .sort((left, right) => earliest(left.items).localeCompare(earliest(right.items)))
    .map((section, index) => ({
      ...section,
      position: lastPosition + (index + 1) * POSITION_STEP,
    }));
  const ordered = [...real, ...virtualSections].map((section) => ({
    ...section,
    items: [...section.items].sort(byPosition),
  }));

  return {
    sections: team ? ordered : ordered.filter((section) => section.items.length > 0),
    announcements,
  };
}

// Implements: REQ-PAGE-11
export function materializationPlan(page: CoursePage) {
  return page.sections
    .filter((section) => section.virtual)
    .map((section) => ({
      title: section.title.slice(0, SECTION_TITLE_MAX) || "Sin título",
      position: section.position,
      items: section.items.map((item, index) => ({
        id: item.id,
        location: item.location,
        position: (index + 1) * POSITION_STEP,
      })),
    }));
}

// Implements: REQ-PAGE-10
export function announcementDraftFor(added: readonly { sectionTitle: string; title: string }[]) {
  const groups = Map.groupBy(added, (entry) => entry.sectionTitle);
  const [onlySection] = groups.keys();
  const title =
    groups.size === 1 && onlySection
      ? `Nuevo material en ${onlySection}`.slice(0, ITEM_TITLE_MAX)
      : "Nuevo material en el ramo";
  const body = [...groups]
    .map(([section, entries]) =>
      [`**${section}**`, "", ...entries.map((entry) => `- ${entry.title}`)].join("\n")
    )
    .join("\n\n");
  return { title, body };
}

export type TrashEntry = {
  id: string;
  kind: "item" | "section";
  title: string;
  placement: Placement;
  itemType: PageItemType;
  sectionId: string;
  sectionTitle: string;
  trashedWithSection: string;
  hidden: boolean;
  itemCount: number;
  deletedAt: string;
  deletedBy: string;
};

// Implements: REQ-PAGE-06
export function trashDaysLeft(deletedAt: string, now: number) {
  const deleted = Date.parse(deletedAt);
  if (Number.isNaN(deleted)) return TRASH_RETENTION_DAYS;
  const elapsed = Math.floor((now - deleted) / 86_400_000);
  return Math.max(0, TRASH_RETENTION_DAYS - elapsed);
}

// Implements: REQ-PAGE-07
export type UndoEntry = {
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

export type UndoHistory = {
  past: readonly UndoEntry[];
  future: readonly UndoEntry[];
};

export const EMPTY_HISTORY: UndoHistory = { past: [], future: [] };

export function recordEntry(history: UndoHistory, entry: UndoEntry): UndoHistory {
  return { past: [...history.past, entry].slice(-UNDO_LIMIT), future: [] };
}

export function stepBack(history: UndoHistory) {
  const entry = history.past.at(-1);
  if (!entry) return null;
  return {
    entry,
    history: { past: history.past.slice(0, -1), future: [entry, ...history.future] },
  };
}

export function stepForward(history: UndoHistory) {
  const [entry, ...future] = history.future;
  if (!entry) return null;
  return { entry, history: { past: [...history.past, entry], future } };
}
