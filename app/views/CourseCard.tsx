"use client";

import React, { ViewTransition } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { AnimatedUnderline } from "@/components/motion/animated-underline-link";
import type { Course } from "../../lib/courses";
import type { CalendarEntry } from "../../lib/portal-utils";
import { shortDate } from "../../lib/portal-utils";

export type CourseActivitySummary = {
  total: number;
  unseen: number;
  upcoming?: CalendarEntry;
};

export type CourseCardProps = {
  course: Course;
  summary?: CourseActivitySummary;
  onOpen: (course: Course) => void;
};

// Implements: REQ-MOTION-04
function CourseCardComponent({ course, summary, onOpen }: CourseCardProps) {
  const upcoming = summary?.upcoming;
  const total = summary?.total ?? 0;
  const unseen = summary?.unseen ?? 0;

  return (
    <article
      className="course-card"
      style={{ "--course-tone": course.tone } as React.CSSProperties}
    >
      <div className="course-cover">
        <ViewTransition default="none" name={`course-${course.id}`} share="course-divider">
          <span className="course-code num">{course.code}</span>
        </ViewTransition>
        {unseen > 0 && (
          <span className="fresh num">
            {unseen} {unseen === 1 ? "nueva" : "nuevas"}
          </span>
        )}
      </div>
      <div className="course-body">
        <h3>{course.name}</h3>
        <p>{course.teacher}</p>
        <p className="course-section num">
          Sección {course.section} · {course.periodId ?? course.period}
        </p>
        <div className="course-meta">
          <span className="num">
            {total === 0
              ? "Sin publicaciones aún"
              : `${total} ${total === 1 ? "publicación" : "publicaciones"}`}
          </span>
          {upcoming ? (
            <time className="num" dateTime={upcoming.date}>
              {shortDate(upcoming.date)} · {upcoming.detail}
            </time>
          ) : (
            <span className="course-open">Sin evaluaciones próximas</span>
          )}
        </div>
        <button
          aria-label={`Entrar al aula de ${course.name}`}
          className="course-action"
          onClick={() => onOpen(course)}
          type="button"
        >
          <AnimatedUnderline>Entrar al aula</AnimatedUnderline>{" "}
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      </div>
    </article>
  );
}

// Implements: REQ-PERF-05
export const CourseCard = React.memo(CourseCardComponent);
