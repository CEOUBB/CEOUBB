"use client";

import { useId } from "react";
import { CalendarPlus } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import type { PlannerItem } from "../../../lib/planner";
import { countdown, evaluationUrgency } from "../../../lib/portal-utils";
import { academicLabel, rectOf } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { ItemIcon, ToneMark } from "./CalendarParts";
import { MiniMonth } from "./MiniMonth";

export function CourseFilters({
  courses,
  hidden,
  onToggle,
}: {
  courses: Course[];
  hidden: Set<string>;
  onToggle: (courseId: string) => void;
}) {
  const titleId = useId();
  if (courses.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="planner-courses">
      <h2 id={titleId}>Ramos</h2>
      <ul>
        {courses.map((course) => {
          const on = !hidden.has(course.id);
          return (
            <li key={course.id}>
              <button
                aria-pressed={on}
                className="planner-course"
                onClick={() => onToggle(course.id)}
                type="button"
              >
                <ToneMark tone={course.tone} />
                <span>{course.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Upcoming({
  items,
  onOpen,
  onPlan,
}: {
  items: PlannerItem[];
  onOpen: (item: PlannerItem, anchor: AnchorRect) => void;
  onPlan: (item: PlannerItem) => void;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="planner-upcoming">
      <h2 id={titleId}>Lo que viene</h2>
      {items.length === 0 ? (
        <p className="planner-side-empty">
          Sin evaluaciones ni entregas en las próximas cuatro semanas.
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              data-kind={item.kind}
              key={item.id}
              style={{ "--course-tone": item.tone } as React.CSSProperties}
            >
              <button
                aria-label={`${academicLabel(item)}, ${countdown(item.date).toLowerCase()}. ${item.detail}`}
                className="planner-upcoming-open"
                onClick={(event) => onOpen(item, rectOf(event.currentTarget))}
                type="button"
              >
                <ToneMark tone={item.tone} />
                <span
                  className="planner-upcoming-when num"
                  data-urgency={evaluationUrgency(item.date)}
                >
                  {countdown(item.date)}
                </span>
                <strong>{item.title}</strong>
                <small>
                  <ItemIcon kind={item.kind} size={12} />
                  <span>{item.courseName}</span>
                  <span className="num">{item.detail}</span>
                </small>
              </button>
              <button
                aria-label={`Planificar estudio para “${item.title}”`}
                className="planner-icon-button planner-upcoming-plan"
                onClick={() => onPlan(item)}
                title="Planificar estudio"
                type="button"
              >
                <CalendarPlus aria-hidden="true" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalendarSide({
  selected,
  today,
  range,
  marks,
  upcoming,
  showUpcoming,
  courses,
  hidden,
  onPick,
  onToggleCourse,
  onOpenItem,
  onPlan,
}: {
  selected: string;
  today: string;
  range: string[];
  marks: Set<string>;
  upcoming: PlannerItem[];
  showUpcoming: boolean;
  courses: Course[];
  hidden: Set<string>;
  onPick: (date: string) => void;
  onToggleCourse: (courseId: string) => void;
  onOpenItem: (item: PlannerItem, anchor: AnchorRect) => void;
  onPlan: (item: PlannerItem) => void;
}) {
  return (
    <aside aria-label="Panel del calendario" className="planner-side">
      <MiniMonth marks={marks} onPick={onPick} range={range} selected={selected} today={today} />
      {showUpcoming && <Upcoming items={upcoming} onOpen={onOpenItem} onPlan={onPlan} />}
      <CourseFilters courses={courses} hidden={hidden} onToggle={onToggleCourse} />
    </aside>
  );
}
