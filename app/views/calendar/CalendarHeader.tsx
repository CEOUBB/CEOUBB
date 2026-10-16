"use client";

import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import { isIsoDate, shiftDate, shiftMonth } from "../../../lib/planner";
import { dayOf, weekRangeLabel, weekdayOf } from "../../../lib/portal-utils";

interface CalendarHeaderProps {
  view: "week" | "month";
  anchor: string;
  setView: (view: "week" | "month") => void;
  days: string[];
  dueCount: number;
  blockCount: number;
  today: string;
  focusDay: string;
  firstFreeHour: number;
  goWeek: (date: string) => void;
  setPickedDay: (date: string) => void;
  newBlock: (date: string, hour: number) => void;
}

export function CalendarHeader({
  view,
  anchor,
  setView,
  days,
  dueCount,
  blockCount,
  today,
  focusDay,
  firstFreeHour,
  goWeek,
  setPickedDay,
  newBlock,
}: CalendarHeaderProps) {
  return (
    <header className="page-head planner-bar">
      <div className="planner-lead">
        <h1>Calendario</h1>
        <p>
          <span className="num">
            {view === "month"
              ? new Date(`${anchor}T12:00:00Z`).toLocaleDateString("es-CL", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : weekRangeLabel(days[0], days[6])}
          </span>
          <span>·</span>
          <span>
            <b className="num">{dueCount}</b> {dueCount === 1 ? "vencimiento" : "vencimientos"}
          </span>
          <span>·</span>
          <span>
            <b>{blockCount}</b> {blockCount === 1 ? "bloque" : "bloques"}
          </span>
        </p>
      </div>
      <div className="planner-controls">
        <div className="planner-view-switch" role="group" aria-label="Vista del calendario">
          <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>
            Semana
          </button>
          <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>
            Mes
          </button>
        </div>
        <div className="planner-step">
          <button
            aria-label={view === "month" ? "Mes anterior" : "Semana anterior"}
            onClick={() =>
              goWeek(view === "month" ? shiftMonth(anchor, -1) : shiftDate(days[0], -7))
            }
            type="button"
          >
            <CaretLeft aria-hidden="true" size={16} weight="bold" />
          </button>
          <button
            className="planner-now-button"
            onClick={() => {
              goWeek(today);
              setPickedDay(today);
            }}
            type="button"
          >
            Hoy
          </button>
          <button
            aria-label={view === "month" ? "Mes siguiente" : "Semana siguiente"}
            onClick={() => goWeek(view === "month" ? shiftMonth(anchor, 1) : shiftDate(days[0], 7))}
            type="button"
          >
            <CaretRight aria-hidden="true" size={16} weight="bold" />
          </button>
        </div>
        <label className="planner-jump">
          <span className="sr-only">Ir a una fecha</span>
          <input
            aria-label="Ir a una fecha"
            onChange={(event) => isIsoDate(event.target.value) && goWeek(event.target.value)}
            type="date"
            value={anchor}
          />
        </label>
        <button
          className="planner-create"
          onClick={() => newBlock(focusDay, firstFreeHour)}
          type="button"
        >
          <Plus aria-hidden="true" size={15} weight="bold" /> Nuevo bloque
        </button>
      </div>
    </header>
  );
}

interface CalendarFiltersProps {
  courses: Course[];
  hiddenCourses: Set<string>;
  toggleCourse: (courseId: string) => void;
}

export function CalendarFilters({ courses, hiddenCourses, toggleCourse }: CalendarFiltersProps) {
  if (courses.length === 0) return null;
  return (
    <div aria-label="Filtrar por ramo" className="planner-filters" role="group">
      {courses.map((course) => {
        const on = !hiddenCourses.has(course.id);
        return (
          <button
            aria-pressed={on}
            className="planner-pill"
            key={course.id}
            onClick={() => toggleCourse(course.id)}
            style={{ "--course-tone": course.tone } as React.CSSProperties}
            type="button"
          >
            <span aria-hidden="true" className="planner-pill-dot" />
            {course.name}
          </button>
        );
      })}
    </div>
  );
}

interface CalendarDayBarProps {
  days: string[];
  focusDay: string;
  today: string;
  setPickedDay: (day: string) => void;
}

export function CalendarDayBar({ days, focusDay, today, setPickedDay }: CalendarDayBarProps) {
  return (
    <nav aria-label="Día visible" className="planner-daybar">
      {days.map((day) => (
        <button
          aria-current={day === focusDay ? "date" : undefined}
          className="planner-daychip"
          data-today={day === today ? "true" : undefined}
          key={day}
          onClick={() => setPickedDay(day)}
          type="button"
        >
          <small>{weekdayOf(day)}</small>
          <b>{dayOf(day)}</b>
        </button>
      ))}
    </nav>
  );
}
