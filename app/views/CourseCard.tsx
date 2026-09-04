"use client";

import React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import * as m from "motion/react-m";
import type { Course } from "../../lib/courses";
import type { CalendarEntry } from "../../lib/portal-utils";
import { instantTransition, rise, shortDate, springDefault } from "../../lib/portal-utils";

export type CourseActivitySummary = {
  total: number;
  unseen: number;
  upcoming?: CalendarEntry;
};

export type CourseCardProps = {
  course: Course;
  summary?: CourseActivitySummary;
  shouldReduceMotion: boolean;
  onOpen: (course: Course) => void;
};

function CourseCardComponent({ course, summary, shouldReduceMotion, onOpen }: CourseCardProps) {
  const upcoming = summary?.upcoming;
  const total = summary?.total ?? 0;
  const unseen = summary?.unseen ?? 0;

  return (
    <m.article
      className="course-card"
      style={{ "--course-tone": course.tone } as React.CSSProperties}
      transition={shouldReduceMotion ? instantTransition : springDefault}
      variants={shouldReduceMotion ? undefined : rise}
      whileHover={shouldReduceMotion ? undefined : { y: -1 }}
    >
      <div aria-hidden="true" className="course-thumb" />
      <div className="course-body">
        <div className="course-head">
          <span className="course-code">{course.code}</span>
          {unseen > 0 && (
            <span className="fresh num">
              {unseen} {unseen === 1 ? "nueva" : "nuevas"}
            </span>
          )}
        </div>
        <h3>{course.name}</h3>
        <p>{course.teacher}</p>
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
            <span className="course-open">Material disponible</span>
          )}
        </div>
        <button className="course-action" onClick={() => onOpen(course)} type="button">
          Entrar al aula <ArrowRight size={15} />
        </button>
      </div>
    </m.article>
  );
}

// Implements: REQ-PERF-05
export const CourseCard = React.memo(CourseCardComponent);
