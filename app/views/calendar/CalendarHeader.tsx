"use client";

import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import { isIsoDate, shiftDate } from "../../../lib/planner";
import { dayOf, weekRangeLabel, weekdayOf } from "../../../lib/portal-utils";

interface CalendarHeaderProps {
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
          <span>{weekRangeLabel(days[0], days[6])}</span>
          <span>·</span>
          <span>
            <b>{dueCount}</b> {dueCount === 1 ? "entrega" : "entregas"}
          </span>
          <span>·</span>
          <span>
            <b>{blockCount}</b> {blockCount === 1 ? "bloque" : "bloques"}
          </span>
        </p>
      </div>
      <div className="planner-controls">
        <div className="planner-step">
          <button
            aria-label="Semana anterior"
            onClick={() => goWeek(shiftDate(days[0], -7))}
            type="button"
          >
            <CaretLeft size={16} weight="bold" />
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
            aria-label="Semana siguiente"
            onClick={() => goWeek(shiftDate(days[0], 7))}
            type="button"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <label className="planner-jump">
          <span className="sr-only">Ir a una fecha</span>
          <input
            onChange={(event) => isIsoDate(event.target.value) && goWeek(event.target.value)}
            type="date"
            value={days[0]}
          />
        </label>
        <button
          className="planner-create"
          onClick={() => newBlock(focusDay, firstFreeHour)}
          type="button"
        >
          <Plus size={15} weight="bold" /> Nuevo bloque
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
