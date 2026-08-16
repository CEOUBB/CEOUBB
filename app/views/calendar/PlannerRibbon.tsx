"use client";

import { Course } from "../../../lib/courses";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";

export function PlannerRibbon({
  days,
  focusDay,
  byDay,
  courseById,
  openCourse,
}: {
  days: string[];
  focusDay: string;
  byDay: Map<string, { ribbon: PlannerItem[]; blocks: PlacedBlock[] }>;
  courseById: Map<string, Course>;
  openCourse: (course: Course) => void;
}) {
  return (
    <div className="planner-ribbon" key={`ribbon-${days[0]}`}>
      <span className="planner-ribbon-label">Entregas</span>
      {days.map((day) => {
        const ribbon = byDay.get(day)?.ribbon ?? [];
        return (
          <div
            className="planner-ribbon-cell"
            data-focus={day === focusDay ? "true" : undefined}
            key={day}
          >
            {ribbon.map((item) => {
              const course = item.courseId ? courseById.get(item.courseId) : undefined;
              return (
                <button
                  className="planner-due"
                  data-kind={item.kind}
                  key={item.id}
                  onClick={() => course && openCourse(course)}
                  style={{ "--course-tone": item.tone } as React.CSSProperties}
                  title={`${item.title} · ${item.courseName ?? ""} · ${item.detail}`}
                  type="button"
                >
                  <span aria-hidden="true" className="planner-due-dot" />
                  <span className="planner-due-title">{item.title}</span>
                  <small>{item.detail}</small>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
