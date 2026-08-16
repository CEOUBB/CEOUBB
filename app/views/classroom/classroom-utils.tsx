import { ChartBar, Files, GraduationCap, House, UsersThree } from "@phosphor-icons/react";
import * as m from "motion/react-m";
import { Course, DEFAULT_FOLDER, materialFolders } from "../../../lib/courses";
import { ClassroomFile, ClassroomPost, ClassroomState } from "../../../lib/firebase-classroom-client";
import { ease } from "../../../lib/portal-utils";

export type Tab = "home" | "materials" | "grades" | "progress" | "people";

export const COURSE_TABS: { key: Tab; label: string; Icon: typeof House }[] = [
  { key: "home", label: "Portada", Icon: House },
  { key: "materials", label: "Materiales", Icon: Files },
  { key: "grades", label: "Notas", Icon: GraduationCap },
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
  simulation: {},
  classScores: {},
};

export function Bar({ ratio }: { ratio: number }) {
  const safeRatio = typeof ratio === "number" && !Number.isNaN(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return <m.span animate={{ scaleX: safeRatio }} initial={{ scaleX: 0 }} style={{ transformOrigin: "left" }} transition={{ duration: 0.6, ease }} />;
}

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
  return kind === "assessment" ? "Evaluación" : kind === "guide" ? "Guía" : kind === "resource" ? "Recurso" : "Aviso";
}

export function tabTitle(tab: Tab) {
  return tab === "materials"
    ? "Materiales del curso"
    : tab === "grades"
      ? "Notas y ponderaciones"
      : tab === "progress"
        ? "Progreso y monitoreo"
        : tab === "people"
          ? "Participantes"
          : "Portada del curso";
}

export function studentCount(total: number) {
  const safeTotal = typeof total === "number" && !Number.isNaN(total) ? Math.max(0, Math.floor(total)) : 0;
  if (safeTotal === 0) return "Sin estudiantes aún";
  return `${safeTotal} inscrito${safeTotal > 1 ? "s" : ""}`;
}
