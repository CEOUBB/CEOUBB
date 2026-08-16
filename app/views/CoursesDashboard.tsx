"use client";

import * as m from "motion/react-m";
import { ArrowRight } from "@phosphor-icons/react";
import { Course, PERIOD } from "../../lib/courses";
import type { CourseActivity } from "../../lib/firebase-classroom-client";
import {
  countdown,
  dayOf,
  ease,
  firstName,
  getSantiagoDateISO,
  nextEntry,
  rise,
  shortDate,
  stagger,
  unseenCount,
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

  return (
    <>
      <section className="page-head lead">
        <h1>
          Bienvenid{user.name.trim().toLowerCase().endsWith("a") ? "a" : "o"},{" "}
          {firstName(user.name)}
        </h1>
        <p>
          <span>
            Periodo <b>{PERIOD}</b>
          </span>
          <span>·</span>
          <span>
            <b>{courses.length}</b> ramos activos
          </span>
          <span>·</span>
          <span>
            <b>{entries.length}</b> {entries.length === 1 ? "evaluación" : "evaluaciones"} en el
            calendario
          </span>
        </p>
      </section>
      {next && (
        <div className="next-strip" style={{ "--course-tone": next.tone } as React.CSSProperties}>
          <div className="next-strip-date">
            <span className="next-strip-day">{dayOf(next.date)}</span>
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
            <time className="next-strip-count" dateTime={next.date}>
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
      <m.section animate="show" className="course-grid" initial="hidden" variants={stagger}>
        {courses.map((course) => {
          const upcoming = entries.find(
            (entry) => entry.courseId === course.id && entry.date >= todayISO
          );
          const total = activity.filter((item) => item.courseId === course.id).length;
          const unseen = unseenCount(activity, course.id, seen[course.id]);
          return (
            <m.article
              className="course-card"
              key={course.id}
              style={{ "--course-tone": course.tone } as React.CSSProperties}
              transition={{ duration: 0.45, ease }}
              variants={rise}
              whileHover={{ y: -1 }}
            >
              <div aria-hidden="true" className="course-thumb" />
              <div className="course-body">
                <div className="course-head">
                  <span className="course-code">{course.code}</span>
                  {unseen > 0 && (
                    <span className="fresh">
                      {unseen} {unseen === 1 ? "nueva" : "nuevas"}
                    </span>
                  )}
                </div>
                <h3>{course.name}</h3>
                <p>{course.teacher}</p>
                <div className="course-meta">
                  <span>
                    {total === 0
                      ? "Sin publicaciones aún"
                      : `${total} ${total === 1 ? "publicación" : "publicaciones"}`}
                  </span>
                  {upcoming ? (
                    <time dateTime={upcoming.date}>
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
