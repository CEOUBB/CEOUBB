import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { type AccountRole, roleForEmail } from "../access-policy.ts";
import { DEFAULT_FOLDER } from "../courses.ts";
import { normalizeItems } from "../grades.ts";
import { normalizeDueDate, normalizeTime } from "../planner.ts";
import type { PersonalEvent, PersonalEventKind } from "../planner.ts";

export type ClassroomPostKind = "notice" | "guide" | "assessment" | "resource";

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
  completed: number;
  total: number;
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
    completed: Number(value.completed ?? 0),
    total: Number(value.total ?? 0),
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

export function iso(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  )
    return (value as { toDate: () => Date }).toDate().toISOString();
  return new Date().toISOString();
}
