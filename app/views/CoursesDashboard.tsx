"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight } from "@phosphor-icons/react";
import { Course, PERIOD } from "../../lib/courses";
import type { CourseActivity } from "../../lib/firebase-classroom-client";
import {
  countdown,
  dayOf,
  firstName,
  getSantiagoDateISO,
  instantTransition,
  nextEntry,
  rise,
  shortDate,
  springDefault,
  stagger,
} from "../../lib/portal-utils";
import type { CalendarEntry, User } from "../../lib/portal-utils";

export function CoursesDashboard({
  user,
  courses,
  activity,
  seen,
  entries,
  openCourse,
}: {
  user: User;
  courses: Course[];
  activity: CourseActivity[];
  seen: Record<string, string>;
  entries: CalendarEntry[];
  openCourse: (course: Course) => void;
}) {
  const next = nextEntry(entries);
  const nextCourse = next && courses.find((course) => course.id === next.courseId);
  const todayISO = getSantiagoDateISO();
  const shouldReduceMotion = useReducedMotion();

  // Implements: REQ-PERF-07
  const activitySummaryByCourse = useMemo(() => {
    const map = new Map<
      string,
      { total: number; unseen: number; upcoming: CalendarEntry | undefined }
    >();

    const activityMap = new Map<string, { total: number; unseen: number }>();
    for (const item of activity) {
      const current = activityMap.get(item.courseId) ?? { total: 0, unseen: 0 };
      current.total += 1;
      const seenAt = seen[item.courseId];
      if (!seenAt || item.createdAt > seenAt) {
        current.unseen += 1;
      }
      activityMap.set(item.courseId, current);
    }

    const upcomingMap = new Map<string, CalendarEntry>();
    for (const entry of entries) {
      if (entry.date >= todayISO && !upcomingMap.has(entry.courseId)) {
        upcomingMap.set(entry.courseId, entry);
      }
    }

    for (const course of courses) {
      const counts = activityMap.get(course.id) ?? { total: 0, unseen: 0 };
      map.set(course.id, {
        total: counts.total,
        unseen: counts.unseen,
        upcoming: upcomingMap.get(course.id),
      });
    }

    return map;
  }, [courses, activity, seen, entries, todayISO]);

  return (
    <>
      <section className="page-head lead">
        <h1>
          Bienvenid{user.name.trim().toLowerCase().endsWith("a") ? "a" : "o"},{" "}
          {firstName(user.name)}
        </h1>
        <p>
          <span>
            Periodo <b className="num">{PERIOD}</b>
          </span>
          <span>·</span>
          <span>
            <b className="num">{courses.length}</b> ramos activos
          </span>
          <span>·</span>
          <span>
            <b className="num">{entries.length}</b>{" "}
            {entries.length === 1 ? "evaluación" : "evaluaciones"} en el calendario
          </span>
        </p>
      </section>
      {next && (
        <div className="next-strip" style={{ "--course-tone": next.tone } as React.CSSProperties}>
          <div className="next-strip-date">
            <span className="next-strip-day num">{dayOf(next.date)}</span>
            <span className="next-strip-month">{shortDate(next.date).slice(3)}</span>
          </div>
          <div className="next-strip-body">
            {/* El punto medio separa en una línea; en el teléfono el nombre del
                ramo baja a su propio renglón y el separador quedaría colgando. */}
            <p className="next-strip-line">
              Próxima evaluación<span className="next-strip-sep"> · </span>
              <strong>{next.course}</strong>
            </p>
            <p className="next-strip-detail">{next.detail}</p>
          </div>
          <div className="next-strip-end">
            <time className="next-strip-count num" dateTime={next.date}>
              {countdown(next.date)}
            </time>
            {nextCourse && (
              <button
                className="next-strip-action"
                onClick={() => openCourse(nextCourse)}
                type="button"
              >
                Ir al ramo <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="section-title">
        <h2>Mis cursos</h2>
      </div>
      <m.section
        animate="show"
        className="course-grid"
        initial={shouldReduceMotion ? "show" : "hidden"}
        variants={shouldReduceMotion ? undefined : stagger}
      >
        {courses.map((course) => {
          const summary = activitySummaryByCourse.get(course.id);
          const upcoming = summary?.upcoming;
          const total = summary?.total ?? 0;
          const unseen = summary?.unseen ?? 0;
          return (
            <m.article
              className="course-card"
              key={course.id}
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
                <button className="course-action" onClick={() => openCourse(course)} type="button">
                  Entrar al aula <ArrowRight size={15} />
                </button>
              </div>
            </m.article>
          );
        })}
      </m.section>
    </>
  );
}
