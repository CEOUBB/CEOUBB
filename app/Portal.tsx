"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ArrowRight, ArrowUpRight, Books, DownloadSimple, Robot, SignOut } from "@phosphor-icons/react";
import { signInWithInstitutionalGoogle } from "../lib/firebase-client";
import { Avatar, ease, forgetPhoto, rememberPhoto, rise, roleLabel, Screen, stagger } from "./portal-ui";
import type { User } from "./portal-ui";

const EstaticaClassroom = dynamic(() => import("./EstaticaClassroom"), {
  ssr: false,
  loading: () => <div className="empty-state"><strong>Abriendo el aula…</strong></div>,
});

type Course = {
  id: string;
  name: string;
  code: string;
  teacher: string;
  period: string;
  notices: number;
  activities: number;
  tone: string;
};

const APK_URL = "https://drive.google.com/uc?export=download&id=16gs-qhzTujmFqf_zgGsVfqBq2QJEbYak";

const courses: Course[] = [
  { id: "edo", name: "Ecuaciones Diferenciales", code: "EDO · 2026-2", teacher: "Banco de estudio", period: "Semestre 2026-2", notices: 0, activities: 3, tone: "#0057a4" },
  { id: "estadistica", name: "Estadística", code: "220318", teacher: "Aula de práctica", period: "Semestre 2026-2", notices: 1, activities: 3, tone: "#007fc3" },
  { id: "estatica", name: "Estática", code: "440299", teacher: "Aula piloto colaborativa", period: "Semestre 2026-2", notices: 1, activities: 4, tone: "#00a6d6" },
  { id: "ingles", name: "Inglés Comunicacional I", code: "340357", teacher: "Banco de estudio", period: "Semestre 2026-2", notices: 0, activities: 2, tone: "#004d91" },
  { id: "termodinamica", name: "Termodinámica Aplicada", code: "440303", teacher: "Banco de certámenes", period: "Semestre 2026-2", notices: 0, activities: 3, tone: "#e84235" },
  { id: "matlab", name: "Programación en Ingeniería", code: "MATLAB", teacher: "Laboratorio de código", period: "Semestre 2026-2", notices: 0, activities: 3, tone: "#ffd100" },
];

const agenda = [
  { date: "2026-08-18", course: "Estática", detail: "Práctica de sistemas de fuerzas", tone: "#00a6d6" },
  { date: "2026-09-01", course: "Termodinámica Aplicada", detail: "Test 01", tone: "#e84235" },
  { date: "2026-10-08", course: "Termodinámica Aplicada", detail: "Evaluación 01 · Primera y Segunda ley", tone: "#e84235" },
  { date: "2026-11-26", course: "Termodinámica Aplicada", detail: "Evaluación 02 · Combustión y ciclos de vapor", tone: "#e84235" },
];

const navItems = [
  { key: "courses", label: "Mis cursos" },
  { key: "calendar", label: "Calendario" },
  { key: "resources", label: "Recursos" },
  { key: "admin", label: "Administración" },
] as const;

export function Portal() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<"courses" | "estatica" | "calendar" | "resources" | "admin">("courses");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((data) => setUser(data.user ?? null))
      .finally(() => setChecking(false));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    forgetPhoto();
    setUser(null);
    setScreen("courses");
  };

  if (checking) return <LoadingScreen />;
  if (!user) return <AccessScreen onSignedIn={setUser} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="portal-shell">
        <PortalHeader user={user} screen={screen} setScreen={setScreen} onLogout={logout} />
        <AnimatePresence initial={false} mode="wait">
          {screen === "estatica" ? (
            <Screen key="estatica"><EstaticaClassroom user={user} goBack={() => setScreen("courses")} /></Screen>
          ) : (
            <Screen key={screen}>
              <main className="portal-main">
                {screen === "courses" && <CoursesDashboard user={user} openEstatica={() => setScreen("estatica")} />}
                {screen === "calendar" && <CalendarView />}
                {screen === "resources" && <ResourcesView />}
                {screen === "admin" && user.role === "owner" && <AdminView />}
              </main>
            </Screen>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-orbit"><img src="/brand/ubb-shield.webp" alt="" aria-hidden="true" width={388} height={594} /></div>
      <p>Abriendo Centro de Estudio UBB…</p>
    </main>
  );
}

function AccessScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const finishGoogleAccess = useCallback(async (idToken: string) => {
    const response = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No fue posible continuar.");
    if (data.photoUrl) rememberPhoto(data.user.email, data.photoUrl);
    onSignedIn(data.user);
  }, [onSignedIn]);

  const googleAccess = async () => {
    setError("");
    setWorking(true);
    try {
      const idToken = await signInWithInstitutionalGoogle();
      await finishGoogleAccess(idToken);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible continuar.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="access-page">
      <section className="access-brand">
        <div className="access-brand-lockup">
          <img src="/brand/ubb-shield.webp" alt="Escudo de la Universidad del Bío-Bío" width={388} height={594} fetchPriority="high" />
          <h1>Centro de <strong>Estudio UBB</strong></h1>
        </div>
      </section>
      <section className="access-panel">
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <h2>Ingresa con tu correo institucional</h2>
            <button className="google-button" disabled={working} onClick={googleAccess} type="button">
              {working ? <span className="google-spinner" aria-hidden="true" /> : <img src="/brand/google-g.webp" alt="" aria-hidden="true" width={256} height={256} />}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="institution-note"><strong>Acceso exclusivo UBB.</strong> Usa tu cuenta @alumnos.ubiobio.cl o @ubiobio.cl. Cualquier otra universidad o correo personal será rechazado.</p>
          </div>
          <div className="store-block">
            <div className="store-badges" role="group" aria-label="Aplicaciones móviles próximamente disponibles">
              <div className="store-badge">
                <img src="/brand/app-store-badge-es.webp" alt="App Store" />
              </div>
              <div className="store-badge">
                <img src="/brand/google-play-badge-es.webp" alt="Google Play" />
              </div>
            </div>
          </div>
          <p className="legal-note">Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la Universidad del Bío-Bío. <a href="/privacidad">Privacidad</a></p>
        </div>
      </section>
    </main>
  );
}

function PortalHeader({ user, screen, setScreen, onLogout }: { user: User; screen: string; setScreen: (screen: "courses" | "estatica" | "calendar" | "resources" | "admin") => void; onLogout: () => void }) {
  return (
    <header className="portal-header">
      <button className="portal-brand" onClick={() => setScreen("courses")} type="button">
        <img src="/brand/ubb-shield.webp" alt="" aria-hidden="true" width={388} height={594} />
        <span><strong>Centro de Estudio UBB</strong><small>Ingeniería Mecánica · 2026-2</small></span>
      </button>
      <nav className="main-nav" aria-label="Navegación principal">
        {navItems.filter((item) => item.key !== "admin" || user.role === "owner").map((item) => {
          const active = item.key === "courses" ? screen === "courses" || screen === "estatica" : screen === item.key;
          return (
            <button aria-current={active ? "page" : undefined} className={active ? "active" : ""} key={item.key} onClick={() => setScreen(item.key)} type="button">
              {item.label}
              {active && <motion.span className="nav-indicator" layoutId="nav-indicator" transition={{ type: "spring", stiffness: 420, damping: 38 }} />}
            </button>
          );
        })}
      </nav>
      <div className="header-actions">
        <details className="account-menu">
          <summary><Avatar email={user.email} name={user.name} /><span className="account-copy"><strong>{firstName(user.name)}</strong><small>{roleLabel(user.role)}</small></span></summary>
          <div className="account-popover">
            <strong>{user.name}</strong><span>{user.email}</span><button onClick={onLogout} type="button"><SignOut size={16} />Cerrar sesión</button>
          </div>
        </details>
      </div>
    </header>
  );
}

function CoursesDashboard({ user, openEstatica }: { user: User; openEstatica: () => void }) {
  const next = nextEvaluation();
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <h1>Bienvenid{user.name.trim().toLowerCase().endsWith("a") ? "a" : "o"}, {firstName(user.name)}</h1>
          <p>Periodo 2026-2 · {courses.length} ramos activos</p>
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
          const upcoming = nextForCourse(course.name);
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
              {course.notices > 0 && <span className="fresh">{course.notices} aviso{course.notices > 1 ? "s" : ""}</span>}
            </div>
            <h3>{course.name}</h3>
            <p>{course.teacher}</p>
            <div className="course-meta">
              <span>{course.activities} actividades</span>
              {upcoming
                ? <time dateTime={upcoming.date}>{shortDate(upcoming.date)} · {upcoming.detail}</time>
                : <span className="course-open">Material disponible</span>}
            </div>
            {course.id === "estatica"
              ? <button className="course-action" onClick={openEstatica} type="button">Entrar al aula <ArrowRight size={15} /></button>
              : <a className="course-action" href="/biblioteca/index.html">Abrir ejercicios <ArrowRight size={15} /></a>}
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

function CalendarView() {
  const next = nextEvaluation();
  return (
    <section>
      <div className="dashboard-hero">
        <div>
          <h1>Calendario académico</h1>
          <p>{agenda.length} evaluaciones · Periodo 2026-2</p>
        </div>
      </div>
      <div className="calendar-layout">
        <motion.div animate="show" className="timeline" initial="hidden" variants={stagger}>
          {agenda.map((item, index) => (
            <Fragment key={`${item.date}-${item.course}`}>
              {(index === 0 || monthOf(item.date) !== monthOf(agenda[index - 1].date)) && (
                <motion.h2 className="timeline-month" transition={{ duration: 0.4, ease }} variants={rise}>{monthLabel(item.date)}</motion.h2>
              )}
              <motion.article
                className={item.date === next.date ? "upcoming" : ""}
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
                  {item.date === next.date && <b className="upcoming-flag">Próxima</b>}
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

function ResourcesView() {
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

function AdminView() {
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

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "estudiante";
}

function nextEvaluation() {
  const today = new Date().toISOString().slice(0, 10);
  return agenda.find((item) => item.date >= today) ?? agenda[agenda.length - 1];
}

function nextForCourse(course: string) {
  const today = new Date().toISOString().slice(0, 10);
  return agenda.find((item) => item.course === course && item.date >= today) ?? null;
}

function countdown(value: string) {
  const today = new Date();
  const target = new Date(`${value}T12:00:00`);
  const days = Math.round((target.getTime() - new Date(`${today.toISOString().slice(0, 10)}T12:00:00`).getTime()) / 86400000);
  if (days < 0) return "Realizada";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function dayOf(value: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

function monthLabel(value: string) {
  const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthOf(value: string) {
  return new Intl.DateTimeFormat("es-CL", { month: "short" }).format(new Date(`${value}T12:00:00`)).replace(".", "").toUpperCase();
}
