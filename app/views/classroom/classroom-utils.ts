import { ChartBar, Exam, Files, GraduationCap, House, UsersThree } from "@phosphor-icons/react";
import { DEFAULT_FOLDER, materialFolders, type Course } from "../../../lib/courses.ts";
import type {
  ClassroomFile,
  ClassroomPost,
  ClassroomState,
} from "../../../lib/firebase-classroom-client.ts";

export type Tab = "home" | "materials" | "grades" | "quizzes" | "progress" | "people";

export const COURSE_TABS: { key: Tab; label: string; Icon: typeof House }[] = [
  { key: "home", label: "Portada", Icon: House },
  { key: "materials", label: "Materiales", Icon: Files },
  { key: "grades", label: "Notas", Icon: GraduationCap },
  { key: "quizzes", label: "Cuestionarios", Icon: Exam },
  { key: "progress", label: "Progreso", Icon: ChartBar },
  { key: "people", label: "Participantes", Icon: UsersThree },
];

export type Note = { text: string; tone: "info" | "ok" | "bad" };

export const emptyClassroom: ClassroomState = {
  posts: [],
  files: [],
  students: [],
  ownProgress: 0,
  gradebook: [],
  exemption: null,
  officialScores: {},
  officialFeedback: {},
  simulation: {},
  classScores: {},
  classFeedback: {},
  liveClass: null,
};

export function groupByFolder(course: Course, files: ClassroomFile[]) {
  const groups = new Map<string, ClassroomFile[]>();
  for (const folder of materialFolders(course)) groups.set(folder, []);
  for (const file of files) {
    const folder = file.folder || DEFAULT_FOLDER;
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder)!.push(file);
  }
  return [...groups].filter(([, items]) => items.length > 0);
}

export function kindLabel(kind: ClassroomPost["kind"]) {
  return kind === "assessment"
    ? "Evaluación"
    : kind === "guide"
      ? "Guía"
      : kind === "resource"
        ? "Recurso"
        : "Aviso";
}

export function tabTitle(tab: Tab) {
  return tab === "materials"
    ? "Materiales del curso"
    : tab === "grades"
      ? "Notas y ponderaciones"
      : tab === "quizzes"
        ? "Cuestionarios y controles"
        : tab === "progress"
          ? "Progreso y monitoreo"
          : tab === "people"
            ? "Participantes"
            : "Portada del curso";
}

export function studentCount(total: number) {
  const safeTotal =
    typeof total === "number" && !Number.isNaN(total) ? Math.max(0, Math.floor(total)) : 0;
  if (safeTotal === 0) return "Sin estudiantes aún";
  return `${safeTotal} inscrito${safeTotal > 1 ? "s" : ""}`;
}

export function normalizeSearchText(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
};

// Implements: REQ-PAG-01, REQ-PAG-04
export function paginateList<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const safePageSize =
    typeof pageSize === "number" && !Number.isNaN(pageSize) && pageSize > 0
      ? Math.trunc(pageSize)
      : 25;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const rawPage =
    typeof page === "number" && !Number.isNaN(page) && page > 0 ? Math.trunc(page) : 1;
  const safePage = Math.min(Math.max(1, rawPage), totalPages);

  if (totalItems === 0) {
    return {
      items: [],
      page: 1,
      pageSize: safePageSize,
      totalPages: 1,
      totalItems: 0,
      startIndex: 0,
      endIndex: 0,
    };
  }

  const start = (safePage - 1) * safePageSize;
  const end = Math.min(start + safePageSize, totalItems);
  return {
    items: items.slice(start, end),
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    totalItems,
    startIndex: start + 1,
    endIndex: end,
  };
}

// Implements: REQ-PAG-02
export function filterRoster<T extends { name: string; email: string }>(
  students: readonly T[],
  query: string
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...students];
  return students.filter((student) => {
    const nameMatch = normalizeSearchText(student.name).includes(normalizedQuery);
    const emailMatch = normalizeSearchText(student.email).includes(normalizedQuery);
    return nameMatch || emailMatch;
  });
}

// Implements: REQ-PAG-05
export function filterMaterialsByQuery(
  folders: [string, ClassroomFile[]][],
  query: string
): [string, ClassroomFile[]][] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return folders;
  const result: [string, ClassroomFile[]][] = [];
  for (const [folderName, files] of folders) {
    const folderMatches = normalizeSearchText(folderName).includes(normalizedQuery);
    if (folderMatches) {
      result.push([folderName, files]);
      continue;
    }
    const matchingFiles = files.filter(
      (file) =>
        normalizeSearchText(file.name).includes(normalizedQuery) ||
        normalizeSearchText(file.authorName).includes(normalizedQuery)
    );
    if (matchingFiles.length > 0) {
      result.push([folderName, matchingFiles]);
    }
  }
  return result;
}
