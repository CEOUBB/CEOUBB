"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import { Course } from "../../../lib/courses";
import type { CourseActivity, CourseGradebook } from "../../../lib/firebase-classroom-client";
import {
  deletePersonalEvent,
  setPersonalEventCompleted,
  watchPersonalEvents,
} from "../../../lib/firebase-classroom-client";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DAY_START_MINUTES,
  dayItems,
  isIsoDate,
  plannerItems,
  shiftDate,
  timeOfMinutes,
  weekDates,
} from "../../../lib/planner";
import type { PersonalEvent, PlannerItem } from "../../../lib/planner";
import {
  dayOf,
  getSantiagoDateISO,
  getSantiagoMinutes,
  weekRangeLabel,
  weekdayOf,
} from "../../../lib/portal-utils";
import { MINUTE_SPAN, SLOT_HOURS } from "./calendar-constants";
import type { BlockDraft } from "./calendar-constants";
import { BlockDialog } from "./BlockDialog";
import { PlannerGrid } from "./PlannerGrid";
import { PlannerRibbon } from "./PlannerRibbon";

export function CalendarView({
  courses,
  gradebooks,
  activity,
  openCourse,
}: {
  courses: Course[];
  gradebooks: CourseGradebook[];
  activity: CourseActivity[];
  openCourse: (course: Course) => void;
}) {
  const today = getSantiagoDateISO();
  const [anchor, setAnchor] = useState(today);
  const [personal, setPersonal] = useState<PersonalEvent[]>([]);
  const [loadedWeek, setLoadedWeek] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [alert, setAlert] = useState("");
  const [pickedDay, setPickedDay] = useState(today);
  const [nowMinutes, setNowMinutes] = useState(() => getSantiagoMinutes());

  const [dir, setDir] = useState<number | null>(null);

  const days = useMemo(() => weekDates(anchor), [anchor]);
  const focusDay = days.includes(pickedDay) ? pickedDay : days.includes(today) ? today : days[0];

  /* Si la semana entrante sólo se funde, avanzar y retroceder se ven idénticos.
     El sentido del viaje alimenta la animación; queda nulo hasta la primera
     navegación para que el montaje no arrastre una entrada de más. */
  const goWeek = (date: string) => {
    setDir(date > days[0] ? 1 : date < days[0] ? -1 : 0);
    setAnchor(date);
  };

  /* Los bloques de la semana entrante tardan lo que tarde Firestore, y hasta que
     llegan `plannerItems` no encuentra ninguno: sin esta marca la rejilla anuncia
     «Tu semana está vacía» durante ese segundo y luego se desdice. */
  useEffect(
    () =>
      watchPersonalEvents(
        days[0],
        days[6],
        (events) => {
          setPersonal(events);
          setLoadedWeek(days[0]);
        },
        setAlert
      ),
    [days]
  );
  const weekLoaded = loadedWeek === days[0];

  /* La grilla arranca a las 08:00 y la hora útil suele estar más abajo. Al montar
     la semana la abrimos una hora antes de «ahora»; el callback sólo cambia de
     identidad al cambiar de semana, así que nunca roba el scroll al usuario. */
  const openGrid = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const target = days.includes(today) ? getSantiagoMinutes() - 60 : DAY_START_MINUTES;
      const ratio = (Math.max(target, DAY_START_MINUTES) - DAY_START_MINUTES) / MINUTE_SPAN;
      node.scrollTop = node.scrollHeight * ratio;
    },
    [days, today]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(getSantiagoMinutes()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(
    () =>
      plannerItems({
        courses,
        gradebooks,
        deadlines: activity.filter((post) => post.dueDate),
        personal,
        from: days[0],
        to: days[6],
      }),
    [courses, gradebooks, activity, personal, days]
  );

  const hiddenCourses = useMemo(() => new Set(hidden), [hidden]);
  const courseById = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses]
  );
  const visible = useMemo(
    () => items.filter((item) => !item.courseId || !hiddenCourses.has(item.courseId)),
    [items, hiddenCourses]
  );
  const byDay = useMemo(
    () => new Map(days.map((day) => [day, dayItems(visible, day)])),
    [days, visible]
  );
  const dueCount = visible.filter((item) => !item.startTime).length;
  const blockCount = visible.filter((item) => item.startTime).length;

  const toggleCourse = (courseId: string) =>
    setHidden((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]
    );

  const newBlock = (date: string, hour: number) =>
    setDraft({
      title: "",
      detail: "",
      date,
      startTime: timeOfMinutes(hour * 60),
      endTime: timeOfMinutes(Math.min(hour + 1, DAY_END_HOUR) * 60),
      courseId: "",
      kind: "study",
    });

  const editBlock = (item: PlannerItem) =>
    setDraft({
      id: item.id,
      title: item.title,
      detail: item.detail,
      date: item.date,
      startTime: item.startTime ?? timeOfMinutes(DAY_START_MINUTES),
      endTime: item.endTime ?? timeOfMinutes(DAY_START_MINUTES + 60),
      courseId: item.courseId ?? "",
      kind: item.kind === "personal" || item.kind === "task" ? item.kind : "study",
    });

  const toggleDone = (item: PlannerItem) => {
    const next = !item.completed;
    setPersonal((current) =>
      current.map((event) => (event.id === item.id ? { ...event, completed: next } : event))
    );
    setPersonalEventCompleted(item.id, next).catch(() => {
      setPersonal((current) =>
        current.map((event) => (event.id === item.id ? { ...event, completed: !next } : event))
      );
      setAlert("No se pudo guardar el estado del bloque.");
    });
  };

  /* Borrar desde la tarjeta ahorra abrir el diálogo, pero sigue pidiendo
     confirmación: no hay deshacer y el bloque se va de Firestore. La lista la
     corrige la suscripción, así que aquí no se toca el estado local. */
  const removeBlock = (item: PlannerItem) => {
    if (!window.confirm(`¿Eliminar “${item.title}”?`)) return;
    deletePersonalEvent(item.id).catch(() => setAlert("No se pudo eliminar el bloque."));
  };

  const firstFreeHour = Math.min(
    Math.max(Math.floor(nowMinutes / 60), DAY_START_HOUR),
    DAY_END_HOUR - 1
  );

  return (
    <section className="planner">
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

      {courses.length > 0 && (
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
      )}

      {alert && (
        <p className="planner-alert" role="status">
          {alert}
        </p>
      )}

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

      <div
        className="planner-frame"
        data-moved={dir === null ? undefined : "true"}
        style={
          {
            "--planner-rows": SLOT_HOURS.length,
            "--planner-dir": String(dir ?? 0),
          } as React.CSSProperties
        }
      >
        <div className="planner-head" key={days[0]}>
          <span className="planner-zone">GMT−4</span>
          {days.map((day) => (
            <div
              className="planner-headday"
              data-focus={day === focusDay ? "true" : undefined}
              data-today={day === today ? "true" : undefined}
              key={day}
            >
              <small>{weekdayOf(day)}</small>
              <b>{dayOf(day)}</b>
            </div>
          ))}
        </div>

        {dueCount > 0 && (
          <PlannerRibbon
            byDay={byDay}
            courseById={courseById}
            days={days}
            focusDay={focusDay}
            openCourse={openCourse}
          />
        )}

        <PlannerGrid
          blockCount={blockCount}
          byDay={byDay}
          days={days}
          firstFreeHour={firstFreeHour}
          focusDay={focusDay}
          nowMinutes={nowMinutes}
          onEditBlock={editBlock}
          onNewBlock={newBlock}
          onOpenGrid={openGrid}
          onRemoveBlock={removeBlock}
          onToggleDone={toggleDone}
          today={today}
          weekLoaded={weekLoaded}
        />
      </div>

      {draft && (
        <BlockDialog
          courses={courses}
          draft={draft}
          onClose={() => setDraft(null)}
          onFail={setAlert}
        />
      )}
    </section>
  );
}
