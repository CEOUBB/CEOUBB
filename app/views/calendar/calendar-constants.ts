import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_HOUR,
  DAY_START_MINUTES,
} from "../../../lib/planner";
import type { PersonalEventKind } from "../../../lib/planner";

export const SLOT_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index
);
export const MINUTE_SPAN = DAY_END_MINUTES - DAY_START_MINUTES;

/** Módulos horarios académicos UBB (08:15, 09:50, etc.) con patrón Cal.com / Scheduler */
export const ACADEMIC_SLOTS = [
  { time: "08:15", minutes: 8 * 60 + 15 },
  { time: "09:50", minutes: 9 * 60 + 50 },
  { time: "11:25", minutes: 11 * 60 + 25 },
  { time: "13:00", minutes: 13 * 60 },
  { time: "14:40", minutes: 14 * 60 + 40 },
  { time: "16:15", minutes: 16 * 60 + 15 },
  { time: "17:50", minutes: 17 * 60 + 50 },
  { time: "19:25", minutes: 19 * 60 + 25 },
] as const;

export const KIND_LABEL: Record<PersonalEventKind, string> = {
  study: "Estudio",
  personal: "Personal",
  task: "Tarea",
};

export type BlockDraft = {
  id?: string;
  title: string;
  detail: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string;
  kind: PersonalEventKind;
};

export function offsetOf(minutes: number): string {
  return `${((minutes - DAY_START_MINUTES) / MINUTE_SPAN) * 100}%`;
}
