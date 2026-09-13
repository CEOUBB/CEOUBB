"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrashSimple, X } from "@phosphor-icons/react";
import { Course } from "../../../lib/courses";
import type { CourseActivity, CourseGradebook } from "../../../lib/firebase-classroom-client";
import {
  deletePersonalEvent,
  setPersonalEventCompleted,
  watchPersonalEvents,
  savePersonalEvent,
} from "../../../lib/firebase-classroom-client";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DAY_START_MINUTES,
  dayItems,
  plannerItems,
  timeOfMinutes,
  weekDates,
  monthDates,
} from "../../../lib/planner";
import type { PersonalEvent, PlannerItem } from "../../../lib/planner";
import {
  dayOf,
  getSantiagoDateISO,
  getSantiagoMinutes,
  weekdayOf,
} from "../../../lib/portal-utils";
import { SLOT_HOURS } from "./calendar-constants";
import type { BlockDraft } from "./calendar-constants";
import { BlockDialog } from "./BlockDialog";
import { CalendarDayBar, CalendarFilters, CalendarHeader } from "./CalendarHeader";
import { PlannerGrid } from "./PlannerGrid";
import { PlannerRibbon } from "./PlannerRibbon";
import { CalendarMonth } from "./CalendarMonth";

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
  const [view, setView] = useState<"week" | "month">("week");
  const [personal, setPersonal] = useState<PersonalEvent[]>([]);
  const [loadedWeek, setLoadedWeek] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [alert, setAlert] = useState("");
  const [notice, setNotice] = useState("");
  const [pickedDay, setPickedDay] = useState(today);
  const [nowMinutes, setNowMinutes] = useState(() => getSantiagoMinutes());

  const [dir, setDir] = useState<number | null>(null);

  const days = useMemo(
    () => (view === "month" ? monthDates(anchor) : weekDates(anchor)),
    [anchor, view]
  );
  const rangeKey = `${days[0]}/${days.at(-1)}`;
  const focusDay = days.includes(pickedDay) ? pickedDay : days.includes(today) ? today : days[0];

  const goWeek = (date: string) => {
    setDir(date > days[0] ? 1 : date < days[0] ? -1 : 0);
    setAnchor(date);
    setPickedDay(date);
    setAlert("");
  };

  useEffect(
    () =>
      watchPersonalEvents(
        days[0],
        days[days.length - 1],
        (events) => {
          setPersonal(events);
          setLoadedWeek(rangeKey);
        },
        setAlert
      ),
    [days, rangeKey]
  );
  const weekLoaded = loadedWeek === rangeKey;

  const openGrid = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    node.scrollTop = 0;
  }, []);

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
        personal: weekLoaded ? personal : [],
        from: days[0],
        to: days[days.length - 1],
      }),
    [courses, gradebooks, activity, personal, days, weekLoaded]
  );

  const hiddenCourses = useMemo(() => new Set(hidden), [hidden]);
  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    for (const course of courses) {
      map.set(course.id, course);
    }
    return map;
  }, [courses]);
  const visible = useMemo(
    () => items.filter((item) => !item.courseId || !hiddenCourses.has(item.courseId)),
    [items, hiddenCourses]
  );
  const byDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof dayItems>>();
    for (const day of days) {
      map.set(day, dayItems(visible, day));
    }
    return map;
  }, [days, visible]);
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

  const newBlock = (date: string, hour: number, endHour = Math.min(hour + 1, DAY_END_HOUR)) =>
    setDraft({
      title: "",
      detail: "",
      date,
      startTime: timeOfMinutes(hour * 60),
      endTime: timeOfMinutes(endHour * 60),
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
      kind:
        item.kind === "personal" || item.kind === "task" || item.kind === "clase"
          ? item.kind
          : "study",
    });

  const moveBlock = async (item: PlannerItem, date: string, startTime: string, endTime: string) => {
    if (item.source !== "user_personal") return;
    try {
      await savePersonalEvent({
        id: item.id,
        title: item.title,
        detail: item.detail,
        date,
        startTime,
        endTime,
        courseId: item.courseId,
        kind:
          item.kind === "personal" || item.kind === "task" || item.kind === "clase"
            ? item.kind
            : "study",
      });
      setNotice(`Bloque movido al ${date}, ${startTime}–${endTime}.`);
    } catch (cause) {
      setAlert(cause instanceof Error ? cause.message : "No se pudo mover el bloque.");
    }
  };

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

  const [blockPendingDelete, setBlockPendingDelete] = useState<PlannerItem | null>(null);

  const removeBlock = (item: PlannerItem) => {
    setBlockPendingDelete(item);
  };

  const confirmRemoveBlock = async () => {
    if (!blockPendingDelete) return;
    const target = blockPendingDelete;
    setBlockPendingDelete(null);
    try {
      await deletePersonalEvent(target.id);
    } catch {
      setAlert("No se pudo eliminar el bloque.");
    }
  };

  const firstFreeHour = Math.min(
    Math.max(Math.floor(nowMinutes / 60), DAY_START_HOUR),
    DAY_END_HOUR - 1
  );

  return (
    <section className="planner">
      <CalendarHeader
        view={view}
        anchor={anchor}
        setView={(next) => {
          setAnchor(focusDay);
          setPickedDay(focusDay);
          setView(next);
        }}
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
      <p className="sr-only" role="status">
        {notice}
      </p>

      {!weekLoaded && !alert && (
        <p className="planner-help" role="status">
          Sincronizando bloques…
        </p>
      )}

      {view === "month" ? (
        <CalendarMonth
          days={days}
          anchor={anchor}
          today={today}
          selected={focusDay}
          items={visible}
          onSelect={setPickedDay}
          onCreate={newBlock}
          onOpen={(item) => {
            if (item.source === "user_personal") editBlock(item);
            else {
              const course = item.courseId ? courseById.get(item.courseId) : undefined;
              if (course) openCourse(course);
            }
          }}
        />
      ) : (
        <>
          <CalendarDayBar
            days={days}
            focusDay={focusDay}
            setPickedDay={setPickedDay}
            today={today}
          />

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
              onMoveBlock={moveBlock}
              onNewBlock={newBlock}
              onOpenGrid={openGrid}
              onRemoveBlock={removeBlock}
              onToggleDone={toggleDone}
              today={today}
              weekLoaded={weekLoaded}
            />
          </div>
        </>
      )}

      {draft && (
        <BlockDialog
          courses={courses}
          draft={draft}
          onClose={() => setDraft(null)}
          onFail={setAlert}
        />
      )}

      {blockPendingDelete && (
        <dialog
          aria-labelledby="delete-dialog-title"
          className="planner-dialog publication-confirm-dialog"
          onCancel={() => setBlockPendingDelete(null)}
          onClose={() => setBlockPendingDelete(null)}
          ref={(dialog) => {
            if (dialog && !dialog.open) dialog.showModal();
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmRemoveBlock();
            }}
          >
            <header>
              <h2 id="delete-dialog-title">¿Eliminar bloque?</h2>
              <button aria-label="Cerrar" onClick={() => setBlockPendingDelete(null)} type="button">
                <X aria-hidden="true" size={16} weight="bold" />
              </button>
            </header>
            <p className="confirmation-message">
              ¿Eliminar “<strong>{blockPendingDelete.title}</strong>”? Esta acción no se puede
              deshacer.
            </p>
            <footer>
              <button
                className="planner-dialog-cancel"
                onClick={() => setBlockPendingDelete(null)}
                type="button"
              >
                Cancelar
              </button>
              <button className="confirmation-danger" type="submit">
                <TrashSimple aria-hidden="true" size={15} /> Eliminar
              </button>
            </footer>
          </form>
        </dialog>
      )}
    </section>
  );
}
