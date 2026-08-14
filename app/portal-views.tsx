"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ArrowRight, ArrowUpRight, Books, CaretLeft, CaretRight, Check, DownloadSimple, Plus, Robot, TrashSimple, X } from "@phosphor-icons/react";
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
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [alert, setAlert] = useState("");
  const [pickedDay, setPickedDay] = useState(today);
  const [nowMinutes, setNowMinutes] = useState(() => getSantiagoMinutes());

  const days = useMemo(() => weekDates(anchor), [anchor]);
  const focusDay = days.includes(pickedDay) ? pickedDay : days.includes(today) ? today : days[0];

  useEffect(() => watchPersonalEvents(days[0], days[6], setPersonal, setAlert), [days]);

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
            <button aria-label="Semana anterior" onClick={() => setAnchor(shiftDate(days[0], -7))} type="button"><CaretLeft size={16} weight="bold" /></button>
            <button className="planner-now-button" onClick={() => { setAnchor(today); setPickedDay(today); }} type="button">Hoy</button>
            <button aria-label="Semana siguiente" onClick={() => setAnchor(shiftDate(days[0], 7))} type="button"><CaretRight size={16} weight="bold" /></button>
          </div>
          <label className="planner-jump">
            <span className="sr-only">Ir a una fecha</span>
            <input onChange={(event) => isIsoDate(event.target.value) && setAnchor(event.target.value)} type="date" value={days[0]} />
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

      <div className="planner-frame" style={{ "--planner-rows": SLOT_HOURS.length } as React.CSSProperties}>
        <div className="planner-head">
          <span className="planner-zone">GMT−4</span>
          {days.map((day) => (
            <div className="planner-headday" data-focus={day === focusDay ? "true" : undefined} data-today={day === today ? "true" : undefined} key={day}>
              <small>{weekdayOf(day)}</small>
              <b>{dayOf(day)}</b>
            </div>
          ))}
        </div>

        <div className="planner-ribbon">
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

        <AnimatePresence initial={false} mode="wait">
          <m.div
            animate={{ opacity: 1 }}
            className="planner-grid"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={days[0]}
            transition={{ duration: 0.14, ease }}
          >
            <div aria-hidden="true" className="planner-hours">
              {HOUR_LINES.map((hour) => (
                <span key={hour} style={{ top: offsetOf(hour * 60) }}>{timeOfMinutes(hour * 60)}</span>
              ))}
            </div>
            {days.map((day) => {
              const blocks = byDay.get(day)?.blocks ?? [];
              const isToday = day === today;
              return (
                <div className="planner-col" data-focus={day === focusDay ? "true" : undefined} data-today={isToday ? "true" : undefined} key={day}>
                  {SLOT_HOURS.map((hour) => (
                    <button
                      aria-label={`Crear un bloque el ${weekdayOf(day)} ${dayOf(day)} a las ${timeOfMinutes(hour * 60)}`}
                      className="planner-slot"
                      key={hour}
                      onClick={() => newBlock(day, hour)}
                      type="button"
                    >
                      <Plus aria-hidden="true" size={13} weight="bold" />
                    </button>
                  ))}
                  {blocks.map((block) => (
                    <m.article
                      className="planner-block"
                      data-done={block.completed ? "true" : undefined}
                      initial={false}
                      key={block.id}
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
                    </m.article>
                  ))}
                  {isToday && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES && (
                    <div aria-hidden="true" className="planner-now" style={{ top: offsetOf(nowMinutes) }} />
                  )}
                </div>
              );
            })}
            {blockCount === 0 && (
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
          </m.div>
        </AnimatePresence>
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

export function ResourcesView({ courses }: { courses: Course[] }) {
  return (
    <section>
      <div className="page-head lead">
        <h1>Recursos de estudio</h1>
        <p><span>La biblioteca académica cubre los <b>{courses.length}</b> ramos del periodo. La app y el tutor son apoyos complementarios.</span></p>
      </div>
      <m.div animate="show" className="resource-layout" initial="hidden" variants={stagger}>
        <m.a className="resource-primary" href="/biblioteca/index.html" transition={{ duration: 0.45, ease }} variants={rise} whileHover={{ y: -1 }}>
          <span className="resource-icon"><Books size={22} /></span>
          <h2>Biblioteca académica</h2>
          <p>Evaluaciones largas con puntaje, tiempo y pauta desarrollada.</p>
          <ul className="coverage-list">
            {courses.map((course) => (
              <li key={course.id} style={{ "--course-tone": course.tone } as React.CSSProperties}>
                <span>{course.name}</span>
                <small>{course.code}</small>
              </li>
            ))}
          </ul>
          <b>Abrir biblioteca <ArrowRight size={14} /></b>
        </m.a>
        <m.a className="resource-aside" href={APK_URL} transition={{ duration: 0.45, ease }} variants={rise} whileHover={{ y: -1 }}>
          <span className="resource-icon"><DownloadSimple size={22} /></span>
          <h2>App para Android</h2>
          <p>Instala el APK y consulta la biblioteca sin conexión.</p>
          <em>Versión 1.0.6 · Android 8 o superior</em>
          <b>Descargar <ArrowRight size={14} /></b>
        </m.a>
        <m.a className="resource-aside" href="https://chatgpt.com" rel="noreferrer" target="_blank" transition={{ duration: 0.45, ease }} variants={rise} whileHover={{ y: -1 }}>
          <span className="resource-icon"><Robot size={22} /></span>
          <h2>Tutor con inteligencia artificial</h2>
          <p>Resuelve dudas puntuales con el contexto del ramo a mano.</p>
          <em>Enlace externo a ChatGPT</em>
          <b>Abrir tutor <ArrowUpRight size={14} /></b>
        </m.a>
      </m.div>
    </section>
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
