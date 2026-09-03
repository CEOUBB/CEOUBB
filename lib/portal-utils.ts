import type { AccountRole as Role } from "./access-policy";
import { parseAcademicSections, type AcademicSectionSummary, type Course } from "./courses.ts";
import type { CourseActivity, CourseGradebook } from "./firebase-classroom-client";
import { dueDateParts } from "./planner.ts";
import { parseSectionMemberships, type SectionMembership } from "./section-roles.ts";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  carrera?: string | null;
  photoUrl?: string | null;
};

export type CalendarEntry = {
  key: string;
  courseId: string;
  course: string;
  detail: string;
  date: string;
  tone: string;
};

export const APK_URL =
  "https://drive.google.com/uc?export=download&id=16gs-qhzTujmFqf_zgGsVfqBq2QJEbYak";

export const springDefault = { type: "spring", stiffness: 340, damping: 28, mass: 0.8 } as const;
export const springSnappy = { type: "spring", stiffness: 400, damping: 30, mass: 0.6 } as const;
export const instantTransition = { duration: 0.01 } as const;

export const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
export const ease = [0.16, 1, 0.3, 1] as const;

const PHOTO_KEY = "ceoubb:photo";

export function cachedPhoto(email: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PHOTO_KEY) ?? "null");
    return saved?.email === email ? String(saved.url) : null;
  } catch {
    return null;
  }
}

export function rememberPhoto(email: string, url: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PHOTO_KEY, JSON.stringify({ email, url }));
  } catch {
    return;
  }
}

export function forgetPhoto(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PHOTO_KEY);
  } catch {
    return;
  }
}

export function roleLabel(role: Role): string {
  return role === "owner" ? "Desarrollador" : role === "teacher" ? "Docente" : "Estudiante";
}

export function initials(value: string): string {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CE"
  );
}

export function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] || "estudiante";
}

export function calendarEntries(courses: Course[], gradebooks: CourseGradebook[]): CalendarEntry[] {
  const gradebookMap = new Map(gradebooks.map((gb) => [gb.courseId, gb]));
  const entries = courses.flatMap((course) => {
    const dated = gradebookMap.get(course.id)?.items.filter((item) => item.date) ?? [];
    const source =
      dated.length > 0
        ? dated.map((item) => ({
            id: item.id,
            name: `${item.name} · ${item.weight}% de la nota`,
            date: item.date,
          }))
        : course.evaluations;
    return source.map((item) => ({
      key: `${course.id}-${item.id}`,
      courseId: course.id,
      course: course.name,
      detail: item.name,
      date: item.date,
      tone: course.tone,
    }));
  });
  return entries.sort((first, second) => first.date.localeCompare(second.date));
}

const TIME_ZONE = "America/Santiago";
const LOCALE = "es-CL";

const shortFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  timeZone: TIME_ZONE,
});
const dayFormat = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", timeZone: TIME_ZONE });
const monthYearFormat = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: TIME_ZONE });
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const isoDateFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});
const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: TIME_ZONE });
const rangeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

export function getSantiagoDateISO(date: Date = new Date()): string {
  return isoDateFormat.format(date);
}

/** Minutos transcurridos del día en Santiago; mueve la línea de "ahora" del planificador. */
export function getSantiagoMinutes(date: Date = new Date()): number {
  const [hours, minutes] = clockFormat.format(date).split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function weekdayOf(value: string): string {
  const label = weekdayFormat.format(new Date(`${value}T12:00:00`)).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weekRangeLabel(from: string, to: string): string {
  const start = rangeFormat.format(new Date(`${from}T12:00:00`));
  const end = rangeFormat.format(new Date(`${to}T12:00:00`));
  const year = to.slice(0, 4);
  return `${start} al ${end} de ${year}`;
}

export function formatDueDate(value: string): string {
  const parts = dueDateParts(value);
  if (!parts) return "";
  return parts.time ? `${formatDay(parts.date)} · ${parts.time}` : formatDay(parts.date);
}

export function nextEntry(entries: CalendarEntry[]): CalendarEntry | null {
  const today = getSantiagoDateISO();
  return entries.find((entry) => entry.date >= today) ?? entries[entries.length - 1] ?? null;
}

export function unseenCount(
  activity: CourseActivity[],
  courseId: string,
  seenAt: string | undefined
): number {
  return activity.filter(
    (item) => item.courseId === courseId && (!seenAt || item.createdAt > seenAt)
  ).length;
}

export function countdown(value: string): string {
  const target = new Date(`${value}T12:00:00-04:00`).getTime();
  const todayISO = getSantiagoDateISO();
  const current = new Date(`${todayISO}T12:00:00-04:00`).getTime();
  const days = Math.round((target - current) / 86400000);
  if (days < 0) return "Realizada";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export function shortDate(value: string): string {
  return shortFormat.format(new Date(`${value}T12:00:00`)).replace(".", "");
}

export function dayOf(value: string): string {
  return dayFormat.format(new Date(`${value}T12:00:00`));
}

export function monthLabel(value: string): string {
  const label = monthYearFormat.format(new Date(`${value}T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthOf(value: string): string {
  return monthFormat
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "")
    .toUpperCase();
}

export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}

export function formatDay(value: string): string {
  return dateFormat.format(new Date(`${value}T12:00:00`));
}

/** Fecha y hora de Santiago de una marca ISO completa, como la de una entrega. */
export function formatDateTime(value: string): string {
  const moment = new Date(value);
  if (Number.isNaN(moment.getTime())) return "";
  return `${dateFormat.format(moment)} · ${clockFormat.format(moment)}`;
}

export function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export type SessionState = {
  user: User | null;
  sectionIds: string[];
  memberships: SectionMembership[];
  sections: AcademicSectionSummary[] | null;
  archivedNextCursor: string | null;
};

export async function loadCurrentSession(): Promise<SessionState> {
  try {
    const response = await fetch("/api/auth/me?includeSections=1", { cache: "no-store" });
    if (!response.ok)
      return {
        user: null,
        sectionIds: [],
        memberships: [],
        sections: null,
        archivedNextCursor: null,
      };
    const data = (await response.json()) as {
      user?: User | null;
      sectionIds?: unknown;
      memberships?: unknown;
      sections?: unknown;
      archivedNextCursor?: unknown;
    };
    const memberships = parseSectionMemberships(data.memberships);
    return {
      user: data.user ?? null,
      sectionIds: Array.isArray(data.sectionIds)
        ? data.sectionIds.filter((value): value is string => typeof value === "string")
        : memberships.map((membership) => membership.sectionId),
      memberships,
      sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
      archivedNextCursor:
        typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
    };
  } catch {
    return {
      user: null,
      sectionIds: [],
      memberships: [],
      sections: null,
      archivedNextCursor: null,
    };
  }
}

export async function loadArchivedAcademicSections(cursor: string) {
  try {
    const response = await fetch(
      `/api/enrollments/me?scope=archived&limit=100&cursor=${encodeURIComponent(cursor)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return { sections: [], nextCursor: null };
    const data = (await response.json()) as { sections?: unknown; nextCursor?: unknown };
    return {
      sections: parseAcademicSections(data.sections),
      nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
    };
  } catch {
    return { sections: [], nextCursor: null };
  }
}

/*
  Identificadores de sección con matrícula activa. Si la consulta falla el
  portal se queda sin escuchas en vez de caer al barrido global: es preferible
  una bandeja vacía a leer secciones ajenas.
*/
// Implements: REQ-PERF-01
export async function loadEnrolledSectionIds(): Promise<string[]> {
  try {
    const response = await fetch("/api/enrollments/me", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { sectionIds?: unknown };
    if (!Array.isArray(data.sectionIds)) return [];
    return data.sectionIds.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

// Implements: REQ-ASST-01, REQ-ASST-02
export async function loadEnrolledSectionMemberships(): Promise<SectionMembership[]> {
  try {
    const response = await fetch("/api/enrollments/me", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { memberships?: unknown };
    return parseSectionMemberships(data.memberships);
  } catch {
    return [];
  }
}

export type AdminUsersResponse = {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
};

export type AcademicPeriodSummary = {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "abierto" | "cerrado" | "archivado";
};

export async function loadAcademicPeriods(): Promise<AcademicPeriodSummary[]> {
  try {
    const response = await fetch("/api/admin/periods?limit=100", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { items?: unknown };
    if (!Array.isArray(data.items)) return [];
    return data.items.filter(
      (item): item is AcademicPeriodSummary =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "nombre" in item &&
        typeof item.nombre === "string" &&
        "fechaInicio" in item &&
        typeof item.fechaInicio === "string" &&
        "fechaFin" in item &&
        typeof item.fechaFin === "string" &&
        "estado" in item &&
        (item.estado === "abierto" || item.estado === "cerrado" || item.estado === "archivado")
    );
  } catch {
    return [];
  }
}

export async function archiveAcademicPeriod(periodId: string) {
  const response = await fetch(`/api/admin/periods/${encodeURIComponent(periodId)}/archive`, {
    method: "POST",
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "No fue posible archivar el período.");
  }
}

export async function loadAdminUsers(
  page = 1,
  limit = 50,
  query = ""
): Promise<AdminUsersResponse> {
  try {
    const response = await fetch(
      `/api/admin/users?page=${page}&limit=${limit}&q=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return { users: [], total: 0, page, totalPages: 1 };
    const data = (await response.json()) as AdminUsersResponse;
    return {
      users: data.users ?? [],
      total: Number(data.total ?? 0),
      page: Number(data.page ?? page),
      totalPages: Number(data.totalPages ?? 1),
    };
  } catch {
    return { users: [], total: 0, page, totalPages: 1 };
  }
}

export function fileExtension(value: string): string {
  const extension = value.split(".").pop()?.toUpperCase() ?? "DOC";
  return extension.slice(0, 4);
}

export { formatGrade } from "./grades.ts";
