export type MoodleImportSource = {
  sourceKey: string;
  fingerprint: string;
  courseId: string;
  courseName: string;
  courseShortName: string;
  moodleVersion: string;
  fileName: string;
};

export type MoodleImportPostDraft = {
  sourceId: string;
  title: string;
  body: string;
  kind: "notice" | "guide" | "assessment" | "resource";
  folder: string;
  linkUrl: string;
  dueDate: string;
  sourceCreatedAt: string | null;
};

export type MoodleImportFile = {
  sourceId: string;
  title: string;
  body: string;
  folder: string;
  archivePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  contentHash: string;
  sourceCreatedAt: string | null;
  scormPackage: boolean;
};

export type MoodleRosterParticipant = {
  sourceUserId: string;
  email: string;
  role: "student";
};

export type MoodleImportOmission = {
  category: string;
  title: string;
  reason: string;
};

export type CourseImportPreview = {
  kind: "moodle" | "csv";
  source: MoodleImportSource;
  sections: string[];
  posts: MoodleImportPostDraft[];
  files: MoodleImportFile[];
  participants: MoodleRosterParticipant[];
  omissions: MoodleImportOmission[];
  uploadBytes: number;
};

export type PreparedCourseImport = {
  preview: CourseImportPreview;
  readArchiveFile: (path: string) => Promise<Uint8Array>;
};

export type MoodleImportPost = MoodleImportPostDraft & {
  storagePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
};

export type MoodleImportReport = {
  status: "completed" | "partial";
  source: MoodleImportSource;
  destinationSectionId: string;
  contentImported: number;
  filesImported: number;
  participantsMatched: number;
  participantsPending: number;
  warnings: MoodleImportOmission[];
  finishedAt: string;
};
