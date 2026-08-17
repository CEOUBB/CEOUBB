import { Books, CalendarBlank, House, Sliders } from "@phosphor-icons/react";
import type { Course } from "../lib/courses";

export type Screen = "courses" | "course" | "calendar" | "resources" | "admin";

export interface NavState {
  screen: Screen;
  course: Course | null;
  coursesSheet: boolean;
  preview: Course | null;
}

export type NavAction =
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "ENTER_COURSE"; course: Course }
  | { type: "SET_PREVIEW"; preview: Course | null }
  | { type: "SET_COURSES_SHEET"; open: boolean }
  | { type: "LOGOUT" };

export const navItems = [
  { key: "courses", label: "Área personal", Icon: House },
  { key: "calendar", label: "Calendario", Icon: CalendarBlank },
  { key: "resources", label: "Recursos", Icon: Books },
  { key: "admin", label: "Administración", Icon: Sliders },
] as const;
