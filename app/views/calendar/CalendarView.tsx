"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  plannerItems,
  timeOfMinutes,
  weekDates,
} from "../../../lib/planner";
import type { PersonalEvent, PlannerItem } from "../../../lib/planner";
import {
  dayOf,
  getSantiagoDateISO,
  getSantiagoMinutes,
  weekdayOf,
} from "../../../lib/portal-utils";
import { MINUTE_SPAN, SLOT_HOURS } from "./calendar-constants";
import type { BlockDraft } from "./calendar-constants";
import { BlockDialog } from "./BlockDialog";
import { CalendarDayBar, CalendarFilters, CalendarHeader } from "./CalendarHeader";
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

  const goWeek = (date: string) => {
    setDir(date > days[0] ? 1 : date < days[0] ? -1 : 0);
    setAnchor(date);
  };

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
  const { dueCount, blockCount } = useMemo(() => {
    let due = 0;
    let block = 0;
    for (const item of visible) {
      if (item.startTime) block++;
      else due++;
    }
    return { dueCount: due, blockCount: block };
  }, [visible]);

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
      <CalendarHeader
        blockCount={blockCount}
        days={days}
        dueCount={dueCount}
        firstFreeHour={firstFreeHour}
        focusDay={focusDay}
        goWeek={goWeek}
        newBlock={newBlock}
        setPickedDay={setPickedDay}
        today={today}
      />

      <CalendarFilters
        courses={courses}
        hiddenCourses={hiddenCourses}
        toggleCourse={toggleCourse}
      />

      {alert && (
        <p className="planner-alert" role="status">
          {alert}
        </p>
      )}

      <CalendarDayBar days={days} focusDay={focusDay} setPickedDay={setPickedDay} today={today} />

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
