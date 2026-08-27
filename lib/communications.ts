import type { AccountRole } from "./access-policy.ts";
import type { CourseActivity } from "./firebase/posts.ts";
import type { SectionRole } from "./section-roles.ts";

export const COMMUNICATIONS_REQUIREMENTS =
  "Implements: REQ-COMM-01 REQ-COMM-02 REQ-COMM-03 REQ-COMM-04 REQ-COMM-05 REQ-COMM-06 REQ-COMM-07 REQ-COMM-08";
export const MAX_COMMUNICATION_ITEMS = 120;
export const MAX_NOTIFICATION_ITEMS = 20;
export const MAX_MESSAGE_LENGTH = 2000;
export const MESSAGE_EMPTY_ERROR = "Escribe un mensaje antes de enviarlo.";
export const MESSAGE_TOO_LONG_ERROR = "El mensaje no puede superar los 2.000 caracteres.";

export type MessageThreadSummary = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  latestBody: string;
  latestAuthorId: string;
  latestAuthorName: string;
  createdAt: string;
  updatedAt: string;
};

export type DirectMessage = {
  id: string;
  courseId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type CommunicationReadCursor = {
  key: string;
  readAt: string;
};

export type CommunicationState = {
  threads: MessageThreadSummary[];
  cursors: CommunicationReadCursor[];
  /*
    `ready` distingue "todavía no llega la primera instantánea" de "no hay nada
    que mostrar". Sin ese matiz el panel enseñaría el estado vacío durante el
    arranque y el usuario creería que no tiene avisos.
  */
  ready?: boolean;
};

export function normalizeMessageBody(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error(MESSAGE_EMPTY_ERROR);
  if (normalized.length > MAX_MESSAGE_LENGTH) throw new Error(MESSAGE_TOO_LONG_ERROR);
  return normalized;
}

export function announcementCursorKey(courseId: string): string {
  return `course:${courseId}`;
}

export function threadCursorKey(courseId: string, threadId: string): string {
  return `thread:${courseId}:${threadId}`;
}

export function firebaseUserId(value: string): string {
  return value.replace(/^firebase:/, "");
}

export function canListStudentThreads(accountRole: AccountRole, sectionRole: SectionRole): boolean {
  return (
    accountRole === "owner" ||
    (accountRole === "teacher" && (sectionRole === "teacher" || sectionRole === "coordinator"))
  );
}

export function mergeMessageThreads(
  bySection: ReadonlyMap<string, readonly MessageThreadSummary[]>
): MessageThreadSummary[] {
  const sorted = [...bySection.values()]
    .flat()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const merged = new Map<string, MessageThreadSummary>();
  for (const item of sorted) {
    const key = `${item.courseId}:${item.id}`;
    if (!merged.has(key)) merged.set(key, item);
    if (merged.size === MAX_COMMUNICATION_ITEMS) break;
  }
  return [...merged.values()];
}

export function readCursorMap(
  cursors: readonly CommunicationReadCursor[]
): ReadonlyMap<string, string> {
  return new Map(cursors.map((cursor) => [cursor.key, cursor.readAt]));
}

export function timestampIsUnread(value: string, readAt: string | undefined): boolean {
  return !readAt || value > readAt;
}

export function unreadCommunicationCount(
  activity: readonly CourseActivity[],
  threads: readonly MessageThreadSummary[],
  cursors: readonly CommunicationReadCursor[],
  currentUserId: string
): number {
  const reads = readCursorMap(cursors);
  let unread = 0;
  for (const item of activity) {
    if (timestampIsUnread(item.createdAt, reads.get(announcementCursorKey(item.courseId)))) {
      unread += 1;
    }
  }
  for (const item of threads) {
    if (
      item.latestAuthorId !== currentUserId &&
      timestampIsUnread(item.updatedAt, reads.get(threadCursorKey(item.courseId, item.id)))
    ) {
      unread += 1;
    }
  }
  return unread;
}

/*
  El panel del header no abre ninguna colección propia: reordena la actividad y
  los hilos que el portal ya mantiene suscritos. Una colección por usuario
  obligaría a escribir un documento por miembro de sección en cada publicación,
  y a escala institucional ese abanico no compra ningún aviso que no se pueda
  derivar aquí.
*/
export type NotificationSource = "announcement" | "thread";

export type NotificationCourse = {
  id: string;
  name: string;
  tone: string;
};

export type NotificationItem = {
  id: string;
  source: NotificationSource;
  courseId: string;
  courseName: string;
  tone: string;
  title: string;
  excerpt: string;
  createdAt: string;
  unread: boolean;
  cursorKey: string;
  threadId?: string;
};

const ACTIVITY_EXCERPTS: Record<string, string> = {
  notice: "Nuevo aviso",
  guide: "Nueva guía",
  assessment: "Nueva evaluación",
  resource: "Nuevo recurso",
};

// Implements: REQ-NOTIF-02
export function deriveNotifications(
  activity: readonly CourseActivity[],
  threads: readonly MessageThreadSummary[],
  cursors: readonly CommunicationReadCursor[],
  currentUserId: string,
  courses: readonly NotificationCourse[]
): NotificationItem[] {
  const reads = readCursorMap(cursors);
  const enrolled = new Map(courses.map((course) => [course.id, course]));
  const items: NotificationItem[] = [];

  for (const item of activity) {
    const course = enrolled.get(item.courseId);
    if (!course) continue;
    const cursorKey = announcementCursorKey(item.courseId);
    items.push({
      id: `announcement:${item.courseId}:${item.id}`,
      source: "announcement",
      courseId: item.courseId,
      courseName: course.name,
      tone: course.tone,
      title: item.title,
      excerpt: ACTIVITY_EXCERPTS[item.kind] ?? "Nueva publicación",
      createdAt: item.createdAt,
      unread: timestampIsUnread(item.createdAt, reads.get(cursorKey)),
      cursorKey,
    });
  }

  for (const item of threads) {
    const course = enrolled.get(item.courseId);
    if (!course) continue;
    if (item.latestAuthorId === currentUserId) continue;
    const cursorKey = threadCursorKey(item.courseId, item.id);
    items.push({
      id: `thread:${item.courseId}:${item.id}`,
      source: "thread",
      courseId: item.courseId,
      courseName: course.name,
      tone: course.tone,
      title: item.latestAuthorName,
      excerpt: item.latestBody,
      createdAt: item.updatedAt,
      unread: timestampIsUnread(item.updatedAt, reads.get(cursorKey)),
      cursorKey,
      threadId: item.id,
    });
  }

  return items
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_NOTIFICATION_ITEMS);
}

// Implements: REQ-NOTIF-04
export function unreadCursorKeys(items: readonly NotificationItem[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.unread) keys.add(item.cursorKey);
  }
  return [...keys];
}
