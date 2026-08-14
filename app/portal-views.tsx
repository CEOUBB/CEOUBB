"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Books, CaretLeft, CaretRight, Check, DeviceMobile, DownloadSimple, Plus, TrashSimple, X } from "@phosphor-icons/react";
import { Course, PERIOD } from "../lib/courses";
import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import { deletePersonalEvent, savePersonalEvent, setPersonalEventCompleted, watchPersonalEvents } from "../lib/firebase-classroom-client";
import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_HOUR,
  DAY_START_MINUTES,
  dayItems,
  isIsoDate,
  plannerItems,
  shiftDate,
  timeOfMinutes,
  validateBlock,
  weekDates,
} from "../lib/planner";
import type { PersonalEvent, PersonalEventKind, PlannerItem } from "../lib/planner";
import {
  APK_URL,
  countdown,
  dayOf,
  ease,
  firstName,
  getSantiagoDateISO,
  getSantiagoMinutes,
  loadAdminUsers,
  nextEntry,
  rise,
  roleLabel,
  shortDate,
  stagger,
  unseenCount,
  weekRangeLabel,
  weekdayOf,
} from "../lib/portal-utils";
import type { CalendarEntry, User } from "../lib/portal-utils";

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
        <h1>Bienvenid{user.name.trim().toLowerCase().endsWith("a") ? "a" : "o"}, {firstName(user.name)}</h1>
        <p>
          <span>Periodo <b>{PERIOD}</b></span>
          <span>·</span>
          <span><b>{courses.length}</b> ramos activos</span>
          <span>·</span>
          <span><b>{entries.length}</b> {entries.length === 1 ? "evaluación" : "evaluaciones"} en el calendario</span>
        </p>
      </section>
      {next && (
        <div className="next-strip" style={{ "--course-tone": next.tone } as React.CSSProperties}>
          <div className="next-strip-date">
            <span className="next-strip-day">{dayOf(next.date)}</span>
            <span className="next-strip-month">{shortDate(next.date).slice(3)}</span>
          </div>
          <div className="next-strip-body">
            <p className="next-strip-line">Próxima evaluación · <strong>{next.course}</strong></p>
            <p className="next-strip-detail">{next.detail}</p>
          </div>
          <div className="next-strip-end">
            <time className="next-strip-count" dateTime={next.date}>{countdown(next.date)}</time>
            {nextCourse && (
              <button className="next-strip-action" onClick={() => openCourse(nextCourse)} type="button">
                Ir al ramo <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="section-title"><h2>Mis cursos</h2></div>
      <m.section animate="show" className="course-grid" initial="hidden" variants={stagger}>
        {courses.map((course) => {
          const upcoming = entries.find((entry) => entry.courseId === course.id && entry.date >= todayISO);
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
                  {unseen > 0 && <span className="fresh">{unseen} {unseen === 1 ? "nueva" : "nuevas"}</span>}
                </div>
                <h3>{course.name}</h3>
                <p>{course.teacher}</p>
                <div className="course-meta">
                  <span>{total === 0 ? "Sin publicaciones aún" : `${total} ${total === 1 ? "publicación" : "publicaciones"}`}</span>
                  {upcoming
                    ? <time dateTime={upcoming.date}>{shortDate(upcoming.date)} · {upcoming.detail}</time>
                    : <span className="course-open">Material disponible</span>}
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

const SLOT_HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);
const HOUR_LINES = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index);
const MINUTE_SPAN = DAY_END_MINUTES - DAY_START_MINUTES;

const KIND_LABEL: Record<PersonalEventKind, string> = {
  study: "Estudio",
  personal: "Personal",
  task: "Tarea",
};

type BlockDraft = {
  id?: string;
  title: string;
  detail: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string;
  kind: PersonalEventKind;
};

function offsetOf(minutes: number): string {
  return `${((minutes - DAY_START_MINUTES) / MINUTE_SPAN) * 100}%`;
}

export function CalendarView({ courses, gradebooks, activity, openCourse }: {
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
  useEffect(() => watchPersonalEvents(days[0], days[6], (events) => {
    setPersonal(events);
    setLoadedWeek(days[0]);
  }, setAlert), [days]);
  const weekLoaded = loadedWeek === days[0];

  /* La grilla arranca a las 08:00 y la hora útil suele estar más abajo. Al montar
     la semana la abrimos una hora antes de «ahora»; el callback sólo cambia de
     identidad al cambiar de semana, así que nunca roba el scroll al usuario. */
  const openGrid = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const target = days.includes(today) ? getSantiagoMinutes() - 60 : DAY_START_MINUTES;
    const ratio = (Math.max(target, DAY_START_MINUTES) - DAY_START_MINUTES) / MINUTE_SPAN;
    node.scrollTop = node.scrollHeight * ratio;
  }, [days, today]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(getSantiagoMinutes()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(() => plannerItems({
    courses,
    gradebooks,
    deadlines: activity.filter((post) => post.dueDate),
    personal,
    from: days[0],
    to: days[6],
  }), [courses, gradebooks, activity, personal, days]);

  const hiddenCourses = useMemo(() => new Set(hidden), [hidden]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const visible = useMemo(
    () => items.filter((item) => !item.courseId || !hiddenCourses.has(item.courseId)),
    [items, hiddenCourses],
  );
  const byDay = useMemo(() => new Map(days.map((day) => [day, dayItems(visible, day)])), [days, visible]);
  const dueCount = visible.filter((item) => !item.startTime).length;
  const blockCount = visible.filter((item) => item.startTime).length;

  const toggleCourse = (courseId: string) =>
    setHidden((current) => current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]);

  const newBlock = (date: string, hour: number) => setDraft({
    title: "",
    detail: "",
    date,
    startTime: timeOfMinutes(hour * 60),
    endTime: timeOfMinutes(Math.min(hour + 1, DAY_END_HOUR) * 60),
    courseId: "",
    kind: "study",
  });

  const editBlock = (item: PlannerItem) => setDraft({
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
    setPersonal((current) => current.map((event) => event.id === item.id ? { ...event, completed: next } : event));
    setPersonalEventCompleted(item.id, next).catch(() => {
      setPersonal((current) => current.map((event) => event.id === item.id ? { ...event, completed: !next } : event));
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

  const firstFreeHour = Math.min(Math.max(Math.floor(nowMinutes / 60), DAY_START_HOUR), DAY_END_HOUR - 1);

  return (
    <section className="planner">
      <header className="page-head planner-bar">
        <div className="planner-lead">
          <h1>Calendario</h1>
          <p>
            <span>{weekRangeLabel(days[0], days[6])}</span>
            <span>·</span>
            <span><b>{dueCount}</b> {dueCount === 1 ? "entrega" : "entregas"}</span>
            <span>·</span>
            <span><b>{blockCount}</b> {blockCount === 1 ? "bloque" : "bloques"}</span>
          </p>
        </div>
        <div className="planner-controls">
          <div className="planner-step">
            <button aria-label="Semana anterior" onClick={() => goWeek(shiftDate(days[0], -7))} type="button"><CaretLeft size={16} weight="bold" /></button>
            <button className="planner-now-button" onClick={() => { goWeek(today); setPickedDay(today); }} type="button">Hoy</button>
            <button aria-label="Semana siguiente" onClick={() => goWeek(shiftDate(days[0], 7))} type="button"><CaretRight size={16} weight="bold" /></button>
          </div>
          <label className="planner-jump">
            <span className="sr-only">Ir a una fecha</span>
            <input onChange={(event) => isIsoDate(event.target.value) && goWeek(event.target.value)} type="date" value={days[0]} />
          </label>
          <button className="planner-create" onClick={() => newBlock(focusDay, firstFreeHour)} type="button">
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

      {alert && <p className="planner-alert" role="status">{alert}</p>}

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
        style={{ "--planner-rows": SLOT_HOURS.length, "--planner-dir": String(dir ?? 0) } as React.CSSProperties}
      >
        <div className="planner-head" key={days[0]}>
          <span className="planner-zone">GMT−4</span>
          {days.map((day) => (
            <div className="planner-headday" data-focus={day === focusDay ? "true" : undefined} data-today={day === today ? "true" : undefined} key={day}>
              <small>{weekdayOf(day)}</small>
              <b>{dayOf(day)}</b>
            </div>
          ))}
        </div>

        {dueCount > 0 && (
        <div className="planner-ribbon" key={`ribbon-${days[0]}`}>
          <span className="planner-ribbon-label">Entregas</span>
          {days.map((day) => {
            const ribbon = byDay.get(day)?.ribbon ?? [];
            return (
              <div className="planner-ribbon-cell" data-focus={day === focusDay ? "true" : undefined} key={day}>
                {ribbon.map((item) => {
                  const course = item.courseId ? courseById.get(item.courseId) : undefined;
                  return (
                    <button
                      className="planner-due"
                      data-kind={item.kind}
                      key={item.id}
                      onClick={() => course && openCourse(course)}
                      style={{ "--course-tone": item.tone } as React.CSSProperties}
                      title={`${item.title} · ${item.courseName ?? ""} · ${item.detail}`}
                      type="button"
                    >
                      <span aria-hidden="true" className="planner-due-dot" />
                      <span className="planner-due-title">{item.title}</span>
                      <small>{item.detail}</small>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        )}

        {/* La semana entrante se anima desde CSS: sin salida que esperar, la
            rejilla llega en el acto y el teclado no arrastra la navegación. */}
        <div className="planner-grid" key={`grid-${days[0]}`} ref={openGrid}>
            <div aria-hidden="true" className="planner-hours">
              {HOUR_LINES.map((hour) => (
                <span key={hour} style={{ top: offsetOf(hour * 60) }}>{timeOfMinutes(hour * 60)}</span>
              ))}
              {days.includes(today) && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES && (
                <b className="planner-hours-now" style={{ top: offsetOf(nowMinutes) }}>{timeOfMinutes(nowMinutes)}</b>
              )}
            </div>
            {days.map((day, index) => {
              const blocks = byDay.get(day)?.blocks ?? [];
              const isToday = day === today;
              return (
                <div
                  className="planner-col"
                  data-focus={day === focusDay ? "true" : undefined}
                  data-today={isToday ? "true" : undefined}
                  data-weekend={index > 4 ? "true" : undefined}
                  key={day}
                >
                  {isToday && nowMinutes > DAY_START_MINUTES && (
                    <div
                      aria-hidden="true"
                      className="planner-spent"
                      style={{ "--planner-spent": String((Math.min(nowMinutes, DAY_END_MINUTES) - DAY_START_MINUTES) / MINUTE_SPAN) } as React.CSSProperties}
                    />
                  )}
                  {SLOT_HOURS.map((hour) => (
                    <button
                      aria-label={`Crear un bloque el ${weekdayOf(day)} ${dayOf(day)} a las ${timeOfMinutes(hour * 60)}`}
                      className="planner-slot"
                      key={hour}
                      onClick={() => newBlock(day, hour)}
                      /* 91 celdas en el orden de tabulación entierran los bloques y el
                         diálogo; el teclado crea bloques desde «Nuevo bloque». */
                      tabIndex={-1}
                      type="button"
                    >
                      <Plus aria-hidden="true" size={13} weight="bold" />
                    </button>
                  ))}
                  {/* Guardar, borrar o esconder un ramo dejaba parpadear los bloques.
                      Ahora entran y salen, y el filtro se ve actuar. El montaje de
                      la semana queda mudo con `initial={false}`. */}
                  <AnimatePresence initial={false}>
                  {blocks.map((block) => (
                    <m.article
                      animate={{ opacity: 1, scale: 1 }}
                      className="planner-block"
                      data-done={block.completed ? "true" : undefined}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                      initial={{ opacity: 0, scale: 0.94 }}
                      key={block.id}
                      transition={{ duration: 0.2, ease }}
                      style={{
                        "--course-tone": block.tone,
                        top: offsetOf(block.startMinutes),
                        height: `${((block.endMinutes - block.startMinutes) / MINUTE_SPAN) * 100}%`,
                        left: `${(block.column / block.columns) * 100}%`,
                        width: `${100 / block.columns}%`,
                      } as React.CSSProperties}
                    >
                      <button
                        aria-label={block.completed ? `Marcar “${block.title}” como pendiente` : `Marcar “${block.title}” como hecho`}
                        aria-pressed={block.completed}
                        className="planner-check"
                        onClick={() => toggleDone(block)}
                        type="button"
                      >
                        <m.span
                          animate={{ scale: block.completed ? 1 : 0.2, opacity: block.completed ? 1 : 0 }}
                          transition={{ type: "spring", stiffness: 620, damping: 26 }}
                        >
                          <Check aria-hidden="true" size={10} weight="bold" />
                        </m.span>
                      </button>
                      <button className="planner-block-open" onClick={() => editBlock(block)} type="button">
                        <strong>{block.title}</strong>
                        <small>{block.startTime}–{block.endTime}{block.courseName ? ` · ${block.courseName}` : ` · ${KIND_LABEL[block.kind as PersonalEventKind] ?? ""}`}</small>
                      </button>
                      {block.source === "user_personal" && (
                        <button
                          aria-label={`Eliminar “${block.title}”`}
                          className="planner-block-remove"
                          onClick={() => removeBlock(block)}
                          type="button"
                        >
                          <X aria-hidden="true" size={10} weight="bold" />
                        </button>
                      )}
                    </m.article>
                  ))}
                  </AnimatePresence>
                  {isToday && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES && (
                    <div aria-hidden="true" className="planner-now" style={{ top: offsetOf(nowMinutes) }} />
                  )}
                </div>
              );
            })}
            {blockCount === 0 && weekLoaded && (
              <div className="planner-blank">
                <div>
                  <strong>Tu semana está vacía.</strong>
                  <p>Elige una hora y resérvala para estudiar. El calendario la recuerda y la sincroniza con las entregas de tus ramos.</p>
                  <button className="planner-create" onClick={() => newBlock(focusDay, firstFreeHour)} type="button">
                    <Plus size={15} weight="bold" /> Crear el primer bloque
                  </button>
                </div>
              </div>
            )}
        </div>
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

function BlockDialog({ draft, courses, onClose, onFail }: {
  draft: BlockDraft;
  courses: Course[];
  onClose: () => void;
  onFail: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(draft);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
    titleRef.current?.focus();
  }, []);

  const set = <Key extends keyof BlockDraft>(key: Key, value: BlockDraft[Key]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = validateBlock(values);
    if (invalid) return setProblem(invalid);
    setBusy(true);
    try {
      await savePersonalEvent({ ...values, courseId: values.courseId || null });
      onClose();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : "No se pudo guardar el bloque.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!values.id || !window.confirm(`¿Eliminar “${values.title}”?`)) return;
    try {
      await deletePersonalEvent(values.id);
      onClose();
    } catch {
      onFail("No se pudo eliminar el bloque.");
    }
  };

  return (
    <dialog aria-labelledby="planner-dialog-title" className="planner-dialog" onCancel={onClose} onClose={onClose} ref={dialogRef}>
      <form onSubmit={submit}>
        <header>
          <h2 id="planner-dialog-title">{values.id ? "Editar bloque" : "Nuevo bloque"}</h2>
          <button aria-label="Cerrar" onClick={onClose} type="button"><X size={16} weight="bold" /></button>
        </header>
        <label>Título<input maxLength={120} onChange={(event) => set("title", event.target.value)} placeholder="Estudiar EDO" ref={titleRef} required value={values.title} /></label>
        <div className="planner-dialog-row">
          <label>Ramo
            <select onChange={(event) => set("courseId", event.target.value)} value={values.courseId}>
              <option value="">Sin ramo</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </label>
          <label>Tipo
            <select onChange={(event) => set("kind", event.target.value as PersonalEventKind)} value={values.kind}>
              {(Object.keys(KIND_LABEL) as PersonalEventKind[]).map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
            </select>
          </label>
        </div>
        <div className="planner-dialog-row three">
          <label>Fecha<input onChange={(event) => set("date", event.target.value)} required type="date" value={values.date} /></label>
          <label>Desde<input onChange={(event) => set("startTime", event.target.value)} required step={900} type="time" value={values.startTime} /></label>
          <label>Hasta<input onChange={(event) => set("endTime", event.target.value)} required step={900} type="time" value={values.endTime} /></label>
        </div>
        <label>Detalle opcional<textarea maxLength={400} onChange={(event) => set("detail", event.target.value)} rows={2} value={values.detail} /></label>
        {problem && <p className="planner-dialog-error" role="alert">{problem}</p>}
        <footer>
          {values.id && <button className="planner-dialog-delete" onClick={remove} type="button"><TrashSimple size={15} /> Eliminar</button>}
          <button className="planner-dialog-cancel" onClick={onClose} type="button">Cancelar</button>
          <button className="planner-dialog-save" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar bloque"}</button>
        </footer>
      </form>
    </dialog>
  );
}

/* ── Recursos de estudio ──────────────────────────────────────
   Marcas de terceros dibujadas como vectores de 24×24 (trazados de
   simple-icons, CC0). Se guardan como datos y no como componentes sueltos
   para que el hub agregue plataformas sin tocar el marcado.
   ─────────────────────────────────────────────────────────── */

type BrandPath = { d: string; fill: string };

const INK = "#0f172a";

const BRAND: Record<string, BrandPath[]> = {
  chatgpt: [{ fill: "#10a37f", d: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" }],
  claude: [{ fill: "#d97757", d: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" }],
  gemini: [{ fill: "#4285f4", d: "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" }],
  deepseek: [{ fill: "#4d6bfe", d: "M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45" }],
  kimi: [{ fill: INK, d: "M21.765.351C22.998.351 24 1.353 24 2.586S22.998 4.82 21.765 4.82h-1.974c-.15 0-.26-.12-.26-.26V2.586A2.237 2.237 0 0 1 21.765.35M9.41 13.388l8.447-8.377c.16-.16.07-.471-.14-.471h-4.55s-.1.02-.14.06l-9.099 9.029c-.14.14-.35.02-.35-.21V4.81c0-.15-.1-.27-.221-.27H.22c-.12 0-.22.12-.22.27v18.57c0 .15.1.27.22.27h3.137c.12 0 .22-.12.22-.27v-3.79c0-.08.03-.16.08-.21l2.826-2.796c.07-.07.16-.08.241-.03l7.546 5.551a8.9 8.9 0 0 0 4.018 1.493c.12.01.23-.11.23-.27V19.76c0-.14-.08-.25-.19-.26a5.8 5.8 0 0 1-2.355-.942l-6.533-4.73c-.14-.09-.15-.32-.03-.441" }],
  qwen: [{ fill: "#615ced", d: "M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z" }],
  github: [{ fill: "#181717", d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" }],
  notion: [{ fill: INK, d: "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" }],
  microsoft: [
    { fill: "#f25022", d: "M0 0v11.408h11.408V0z" },
    { fill: "#7fba00", d: "M12.594 0v11.408H24V0z" },
    { fill: "#00a4ef", d: "M0 12.594V24h11.408V12.594z" },
    { fill: "#ffb900", d: "M12.594 12.594V24H24V12.594z" },
  ],
  autodesk: [{ fill: INK, d: "m.129 20.202 14.7-9.136h7.625c.235 0 .445.188.445.445 0 .21-.092.305-.21.375l-7.222 4.323c-.47.283-.633.845-.633 1.265l-.008 2.725H24V4.362a.561.561 0 0 0-.585-.562h-8.752L0 12.893V20.2h.129z" }],
  spotify: [{ fill: "#1db954", d: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" }],
  applemusic: [{ fill: "#fa243c", d: "M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z" }],
  moodle: [{ fill: "#f98012", d: "M12 0C5.3726 0 0 5.3726 0 12s5.3726 12 12 12 12-5.3726 12-12S18.6274 0 12 0Zm1.1348 5.7402.0351.123-2.7363 1.9903c.3694.2606.7968.609 1.0078.8438l.0762.1035c-1.2878 2.2571-3.737 3.0557-6.3164 2.1816l.0195-.1601h-.002c-.0784-.5679-.0962-1.0524-.0585-1.463-.7507-.003-1.5298-.0402-2.2832-.0663l-.5157.0175c-.0994.8449-.0351 2.135-.0254 2.3223.3492 1.2819.2977 2.2907.295 3.5293-.4134-1.0028-.8995-2.097-.416-3.4668l-.0098-.3183c-.0007-.0143-.0683-1.1532.037-2.0625l-.4081.0136-.0371-.1191C5.7922 6.8402 8.5032 6.218 13.1348 5.7402Zm1.623 2.5137c1.2202 0 2.1885.2691 2.9043.8066.8138.601 1.2207 1.4866 1.2207 2.6582v5.6856h-2.7344v-5.3691c0-1.1225-.4634-1.6836-1.3906-1.6836-.9278 0-1.3906.561-1.3906 1.6836v5.3691h-2.7344v-5.3691c0-.5183-.0986-.9144-.293-1.1934.6172-.435 1.1534-1.0124 1.5723-1.7246.0297.029.0597.0574.0879.0879.5044-.6349 1.4233-.9512 2.7578-.9512zm-9.6094 3.2344c.932.3 1.8614.393 2.7364.287a3.5455 3.5455 0 0 0-.0098.2599v5.3691H5.1426v-5.6855c0-.0787.0022-.1544.0058-.2305z" }],
  youtubemusic: [{ fill: "#ff0000", d: "M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" }],
};

type Brand = keyof typeof BRAND;
type LinkItem = { brand: Brand; name: string; note: string; url: string; mark?: string; check?: string };

const AI_TIERS: { id: string; label: string; mark?: string; tone: "free" | "plan"; tools: LinkItem[] }[] = [
  {
    id: "gratis",
    label: "100% gratis",
    tone: "free",
    tools: [
      { brand: "deepseek", name: "DeepSeek", note: "Razonamiento paso a paso en matemáticas, física y código.", url: "https://chat.deepseek.com" },
      { brand: "qwen", name: "Qwen", note: "Multilingüe, con lectura de imágenes y documentos.", url: "https://chat.qwen.ai" },
    ],
  },
  {
    id: "plan",
    label: "Plan gratuito",
    mark: "*",
    tone: "plan",
    tools: [
      { brand: "chatgpt", name: "ChatGPT", mark: "**", note: "Conversación general, borradores y explicaciones guiadas.", url: "https://chatgpt.com" },
      { brand: "claude", name: "Claude", note: "Escritura académica larga y análisis de documentos.", url: "https://claude.ai" },
      { brand: "gemini", name: "Google Gemini", note: "Integrado con Drive, Docs y el correo institucional.", url: "https://gemini.google.com" },
      { brand: "kimi", name: "Kimi", note: "Contexto largo: resume guías, papers y apuntes completos.", url: "https://www.kimi.com" },
    ],
  },
];

const PERKS: LinkItem[] = [
  { brand: "github", name: "GitHub Student Developer Pack", note: "GitHub Copilot Pro y la suite completa de JetBrains sin costo mientras estudies.", url: "https://education.github.com/pack", check: "Verificación de estudiante en GitHub Education" },
  { brand: "notion", name: "Notion Plus para Educación", note: "Bloques y almacenamiento de archivos ilimitados para apuntes y proyectos.", url: "https://www.notion.com/product/notion-for-education", check: "Se activa con el correo @alumnos.ubiobio.cl" },
  { brand: "microsoft", name: "Microsoft 365 Educación UBB", note: "Office descargable en 5 PC o Mac, más OneDrive con tu cuenta institucional.", url: "https://www.microsoft365.com", check: "Inicio de sesión con la cuenta UBB" },
  { brand: "autodesk", name: "Autodesk Education", note: "AutoCAD, Revit, Fusion 360 e Inventor con licencia educativa gratuita.", url: "https://www.autodesk.com/education/edu-software", check: "Verificación educativa de Autodesk" },
  { brand: "spotify", name: "Spotify Premium Estudiantes", note: "Tarifa estudiante de $2.700 CLP al mes mientras dure la verificación.", url: "https://www.spotify.com/cl/student/", check: "Verificación externa vía SheerID" },
  { brand: "applemusic", name: "Apple Music Estudiantes", note: "Tarifa reducida con Apple TV+ incluido durante la carrera.", url: "https://www.apple.com/cl/apple-music/", check: "Verificación externa vía UNiDAYS" },
  { brand: "youtubemusic", name: "YouTube Music y Premium Estudiantes", note: "Música y videos sin anuncios, con reproducción en segundo plano.", url: "https://www.youtube.com/premium/student", check: "Verificación externa vía SheerID" },
];

/* Cada servicio lleva su propia marca cuando la tiene (Moodle como vector,
   Adecca como imagen); el resto usa el escudo UBB, que es su identidad real. */
const UBB_PORTALS: { name: string; host: string; url: string; brand?: Brand; image?: string }[] = [
  { name: "Intranet Alumnos UBB", host: "intranet.ubiobio.cl", url: "https://intranet.ubiobio.cl" },
  { name: "Adecca UBB", host: "adecca.ubiobio.cl", url: "https://adecca.ubiobio.cl", image: "/brand/adecca-mark.webp" },
  { name: "Moodle UBB", host: "moodle.ubiobio.cl", url: "https://moodle.ubiobio.cl", brand: "moodle" },
  { name: "Biblioteca Central Werken", host: "werken.ubiobio.cl", url: "https://werken.ubiobio.cl/", image: "/brand/werken-mark.webp" },
  { name: "Portal Institucional UBB", host: "ubiobio.cl", url: "https://www.ubiobio.cl" },
];

function BrandMark({ brand }: { brand: Brand }) {
  return (
    <svg aria-hidden="true" className="brand-mark" focusable="false" viewBox="0 0 24 24">
      {BRAND[brand].map((path) => <path d={path.d} fill={path.fill} key={path.d} />)}
    </svg>
  );
}

export function ResourcesView() {
  return (
    <m.section animate="show" className="resources-hub" initial="hidden" variants={stagger}>
      <div className="page-head lead">
        <h1>Recursos de estudio</h1>
        <p><span>Biblioteca colaborativa, asistentes de inteligencia artificial y beneficios con tu correo institucional, para cualquier carrera de la Universidad del Bío-Bío.</span></p>
      </div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title"><h2>Ecosistema CEOUBB</h2></div>
        <div className="resource-layout">
          <m.a className="resource-card" href="/biblioteca/index.html" whileHover={{ y: -1 }}>
            <span className="resource-icon"><Books size={22} /></span>
            <h3>Biblioteca académica</h3>
            <p>Banco colaborativo de certámenes, controles y apuntes que la comunidad va sumando período a período.</p>
            <ul className="resource-points">
              <li><Check size={15} weight="bold" /> Evaluaciones completas con puntaje y tiempo real de aplicación.</li>
              <li><Check size={15} weight="bold" /> Pautas desarrolladas paso a paso, no sólo la alternativa correcta.</li>
              <li><Check size={15} weight="bold" /> Abierta a todas las facultades: se amplía con lo que aportan estudiantes y docentes.</li>
            </ul>
            <b>Abrir biblioteca <ArrowRight size={14} /></b>
          </m.a>
          <div className="resource-card">
            <span className="resource-icon"><DeviceMobile size={22} /></span>
            <h3>CEOUBB Móvil</h3>
            <p>La biblioteca de estudio viaja contigo y funciona sin conexión.</p>
            <div className="store-badges" role="group" aria-label="Aplicaciones móviles próximamente disponibles">
              <div className="store-badge">
                <Image alt="App Store" height={1284} src="/brand/app-store-badge-es.webp" width={3840} />
              </div>
              <div className="store-badge">
                <Image alt="Google Play" height={675} src="/brand/google-play-badge-es.webp" width={2214} />
              </div>
            </div>
            <em>Publicación en tiendas en preparación. Mientras tanto, el APK de Android está disponible.</em>
            <a className="resource-inline" href={APK_URL}><DownloadSimple size={15} /> Descargar APK para Android</a>
          </div>
        </div>
      </m.div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title"><h2>Asistentes de inteligencia artificial</h2></div>
        {AI_TIERS.map((tier) => (
          <div className="ai-tier" key={tier.id}>
            <h3 className={`tier-label ${tier.tone}`}>{tier.label}{tier.mark && <sup>{tier.mark}</sup>}</h3>
            <ul className="brand-grid">
              {tier.tools.map((tool) => (
                <li key={tool.name}>
                  <a className="brand-tile" href={tool.url} rel="noreferrer noopener" target="_blank">
                    <span className="brand-head">
                      <BrandMark brand={tool.brand} />
                      <b>{tool.name}{tool.mark && <sup>{tool.mark}</sup>}</b>
                      <ArrowUpRight className="brand-go" size={14} />
                    </span>
                    <small>{tool.note}</small>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="resource-notes">
          <p className="resource-note"><sup>*</sup> Los planes gratuitos tienen cuotas de uso. Al agotarlas hay que esperar a que se reinicien o pasar a un plan de pago; ninguno de estos servicios es provisto por CEOUBB.</p>
          <p className="resource-note"><sup>**</sup> En ChatGPT la conversación con los modelos base es ilimitada y no requiere suscripción. Las cuotas afectan sólo a los modelos avanzados y a las funciones adicionales.</p>
        </div>
      </m.div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title"><h2>Beneficios con tu correo institucional</h2></div>
        <p className="resource-note">Disponibles para cuentas @alumnos.ubiobio.cl. Cada servicio mantiene su propia verificación de estudiante: CEOUBB sólo indica dónde solicitarla.</p>
        <ul className="perk-list">
          {PERKS.map((perk) => (
            <li key={perk.name}>
              <a className="perk-row" href={perk.url} rel="noreferrer noopener" target="_blank">
                <span className="perk-mark"><BrandMark brand={perk.brand} /></span>
                <span>
                  <b>{perk.name}</b>
                  <small>{perk.note}</small>
                  <em>{perk.check}</em>
                </span>
                <ArrowUpRight className="brand-go" size={16} />
              </a>
            </li>
          ))}
        </ul>
      </m.div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title"><h2>Portales y servicios oficiales UBB</h2></div>
        <div className="portal-panel">
          <p>Sistemas administrados por la Universidad del Bío-Bío. CEOUBB es una plataforma estudiantil independiente y no los reemplaza.</p>
          <ul className="portal-links">
            {UBB_PORTALS.map((portal) => (
              <li key={portal.host}>
                <a className="portal-link" href={portal.url} rel="noreferrer noopener" target="_blank">
                  <span className="portal-mark">
                    {portal.brand && <BrandMark brand={portal.brand} />}
                    {portal.image && <Image alt="" aria-hidden="true" height={128} src={portal.image} width={128} />}
                    {!portal.brand && !portal.image && <Image alt="" aria-hidden="true" height={594} src="/brand/ubb-shield.webp" width={388} />}
                  </span>
                  <span className="portal-copy"><b>{portal.name}</b><small>{portal.host}</small></span>
                  <ArrowUpRight className="brand-go" size={14} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </m.div>
    </m.section>
  );
}

export function AdminView() {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [message, setMessage] = useState("");

  const refreshAccounts = useCallback(async () => {
    const list = await loadAdminUsers();
    setAccounts(list);
  }, []);

  useEffect(() => {
    let active = true;
    loadAdminUsers()
      .then((users) => {
        if (active) setAccounts(users);
      })
      .catch(() => {
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeRole = async (userId: string, role: "teacher" | "student") => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      setMessage(response.ok ? "Rol actualizado." : "No fue posible actualizar el rol.");
      if (response.ok) {
        await refreshAccounts();
      }
    } catch {
      setMessage("No fue posible actualizar el rol.");
    }
  };

  return (
    <section>
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        <p>
          <span><b>{accounts.length}</b> {accounts.length === 1 ? "cuenta registrada" : "cuentas registradas"}</span>
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>
      <div className="admin-table">
        <div className="admin-head">
          <span>Cuenta</span>
          <span>Rango</span>
          <span>Acción</span>
        </div>
        {accounts.length === 0 && (
          <p className="empty-row">Todavía no hay cuentas institucionales registradas.</p>
        )}
        {accounts.map((account) => (
          <div className="admin-row" key={account.id}>
            <span>
              <b>{account.name}</b>
              <small>{account.email}</small>
            </span>
            <span className={`role-chip ${account.role}`}>{roleLabel(account.role)}</span>
            <span>
              {account.role !== "owner" && (
                <select
                  aria-label={`Cambiar rango de ${account.name}`}
                  value={account.role}
                  onChange={(event) => changeRole(account.id, event.target.value as "teacher" | "student")}
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor UBB</option>
                </select>
              )}
            </span>
          </div>
        ))}
      </div>
      {message && (
        <p className={`tool-status ${message.startsWith("Rol actualizado") ? "ok" : "bad"}`} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
