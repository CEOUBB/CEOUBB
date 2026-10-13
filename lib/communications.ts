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
  const map = new Map<string, string>();
  for (const cursor of cursors) {
    map.set(cursor.key, cursor.readAt);
  }
  return map;
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
  kind?: CourseActivity["kind"];
  dueDate?: string;
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
  courses: readonly NotificationCourse[],
  limit = MAX_NOTIFICATION_ITEMS
): NotificationItem[] {
  const reads = readCursorMap(cursors);
  const enrolled = new Map<string, NotificationCourse>();
  for (const course of courses) {
    enrolled.set(course.id, course);
  }
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
      kind: item.kind,
      dueDate: item.dueDate,
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

  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, limit);
}

// Implements: REQ-NOTIF-04
export function unreadCursorKeys(items: readonly NotificationItem[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.unread) keys.add(item.cursorKey);
  }
  return [...keys];
}

const TIME_ZONE = "America/Santiago";
const DAY_MS = 86_400_000;
const MESSAGE_RUN_GAP_MS = 10 * 60_000;
const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const CLOCK = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY = new Intl.DateTimeFormat("es-CL", { timeZone: TIME_ZONE, weekday: "long" });
const SHORT_DATE = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});
const SHORT_DATE_YEAR = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const LONG_DAY = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const FULL_STAMP = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  dateStyle: "full",
  timeStyle: "short",
  hourCycle: "h23",
});

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es-CL") + value.slice(1);
}

export function dayKey(value: string | Date): string {
  const date = typeof value === "string" ? validDate(value) : value;
  return date ? DAY_KEY.format(date) : "";
}

function dayDistance(from: Date, to: Date): number {
  return Math.round((Date.parse(dayKey(to)) - Date.parse(dayKey(from))) / DAY_MS);
}

export function clockTime(value: string): string {
  const date = validDate(value);
  return date ? CLOCK.format(date) : "";
}

export function fullStamp(value: string): string {
  const date = validDate(value);
  return date ? FULL_STAMP.format(date) : "Fecha no disponible";
}

// Implements: REQ-COMM-08
export function stampLabel(value: string, now: Date): string {
  const date = validDate(value);
  if (!date) return "";
  const elapsed = now.getTime() - date.getTime();
  if (elapsed >= 0 && elapsed < 60_000) return "Ahora";
  if (elapsed >= 0 && elapsed < 3_600_000) return `Hace ${Math.floor(elapsed / 60_000)} min`;
  const days = dayDistance(date, now);
  if (days === 0) return CLOCK.format(date);
  if (days === 1) return "Ayer";
  if (days > 1 && days < 7) return capitalize(WEEKDAY.format(date));
  return dayKey(date).slice(0, 4) === dayKey(now).slice(0, 4)
    ? SHORT_DATE.format(date)
    : SHORT_DATE_YEAR.format(date);
}

export function dayLabel(key: string, now: Date): string {
  const date = new Date(`${key}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  const days = Math.round((Date.parse(dayKey(now)) - Date.parse(key)) / DAY_MS);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return capitalize(LONG_DAY.format(date));
}

export type MessageRun = {
  key: string;
  authorId: string;
  authorName: string;
  own: boolean;
  messages: DirectMessage[];
};

export type MessageDay = {
  key: string;
  runs: MessageRun[];
};

// Implements: REQ-COMM-08
export function groupMessages(
  messages: readonly DirectMessage[],
  currentUserId: string
): MessageDay[] {
  const days: MessageDay[] = [];
  let previous: DirectMessage | null = null;

  for (const message of messages) {
    const key = dayKey(message.createdAt);
    let day = days.at(-1);

    if (!day || day.key !== key) {
      day = { key, runs: [] };
      days.push(day);
      previous = null;
    }

    const run = day.runs.at(-1);
    const gap = previous
      ? Date.parse(message.createdAt) - Date.parse(previous.createdAt)
      : Number.POSITIVE_INFINITY;

    if (run && previous?.authorId === message.authorId && gap <= MESSAGE_RUN_GAP_MS) {
      run.messages.push(message);
    } else {
      day.runs.push({
        key: message.id,
        authorId: message.authorId,
        authorName: message.authorName,
        own: message.authorId === currentUserId,
        messages: [message],
      });
    }

    previous = message;
  }

  return days;
}

export function firstUnreadMessageId(
  messages: readonly DirectMessage[],
  readAt: string | undefined,
  currentUserId: string
): string {
  if (!readAt) return "";
  return (
    messages.find(
      (message) =>
        message.authorId !== currentUserId && timestampIsUnread(message.createdAt, readAt)
    )?.id ?? ""
  );
}

export function awaitsTeamReply(thread: MessageThreadSummary): boolean {
  return thread.latestAuthorId === thread.studentId;
}
