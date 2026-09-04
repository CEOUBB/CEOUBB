"use client";

import { useCallback, useMemo } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Archive, ArrowRight, ChalkboardTeacher } from "@phosphor-icons/react";
import { CourseCard } from "./CourseCard";
import { Course, PERIOD } from "../../lib/courses";
import type { CourseActivity } from "../../lib/firebase-classroom-client";
import {
  countdown,
  dayOf,
  firstName,
  getSantiagoDateISO,
  nextEntry,
  shortDate,
  stagger,
} from "../../lib/portal-utils";
import type { CalendarEntry, User } from "../../lib/portal-utils";

export function CoursesDashboard({
  user,
  courses,
  archivedCourses,
  archivedHasMore,
  archivedLoading,
  activity,
  seen,
  entries,
  manageCourses,
  openCourse,
  onLoadMoreArchived,
}: {
  user: User;
  courses: Course[];
  archivedCourses: Course[];
  archivedHasMore: boolean;
  archivedLoading: boolean;
  activity: CourseActivity[];
  seen: Record<string, string>;
  entries: CalendarEntry[];
  manageCourses?: () => void;
  openCourse: (course: Course) => void;
  onLoadMoreArchived: () => void;
}) {
  const next = nextEntry(entries);
  const nextCourse = next && courses.find((course) => course.id === next.courseId);
  const todayISO = getSantiagoDateISO();
  const shouldReduceMotion = useReducedMotion();

  const handleOpenCourse = useCallback(
    (courseToOpen: Course) => {
      openCourse(courseToOpen);
    },
    [openCourse]
  );

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
          <span>{user.carrera?.trim() ? user.carrera.trim() : "Sin carrera"}</span>
          <span>·</span>
          <span>
            Periodo <b className="num">{courses[0]?.periodId ?? PERIOD}</b>
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
                aria-label={`Ir al ramo ${nextCourse.name}`}
                className="next-strip-action"
                onClick={() => openCourse(nextCourse)}
                type="button"
              >
                Ir al ramo <ArrowRight aria-hidden="true" size={15} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="section-title">
        <h2>Mis cursos</h2>
      </div>
      {courses.length === 0 && (
        <div className="empty-state course-empty-state">
          <strong>No tienes ramos vigentes en este período.</strong>
          <p>Las nuevas secciones aparecerán aquí cuando tu matrícula quede activa.</p>
        </div>
      )}
      <m.section
        animate="show"
        className="course-grid"
        initial={shouldReduceMotion ? "show" : "hidden"}
        variants={shouldReduceMotion ? undefined : stagger}
      >
        {courses.length === 0 && (
          <div className="course-empty-state">
            <ChalkboardTeacher aria-hidden="true" size={30} />
            <strong>No hay ramos activos en tu portal</strong>
            <p>
              {manageCourses
                ? "Crea una sección para comenzar a preparar el aula."
                : "Tus ramos aparecerán aquí cuando tu matrícula esté activa."}
            </p>
            {manageCourses && (
              <button className="primary-button" onClick={manageCourses} type="button">
                Administrar ramos
              </button>
            )}
          </div>
        )}
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            summary={activitySummaryByCourse.get(course.id)}
            shouldReduceMotion={Boolean(shouldReduceMotion)}
            onOpen={handleOpenCourse}
          />
        ))}
      </m.section>
      {archivedCourses.length > 0 && (
        <details className="archived-courses">
          <summary>
            <span>
              <Archive aria-hidden="true" size={20} weight="fill" />
              <strong>Ramos archivados</strong>
            </span>
            <small className="num">
              {archivedCourses.length} {archivedCourses.length === 1 ? "ramo" : "ramos"}
            </small>
          </summary>
          <div className="archived-course-list">
            {archivedCourses.map((course) => (
              <article className="archived-course-row" key={course.id}>
                <span
                  aria-hidden="true"
                  className="archived-course-tone"
                  style={{ "--course-tone": course.tone } as React.CSSProperties}
                />
                <div>
                  <strong>{course.name}</strong>
                  <small>
                    <span className="num">{course.code}</span> · {course.period} · Sección{" "}
                    <span className="num">{course.section}</span>
                  </small>
                </div>
                <button
                  aria-label={`Abrir en solo lectura el ramo ${course.name}`}
                  onClick={() => openCourse(course)}
                  type="button"
                >
                  Abrir en solo lectura <ArrowRight aria-hidden="true" size={15} />
                </button>
              </article>
            ))}
          </div>
          {archivedHasMore && (
            <button
              className="secondary-button archived-load-more"
              disabled={archivedLoading}
              onClick={onLoadMoreArchived}
              type="button"
            >
              {archivedLoading ? "Cargando historial…" : "Cargar más ramos"}
            </button>
          )}
        </details>
      )}
    </>
  );
}
