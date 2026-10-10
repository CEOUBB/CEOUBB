"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrashSimple, X } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import type { CourseActivity, CourseGradebook } from "../../../lib/firebase-classroom-client";
import {
  deletePersonalEvent,
  savePersonalEvent,
  setPersonalEventCompleted,
  watchPersonalEvents,
} from "../../../lib/firebase-classroom-client";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  dayItems,
  plannerItems,
  shiftDate,
  stepDate,
  timeOfMinutes,
  viewDates,
  weekDates,
} from "../../../lib/planner";
import type { CalendarView as View, PersonalEvent, PlannerItem } from "../../../lib/planner";
import { getSantiagoDateISO, getSantiagoMinutes } from "../../../lib/portal-utils";
import {
  VIEWS,
  compactViewport,
  isPersonalKind,
  longDate,
  rangeTitle,
  useCompactViewport,
} from "./calendar-constants";
import type { AnchorRect, BlockDraft } from "./calendar-constants";
import { BlockDialog } from "./BlockDialog";
import { CalendarAgenda } from "./CalendarAgenda";
import { CalendarHeader, CalendarToolbar, DayStrip } from "./CalendarHeader";
import { CalendarMonth } from "./CalendarMonth";
import { CalendarPopover } from "./CalendarPopover";
import { CalendarSide, CourseFilters, Upcoming } from "./CalendarSide";
import { ItemPeek } from "./ItemPeek";
import { MiniMonth } from "./MiniMonth";
import { PlannerGrid } from "./PlannerGrid";
import type { PendingRange } from "./PlannerGrid";
import { QuickCreate } from "./QuickCreate";

const VIEW_KEY = "ceoubb:calendar-view";
const SIDE_KEY = "ceoubb:calendar-side";
const UPCOMING_DAYS = 28;
const UPCOMING_LIMIT = 8;
const ALL_TIME = { from: "0000-01-01", to: "9999-12-31" };

const SHORTCUTS: [string, string][] = [
  ["T", "Ir a hoy"],
  ["J", "Período siguiente"],
  ["K", "Período anterior"],
  ["D", "Vista de día"],
  ["S", "Vista de semana"],
  ["M", "Vista de mes"],
  ["A", "Agenda"],
  ["C", "Nuevo bloque"],
  ["?", "Mostrar estos atajos"],
];

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

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function draftFor(day: string, start: number, end: number): BlockDraft {
  return {
    title: "",
    detail: "",
    date: day,
    startTime: timeOfMinutes(start),
    endTime: timeOfMinutes(end),
    courseId: "",
    kind: "study",
  };
}

function draftOf(item: PlannerItem): BlockDraft {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail,
    date: item.date,
    startTime: item.startTime ?? "",
    endTime: item.endTime ?? "",
    courseId: item.courseId ?? "",
    kind: isPersonalKind(item.kind) ? item.kind : "study",
  };
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
  const [personal, setPersonal] = useState<PersonalEvent[]>([]);
  const [loadedRange, setLoadedRange] = useState("");
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

  const days = useMemo(() => viewDates(view, date), [view, date]);
  const loadDays = useMemo(() => (view === "day" ? weekDates(date) : days), [view, date, days]);
  const from = loadDays[0];
  const to = loadDays[loadDays.length - 1];
  const rangeKey = `${from}/${to}`;
  const loaded = loadedRange === rangeKey;

  useEffect(
    () =>
      watchPersonalEvents(
        from,
        to,
        (events) => {
          setPersonal(events);
          setLoadedRange(`${from}/${to}`);
        },
        setAlert
      ),
    [from, to]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(getSantiagoMinutes()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const deadlines = useMemo(() => activity.filter((post) => post.dueDate), [activity]);
  const hiddenCourses = useMemo(() => new Set(hidden), [hidden]);
  const courseById = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses]
  );

  const items = useMemo(
    () =>
      plannerItems({
        courses,
        gradebooks,
        deadlines,
        personal: loaded ? personal : [],
        from,
        to,
      }).filter((item) => !item.courseId || !hiddenCourses.has(item.courseId)),
    [courses, gradebooks, deadlines, personal, loaded, from, to, hiddenCourses]
  );

  const academic = useMemo(
    () =>
      plannerItems({ courses, gradebooks, deadlines, personal: [], ...ALL_TIME }).filter(
        (item) => !item.courseId || !hiddenCourses.has(item.courseId)
      ),
    [courses, gradebooks, deadlines, hiddenCourses]
  );
  const marks = useMemo(() => new Set(academic.map((item) => item.date)), [academic]);
  const upcoming = useMemo(() => {
    const horizon = shiftDate(today, UPCOMING_DAYS);
    return academic
      .filter((item) => item.date >= today && item.date <= horizon)
      .slice(0, UPCOMING_LIMIT);
  }, [academic, today]);

  const byDay = useMemo(
    () => new Map(loadDays.map((day) => [day, dayItems(items, day)])),
    [loadDays, items]
  );
  const tones = useMemo(
    () =>
      new Map(
        loadDays.map((day) => {
          const entry = byDay.get(day);
          return [
            day,
            [...(entry?.ribbon ?? []), ...(entry?.blocks ?? [])].map((item) => item.tone),
          ];
        })
      ),
    [loadDays, byDay]
  );

  const first = days[0];
  const last = days[days.length - 1];
  const inView = items.filter((item) => item.date >= first && item.date <= last);
  const evaluations = inView.filter((item) => item.kind === "evaluation").length;
  const deliveries = inView.filter((item) => item.kind === "deadline").length;
  const blocks = inView.length - evaluations - deliveries;
  const summary =
    [
      evaluations > 0 && plural(evaluations, "evaluación", "evaluaciones"),
      deliveries > 0 && plural(deliveries, "entrega", "entregas"),
      blocks > 0 && plural(blocks, "bloque", "bloques"),
    ]
      .filter(Boolean)
      .join(" · ") || "Sin actividades en este período";

  const peekCourse = peek?.item.courseId ? courseById.get(peek.item.courseId) : undefined;
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

  const reschedule = async (item: PlannerItem, day: string, startTime: string, endTime: string) => {
    try {
      await savePersonalEvent({
        ...draftOf(item),
        courseId: item.courseId,
        date: day,
        startTime,
        endTime,
      });
      setNotice(`“${item.title}” queda el ${longDate(day)}, de ${startTime} a ${endTime}.`);
    } catch (cause) {
      setAlert(cause instanceof Error ? cause.message : "No se pudo mover el bloque.");
    }
  };

  const toggleDone = (item: PlannerItem) => {
    const next = !item.completed;
    const mark = (completed: boolean) =>
      setPersonal((current) =>
        current.map((event) => (event.id === item.id ? { ...event, completed } : event))
      );
    mark(next);
    setPersonalEventCompleted(item.id, next).catch(() => {
      mark(!next);
      setAlert("No se pudo guardar el estado del bloque.");
    });
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deletePersonalEvent(target.id);
    } catch {
      setAlert("No se pudo eliminar el bloque.");
    }
  };

  // Implements: REQ-CEO72-08 — atajos de una tecla fuera de campos, diálogos y popovers.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [popover]"))
      )
        return;
      if (document.querySelector("dialog[open], [popover]:popover-open")) return;
      const key = event.key.toLowerCase();
      const option = VIEWS.find((entry) => entry.key === key);
      if (option) changeView(option.id);
      else if (key === "t") goTo(today);
      else if (key === "j") step(1);
      else if (key === "k") step(-1);
      else if (key === "c") newBlock();
      else if (key === "?" && shortcutsButton.current) {
        const { left, top, width, height } = shortcutsButton.current.getBoundingClientRect();
        setShortcuts({ left, top, width, height });
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          <div className="planner-stage">
            {view === "day" && (
              <DayStrip
                days={loadDays}
                direction={direction}
                onPick={goTo}
                onSwipe={(sign) => goTo(shiftDate(date, 7 * sign))}
                selected={date}
                today={today}
                tones={tones}
              />
            )}
            {view === "month" ? (
              <CalendarMonth
                anchor={date}
                days={days}
                direction={direction}
                items={items}
                onCreate={newBlock}
                onOpen={openItem}
                onOpenDay={(day) => {
                  goTo(day);
                  changeView("day");
                }}
                onSelect={goTo}
                onSwipe={step}
                onToggleDone={toggleDone}
                selected={date}
                today={today}
              />
            ) : view === "agenda" ? (
              <CalendarAgenda
                days={days}
                items={items}
                onOpen={openItem}
                onToggleDone={toggleDone}
                today={today}
              />
            ) : (
              <PlannerGrid
                byDay={byDay}
                days={days}
                direction={direction}
                firstFreeHour={nowHour}
                focusDay={date}
                loaded={loaded}
                nowMinutes={nowMinutes}
                onCreate={createAt}
                onEdit={(item) => setDraft(draftOf(item))}
                onMove={reschedule}
                onOpenItem={openItem}
                onPickDay={(day) => {
                  goTo(day);
                  changeView("day");
                }}
                onRemove={setPendingDelete}
                onResize={(item, endTime) =>
                  reschedule(item, item.date, item.startTime ?? "", endTime)
                }
                onSwipe={step}
                onToggleDone={toggleDone}
                pending={quick?.range ?? null}
                today={today}
              />
            )}
          </div>
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

      {shortcuts && (
        <CalendarPopover
          anchor={shortcuts}
          className="planner-shortcuts"
          label="Atajos de teclado"
          onClose={() => setShortcuts(null)}
        >
          <h2>Atajos de teclado</h2>
          <dl>
            {SHORTCUTS.map(([key, action]) => (
              <div key={key}>
                <dt>
                  <kbd>{key}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </CalendarPopover>
      )}

      {draft && (
        <BlockDialog
          courses={courses}
          draft={draft}
          onClose={() => setDraft(null)}
          onFail={setAlert}
        />
      )}

      {pendingDelete && (
        <dialog
          aria-labelledby="delete-dialog-title"
          className="planner-dialog publication-confirm-dialog"
          onCancel={() => setPendingDelete(null)}
          onClose={() => setPendingDelete(null)}
          ref={(dialog) => {
            if (dialog && !dialog.open) dialog.showModal();
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirmRemove();
            }}
          >
            <header>
              <h2 id="delete-dialog-title">¿Eliminar bloque?</h2>
              <button aria-label="Cerrar" onClick={() => setPendingDelete(null)} type="button">
                <X aria-hidden="true" size={16} weight="bold" />
              </button>
            </header>
            <p className="confirmation-message">
              ¿Eliminar “<strong>{pendingDelete.title}</strong>”? Esta acción no se puede deshacer.
            </p>
            <footer>
              <button
                className="planner-dialog-cancel"
                onClick={() => setPendingDelete(null)}
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
