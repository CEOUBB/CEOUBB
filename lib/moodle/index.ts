export {
  MAX_MOODLE_ARCHIVE_BYTES,
  MAX_MOODLE_ENTRIES,
  MAX_MOODLE_EXPANDED_BYTES,
  MAX_MOODLE_XML_BYTES,
  MoodleImportError,
  openMoodleArchive,
} from "./archive.ts";

export { sha1Text, stableMoodleDocumentId } from "./ids.ts";
export {
  chunkImportRecords,
  fileIsSupported,
  prepareCourseImport,
  verifyMoodleFileBytes,
} from "./parser.ts";

export type {
  CourseImportPreview,
  MoodleImportFile,
  MoodleImportOmission,
  MoodleImportPost,
  MoodleImportPostDraft,
  MoodleImportReport,
  MoodleImportSource,
  MoodleRosterParticipant,
  PreparedCourseImport,
} from "./types.ts";
