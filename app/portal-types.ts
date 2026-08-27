import {
  Bell,
  Books,
  CalendarBlank,
  ChalkboardTeacher,
  House,
  Sliders,
} from "@phosphor-icons/react";
import type { Course } from "../lib/courses";

export type Screen =
  | "courses"
  | "course"
  | "notifications"
  | "calendar"
  | "resources"
  | "teacher"
  | "admin"
  | "settings";

/*
  `Configuración` no entra en `navItems`: su acceso vive en el menú de cuenta
  del header, que es donde el usuario la busca. El rótulo se declara igual
  porque la miga del header y el anuncio de vista lo leen desde aquí.
*/
// Implements: REQ-CFG-01
export const SETTINGS_SCREEN_LABEL = "Configuración";

export interface NavState {
  screen: Screen;
  course: Course | null;
  coursesSheet: boolean;
  preview: Course | null;
  /*
    Clave `courseId:threadId` de la conversación que el centro de comunicaciones
    debe abrir al montarse. Es estado de navegación, no de datos: lo escribe el
    panel del header y lo consume la vista destino una sola vez.
  */
  focusThread: string;
}

export type NavAction =
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "OPEN_THREAD"; key: string }
  | { type: "ENTER_COURSE"; course: Course }
  | { type: "SET_PREVIEW"; preview: Course | null }
  | { type: "SET_COURSES_SHEET"; open: boolean }
  | { type: "LOGOUT" };

export const navItems = [
  { key: "courses", label: "Área personal", Icon: House },
  { key: "notifications", label: "Avisos y mensajes", Icon: Bell },
  { key: "calendar", label: "Calendario", Icon: CalendarBlank },
  { key: "resources", label: "Recursos", Icon: Books },
  { key: "teacher", label: "Administrar ramos", Icon: ChalkboardTeacher },
  { key: "admin", label: "Administración", Icon: Sliders },
] as const;

export const SEEN_KEY = "ceoubb:seen";

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "SET_SCREEN":
      return { ...state, screen: action.screen, focusThread: "" };
    case "OPEN_THREAD":
      return { ...state, screen: "notifications", focusThread: action.key };
    case "ENTER_COURSE":
      return {
        ...state,
        screen: "course",
        course: action.course,
        preview: null,
        coursesSheet: false,
        focusThread: "",
      };
    case "SET_PREVIEW":
      return { ...state, preview: action.preview };
    case "SET_COURSES_SHEET":
      return { ...state, coursesSheet: action.open };
    case "LOGOUT":
      return {
        ...state,
        screen: "courses",
        course: null,
        preview: null,
        coursesSheet: false,
        focusThread: "",
      };
    default:
      return state;
  }
}

export function readSeen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const saved = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "{}");
    return saved && typeof saved === "object" ? (saved as Record<string, string>) : {};
  } catch {
    return {};
  }
}
