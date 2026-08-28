import type { Course } from "./courses";
import type { GradeItem } from "./grades";

/** Primera y última hora visibles en la grilla semanal. */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 21;
export const DAY_START_MINUTES = DAY_START_HOUR * 60;
export const DAY_END_MINUTES = DAY_END_HOUR * 60;

/** Tono de los bloques personales sin ramo asociado (ink-500 del sistema). */
export const PERSONAL_TONE = "#57657a";

export type PersonalEventKind = "study" | "personal" | "task";

export type PersonalEvent = {
  id: string;
  title: string;
  detail: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string | null;
  kind: PersonalEventKind;
  completed: boolean;
};

export type PlannerKind = "evaluation" | "deadline" | PersonalEventKind;

export type PlannerItem = {
  id: string;
  source: "gradebook_eval" | "course_post_deadline" | "user_personal";
  title: string;
  detail: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  courseId: string | null;
  courseName: string | null;
  tone: string;
  kind: PlannerKind;
  completed: boolean;
};

export type PlacedBlock = PlannerItem & {
  startMinutes: number;
  endMinutes: number;
  column: number;
  columns: number;
};

/** Formas mínimas que necesita el agregador; evita acoplar este módulo al cliente Firebase. */
export type PlannerGradebook = { courseId: string; items: GradeItem[] };
export type PlannerDeadline = { id: string; courseId: string; title: string; dueDate: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

export function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(atNoon(value).getTime())
  );
}

function atNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Desplaza una fecha ISO en días sin arrastrar el huso horario del navegador. */
export function shiftDate(iso: string, days: number): string {
  const moment = atNoon(iso);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}

/** Los siete días de la semana que contiene `anchor`, de lunes a domingo. */
export function weekDates(anchor: string): string[] {
  const weekday = atNoon(anchor).getUTCDay();
  const start = shiftDate(anchor, -(weekday === 0 ? 6 : weekday - 1));
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}

export function normalizeTime(value: unknown): string | null {
  const match = TIME_PATTERN.exec(String(value ?? ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function minutesOf(time: string): number {
  const normalized = normalizeTime(time);
  if (!normalized) return 0;
  return Number(normalized.slice(0, 2)) * 60 + Number(normalized.slice(3, 5));
}

export function timeOfMinutes(minutes: number): string {
  const bounded = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

/** Acepta "YYYY-MM-DD" o "YYYY-MM-DDTHH:MM…" y devuelve "" cuando no hay fecha usable. */
export function normalizeDueDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const date = raw.slice(0, 10);
  if (!isIsoDate(date)) return "";
  const time = normalizeTime(raw.slice(11));
  return time ? `${date}T${time}` : date;
}

export function dueDateParts(value: string): { date: string; time: string | null } | null {
  const normalized = normalizeDueDate(value);
  if (!normalized) return null;
  return {
    date: normalized.slice(0, 10),
    time: normalized.length > 10 ? normalized.slice(11, 16) : null,
  };
}

/**
 * Mensaje de error en español, o `null` cuando el bloque es válido.
 * Único punto de validación: lo usan el formulario y el cliente Firestore.
 */
export function validateBlock(input: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}): string | null {
  if (!input.title.trim()) return "Escribe un título para el bloque.";
  if (!isIsoDate(input.date)) return "Elige una fecha válida.";
  const start = normalizeTime(input.startTime);
  const end = normalizeTime(input.endTime);
  if (!start || !end) return "Indica la hora de inicio y la de término.";
  const startMinutes = minutesOf(start);
  const endMinutes = minutesOf(end);
  if (endMinutes <= startMinutes) return "La hora de término debe ser posterior a la de inicio.";
  if (startMinutes < DAY_START_MINUTES || endMinutes > DAY_END_MINUTES) {
    return `El calendario cubre de ${timeOfMinutes(DAY_START_MINUTES)} a ${timeOfMinutes(DAY_END_MINUTES)}.`;
  }
  return null;
}

/** Une gradebooks, entregas de publicaciones y bloques personales en un solo feed ordenado. */
export function plannerItems(input: {
  courses: Course[];
  gradebooks: PlannerGradebook[];
  deadlines: PlannerDeadline[];
  personal: PersonalEvent[];
  from: string;
  to: string;
}): PlannerItem[] {
  const byId = new Map(input.courses.map((course) => [course.id, course]));
  const inRange = (date: string) => date >= input.from && date <= input.to;
  const items: PlannerItem[] = [];

  for (const gradebook of input.gradebooks) {
    const course = byId.get(gradebook.courseId);
    if (!course) continue;
    for (const item of gradebook.items) {
      if (!isIsoDate(item.date) || !inRange(item.date)) continue;
      items.push({
        id: `eval-${gradebook.courseId}-${item.id}`,
        source: "gradebook_eval",
        title: item.name,
        detail: `${item.weight}% de la nota`,
        date: item.date,
        startTime: null,
        endTime: null,
        courseId: course.id,
        courseName: course.name,
        tone: course.tone,
        kind: "evaluation",
        completed: false,
      });
    }
  }

  for (const deadline of input.deadlines) {
    const course = byId.get(deadline.courseId);
    const parts = dueDateParts(deadline.dueDate);
    if (!course || !parts || !inRange(parts.date)) continue;
    items.push({
      id: `due-${deadline.id}`,
      source: "course_post_deadline",
      title: deadline.title,
      detail: parts.time ? `Entrega ${parts.time}` : "Entrega",
      date: parts.date,
      startTime: null,
      endTime: null,
      courseId: course.id,
      courseName: course.name,
      tone: course.tone,
      kind: "deadline",
      completed: false,
    });
  }

  for (const event of input.personal) {
    if (!isIsoDate(event.date) || !inRange(event.date)) continue;
    const start = normalizeTime(event.startTime);
    const end = normalizeTime(event.endTime);
    if (!start || !end || minutesOf(end) <= minutesOf(start)) continue;
    const course = event.courseId ? byId.get(event.courseId) : undefined;
    items.push({
      id: event.id,
      source: "user_personal",
      title: event.title,
      detail: event.detail,
      date: event.date,
      startTime: start,
      endTime: end,
      courseId: course?.id ?? null,
      courseName: course?.name ?? null,
      tone: course?.tone ?? PERSONAL_TONE,
      kind: event.kind,
      completed: event.completed,
    });
  }

  return items.sort(
    (first, second) =>
      first.date.localeCompare(second.date) ||
      (first.startTime ?? "").localeCompare(second.startTime ?? "") ||
      first.title.localeCompare(second.title)
  );
}

export function dayItems(items: PlannerItem[], date: string) {
  const sameDay = items.filter((item) => item.date === date);
  return {
    ribbon: sameDay.filter((item) => !item.startTime),
    blocks: placeBlocks(sameDay),
  };
}

/**
 * Reparte en columnas los bloques que se solapan dentro de un mismo día.
 * Barrido lineal sobre bloques ya ordenados: agrupa por racimo de solapes y
 * asigna la primera columna libre de cada racimo.
 */
export function placeBlocks(items: PlannerItem[]): PlacedBlock[] {
  const timed: PlacedBlock[] = [];
  for (const item of items) {
    if (!item.startTime || !item.endTime) continue;
    timed.push({
      ...item,
      startMinutes: minutesOf(item.startTime),
      endMinutes: minutesOf(item.endTime),
      column: 0,
      columns: 1,
    });
  }
  timed.sort(
    (first, second) =>
      first.startMinutes - second.startMinutes || first.endMinutes - second.endMinutes
  );

  const placed: PlacedBlock[] = [];
  let cluster: PlacedBlock[] = [];
  let columnEnds: number[] = [];
  let clusterMaxEnd = 0;

  const flush = () => {
    for (const block of cluster) block.columns = columnEnds.length;
    placed.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterMaxEnd = 0;
  };

  for (const block of timed) {
    if (cluster.length > 0 && block.startMinutes >= clusterMaxEnd) flush();
    const free = columnEnds.findIndex((end) => end <= block.startMinutes);
    block.column = free === -1 ? columnEnds.length : free;
    columnEnds[block.column] = block.endMinutes;
    clusterMaxEnd = Math.max(clusterMaxEnd, block.endMinutes);
    cluster.push(block);
  }
  flush();

  return placed;
}
