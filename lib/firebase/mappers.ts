import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { type AccountRole, roleForEmail } from "../access-policy.ts";
import { DEFAULT_FOLDER } from "../courses.ts";
import { normalizeItems } from "../grades.ts";
import { normalizeDueDate, normalizeTime } from "../planner.ts";
import type { PersonalEvent, PersonalEventKind } from "../planner.ts";

export type ClassroomPostKind = "notice" | "guide" | "assessment" | "resource";

/*
  Un certamen se publica con su pauta y su formulario: el adjunto pertenece al
  aviso, no a un listado paralelo. La cota de seis evita que un documento de
  Firestore crezca sin techo con una carga masiva.
*/
// Implements: REQ-PUB-09
export const MAX_POST_ATTACHMENTS = 6;

export type ClassroomAttachment = {
  name: string;
  storagePath: string;
  contentType: string;
  size: number;
};

export function toAttachments(value: unknown): ClassroomAttachment[] {
  if (!Array.isArray(value)) return [];
  const attachments: ClassroomAttachment[] = [];
  for (const entry of value.slice(0, MAX_POST_ATTACHMENTS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    const storagePath = String(candidate.storagePath ?? "");
    if (!storagePath) continue;
    const size = Number(candidate.size);
    attachments.push({
      name: String(candidate.name || "Archivo adjunto"),
      storagePath,
      contentType: String(candidate.contentType || "application/octet-stream"),
      size: Number.isFinite(size) && size > 0 ? size : 0,
    });
  }
  return attachments;
}

export type ClassroomPost = {
  id: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  authorRole: AccountRole;
  title: string;
  body: string;
  kind: ClassroomPostKind;
  folder: string;
  linkUrl: string | null;
  storagePath: string;
  attachments: ClassroomAttachment[];
  dueDate: string;
  createdAt: string;
};

export type ClassroomFile = {
  id: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  name: string;
  folder: string;
  contentType: string;
  size: number;
  storagePath: string;
  url: string;
  createdAt: string;
};

export type ClassroomStudent = {
  userId: string;
  name: string;
  email: string;
  updatedAt: string | null;
};

export function folderName(value: string) {
  return value.trim().slice(0, 60) || DEFAULT_FOLDER;
}

export function toGradebookState(value: DocumentData | null) {
  const exemption = Number(value?.exemption);
  return {
    gradebook: normalizeItems(value?.items),
    exemption: Number.isFinite(exemption) && exemption > 0 ? exemption : null,
  };
}

// Implements: REQ-SEC-12
export function toPost(document: QueryDocumentSnapshot<DocumentData>): ClassroomPost {
  const value = document.data();
  const authorEmail = String(value.authorEmail ?? "");
  const rawLink = String(value.fileUrl || value.linkUrl || "").trim();
  const linkUrl = /^https?:\/\//i.test(rawLink) ? rawLink : null;
  return {
    id: document.id,
    authorId: String(value.authorId ?? ""),
    authorEmail,
    authorName: String(value.authorName || authorEmail || "Equipo docente"),
    authorRole: roleForEmail(authorEmail) ?? "student",
    title: String(value.title ?? "Publicación"),
    body: String(value.body ?? ""),
    kind: postKind(String(value.kind ?? "notice")),
    folder: String(value.folder || DEFAULT_FOLDER),
    linkUrl,
    storagePath: String(value.storagePath ?? ""),
    attachments: toAttachments(value.attachments),
    dueDate: normalizeDueDate(value.dueDate),
    createdAt: iso(value.createdAt),
  };
}

export function toFile(post: ClassroomPost, value: DocumentData): ClassroomFile {
  return {
    id: post.id,
    authorId: post.authorId,
    authorEmail: post.authorEmail,
    authorName: post.authorName,
    name: String(value.fileName ?? post.title),
    folder: post.folder,
    contentType: String(value.contentType ?? "application/octet-stream"),
    size: Number(value.fileSize ?? 0),
    storagePath: post.storagePath,
    url: post.linkUrl ?? "",
    createdAt: post.createdAt,
  };
}

export function toStudent(document: QueryDocumentSnapshot<DocumentData>): ClassroomStudent {
  const value = document.data();
  return {
    userId: document.id,
    name: String(value.displayName ?? "Estudiante"),
    email: String(value.email ?? ""),
    updatedAt: value.lastSeen ? iso(value.lastSeen) : null,
  };
}

export function toPersonalEvent(document: QueryDocumentSnapshot<DocumentData>): PersonalEvent {
  const value = document.data();
  return {
    id: document.id,
    title: String(value.title ?? "Bloque"),
    detail: String(value.detail ?? ""),
    date: String(value.date ?? ""),
    startTime: normalizeTime(value.startTime) ?? "",
    endTime: normalizeTime(value.endTime) ?? "",
    courseId: value.courseId ? String(value.courseId) : null,
    kind: personalKind(value.kind),
    completed: value.completed === true,
  };
}

export function personalKind(value: unknown): PersonalEventKind {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "personal" || normalized === "task" ? normalized : "study";
}

export function postKind(value: string): ClassroomPostKind {
  const normalized = value.toLowerCase();
  if (normalized === "assessment" || normalized === "evaluacion" || normalized === "dictamen")
    return "assessment";
  if (normalized === "guide" || normalized === "guia") return "guide";
  if (normalized === "resource" || normalized === "recurso") return "resource";
  return "notice";
}

export function iso(value: unknown): string {
  if (value === null || value === undefined) {
    return new Date().toISOString();
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    } catch {
      // Si toDate arroja error, continuar
    }
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    }
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}
