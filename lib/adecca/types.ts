export const ADECCA_IMPORT_REQUIREMENTS = [
  "REQ-ADECCA-01",
  "REQ-ADECCA-02",
  "REQ-ADECCA-03",
  "REQ-ADECCA-04",
  "REQ-ADECCA-05",
  "REQ-ADECCA-06",
  "REQ-ADECCA-07",
  "REQ-ADECCA-08",
  "REQ-ADECCA-09",
  "REQ-ADECCA-10",
  "REQ-ADECCA-11",
] as const;

export type AdeccaImportSource = {
  sourceKey: string;
  fingerprint: string;
  courseId: string;
  courseName: string;
  courseShortName: string;
  adeccaVersion: string;
  fileName: string;
  sourceFormat: "zip" | "json" | "csv";
};

export type AdeccaImportPostDraft = {
  sourceId: string;
  title: string;
  body: string;
  kind: "notice" | "guide" | "assessment" | "resource";
  folder: string;
  linkUrl: string;
  dueDate: string;
  sourceCreatedAt: string | null;
};

export type AdeccaImportFile = {
  sourceId: string;
  title: string;
  body: string;
  kind: "notice" | "guide" | "assessment" | "resource";
  folder: string;
  linkUrl: string;
  dueDate: string;
  archivePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  contentHash: string;
  sourceCreatedAt: string | null;
};

export type AdeccaRosterParticipant = {
  sourceUserId: string;
  email: string;
  role: "student";
};

export type AdeccaImportOmission = {
  category: string;
  title: string;
  reason: string;
};

export type AdeccaCourseImportPreview = {
  kind: "adecca" | "csv";
  source: AdeccaImportSource;
  folders: string[];
  posts: AdeccaImportPostDraft[];
  files: AdeccaImportFile[];
  participants: AdeccaRosterParticipant[];
  omissions: AdeccaImportOmission[];
  uploadBytes: number;
};

export type PreparedAdeccaCourseImport = {
  preview: AdeccaCourseImportPreview;
  readArchiveFile: (path: string) => Promise<Uint8Array>;
};

export type AdeccaImportPost = AdeccaImportPostDraft & {
  storagePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  contentHash: string;
};

export type AdeccaImportReport = {
  status: "completed" | "partial";
  source: AdeccaImportSource;
  destinationSectionId: string;
  contentImported: number;
  filesImported: number;
  participantsMatched: number;
  participantsPending: number;
  warnings: AdeccaImportOmission[];
  finishedAt: string;
};

export type AdeccaManifestV1 = {
  format: "ceoubb-adecca-package";
  version: 1;
  source: {
    courseId: string;
    courseName: string;
    courseShortName?: string;
    adeccaVersion?: string;
  };
  items?: Array<{
    sourceId: string;
    title: string;
    kind: "notice" | "guide" | "assessment" | "resource";
    folder?: string;
    body?: string;
    bodyHtml?: string;
    linkUrl?: string;
    dueDate?: string;
    filePath?: string;
    sha256?: string;
    visible?: boolean;
  }>;
  participants?: AdeccaRosterParticipant[];
};
