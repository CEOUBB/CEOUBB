"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Course } from "../../../lib/courses";
import type { CourseActivity, CourseGradebook } from "../../../lib/firebase-classroom-client";
import { DAY_END_HOUR, DAY_START_HOUR, shiftDate, stepDate } from "../../../lib/planner";
import type { CalendarView as View, PlannerItem } from "../../../lib/planner";
import { getSantiagoDateISO, getSantiagoMinutes } from "../../../lib/portal-utils";
import {
  VIEWS,
  compactViewport,
  draftFor,
  draftOf,
  rangeTitle,
  rectOf,
  useCompactViewport,
} from "./calendar-constants";
import type { AnchorRect, BlockDraft } from "./calendar-constants";
import { useBlockActions, useCalendarData, useShortcutKeys } from "./calendar-hooks";
import { BlockDialog } from "./BlockDialog";
import { DeleteBlockDialog, ShortcutsPopover } from "./CalendarDialogs";
import { CalendarHeader, CalendarToolbar } from "./CalendarHeader";
import { CalendarPopover } from "./CalendarPopover";
import { CalendarSide, CourseFilters, Upcoming } from "./CalendarSide";
import { CalendarStage } from "./CalendarStage";
import { ItemPeek } from "./ItemPeek";
import { MiniMonth } from "./MiniMonth";
import type { PendingRange } from "./PlannerColumn";
import { QuickCreate } from "./QuickCreate";

const VIEW_KEY = "ceoubb:calendar-view";
const SIDE_KEY = "ceoubb:calendar-side";

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function initialView(): View {
  const stored = VIEWS.find((option) => option.id === readStored(VIEW_KEY));
  return stored?.id ?? (compactViewport() ? "day" : "week");
}

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
  const [view, setView] = useState<View>(initialView);
  const [date, setDate] = useState(today);
  const [direction, setDirection] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [quick, setQuick] = useState<{ range: PendingRange; anchor: AnchorRect } | null>(null);
  const [peek, setPeek] = useState<{ item: PlannerItem; anchor: AnchorRect } | null>(null);
  const [picker, setPicker] = useState<AnchorRect | null>(null);
  const [shortcuts, setShortcuts] = useState<AnchorRect | null>(null);
  const [sideOpen, setSideOpen] = useState(() => readStored(SIDE_KEY) !== "closed");
  const [pendingDelete, setPendingDelete] = useState<PlannerItem | null>(null);
  const [alert, setAlert] = useState("");
  const [notice, setNotice] = useState("");
  const [nowMinutes, setNowMinutes] = useState(getSantiagoMinutes);
  const shortcutsButton = useRef<HTMLButtonElement>(null);
  const compact = useCompactViewport();
  const hiddenCourses = useMemo(() => new Set(hidden), [hidden]);
  const { days, loadDays, loaded, items, marks, upcoming, byDay, tones, summary, setCompleted } =
    useCalendarData({
      courses,
      gradebooks,
      activity,
      view,
      date,
      today,
      hidden: hiddenCourses,
      onError: setAlert,
    });
  const { reschedule, toggleDone, remove } = useBlockActions({
    onError: setAlert,
    onNotice: setNotice,
    setCompleted,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(getSantiagoMinutes()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const peekCourse = peek?.item.courseId
    ? courses.find((course) => course.id === peek.item.courseId)
    : undefined;
  const nowHour = Math.min(Math.max(Math.floor(nowMinutes / 60), DAY_START_HOUR), DAY_END_HOUR - 1);
  const defaultHour = (day: string) =>
    day === today
      ? Math.min(Math.max(Math.ceil(nowMinutes / 60), DAY_START_HOUR), DAY_END_HOUR - 1)
      : 9;

  const goTo = (next: string) => {
    setDirection(next > date ? 1 : next < date ? -1 : 0);
    setDate(next);
    setAlert("");
  };
  const step = (sign: 1 | -1) => goTo(stepDate(view, date, sign));
  const changeView = (next: View) => {
    store(VIEW_KEY, next);
    setDirection(0);
    setView(next);
  };
  const openDay = (day: string) => {
    goTo(day);
    changeView("day");
  };
  const toggleSide = () => {
    store(SIDE_KEY, sideOpen ? "closed" : "open");
    setSideOpen(!sideOpen);
  };
  const toggleCourse = (courseId: string) =>
    setHidden((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]
    );

  const newBlock = (day = date) => {
    const hour = defaultHour(day);
    setDraft(draftFor(day, hour * 60, Math.min(hour + 1, DAY_END_HOUR) * 60));
  };

  // Implements: REQ-CEO72-06
  const createAt = (day: string, start: number, end: number, anchor: AnchorRect) => {
    setPeek(null);
    if (compact) setDraft(draftFor(day, start, end));
    else setQuick({ range: { day, start, end }, anchor });
  };

  const openItem = (item: PlannerItem, anchor: AnchorRect) => {
    if (item.source === "user_personal") setDraft(draftOf(item));
    else setPeek({ item, anchor });
  };

  const openUpcoming = (item: PlannerItem, anchor: AnchorRect) => {
    setPicker(null);
    goTo(item.date);
    setPeek({ item, anchor });
  };

  const plan = (item: PlannerItem) => {
    const day = item.date > today ? shiftDate(item.date, -1) : today;
    const hour = defaultHour(day);
    setPeek(null);
    setPicker(null);
    setDraft({
      ...draftFor(day, hour * 60, Math.min(hour + 1, DAY_END_HOUR) * 60),
      title: `Preparar ${item.title}`.slice(0, 120),
      courseId: item.courseId ?? "",
    });
  };

  useShortcutKeys((key) => {
    const option = VIEWS.find((entry) => entry.key === key);
    if (option) changeView(option.id);
    else if (key === "t") goTo(today);
    else if (key === "j") step(1);
    else if (key === "k") step(-1);
    else if (key === "c") newBlock();
    else if (key === "?" && shortcutsButton.current) setShortcuts(rectOf(shortcutsButton.current));
    else return false;
    return true;
  });

  return (
    <section className="planner" data-side={sideOpen ? "open" : "closed"} data-view={view}>
      <CalendarHeader
        loaded={loaded}
        onCreate={() => newBlock()}
        onShortcuts={setShortcuts}
        shortcutsRef={shortcutsButton}
        summary={summary}
      />

      {alert && (
        <p className="planner-alert" role="status">
          {alert}
        </p>
      )}
      <p className="sr-only" role="status">
        {notice}
      </p>

      <div className="planner-body">
        <CalendarToolbar
          onPicker={setPicker}
          onStep={step}
          onToday={() => goTo(today)}
          onToggleSide={toggleSide}
          onView={changeView}
          pickerOpen={picker !== null}
          sideOpen={sideOpen}
          title={rangeTitle(view, days, date, compact)}
          view={view}
        />
        <div className="planner-columns">
          <CalendarSide
            courses={courses}
            hidden={hiddenCourses}
            marks={marks}
            onOpenItem={openUpcoming}
            onPick={goTo}
            onPlan={plan}
            onToggleCourse={toggleCourse}
            range={view === "week" ? days : []}
            selected={date}
            showUpcoming={view !== "agenda"}
            today={today}
            upcoming={upcoming}
          />
          <CalendarStage
            byDay={byDay}
            date={date}
            days={days}
            direction={direction}
            firstFreeHour={nowHour}
            items={items}
            loadDays={loadDays}
            loaded={loaded}
            nowMinutes={nowMinutes}
            onCreate={createAt}
            onEdit={(item) => setDraft(draftOf(item))}
            onGoTo={goTo}
            onMove={reschedule}
            onNewBlock={newBlock}
            onOpenDay={openDay}
            onOpenItem={openItem}
            onRemove={setPendingDelete}
            onStep={step}
            onToggleDone={toggleDone}
            pending={quick?.range ?? null}
            today={today}
            tones={tones}
            view={view}
          />
        </div>
      </div>

      {quick && (
        <QuickCreate
          anchor={quick.anchor}
          courses={courses}
          onClose={() => setQuick(null)}
          onMore={(values) => {
            setQuick(null);
            setDraft(values);
          }}
          range={quick.range}
        />
      )}

      {peek && (
        <ItemPeek
          anchor={peek.anchor}
          item={peek.item}
          onClose={() => setPeek(null)}
          onOpenCourse={peekCourse ? () => openCourse(peekCourse) : undefined}
          onPlan={() => plan(peek.item)}
        />
      )}

      {picker && (
        <CalendarPopover
          anchor={picker}
          className="planner-picker"
          label="Elegir fecha"
          onClose={() => setPicker(null)}
        >
          <MiniMonth
            marks={marks}
            onPick={(day) => {
              setPicker(null);
              goTo(day);
            }}
            range={view === "week" ? days : []}
            selected={date}
            today={today}
          />
          <Upcoming items={upcoming} onOpen={openUpcoming} onPlan={plan} />
          <CourseFilters courses={courses} hidden={hiddenCourses} onToggle={toggleCourse} />
        </CalendarPopover>
      )}

      {shortcuts && <ShortcutsPopover anchor={shortcuts} onClose={() => setShortcuts(null)} />}

      {draft && (
        <BlockDialog
          courses={courses}
          draft={draft}
          onClose={() => setDraft(null)}
          onFail={setAlert}
        />
      )}

      {pendingDelete && (
        <DeleteBlockDialog
          item={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            setPendingDelete(null);
            void remove(pendingDelete);
          }}
        />
      )}
    </section>
  );
}
