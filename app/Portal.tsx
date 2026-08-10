"use client";

import { Fragment, FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bell, Books, ChartBar, DownloadSimple, Files, House, Robot, Sigma, SignOut, UsersThree } from "@phosphor-icons/react";
import { signInWithInstitutionalGoogle, watchGooglePhoto } from "../lib/firebase-client";
import { ClassroomFile, ClassroomPost, ClassroomState, ClassroomStudent, classroomFileUrl, deleteClassroomPost, editClassroomPost, publishClassroomPost, renameClassroomFile, saveClassroomProgress, uploadClassroomFile, watchClassroom } from "../lib/firebase-classroom-client";
import type { AccountRole as Role } from "../lib/access-policy";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

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

const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const ease = [0.16, 1, 0.3, 1] as const;

const units = [
  { title: "RA1 · Sistemas de fuerzas", subtitle: "Vectores, leyes de Newton, resultantes y sistemas equivalentes", equation: "ΣF = 0" },
  { title: "RA2 · Cuerpos rígidos y estructuras", subtitle: "Diagramas de cuerpo libre, reacciones y equilibrio en 2D/3D", equation: "ΣM₀ = 0" },
  { title: "RA3 · Fricción seca", subtitle: "Cuñas, tornillos, correas, descansos y rodadura", equation: "F ≤ μₛN" },
  { title: "RA4 · Propiedades de área y masa", subtitle: "Centroide, centro de gravedad, inercia y teorema de Steiner", equation: "I = Ī + Ad²" },
];

const initialPost: ClassroomPost = {
  id: "welcome",
  authorId: "",
  authorEmail: "",
  authorName: "Equipo Centro de Estudio UBB",
  authorRole: "owner",
  title: "Aula piloto de Estática disponible",
  body: "Aquí el docente puede publicar avisos, guías, presentaciones y dictámenes. Los estudiantes pueden revisar materiales y registrar su avance por resultado de aprendizaje.",
  kind: "notice",
  linkUrl: null,
  storagePath: "",
  createdAt: "2026-08-08T12:00:00.000Z",
};

const emptyClassroom: ClassroomState = { posts: [], files: [], students: [], ownProgress: 0 };

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

const PHOTO_KEY = "ceoubb:photo";

function cachedPhoto(email: string) {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PHOTO_KEY) ?? "null");
    return saved?.email === email ? String(saved.url) : null;
  } catch {
    return null;
  }
}

function rememberPhoto(email: string, url: string) {
  try {
    window.localStorage.setItem(PHOTO_KEY, JSON.stringify({ email, url }));
  } catch {
    return;
  }
}

function forgetPhoto() {
  try {
    window.localStorage.removeItem(PHOTO_KEY);
  } catch {
    return;
  }
}

function useGooglePhoto(email: string) {
  const [photo, setPhoto] = useState<string | null>(() => cachedPhoto(email));
  useEffect(() => watchGooglePhoto((url) => {
    if (url) rememberPhoto(email, url);
    setPhoto(url ?? cachedPhoto(email));
  }), [email]);
  return [photo, () => setPhoto(null)] as const;
}

function Avatar({ email, name, large = false }: { email: string; name: string; large?: boolean }) {
  const [photo, dropPhoto] = useGooglePhoto(email);
  return (
    <span className={large ? "avatar large" : "avatar"}>
      {photo ? <img alt="" src={photo} onError={dropPhoto} referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}

function Bar({ ratio }: { ratio: number }) {
  return <motion.span animate={{ scaleX: Math.min(1, Math.max(0, ratio)) }} initial={{ scaleX: 0 }} transition={{ duration: 0.6, ease }} />;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease }}
    >
      {children}
    </motion.div>
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

type NotificationItem = {
  id: string;
  kind: "notice" | "file";
  title: string;
  body: string;
  targetUrl: string;
  createdAt: string;
};

function NotificationMenu({ items = [], unread = 0 }: { items?: NotificationItem[]; unread?: number }) {
  return (
    <details className="notification-menu">
      <summary aria-label="Notificaciones" className="icon-action" title="Notificaciones">
        <Bell size={18} />
        {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </summary>
      <div className="notification-popover">
        <header><strong>Notificaciones</strong><small>Avisos y archivos del aula</small></header>
        {items.length === 0 && <p>No hay avisos nuevos todavía.</p>}
        {items.map((item) => (
          <a href={item.targetUrl} key={item.id}>
            <span className={`notification-kind ${item.kind}`}>{item.kind === "file" ? "Archivo" : "Aviso"}</span>
            <strong>{item.title}</strong>
            <small>{item.body}</small>
            <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
          </a>
        ))}
      </div>
    </details>
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
        <NotificationMenu />
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
        {courses.map((course) => (
          <motion.article
            className="course-card"
            key={course.id}
            style={{ "--course-tone": course.tone } as React.CSSProperties}
            transition={{ duration: 0.45, ease }}
            variants={rise}
            whileHover={{ y: -3 }}
          >
            <span className="course-code">{course.code}</span>
            <h3>{course.name}</h3>
            <p>{course.teacher}</p>
            <div className="course-meta">
              <span>{course.activities} actividades</span>
              {course.notices > 0 && <span className="fresh">{course.notices} aviso{course.notices > 1 ? "s" : ""}</span>}
            </div>
            {course.id === "estatica"
              ? <button className="course-action" onClick={openEstatica} type="button">Entrar al aula <ArrowRight size={15} /></button>
              : <a className="course-action" href="/biblioteca/index.html">Abrir ejercicios <ArrowRight size={15} /></a>}
          </motion.article>
        ))}
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

function EstaticaClassroom({ user, goBack }: { user: User; goBack: () => void }) {
  const [tab, setTab] = useState<"home" | "materials" | "progress" | "people">("home");
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState("");
  const canTeach = user.role === "teacher" || user.role === "owner";
  const { files, students } = classroom;
  const posts = [initialPost, ...classroom.posts];
  const completed = classroom.ownProgress;

  useEffect(() => watchClassroom(canTeach, (patch) => setClassroom((current) => ({ ...current, ...patch })), setStatus), [canTeach]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

  const updateProgress = async (next: number) => {
    setClassroom((current) => ({ ...current, ownProgress: next }));
    await saveClassroomProgress(next, units.length).catch((cause) => setStatus(cause instanceof Error ? cause.message : "No se pudo guardar el progreso."));
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Publicando…");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await publishClassroomPost({ title: String(form.get("title") ?? ""), body: String(form.get("body") ?? ""), kind: String(form.get("kind") ?? "notice"), linkUrl: String(form.get("linkUrl") ?? "") });
      formElement.reset();
      setStatus("Publicado correctamente y notificado al curso.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible publicar.");
    }
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Subiendo archivo…");
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get("file");
    if (!(file instanceof File)) return setStatus("Selecciona un archivo.");
    try {
      await uploadClassroomFile(file, (percent) => setStatus(`Subiendo archivo… ${percent}%`));
      formElement.reset();
      setStatus("Archivo disponible y notificado al curso.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible subir el archivo.");
    }
  };

  const editPost = async (post: ClassroomPost) => {
    const title = window.prompt("Título de la publicación", post.title);
    if (title === null) return;
    const body = window.prompt("Contenido de la publicación", post.body);
    if (body === null) return;
    try {
      await editClassroomPost(post.id, { title, body });
      setStatus("Publicación actualizada.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible modificarla.");
    }
  };

  const deletePost = async (post: ClassroomPost) => {
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(post.id, post.storagePath);
      setStatus("Publicación eliminada.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible eliminarla.");
    }
  };

  const openFile = async (file: ClassroomFile) => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = file.url || await classroomFileUrl(file.storagePath);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      tab?.close();
      setStatus(cause instanceof Error ? cause.message : "No fue posible abrir el archivo.");
    }
  };

  const renameFile = async (file: ClassroomFile) => {
    const name = window.prompt("Nombre del archivo", file.name);
    if (name === null) return;
    try {
      await renameClassroomFile(file.id, name);
      setStatus("Archivo renombrado.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible modificarlo.");
    }
  };

  const deleteFile = async (file: ClassroomFile) => {
    if (!window.confirm(`¿Eliminar “${file.name}”?`)) return;
    try {
      await deleteClassroomPost(file.id, file.storagePath);
      setStatus("Archivo eliminado.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible eliminarlo.");
    }
  };

  return (
    <div className="classroom-layout">
      <aside className="classroom-sidebar">
        <button className="back-button" onClick={goBack} type="button"><ArrowLeft size={15} /><span>Mis cursos</span></button>
        <div className="course-identity panel-navy"><span>440299</span><h2>Estática</h2><p>Ingeniería Mecánica · 2026-2</p></div>
        <nav aria-label="Secciones del aula">
          <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")} type="button"><House size={18} />Portada del curso</button>
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")} type="button"><UsersThree size={18} />Participantes</button>
          <button onClick={() => setTab("progress")} className={tab === "progress" ? "active" : ""} type="button"><ChartBar size={18} />Progreso y monitoreo</button>
          <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")} type="button"><Files size={18} />Materiales</button>
        </nav>
        <div className="unit-menu"><strong>Actividades</strong>{units.map((unit, index) => <button key={unit.title} onClick={() => setTab("home")} type="button"><span>0{index + 1}</span>{unit.title.split(" · ")[1]}</button>)}</div>
        <a className="sidebar-library" href="/biblioteca/index.html">Banco de certámenes <ArrowUpRight size={14} /></a>
      </aside>
      <main className="classroom-main">
        <header className="classroom-top"><div><span className="breadcrumb">Mis cursos / Estática</span><h1>{tabTitle(tab)}</h1></div><span className="role-badge">{roleLabel(user.role)}</span></header>
        <AnimatePresence initial={false} mode="wait">
        <Screen key={tab}>
        {tab === "home" && (
          <>
            <section className="course-cover panel-navy"><div><span className="eyebrow">Aula piloto colaborativa</span><h2>Equilibrio, fricción y propiedades de área y masa</h2><p>Desarrolla modelos de sistemas mecánicos en equilibrio con análisis riguroso, diagramas de cuerpo libre y notación matemática inmediata.</p><div className="cover-meta"><span>6 créditos SCT</span><span>Semestral</span><span>Presencial y digital</span></div></div><div className="equation-stack"><span>ΣFₓ = 0</span><span>ΣFᵧ = 0</span><span>ΣM₀ = 0</span></div></section>
            <div className="classroom-columns">
              <section>
                <div className="section-title compact-title"><h2>Resultados de aprendizaje</h2></div>
                <motion.div animate="show" className="unit-grid" initial="hidden" variants={stagger}>{units.map((unit, index) => <motion.article key={unit.title} transition={{ duration: 0.45, ease }} variants={rise}><span className="unit-number">0{index + 1}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><strong>{unit.equation}</strong>{!canTeach && <label className="unit-check"><input checked={index < completed} onChange={(event) => updateProgress(event.target.checked ? Math.max(completed, index + 1) : Math.min(completed, index))} type="checkbox" />Completado</label>}</motion.article>)}</motion.div>
              </section>
              <aside className="course-sidecards"><div><span className="eyebrow">Coordinación</span><strong>Profesor de Estática</strong><small>Cuenta docente institucional</small></div><div><span className="eyebrow">Próxima entrega</span><strong>Banco RA1 disponible</strong><small>Certamen completo · 90 min</small></div><div><span className="eyebrow">{canTeach ? "Estudiantes" : "Tu avance"}</span><strong>{canTeach ? `${students.length} inscritos` : `${completed} de ${units.length} unidades`}</strong>{!canTeach && <div className="mini-progress"><Bar ratio={completed / units.length} /></div>}</div></aside>
            </div>
            <PostsSection posts={posts} user={user} editPost={editPost} deletePost={deletePost} />
          </>
        )}
        {tab === "materials" && <MaterialsSection files={files} user={user} canTeach={canTeach} publish={publish} upload={upload} openFile={openFile} renameFile={renameFile} deleteFile={deleteFile} status={status} />}
        {tab === "progress" && <ProgressSection user={user} completed={completed} students={students} />}
        {tab === "people" && <PeopleSection user={user} students={students} />}
        </Screen>
        </AnimatePresence>
      </main>
    </div>
  );
}

function PostsSection({ posts, user, editPost, deletePost }: { posts: ClassroomPost[]; user: User; editPost: (post: ClassroomPost) => void; deletePost: (post: ClassroomPost) => void }) {
  return (
    <section className="posts-section">
      <div className="section-title compact-title"><h2>Avisos del curso</h2></div>
      <div className="post-list">{posts.map((post) => { const canManage = Boolean(post.authorId) && (user.role === "owner" || post.authorEmail.toLowerCase() === user.email.toLowerCase()); return <article key={post.id}><span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span><div><h3>{post.title}</h3><p>{post.body}</p><footer><span>{post.authorName}</span><time>{formatDate(post.createdAt)}</time>{post.linkUrl && <a href={post.linkUrl} target="_blank" rel="noreferrer">Abrir recurso <ArrowUpRight size={12} /></a>}{canManage && <span className="content-actions"><button onClick={() => editPost(post)} type="button">Modificar</button><button onClick={() => deletePost(post)} type="button">Eliminar</button></span>}</footer></div></article>; })}</div>
    </section>
  );
}

function MaterialsSection({ files, user, canTeach, publish, upload, openFile, renameFile, deleteFile, status }: { files: ClassroomFile[]; user: User; canTeach: boolean; publish: (event: FormEvent<HTMLFormElement>) => void; upload: (event: FormEvent<HTMLFormElement>) => void; openFile: (file: ClassroomFile) => void; renameFile: (file: ClassroomFile) => void; deleteFile: (file: ClassroomFile) => void; status: string }) {
  return (
    <section className="materials-view">
      <div className="materials-list">
        <div className="section-title compact-title"><h2>Archivos compartidos</h2></div>
        <a className="material-row featured" href="/biblioteca/index.html"><span className="file-icon"><Sigma size={20} /></span><div><strong>Banco completo de Estática</strong><small>Certámenes, ejercicios resueltos, apuntes y material original</small></div><b>Abrir <ArrowRight size={14} /></b></a>
        {files.length === 0 && <div className="empty-state"><strong>Aún no hay archivos del docente.</strong><p>Cuando publique una guía, PPT, PDF o dictamen aparecerá aquí.</p></div>}
        {files.map((file) => { const canManage = user.role === "owner" || file.authorEmail.toLowerCase() === user.email.toLowerCase(); return <div className="material-row" key={file.id}><span className="file-icon">{fileExtension(file.name)}</span><div><strong>{file.name}</strong><small>{file.authorName} · {formatBytes(file.size)} · {formatDate(file.createdAt)}</small></div><span className="material-actions"><button onClick={() => openFile(file)} type="button">Descargar</button>{canManage && <span className="content-actions"><button onClick={() => renameFile(file)} type="button">Modificar</button><button onClick={() => deleteFile(file)} type="button">Eliminar</button></span>}</span></div>; })}
      </div>
      {canTeach && <aside className="teacher-tools"><h2>Publicar en el aula</h2><form onSubmit={publish}><label>Título<input name="title" required /></label><label>Tipo<select name="kind"><option value="notice">Aviso</option><option value="guide">Guía</option><option value="assessment">Dictamen o certamen</option><option value="resource">Recurso</option></select></label><label>Mensaje<textarea name="body" rows={4} required /></label><label>Enlace Drive opcional<input name="linkUrl" type="url" placeholder="https://…" /></label><button className="primary-button" type="submit">Publicar aviso o enlace</button></form><div className="tool-divider"><span>o subir archivo</span></div><form onSubmit={upload}><label>PDF, PPT, DOCX, XLSX, ZIP o imagen<input name="file" type="file" required /></label><button className="secondary-button" type="submit">Subir al curso</button></form>{status && <p className="tool-status">{status}</p>}</aside>}
    </section>
  );
}

function ProgressSection({ user, completed, students }: { user: User; completed: number; students: ClassroomStudent[] }) {
  const canTeach = user.role === "teacher" || user.role === "owner";
  return (
    <section className="progress-view">
      {!canTeach && <div className="personal-progress"><strong>{completed}/{units.length}</strong><div><h3>Resultados de aprendizaje completados</h3><p>Tu avance se guarda en tu cuenta y aparece en todos tus dispositivos.</p><div className="big-progress"><Bar ratio={completed / units.length} /></div></div></div>}
      {canTeach && <div className="progress-table"><div className="progress-table-head"><span>Estudiante</span><span>Avance</span><span>Última actividad</span></div>{students.length === 0 && <p className="empty-row">Los estudiantes aparecerán cuando creen su cuenta institucional.</p>}{students.map((student) => <div className="progress-table-row" key={student.userId}><span><b>{student.name}</b><small>{student.email}</small></span><span><b>{student.completed}/{student.total}</b><i><motion.em animate={{ scaleX: student.total ? student.completed / student.total : 0 }} initial={{ scaleX: 0 }} transition={{ duration: 0.6, ease }} /></i></span><span>{student.updatedAt ? formatDate(student.updatedAt) : "Sin actividad"}</span></div>)}</div>}
    </section>
  );
}

function PeopleSection({ user, students }: { user: User; students: ClassroomStudent[] }) {
  return (
    <section>
      <div className="people-grid"><article><span className="avatar large">PE</span><div><strong>Profesor de Estática</strong><small>Docente · Coordinación del curso</small></div></article><article><Avatar large email={user.email} name={user.name} /><div><strong>{user.name}</strong><small>{roleLabel(user.role)} · {user.email}</small></div></article>{students.filter((student) => student.email.toLowerCase() !== user.email.toLowerCase()).map((student) => <article key={student.userId}><span className="avatar large">{initials(student.name)}</span><div><strong>{student.name}</strong><small>Estudiante · {student.email}</small></div></article>)}</div>
    </section>
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
                {item.date === next.date && <span className="upcoming-flag">Próxima</span>}
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
  const resources = [
    { href: "/biblioteca/index.html", icon: <Books size={22} />, title: "Banco de certámenes", body: "Evaluaciones largas con puntaje, tiempo y pauta desarrollada.", meta: "18 evaluaciones · 6 ramos", action: "Abrir biblioteca", external: false },
    { href: APK_URL, icon: <DownloadSimple size={22} />, title: "App para Android", body: "Instala el APK y consulta la biblioteca sin conexión.", meta: "Versión 1.0.6 · Android 8 o superior", action: "Descargar", external: false },
    { href: "https://chatgpt.com", icon: <Robot size={22} />, title: "Tutor con inteligencia artificial", body: "Resuelve dudas puntuales con el contexto del ramo a mano.", meta: "Enlace externo a ChatGPT", action: "Abrir tutor", external: true },
  ];
  return (
    <section>
      <div className="dashboard-hero"><div><h1>Recursos de estudio</h1></div></div>
      <motion.div animate="show" className="resource-cards" initial="hidden" variants={stagger}>
        {resources.map((resource) => (
          <motion.a
            href={resource.href}
            key={resource.title}
            rel={resource.external ? "noreferrer" : undefined}
            target={resource.external ? "_blank" : undefined}
            transition={{ duration: 0.45, ease }}
            variants={rise}
            whileHover={{ y: -3 }}
          >
            <span>{resource.icon}</span>
            <h2>{resource.title}</h2>
            <p>{resource.body}</p>
            <em>{resource.meta}</em>
            <b>{resource.action} {resource.external ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}</b>
          </motion.a>
        ))}
      </motion.div>
      <div className="section-title compact-title"><h2>Cobertura del banco</h2></div>
      <div className="period-courses coverage">
        <ul>
          {courses.map((course) => (
            <li key={course.id} style={{ "--course-tone": course.tone } as React.CSSProperties}>
              <span>{course.name}</span>
              <small>{course.code}</small>
            </li>
          ))}
        </ul>
      </div>
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
  return <section><div className="dashboard-hero"><div><h1>Administración de cuentas</h1><p>{accounts.length} {accounts.length === 1 ? "cuenta registrada" : "cuentas registradas"} · el rango se asigna por dominio institucional</p></div></div><div className="admin-table"><div className="admin-head"><span>Cuenta</span><span>Rango</span><span>Acción</span></div>{accounts.length === 0 && <p className="empty-row">Todavía no hay cuentas institucionales registradas.</p>}{accounts.map((account) => <div className="admin-row" key={account.id}><span><b>{account.name}</b><small>{account.email}</small></span><span className={`role-chip ${account.role}`}>{roleLabel(account.role)}</span><span>{account.role !== "owner" && <select value={account.role} onChange={(event) => changeRole(account.id, event.target.value as "teacher" | "student")}><option value="student">Estudiante</option><option value="teacher">Profesor UBB</option></select>}</span></div>)}</div>{message && <p className="tool-status">{message}</p>}</section>;
}

function roleLabel(role: Role) {
  return role === "owner" ? "Desarrollador" : role === "teacher" ? "Docente" : "Estudiante";
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "estudiante";
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CE";
}

function kindLabel(kind: ClassroomPost["kind"]) {
  return kind === "assessment" ? "Evaluación" : kind === "guide" ? "Guía" : kind === "resource" ? "Recurso" : "Aviso";
}

function tabTitle(tab: "home" | "materials" | "progress" | "people") {
  return tab === "materials" ? "Materiales del curso" : tab === "progress" ? "Progreso y monitoreo" : tab === "people" ? "Participantes" : "Portada del curso";
}

function nextEvaluation() {
  const today = new Date().toISOString().slice(0, 10);
  return agenda.find((item) => item.date >= today) ?? agenda[agenda.length - 1];
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function fileExtension(value: string) {
  const extension = value.split(".").pop()?.toUpperCase() ?? "DOC";
  return extension.slice(0, 4);
}
