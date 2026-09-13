"use client";

import { useCallback, useMemo } from "react";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import {
  Archive,
  ArrowRight,
  CalendarBlank,
  ChalkboardTeacher,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { courseStates } from "../../lib/search-params";
import { CourseCard } from "./CourseCard";
import { EmptyState } from "./classroom/EmptyState";
import { Course, PERIOD } from "../../lib/courses";
import type { CourseActivity } from "../../lib/firebase-classroom-client";
import {
  countdown,
  dayOf,
  evaluationUrgency,
  firstName,
  getSantiagoDateISO,
  nextEntry,
  shortDate,
  stagger,
  weekdayOf,
} from "../../lib/portal-utils";
import type { CalendarEntry, User } from "../../lib/portal-utils";

function DashboardAgenda({
  next,
  nextCourse,
  onCalendar,
  openCourse,
}: {
  next: CalendarEntry | null | undefined;
  nextCourse: Course | null | undefined;
  onCalendar: () => void;
  openCourse: (course: Course) => void;
}) {
  return (
    <section className="dashboard-section dashboard-agenda">
      <div className="section-title">
        <h2>En tu agenda</h2>
        <CalendarBlank size={20} aria-hidden="true" />
      </div>
      {next ? (
        <article
          className="next-eval"
          style={{ "--course-tone": next.tone } as React.CSSProperties}
        >
          <time className="next-eval-date" dateTime={next.date}>
            <span className="next-eval-weekday">{weekdayOf(next.date)}</span>
            <span className="next-eval-day num">{dayOf(next.date)}</span>
            <span className="next-eval-month">{shortDate(next.date).slice(3)}</span>
          </time>
          <h3 className="next-eval-title">{next.detail}</h3>
          <p className="next-eval-meta">
            <span className="next-eval-course">
              <span aria-hidden="true" className="next-eval-dot" />
              {next.course}
            </span>
            {nextCourse && (
              <>
                <span aria-hidden="true">·</span>
                <span className="num">{nextCourse.code}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Sección <span className="num">{nextCourse.section}</span>
                </span>
              </>
            )}
          </p>
          <span className="next-eval-count num" data-urgency={evaluationUrgency(next.date)}>
            {countdown(next.date)}
          </span>
          {nextCourse && (
            <button
              aria-label={`Ir al ramo ${nextCourse.name}`}
              className="next-eval-action"
              onClick={() => openCourse(nextCourse)}
              type="button"
            >
              Ir al ramo <ArrowRight aria-hidden="true" size={15} />
            </button>
          )}
        </article>
      ) : (
        <div className="agenda-clear">
          <h3>Espacio para organizarte</h3>
          <p>No hay evaluaciones próximas. Revisa tu calendario y reserva tiempo para estudiar.</p>
          <button className="empty-state-action" onClick={onCalendar} type="button">
            Abrir calendario <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

function ArchivedCoursesSection({
  archivedCourses,
  archivedHasMore,
  archivedLoading,
  onLoadMoreArchived,
  openCourse,
}: {
  archivedCourses: Course[];
  archivedHasMore: boolean;
  archivedLoading: boolean;
  onLoadMoreArchived: () => void;
  openCourse: (course: Course) => void;
}) {
  if (archivedCourses.length === 0) return null;

  return (
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
  );
}

// Implements: REQ-URL-01, REQ-URL-02
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
  onCalendar,
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
  onCalendar: () => void;
  openCourse: (course: Course) => void;
  onLoadMoreArchived: () => void;
}) {
  const [filtro] = useQueryState(
    "filtro",
    parseAsStringLiteral(courseStates).withDefault("todos").withOptions({ shallow: true })
  );
  const [busqueda, setBusqueda] = useQueryState(
    "busqueda",
    parseAsString.withDefault("").withOptions({ shallow: true, throttleMs: 300 })
  );

  const next = nextEntry(entries);
  const nextCourse = next && courses.find((course) => course.id === next.courseId);
  const todayISO = getSantiagoDateISO();
  const teaches = user.role === "teacher" || user.role === "owner";
  const shouldReduceMotion = useReducedMotion();

  const displayedCourses = useMemo(() => {
    let list = filtro === "archivado" ? archivedCourses : courses;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, archivedCourses, filtro, busqueda]);

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
      <section className="page-head lead dashboard-heading">
        <div>
          <h1>Hola, {firstName(user.name)}</h1>
          {/* La línea de contexto es la del rol que mira. Un docente no tiene
            carrera ni rinde evaluaciones: esos dos datos ocupaban sitio sin
            decirle nada. Lo suyo son las secciones que dicta este período. */}
          <p>
            {teaches ? (
              <span>
                <b className="num">{courses.length}</b>{" "}
                {courses.length === 1 ? "sección a tu cargo" : "secciones a tu cargo"}
              </span>
            ) : (
              <span>{user.carrera?.trim() ? user.carrera.trim() : "Tu espacio de estudio"}</span>
            )}
            <span>·</span>
            <span>
              Periodo <b className="num">{courses[0]?.periodId ?? PERIOD}</b>
            </span>
            {!teaches && (
              <>
                <span>·</span>
                <span>
                  <b className="num">{entries.length}</b>{" "}
                  {entries.length === 1 ? "evaluación" : "evaluaciones"} en el calendario
                </span>
              </>
            )}
          </p>
        </div>
      </section>
      <div className="dashboard-workspace">
        <section className="dashboard-section dashboard-courses">
          <div className="section-title">
            <h2>Mis cursos</h2>
            <span className="section-count num">
              {displayedCourses.length} {displayedCourses.length === 1 ? "sección" : "secciones"}
            </span>
          </div>
          {courses.length > 2 && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[oklch(0.92_0.006_60)] bg-white/70 px-3 py-1.5 backdrop-blur-sm">
              <MagnifyingGlass
                aria-hidden="true"
                size={15}
                className="text-[oklch(0.5_0.03_250)]"
              />
              <input
                aria-label="Filtrar cursos"
                className="w-full bg-transparent text-xs text-[oklch(0.2_0.03_260)] placeholder:text-[oklch(0.55_0.03_250)] outline-none border-0 ring-0 focus:outline-none focus:ring-0"
                placeholder="Filtrar por ramo o código…"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  aria-label="Limpiar filtro"
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="text-[oklch(0.5_0.03_250)] hover:text-[oklch(0.2_0.03_260)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <m.div
            animate="show"
            className="course-grid"
            initial={shouldReduceMotion ? "show" : "hidden"}
            variants={shouldReduceMotion ? undefined : stagger}
          >
            {courses.length === 0 && (
              <div className="course-empty-state">
                <EmptyState
                  icon={ChalkboardTeacher}
                  title={
                    manageCourses
                      ? "Todavía no administras ningún ramo"
                      : "No tienes ramos vigentes en este período"
                  }
                  description={
                    manageCourses
                      ? "Crea una sección para preparar su aula, publicar material y abrir el libro de notas."
                      : "Tus secciones aparecerán aquí en cuanto tu matrícula quede activa."
                  }
                  action={
                    manageCourses ? (
                      <button className="empty-state-action" onClick={manageCourses} type="button">
                        Administrar ramos <ArrowRight size={15} />
                      </button>
                    ) : undefined
                  }
                />
              </div>
            )}
            {displayedCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                summary={activitySummaryByCourse.get(course.id)}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
                onOpen={handleOpenCourse}
              />
            ))}
          </m.div>
        </section>
        <DashboardAgenda
          next={next}
          nextCourse={nextCourse}
          onCalendar={onCalendar}
          openCourse={openCourse}
        />
      </div>
      <ArchivedCoursesSection
        archivedCourses={archivedCourses}
        archivedHasMore={archivedHasMore}
        archivedLoading={archivedLoading}
        onLoadMoreArchived={onLoadMoreArchived}
        openCourse={openCourse}
      />
    </>
  );
}
