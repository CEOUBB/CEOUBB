"use client";

import { useCallback, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  Archive,
  ArrowRight,
  CalendarBlank,
  CalendarCheck,
  ChalkboardTeacher,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { AnimatedUnderline } from "@/components/motion/animated-underline-link";
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
  monthOf,
  nextEntry,
  weekdayOf,
} from "../../lib/portal-utils";
import type { CalendarEntry, User } from "../../lib/portal-utils";

const AGENDA_LATER_LIMIT = 3;

type AgendaItem = { entry: CalendarEntry; course: Course };

function AgendaMeta({
  course,
  weight,
  marked = false,
}: {
  course: string;
  weight?: number;
  marked?: boolean;
}) {
  return (
    <span className="agenda-meta">
      <span>
        {marked && <span aria-hidden="true" className="teacher-course-mark" />}
        {course}
      </span>
      {weight !== undefined && <span className="num">{weight}% de la nota</span>}
    </span>
  );
}

function DashboardAgenda({
  next,
  nextCourse,
  later,
  onCalendar,
  openCourse,
}: {
  next: CalendarEntry | null | undefined;
  nextCourse: Course | null | undefined;
  later: AgendaItem[];
  onCalendar: () => void;
  openCourse: (course: Course) => void;
}) {
  return (
    <section className="dashboard-section dashboard-agenda">
      <div className="section-title">
        <h2>En tu agenda</h2>
        <button className="agenda-calendar-link" onClick={onCalendar} type="button">
          <CalendarBlank size={16} aria-hidden="true" />
          Calendario
        </button>
      </div>
      {next ? (
        <div className="agenda-sheet">
          <article
            className="agenda-next"
            style={{ "--course-tone": next.tone } as React.CSSProperties}
          >
            <time className="agenda-leaf" dateTime={next.date}>
              <span>{weekdayOf(next.date)}</span>
              <b className="num">{dayOf(next.date)}</b>
              <span>{monthOf(next.date)}</span>
            </time>
            <div className="agenda-next-copy">
              <h3>{next.title ?? next.detail}</h3>
              <AgendaMeta course={next.course} weight={next.weight} />
            </div>
            <footer className="agenda-next-foot">
              <span className="agenda-count num" data-urgency={evaluationUrgency(next.date)}>
                {countdown(next.date)}
              </span>
              {nextCourse && (
                <button
                  aria-label={`Ir al ramo ${nextCourse.name}`}
                  className="agenda-open"
                  onClick={() => openCourse(nextCourse)}
                  type="button"
                >
                  <AnimatedUnderline>Ir al ramo</AnimatedUnderline>{" "}
                  <ArrowRight aria-hidden="true" size={15} />
                </button>
              )}
            </footer>
          </article>
          {later.length > 0 && (
            <ol aria-label="Siguientes evaluaciones" className="agenda-later">
              {later.map(({ entry, course }) => (
                <li key={entry.key} style={{ "--course-tone": entry.tone } as React.CSSProperties}>
                  <button
                    aria-label={`${entry.detail}, ${course.name}, ${countdown(entry.date)}`}
                    onClick={() => openCourse(course)}
                    type="button"
                  >
                    <time className="agenda-day" dateTime={entry.date}>
                      <span>{weekdayOf(entry.date)}</span>
                      <b className="num">{dayOf(entry.date)}</b>
                    </time>
                    <span className="agenda-later-copy">
                      <strong>{entry.title ?? entry.detail}</strong>
                      <AgendaMeta course={course.name} marked weight={entry.weight} />
                    </span>
                    <span className="agenda-count num" data-urgency={evaluationUrgency(entry.date)}>
                      {countdown(entry.date)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div className="pending-clear agenda-clear">
          <CalendarCheck aria-hidden="true" size={26} />
          <div>
            <h3>Espacio para organizarte</h3>
            <p>
              No hay evaluaciones próximas. Revisa tu calendario y reserva tiempo para estudiar.
            </p>
          </div>
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
  const [busqueda, setBusqueda] = useQueryState(
    "busqueda",
    parseAsString.withDefault("").withOptions({ shallow: true, throttleMs: 300 })
  );

  const next = nextEntry(entries);
  const nextCourse = next && courses.find((course) => course.id === next.courseId);
  const todayISO = getSantiagoDateISO();
  const later = useMemo(
    () =>
      entries
        .filter((entry) => entry !== next && entry.date >= todayISO)
        .flatMap((entry) => {
          const course = courses.find((item) => item.id === entry.courseId);
          return course ? [{ entry, course }] : [];
        })
        .slice(0, AGENDA_LATER_LIMIT),
    [entries, next, courses, todayISO]
  );
  const teaches = user.role === "teacher" || user.role === "owner";

  const displayedCourses = useMemo(() => {
    let list = courses;
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
  }, [courses, busqueda]);

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
            <label className="dashboard-filter">
              <MagnifyingGlass aria-hidden="true" size={16} />
              <input
                aria-label="Filtrar cursos"
                placeholder="Filtrar por ramo o código"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button aria-label="Limpiar filtro" type="button" onClick={() => setBusqueda("")}>
                  <X aria-hidden="true" size={14} weight="bold" />
                </button>
              )}
            </label>
          )}
          <div className="course-grid">
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
                        Administrar ramos <ArrowRight aria-hidden="true" size={15} />
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
                onOpen={handleOpenCourse}
              />
            ))}
          </div>
        </section>
        <DashboardAgenda
          later={later}
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
