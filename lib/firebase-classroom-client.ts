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
  currentUser,
  emailOf,
  roleOf,
  authorFields,
} from "./firebase/sdk.ts";

export type {
  ClassroomState,
  CourseActivity,
} from "./firebase/posts.ts";

export {
  watchClassroom,
  watchCourseActivity,
  publishClassroomPost,
  editClassroomPost,
  moveClassroomPost,
  deleteClassroomPost,
} from "./firebase/posts.ts";

import { classroomFileUrl as getFileUrl } from "./firebase/storage.ts";

export {
  uploadClassroomFile,
  renameClassroomFile,
} from "./firebase/storage.ts";

export async function classroomFileUrl(storagePath: string) {
  return getFileUrl(storagePath);
}

export type {
  CourseGradebook,
} from "./firebase/grades.ts";

export {
  watchGradebooks,
  saveClassroomProgress,
  saveSimulation,
  saveGradebook,
  saveStudentScores,
} from "./firebase/grades.ts";

export type {
  PersonalEventInput,
} from "./firebase/calendar.ts";

export {
  watchPersonalEvents,
  savePersonalEvent,
  setPersonalEventCompleted,
  deletePersonalEvent,
  personalEventError,
} from "./firebase/calendar.ts";

export {
  syncProfile,
} from "./firebase/profile.ts";
