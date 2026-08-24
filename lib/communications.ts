import type { AccountRole } from "./access-policy.ts";
import type { CourseActivity } from "./firebase/posts.ts";
import type { SectionRole } from "./section-roles.ts";

export const COMMUNICATIONS_REQUIREMENTS =
  "Implements: REQ-COMM-01 REQ-COMM-02 REQ-COMM-03 REQ-COMM-04 REQ-COMM-05 REQ-COMM-06 REQ-COMM-07 REQ-COMM-08";
export const MAX_COMMUNICATION_ITEMS = 120;
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
