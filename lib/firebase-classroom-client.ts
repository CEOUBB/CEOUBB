export type {
  ClassroomPostKind,
  ClassroomPost,
  ClassroomFile,
  ClassroomStudent,
} from "./firebase/mappers.ts";

export {
  toPost,
  toFile,
  toStudent,
  toPersonalEvent,
  toGradebookState,
  personalKind,
  postKind,
  folderName,
  iso,
} from "./firebase/mappers.ts";

export {
  firestore,
  cloudStorage,
  cloudFunctions,
  currentUser,
  emailOf,
  roleOf,
  authorFields,
} from "./firebase/sdk.ts";

export type { ClassroomState, CourseActivity } from "./firebase/posts.ts";

export {
  watchClassroom,
  watchCourseActivity,
  watchableSections,
  mergeActivity,
  MAX_WATCHED_SECTIONS,
  publishClassroomPost,
  saveLiveClassLink,
  editClassroomPost,
  moveClassroomPost,
  deleteClassroomPost,
} from "./firebase/posts.ts";

import { classroomFileUrl as getFileUrl } from "./firebase/storage.ts";

export type { StudentSubmission } from "./firebase/storage.ts";

export {
  uploadClassroomFile,
  renameClassroomFile,
  uploadStudentSubmission,
  watchOwnSubmissions,
  submissionStoragePath,
  safeFileName,
  MAX_SUBMISSION_BYTES,
} from "./firebase/storage.ts";

export async function classroomFileUrl(storagePath: string) {
  return getFileUrl(storagePath);
}

export type { CourseGradebook, StudentScoreRow } from "./firebase/grades.ts";

export {
  watchGradebook,
  watchGradebooks,
  saveClassroomProgress,
  saveSimulation,
  saveGradebook,
  saveStudentScores,
  saveGradeFeedback,
  saveSectionScores,
  chunkOperations,
  MAX_BATCH_OPERATIONS,
} from "./firebase/grades.ts";

export type { PersonalEventInput } from "./firebase/calendar.ts";

export {
  watchPersonalEvents,
  savePersonalEvent,
  setPersonalEventCompleted,
  deletePersonalEvent,
  personalEventError,
} from "./firebase/calendar.ts";

export { syncProfile } from "./firebase/profile.ts";

export type {
  CommunicationReadCursor,
  CommunicationState,
  DirectMessage,
  MessageThreadSummary,
} from "./communications.ts";

export {
  MAX_MESSAGES_PER_THREAD,
  MAX_READ_CURSORS,
  MAX_THREAD_SUMMARIES_PER_SECTION,
  markCommunicationRead,
  sendDirectMessage,
  watchCommunications,
  watchDirectMessages,
} from "./firebase/communications.ts";
