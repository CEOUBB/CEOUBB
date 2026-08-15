import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_HOUR,
  DAY_START_MINUTES,
} from "../../../lib/planner";
import type { PersonalEventKind } from "../../../lib/planner";

export const SLOT_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index,
);
export const HOUR_LINES = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, index) => DAY_START_HOUR + index,
);
export const MINUTE_SPAN = DAY_END_MINUTES - DAY_START_MINUTES;

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
