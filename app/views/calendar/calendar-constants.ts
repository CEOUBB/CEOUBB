import { useSyncExternalStore } from "react";
import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_HOUR,
  DAY_START_MINUTES,
} from "../../../lib/planner";
import type {
  CalendarView,
  PersonalEventKind,
  PlannerItem,
  PlannerKind,
} from "../../../lib/planner";

export const SLOT_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index
);
export const MINUTE_SPAN = DAY_END_MINUTES - DAY_START_MINUTES;

export const KIND_LABEL: Record<PersonalEventKind, string> = {
  study: "Estudio",
  personal: "Personal",
  task: "Tarea",
  clase: "Clase",
};

export const PERSONAL_KINDS: PersonalEventKind[] = ["study", "clase", "task", "personal"];

export const VIEWS: { id: CalendarView; label: string; key: string }[] = [
  { id: "day", label: "Día", key: "d" },
  { id: "week", label: "Semana", key: "s" },
  { id: "month", label: "Mes", key: "m" },
  { id: "agenda", label: "Agenda", key: "a" },
];

export type BlockDraft = {
  id?: string;
  title: string;
  detail: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string;
  kind: PersonalEventKind;
  repeatUntil?: string;
};

export type AnchorRect = { left: number; top: number; width: number; height: number };

export function offsetOf(minutes: number): string {
  return `${((minutes - DAY_START_MINUTES) / MINUTE_SPAN) * 100}%`;
}

const longDateFormat = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const monthNameFormat = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" });
const monthShortFormat = new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" });
const zoneFormat = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  timeZoneName: "shortOffset",
});

const atNoon = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function longDate(iso: string): string {
  return longDateFormat.format(atNoon(iso));
}

export function monthShort(iso: string): string {
  return monthShortFormat.format(atNoon(iso)).replace(".", "");
}

export function zoneLabel(iso: string): string {
  const zone = zoneFormat.formatToParts(atNoon(iso)).find((part) => part.type === "timeZoneName");
  return zone?.value.replace("-", "−") ?? "";
}

function monthName(iso: string): string {
  return monthNameFormat.format(atNoon(iso));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function monthTitle(iso: string): string {
  return capitalize(`${monthName(iso)} de ${iso.slice(0, 4)}`);
}

// Implements: REQ-CEO72-09 — en el teléfono la tira semanal ya nombra el día; el título conserva el mes.
export function rangeTitle(
  view: CalendarView,
  days: string[],
  anchor: string,
  compact = false
): string {
  if (view === "month" || (view === "day" && compact)) return monthTitle(anchor);
  if (view === "day") return capitalize(longDate(days[0]));
  const first = days[0];
  const last = days[days.length - 1];
  if (first.slice(0, 7) === last.slice(0, 7)) return monthTitle(first);
  const name = compact ? monthShort : monthName;
  if (first.slice(0, 4) === last.slice(0, 4))
    return capitalize(`${name(first)} y ${name(last)} de ${last.slice(0, 4)}`);
  return capitalize(`${name(first)} ${first.slice(0, 4)} y ${name(last)} ${last.slice(0, 4)}`);
}

export function itemTimeLabel(item: PlannerItem): string {
  if (item.startTime && item.endTime) return `${item.startTime}–${item.endTime}`;
  if (item.kind === "evaluation") return "Evaluación";
  return item.detail || "Entrega";
}

export function isPersonalKind(kind: PlannerKind): kind is PersonalEventKind {
  return kind in KIND_LABEL;
}

export function itemContext(item: PlannerItem): string {
  if (item.courseName) return item.courseName;
  return isPersonalKind(item.kind) ? KIND_LABEL[item.kind] : item.detail;
}

const EDGE = 12;
const GAP = 8;

// Implements: REQ-CEO72-06 — el popover se abre junto a la selección sin salir de la ventana.
export function placeBeside(anchor: AnchorRect, width: number, height: number) {
  const right = anchor.left + anchor.width + GAP;
  const left =
    right + width <= window.innerWidth - EDGE
      ? right
      : anchor.left - width - GAP >= EDGE
        ? anchor.left - width - GAP
        : Math.min(Math.max(anchor.left, EDGE), window.innerWidth - width - EDGE);
  const top = Math.min(Math.max(anchor.top, EDGE), window.innerHeight - height - EDGE);
  return { left, top };
}

const COMPACT_QUERY = "(max-width: 767px)";

export function compactViewport(): boolean {
  return window.matchMedia(COMPACT_QUERY).matches;
}

function watchCompact(callback: () => void) {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useCompactViewport(): boolean {
  return useSyncExternalStore(watchCompact, compactViewport, () => false);
}
