"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Course } from "../../../lib/courses";
import type { CourseActivity, CourseGradebook } from "../../../lib/firebase-classroom-client";
import {
  deletePersonalEvent,
  savePersonalEvent,
  setPersonalEventCompleted,
  watchPersonalEvents,
} from "../../../lib/firebase-classroom-client";
import { dayItems, plannerItems, shiftDate, viewDates, weekDates } from "../../../lib/planner";
import type { CalendarView, PersonalEvent, PlannerItem } from "../../../lib/planner";
import { draftOf, longDate } from "./calendar-constants";

const UPCOMING_DAYS = 28;
const UPCOMING_LIMIT = 8;
const ALL_TIME = { from: "0000-01-01", to: "9999-12-31" };

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function periodSummary(items: PlannerItem[]): string {
  const evaluations = items.filter((item) => item.kind === "evaluation").length;
  const deliveries = items.filter((item) => item.kind === "deadline").length;
  const blocks = items.length - evaluations - deliveries;
  return (
    [
      evaluations > 0 && plural(evaluations, "evaluación", "evaluaciones"),
      deliveries > 0 && plural(deliveries, "entrega", "entregas"),
      blocks > 0 && plural(blocks, "bloque", "bloques"),
    ]
      .filter(Boolean)
      .join(" · ") || "Sin actividades en este período"
  );
}

// Implements: REQ-CEO72-04 — un listener paginado por rango cargado; el día carga su semana para la tira.
export function useCalendarData({
  courses,
  gradebooks,
  activity,
  view,
  date,
  today,
  hidden,
  onError,
}: {
  courses: Course[];
  gradebooks: CourseGradebook[];
  activity: CourseActivity[];
  view: CalendarView;
  date: string;
  today: string;
  hidden: Set<string>;
  onError: (message: string) => void;
}) {
  const [personal, setPersonal] = useState<PersonalEvent[]>([]);
  const [loadedRange, setLoadedRange] = useState("");
  const days = useMemo(() => viewDates(view, date), [view, date]);
  const loadDays = useMemo(() => (view === "day" ? weekDates(date) : days), [view, date, days]);
  const from = loadDays[0];
  const to = loadDays[loadDays.length - 1];
  const loaded = loadedRange === `${from}/${to}`;

  useEffect(
    () =>
      watchPersonalEvents(
        from,
        to,
        (events) => {
          setPersonal(events);
          setLoadedRange(`${from}/${to}`);
        },
        onError
      ),
    [from, to, onError]
  );

  const deadlines = useMemo(() => activity.filter((post) => post.dueDate), [activity]);
  const visible = useCallback(
    (item: PlannerItem) => !item.courseId || !hidden.has(item.courseId),
    [hidden]
  );
  const items = useMemo(
    () =>
      plannerItems({
        courses,
        gradebooks,
        deadlines,
        personal: loaded ? personal : [],
        from,
        to,
      }).filter(visible),
    [courses, gradebooks, deadlines, personal, loaded, from, to, visible]
  );
  const academic = useMemo(
    () =>
      plannerItems({ courses, gradebooks, deadlines, personal: [], ...ALL_TIME }).filter(visible),
    [courses, gradebooks, deadlines, visible]
  );
  const marks = useMemo(() => new Set(academic.map((item) => item.date)), [academic]);
  const upcoming = useMemo(() => {
    const horizon = shiftDate(today, UPCOMING_DAYS);
    return academic
      .filter((item) => item.date >= today && item.date <= horizon)
      .slice(0, UPCOMING_LIMIT);
  }, [academic, today]);
  const byDay = useMemo(
    () => new Map(loadDays.map((day) => [day, dayItems(items, day)])),
    [loadDays, items]
  );
  const tones = useMemo(
    () =>
      new Map(
        loadDays.map((day) => {
          const entry = byDay.get(day);
          return [
            day,
            [...(entry?.ribbon ?? []), ...(entry?.blocks ?? [])].map((item) => item.tone),
          ];
        })
      ),
    [loadDays, byDay]
  );
  const first = days[0];
  const last = days[days.length - 1];
  const summary = periodSummary(items.filter((item) => item.date >= first && item.date <= last));
  const setCompleted = useCallback(
    (id: string, completed: boolean) =>
      setPersonal((current) =>
        current.map((event) => (event.id === id ? { ...event, completed } : event))
      ),
    []
  );

  return { days, loadDays, loaded, items, marks, upcoming, byDay, tones, summary, setCompleted };
}

export function useBlockActions({
  onError,
  onNotice,
  setCompleted,
}: {
  onError: (message: string) => void;
  onNotice: (message: string) => void;
  setCompleted: (id: string, completed: boolean) => void;
}) {
  const reschedule = async (item: PlannerItem, day: string, startTime: string, endTime: string) => {
    try {
      await savePersonalEvent({
        ...draftOf(item),
        courseId: item.courseId,
        date: day,
        startTime,
        endTime,
      });
      onNotice(`“${item.title}” queda el ${longDate(day)}, de ${startTime} a ${endTime}.`);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "No se pudo mover el bloque.");
    }
  };

  const toggleDone = (item: PlannerItem) => {
    const next = !item.completed;
    setCompleted(item.id, next);
    setPersonalEventCompleted(item.id, next).catch(() => {
      setCompleted(item.id, !next);
      onError("No se pudo guardar el estado del bloque.");
    });
  };

  const remove = async (item: PlannerItem) => {
    try {
      await deletePersonalEvent(item.id);
    } catch {
      onError("No se pudo eliminar el bloque.");
    }
  };

  return { reschedule, toggleDone, remove };
}

// Implements: REQ-CEO72-08 — atajos de una tecla fuera de campos, diálogos y popovers.
export function useShortcutKeys(handle: (key: string) => boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [popover]"))
      )
        return;
      if (document.querySelector("dialog[open], [popover]:popover-open")) return;
      if (handle(event.key.toLowerCase())) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
}
