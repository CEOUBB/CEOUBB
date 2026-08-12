"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Books, DownloadSimple, Robot } from "@phosphor-icons/react";
import { Course, PERIOD } from "../lib/courses";
import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import { ease, rise, roleLabel, stagger } from "./portal-ui";
import type { User } from "./portal-ui";

export const APK_URL = "https://drive.google.com/uc?export=download&id=16gs-qhzTujmFqf_zgGsVfqBq2QJEbYak";

export type CalendarEntry = {
  key: string;
  courseId: string;
  course: string;
  detail: string;
  date: string;
  tone: string;
};

export function calendarEntries(courses: Course[], gradebooks: CourseGradebook[]): CalendarEntry[] {
  const entries = courses.flatMap((course) => {
    const dated = gradebooks.find((entry) => entry.courseId === course.id)?.items.filter((item) => item.date) ?? [];
    const source = dated.length > 0
      ? dated.map((item) => ({ id: item.id, name: `${item.name} · ${item.weight}% de la nota`, date: item.date }))
      : course.evaluations;
    return source.map((item) => ({ key: `${course.id}-${item.id}`, courseId: course.id, course: course.name, detail: item.name, date: item.date, tone: course.tone }));
  });
  return entries.sort((first, second) => first.date.localeCompare(second.date));
}

export function nextEntry(entries: CalendarEntry[]) {
  const today = new Date().toISOString().slice(0, 10);
  return entries.find((entry) => entry.date >= today) ?? entries[entries.length - 1] ?? null;
}

function unseenCount(activity: CourseActivity[], courseId: string, seenAt: string | undefined) {
  return activity.filter((item) => item.courseId === courseId && (!seenAt || item.createdAt > seenAt)).length;
}

export function CoursesDashboard({ user, courses, activity, seen, entries, openCourse }: { user: User; courses: Course[]; activity: CourseActivity[]; seen: Record<string, string>; entries: CalendarEntry[]; openCourse: (course: Course) => void }) {
  const next = nextEntry(entries);
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <h1>Bienvenid{user.name.trim().toLowerCase().endsWith("a") ? "a" : "o"}, {firstName(user.name)}</h1>
          <p>Periodo {PERIOD} · {courses.length} ramos activos</p>
        </div>
        {next && (
          <div className="next-card" style={{ "--course-tone": next.tone } as React.CSSProperties}>
            <span className="eyebrow">Próxima evaluación</span>
            <strong>{next.course}</strong>
            <small>{next.detail}</small>
            <time dateTime={next.date}>{longDate(next.date)}</time>
          </div>
        )}
      </section>
      <div className="section-title"><h2>Mis cursos</h2><a href="/biblioteca/index.html">Ir al banco completo <ArrowRight size={14} /></a></div>
      <motion.section animate="show" className="course-grid" initial="hidden" variants={stagger}>
        {courses.map((course) => {
          const upcoming = entries.find((entry) => entry.courseId === course.id && entry.date >= new Date().toISOString().slice(0, 10));
          const total = activity.filter((item) => item.courseId === course.id).length;
          const unseen = unseenCount(activity, course.id, seen[course.id]);
          return (
            <motion.article
              className="course-card"
              key={course.id}
              style={{ "--course-tone": course.tone } as React.CSSProperties}
              transition={{ duration: 0.45, ease }}
              variants={rise}
              whileHover={{ y: -3 }}
            >
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
              <button className="course-action" onClick={() => openCourse(course)} type="button">Entrar al aula <ArrowRight size={15} /></button>
            </motion.article>
          );
        })}
      </motion.section>
      <section className="panel-navy download-banner">
        <div>
          <h2>Lleva Centro de Estudio UBB contigo</h2>
          <p>La biblioteca de estudio y el aula, disponibles sin conexión en tu teléfono.</p>
          <a className="apk-link" href={APK_URL}><DownloadSimple size={17} />Descargar para Android</a>
        </div>
        <div className="store-badges" role="group" aria-label="Aplicaciones móviles próximamente disponibles">
          <div className="store-badge"><img src="/brand/google-play-badge-es.webp" alt="Google Play" /></div>
          <div className="store-badge"><img src="/brand/app-store-badge-es.webp" alt="App Store" /></div>
        </div>
      </section>
    </>
  );
}

export function CalendarView({ courses, entries }: { courses: Course[]; entries: CalendarEntry[] }) {
  const next = nextEntry(entries);
  return (
    <section>
      <div className="dashboard-hero">
        <div>
          <h1>Calendario académico</h1>
          <p>{entries.length} {entries.length === 1 ? "evaluación" : "evaluaciones"} · Periodo {PERIOD}</p>
        </div>
      </div>
      <div className="calendar-layout">
        <motion.div animate="show" className="timeline" initial="hidden" variants={stagger}>
          {entries.length === 0 && <div className="empty-state"><strong>Todavía no hay evaluaciones cargadas.</strong><p>Aparecen aquí en cuanto un docente publica la ponderación de su ramo con fechas.</p></div>}
          {entries.map((item, index) => (
            <Fragment key={item.key}>
              {(index === 0 || monthOf(item.date) !== monthOf(entries[index - 1].date)) && (
                <motion.h2 className="timeline-month" transition={{ duration: 0.4, ease }} variants={rise}>{monthLabel(item.date)}</motion.h2>
              )}
              <motion.article
                className={item.key === next?.key ? "upcoming" : ""}
                style={{ "--course-tone": item.tone } as React.CSSProperties}
                transition={{ duration: 0.45, ease }}
                variants={rise}
              >
                <time dateTime={item.date}><b>{dayOf(item.date)}</b><span>{monthOf(item.date)}</span></time>
                <div>
                  <strong>{item.course}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className="timeline-when">
                  {item.key === next?.key && <b className="upcoming-flag">Próxima</b>}
                  {countdown(item.date)}
                </span>
              </motion.article>
            </Fragment>
          ))}
        </motion.div>
        <aside className="period-courses">
          <strong>Ramos del periodo</strong>
          <ul>
            {courses.map((course) => (
              <li key={course.id} style={{ "--course-tone": course.tone } as React.CSSProperties}>
                <span>{course.name}</span>
                <small>{course.code}</small>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

export function ResourcesView({ courses }: { courses: Course[] }) {
  return (
    <section>
      <div className="dashboard-hero">
        <div>
          <h1>Recursos de estudio</h1>
          <p>El banco de certámenes cubre los {courses.length} ramos del periodo. La app y el tutor son apoyos complementarios.</p>
        </div>
      </div>
      <motion.div animate="show" className="resource-layout" initial="hidden" variants={stagger}>
        <motion.a className="resource-primary" href="/biblioteca/index.html" transition={{ duration: 0.45, ease }} variants={rise} whileHover={{ y: -3 }}>
          <span className="resource-icon"><Books size={22} /></span>
          <h2>Banco de certámenes</h2>
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
        </motion.a>
        <motion.a className="resource-aside" href={APK_URL} transition={{ duration: 0.45, ease }} variants={rise} whileHover={{ y: -3 }}>
          <span className="resource-icon"><DownloadSimple size={22} /></span>
          <h2>App para Android</h2>
          <p>Instala el APK y consulta la biblioteca sin conexión.</p>
          <em>Versión 1.0.6 · Android 8 o superior</em>
          <b>Descargar <ArrowRight size={14} /></b>
        </motion.a>
        <motion.a className="resource-aside" href="https://chatgpt.com" rel="noreferrer" target="_blank" transition={{ duration: 0.45, ease }} variants={rise} whileHover={{ y: -3 }}>
          <span className="resource-icon"><Robot size={22} /></span>
          <h2>Tutor con inteligencia artificial</h2>
          <p>Resuelve dudas puntuales con el contexto del ramo a mano.</p>
          <em>Enlace externo a ChatGPT</em>
          <b>Abrir tutor <ArrowUpRight size={14} /></b>
        </motion.a>
      </motion.div>
    </section>
  );
}

export function AdminView() {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(() => fetch("/api/admin/users", { cache: "no-store" }).then((response) => response.json()).then((data) => setAccounts(data.users ?? [])), []);
  useEffect(() => { load().catch(() => undefined); }, [load]);
  const changeRole = async (userId: string, role: "teacher" | "student") => {
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    setMessage(response.ok ? "Rol actualizado." : "No fue posible actualizar el rol.");
    if (response.ok) await load();
  };
  return <section><div className="dashboard-hero"><div><h1>Administración de cuentas</h1><p>{accounts.length} {accounts.length === 1 ? "cuenta registrada" : "cuentas registradas"} · el rango se asigna por dominio institucional</p></div></div><div className="admin-table"><div className="admin-head"><span>Cuenta</span><span>Rango</span><span>Acción</span></div>{accounts.length === 0 && <p className="empty-row">Todavía no hay cuentas institucionales registradas.</p>}{accounts.map((account) => <div className="admin-row" key={account.id}><span><b>{account.name}</b><small>{account.email}</small></span><span className={`role-chip ${account.role}`}>{roleLabel(account.role)}</span><span>{account.role !== "owner" && <select aria-label={`Cambiar rango de ${account.name}`} value={account.role} onChange={(event) => changeRole(account.id, event.target.value as "teacher" | "student")}><option value="student">Estudiante</option><option value="teacher">Profesor UBB</option></select>}</span></div>)}</div>{message && <p className={`tool-status ${message.startsWith("Rol actualizado") ? "ok" : "bad"}`} role="status">{message}</p>}</section>;
}

export function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "estudiante";
}

const shortFormat = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" });
const longFormat = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" });
const dayFormat = new Intl.DateTimeFormat("es-CL", { day: "2-digit" });
const monthYearFormat = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
const monthFormat = new Intl.DateTimeFormat("es-CL", { month: "short" });

function countdown(value: string) {
  const target = new Date(`${value}T12:00:00`);
  const days = Math.round((target.getTime() - new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`).getTime()) / 86400000);
  if (days < 0) return "Realizada";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function shortDate(value: string) {
  return shortFormat.format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function longDate(value: string) {
  return longFormat.format(new Date(`${value}T12:00:00`));
}

function dayOf(value: string) {
  return dayFormat.format(new Date(`${value}T12:00:00`));
}

function monthLabel(value: string) {
  const label = monthYearFormat.format(new Date(`${value}T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthOf(value: string) {
  return monthFormat.format(new Date(`${value}T12:00:00`)).replace(".", "").toUpperCase();
}
