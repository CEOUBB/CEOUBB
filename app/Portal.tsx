"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { signInWithInstitutionalGoogle } from "../lib/firebase-client";
import { deleteClassroomPost, loadOwnClassroomProgress, publishClassroomPost, saveClassroomProgress, syncFirebaseProfile, updateClassroomPost, uploadClassroomFile, watchClassroomPosts, watchClassroomProgress } from "../lib/firebase-classroom-client";

type Role = "owner" | "teacher" | "student";

type User = {
  id: string;
  rut: string;
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

type Post = {
  id: string;
  authorId?: string;
  authorEmail?: string;
  title: string;
  body: string;
  kind: "notice" | "guide" | "assessment" | "resource";
  linkUrl?: string | null;
  storagePath?: string;
  createdAt: string;
  authorName: string;
  authorRole: Role;
};

type CourseFile = {
  id: string;
  authorId: string;
  authorEmail: string;
  name: string;
  contentType: string;
  size: number;
  storagePath: string;
  url: string;
  createdAt: string;
  authorName: string;
};

type StudentProgress = {
  userId: string;
  name: string;
  email: string;
  completed: number;
  total: number;
  updatedAt?: string | null;
};

type NotificationItem = {
  id: string;
  kind: "notice" | "file";
  title: string;
  body: string;
  targetUrl: string;
  createdAt: string;
  actorName: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const APK_URL = "https://drive.google.com/uc?export=download&id=16gs-qhzTujmFqf_zgGsVfqBq2QJEbYak";

const courses: Course[] = [
  { id: "edo", name: "Ecuaciones Diferenciales", code: "EDO · 2026-2", teacher: "Banco de estudio", period: "Semestre 2026-2", notices: 0, activities: 3, tone: "#7d1736" },
  { id: "estadistica", name: "Estadística", code: "220318", teacher: "Aula de práctica", period: "Semestre 2026-2", notices: 1, activities: 3, tone: "#2f6c78" },
  { id: "estatica", name: "Estática", code: "440299", teacher: "Aula piloto colaborativa", period: "Semestre 2026-2", notices: 1, activities: 4, tone: "#9a5b18" },
  { id: "ingles", name: "Inglés Comunicacional I", code: "340357", teacher: "Banco de estudio", period: "Semestre 2026-2", notices: 0, activities: 2, tone: "#5d4a82" },
  { id: "termodinamica", name: "Termodinámica Aplicada", code: "440303", teacher: "Banco de certámenes", period: "Semestre 2026-2", notices: 0, activities: 3, tone: "#b1452e" },
  { id: "matlab", name: "Programación en Ingeniería", code: "MATLAB", teacher: "Laboratorio de código", period: "Semestre 2026-2", notices: 0, activities: 3, tone: "#27644d" },
];

const units = [
  { title: "RA1 · Sistemas de fuerzas", subtitle: "Vectores, leyes de Newton, resultantes y sistemas equivalentes", equation: "ΣF = 0" },
  { title: "RA2 · Cuerpos rígidos y estructuras", subtitle: "Diagramas de cuerpo libre, reacciones y equilibrio en 2D/3D", equation: "ΣM₀ = 0" },
  { title: "RA3 · Fricción seca", subtitle: "Cuñas, tornillos, correas, descansos y rodadura", equation: "F ≤ μₛN" },
  { title: "RA4 · Propiedades de área y masa", subtitle: "Centroide, centro de gravedad, inercia y teorema de Steiner", equation: "I = Ī + Ad²" },
];

const initialPost: Post = {
  id: "welcome",
  title: "Aula piloto de Estática disponible",
  body: "Aquí el docente puede publicar avisos, guías, presentaciones y dictámenes. Los estudiantes pueden revisar materiales y registrar su avance por resultado de aprendizaje.",
  kind: "notice",
  createdAt: "2026-08-08T12:00:00.000Z",
  authorName: "Equipo Centro de Estudio UBB",
  authorRole: "owner",
};

export function Portal() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<"courses" | "estatica" | "calendar" | "resources" | "admin">("courses");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((data) => setUser(data.user ?? null))
      .finally(() => setChecking(false));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else {
      setInstallHelp(true);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setScreen("courses");
  };

  if (checking) return <LoadingScreen />;
  if (!user) return <AccessScreen onSignedIn={setUser} onInstall={install} installHelp={installHelp} closeInstallHelp={() => setInstallHelp(false)} />;

  return (
    <div className="portal-shell">
      <PortalHeader user={user} screen={screen} setScreen={setScreen} onLogout={logout} onInstall={install} />
      {screen === "estatica" ? (
        <EstaticaClassroom user={user} goBack={() => setScreen("courses")} />
      ) : (
        <main className="portal-main">
          {screen === "courses" && <CoursesDashboard user={user} openEstatica={() => setScreen("estatica")} />}
          {screen === "calendar" && <CalendarView />}
          {screen === "resources" && <ResourcesView />}
          {screen === "admin" && user.role === "owner" && <AdminView />}
        </main>
      )}
      {installHelp && <InstallHelp close={() => setInstallHelp(false)} />}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-orbit"><span>CE</span></div>
      <p>Abriendo Centro de Estudio UBB…</p>
    </main>
  );
}

function AccessScreen({ onSignedIn, onInstall, installHelp, closeInstallHelp }: { onSignedIn: (user: User) => void; onInstall: () => void; installHelp: boolean; closeInstallHelp: () => void }) {
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
      <section className="access-panel">
        <div className="access-copy">
          <span className="eyebrow">2026</span>
          <h1>Centro de <strong>Estudio UBB</strong></h1>
          <p>Certámenes largos, soluciones desarrolladas, apuntes con notación matemática, materiales del docente y seguimiento del progreso.</p>
          <div className="access-pills"><span>Android</span><span>iPhone y iPad</span><span>PC y Mac</span><span>Uso sin conexión</span></div>
        </div>
        <div className="access-actions">
          <button className="secondary-button" onClick={onInstall} type="button">Instalar en este dispositivo</button>
          <a className="text-link" href={APK_URL}>Descargar APK para Android</a>
        </div>
        <p className="legal-note">Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la Universidad del Bío-Bío. <a href="/privacidad">Privacidad</a> · <a href="/eliminar-cuenta">Eliminar cuenta</a></p>
      </section>

      <section className="login-panel" id="inicio">
        <div className="login-card">
          <div className="google-access-copy">
            <span className="eyebrow">Cuenta personal del portal</span>
            <h2>Ingresa con tu correo institucional</h2>
          </div>
          <button className="google-button" disabled={working} onClick={googleAccess} type="button"><span>G</span>{working ? "Verificando cuenta…" : "Continuar con Google"}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="institution-note">
            <strong>Acceso exclusivo UBB</strong>
            <p>Usa tu cuenta @alumnos.ubiobio.cl o @ubiobio.cl. Cualquier otra universidad o correo personal será rechazado.</p>
          </div>
        </div>
      </section>
      {installHelp && <InstallHelp close={closeInstallHelp} />}
    </main>
  );
}

function PortalHeader({ user, screen, setScreen, onLogout, onInstall }: { user: User; screen: string; setScreen: (screen: "courses" | "estatica" | "calendar" | "resources" | "admin") => void; onLogout: () => void; onInstall: () => void }) {
  return (
    <header className="portal-header">
      <button className="portal-brand" onClick={() => setScreen("courses")} type="button">
        <span className="brand-mark compact">CE</span>
        <span><strong>Centro de Estudio</strong><small>UBB · 2026-2</small></span>
      </button>
      <nav className="main-nav" aria-label="Navegación principal">
        <button className={screen === "courses" || screen === "estatica" ? "active" : ""} onClick={() => setScreen("courses")} type="button">Mis cursos</button>
        <button className={screen === "calendar" ? "active" : ""} onClick={() => setScreen("calendar")} type="button">Calendario</button>
        <button className={screen === "resources" ? "active" : ""} onClick={() => setScreen("resources")} type="button">Recursos</button>
        {user.role === "owner" && <button className={screen === "admin" ? "active" : ""} onClick={() => setScreen("admin")} type="button">Administración</button>}
      </nav>
      <div className="header-actions">
        <NotificationMenu />
        <button className="icon-action" onClick={onInstall} title="Instalar app" type="button">↓</button>
        <a className="icon-action" href="https://chatgpt.com" target="_blank" rel="noreferrer" title="Tutor IA">AI</a>
        <details className="account-menu">
          <summary><span className="avatar">{initials(user.name)}</span><span className="account-copy"><strong>{firstName(user.name)}</strong><small>{roleLabel(user.role)}</small></span></summary>
          <div className="account-popover">
            <strong>{user.name}</strong><span>{user.email}</span><span>{user.rut}</span><button onClick={onLogout} type="button">Cerrar sesión</button>
          </div>
        </details>
      </div>
    </header>
  );
}

function NotificationMenu() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setItems(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }, []);
  useEffect(() => {
    load().catch(() => undefined);
    const timer = window.setInterval(() => load().catch(() => undefined), 30000);
    return () => window.clearInterval(timer);
  }, [load]);
  const markRead = async () => {
    setUnread(0);
    await fetch("/api/notifications", { method: "POST" });
  };
  return (
    <details className="notification-menu" onToggle={(event) => { if (event.currentTarget.open) markRead().catch(() => undefined); }}>
      <summary className="icon-action" title="Notificaciones">●{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}</summary>
      <div className="notification-popover">
        <header><strong>Notificaciones</strong><small>Estática · profesor y estudiantes</small></header>
        {items.length === 0 && <p>No hay avisos nuevos todavía.</p>}
        {items.map((item) => <a href={item.targetUrl} key={item.id}><span className={`notification-kind ${item.kind}`}>{item.kind === "file" ? "Archivo" : "Aviso"}</span><strong>{item.title}</strong><small>{item.body}</small><time>{formatDate(item.createdAt)}</time></a>)}
      </div>
    </details>
  );
}

function CoursesDashboard({ user, openEstatica }: { user: User; openEstatica: () => void }) {
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Periodo académico 2026-2</span>
          <h1>Bienvenid{user.name.trim().toLowerCase().endsWith("a") ? "a" : "o"}, {firstName(user.name)}</h1>
          <p>Continúa donde quedaste o entra al aula colaborativa de Estática.</p>
        </div>
        <div className="connected-card"><span className="pulse" /><strong>Portal sincronizado</strong><small>Disponible en todos tus dispositivos</small></div>
      </section>
      <section className="dashboard-metrics" aria-label="Resumen">
        <div><strong>6</strong><span>ramos activos</span></div>
        <div><strong>18</strong><span>certámenes completos</span></div>
        <div><strong>1</strong><span>aula colaborativa</span></div>
        <div><strong>24/7</strong><span>biblioteca disponible</span></div>
      </section>
      <div className="section-title"><div><span className="eyebrow">Mi semestre</span><h2>Mis cursos</h2></div><a href="/biblioteca/index.html">Ir al banco completo →</a></div>
      <section className="course-grid">
        {courses.map((course) => (
          <article className="course-card" key={course.id} style={{ "--course-tone": course.tone } as React.CSSProperties}>
            <div className="course-band"><span>{course.code}</span><small>{course.period}</small></div>
            <div className="course-body">
              <h3>{course.name}</h3>
              <p>{course.teacher}</p>
              <div className="course-stats"><span><b>{course.notices}</b> avisos</span><span><b>{course.activities}</b> actividades</span></div>
            </div>
            {course.id === "estatica" ? <button onClick={openEstatica} type="button">Entrar al aula</button> : <a href="/biblioteca/index.html">Abrir ejercicios</a>}
          </article>
        ))}
      </section>
      <section className="download-banner">
        <div><span className="eyebrow">Acceso rápido</span><h2>Lleva Centro de Estudio UBB contigo</h2><p>Instala la experiencia web en iPhone, iPad, Android o computador, o descarga el APK Android.</p></div>
        <div><a className="primary-button link-button" href={APK_URL}>Descargar para Android</a><a className="secondary-button link-button" href="#instalar">Cómo instalar en iPhone</a></div>
      </section>
    </>
  );
}

function EstaticaClassroom({ user, goBack }: { user: User; goBack: () => void }) {
  const [tab, setTab] = useState<"home" | "materials" | "progress" | "people">("home");
  const [posts, setPosts] = useState<Post[]>([initialPost]);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [completed, setCompleted] = useState(0);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [status, setStatus] = useState("");
  const canTeach = user.role === "teacher" || user.role === "owner";

  useEffect(() => {
    let active = true;
    let stopPosts = () => undefined;
    let stopProgress = () => undefined;
    syncFirebaseProfile().then(() => {
      if (!active) return;
      stopPosts = watchClassroomPosts((items) => {
        const mapped = items.map((item): Post => ({
          id: item.id,
          authorId: item.authorId,
          authorEmail: item.authorEmail,
          title: item.title,
          body: item.body,
          kind: firebasePostKind(item.kind),
          linkUrl: item.fileUrl || null,
          storagePath: item.storagePath,
          createdAt: item.createdAt,
          authorName: item.authorName,
          authorRole: item.authorEmail.endsWith("@ubiobio.cl") ? "teacher" : item.authorEmail === "elpapijuaco325@gmail.com" ? "owner" : "student"
        }));
        setPosts([initialPost, ...mapped]);
        setFiles(items.filter((item) => Boolean(item.storagePath && item.fileUrl)).map((item) => ({
          id: item.id,
          authorId: item.authorId,
          authorEmail: item.authorEmail,
          name: item.fileName,
          contentType: item.contentType,
          size: item.fileSize,
          storagePath: item.storagePath,
          url: item.fileUrl,
          createdAt: item.createdAt,
          authorName: item.authorName
        })));
      }, setStatus);
      if (canTeach) {
        stopProgress = watchClassroomProgress((items) => setStudents(items.map((item) => ({ userId: item.uid, name: item.displayName, email: item.email, completed: item.completed, total: item.total, updatedAt: item.lastSeen }))), setStatus);
      } else {
        loadOwnClassroomProgress().then((value) => {
          if (active) setCompleted(value);
        }).catch((cause) => setStatus(cause instanceof Error ? cause.message : "No se pudo cargar tu progreso."));
      }
    }).catch((cause) => setStatus(cause instanceof Error ? cause.message : "No se pudo conectar Firebase."));
    return () => {
      active = false;
      stopPosts();
      stopProgress();
    };
  }, [canTeach]);

  const updateProgress = async (next: number) => {
    setCompleted(next);
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

  const editPost = async (post: Post) => {
    const title = window.prompt("Título de la publicación", post.title);
    if (title === null) return;
    const body = window.prompt("Contenido de la publicación", post.body);
    if (body === null) return;
    try {
      await updateClassroomPost(post.id, { title, body, kind: post.kind });
      setStatus("Publicación actualizada.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible modificarla.");
    }
  };

  const deletePost = async (post: Post) => {
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(post.id, post.storagePath ?? "");
      setStatus("Publicación eliminada.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible eliminarla.");
    }
  };

  const renameFile = async (file: CourseFile) => {
    const name = window.prompt("Nombre del archivo", file.name);
    if (name === null) return;
    try {
      await updateClassroomPost(file.id, { fileName: name });
      setStatus("Archivo renombrado.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "No fue posible modificarlo.");
    }
  };

  const deleteFile = async (file: CourseFile) => {
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
        <button className="back-button" onClick={goBack} type="button">← Mis cursos</button>
        <div className="course-identity"><span>440299</span><h2>Estática</h2><p>Ingeniería Mecánica · 2026-2</p></div>
        <nav aria-label="Secciones del aula">
          <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")} type="button"><span>⌂</span>Portada del curso</button>
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")} type="button"><span>◎</span>Participantes</button>
          <button onClick={() => setTab("progress")} className={tab === "progress" ? "active" : ""} type="button"><span>▣</span>Progreso y monitoreo</button>
          <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")} type="button"><span>▤</span>Materiales</button>
        </nav>
        <div className="unit-menu"><strong>Actividades</strong>{units.map((unit, index) => <button key={unit.title} onClick={() => setTab("home")} type="button"><span>0{index + 1}</span>{unit.title.split(" · ")[1]}</button>)}</div>
        <a className="sidebar-library" href="/biblioteca/index.html">Abrir banco de certámenes ↗</a>
      </aside>
      <main className="classroom-main">
        <header className="classroom-top"><div><span className="breadcrumb">Mis cursos / Estática</span><h1>{tabTitle(tab)}</h1></div><span className="role-badge">{roleLabel(user.role)}</span></header>
        {tab === "home" && (
          <>
            <section className="course-cover"><div><span className="eyebrow">Aula piloto colaborativa</span><h2>Equilibrio, fricción y propiedades de área y masa</h2><p>Desarrolla modelos de sistemas mecánicos en equilibrio con análisis riguroso, diagramas de cuerpo libre y notación matemática inmediata.</p><div className="cover-meta"><span>6 créditos SCT</span><span>Semestral</span><span>Presencial + digital</span></div></div><div className="equation-stack"><span>ΣFₓ = 0</span><span>ΣFᵧ = 0</span><span>ΣM₀ = 0</span></div></section>
            <div className="classroom-columns">
              <section>
                <div className="section-title compact-title"><div><span className="eyebrow">Resultados de aprendizaje</span><h2>Unidades del semestre</h2></div></div>
                <div className="unit-grid">{units.map((unit, index) => <article key={unit.title}><span className="unit-number">0{index + 1}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><strong>{unit.equation}</strong>{!canTeach && <label className="unit-check"><input checked={index < completed} onChange={(event) => updateProgress(event.target.checked ? Math.max(completed, index + 1) : Math.min(completed, index))} type="checkbox" />Completado</label>}</article>)}</div>
              </section>
              <aside className="course-sidecards"><div><span className="eyebrow">Coordinación</span><strong>Profesor de Estática</strong><small>Cuenta docente institucional</small></div><div><span className="eyebrow">Próxima entrega</span><strong>Banco RA1 disponible</strong><small>Certamen completo · 90 min</small></div><div><span className="eyebrow">Tu avance</span><strong>{canTeach ? `${students.length} estudiantes` : `${completed} de ${units.length} unidades`}</strong><div className="mini-progress"><span style={{ width: canTeach ? "100%" : `${completed / units.length * 100}%` }} /></div></div></aside>
            </div>
            <PostsSection posts={posts} user={user} editPost={editPost} deletePost={deletePost} />
          </>
        )}
        {tab === "materials" && <MaterialsSection files={files} user={user} canTeach={canTeach} publish={publish} upload={upload} renameFile={renameFile} deleteFile={deleteFile} status={status} />}
        {tab === "progress" && <ProgressSection user={user} completed={completed} students={students} />}
        {tab === "people" && <PeopleSection user={user} students={students} />}
      </main>
    </div>
  );
}

function PostsSection({ posts, user, editPost, deletePost }: { posts: Post[]; user: User; editPost: (post: Post) => void; deletePost: (post: Post) => void }) {
  return (
    <section className="posts-section">
      <div className="section-title compact-title"><div><span className="eyebrow">Actualizaciones</span><h2>Avisos del curso</h2></div></div>
      <div className="post-list">{posts.map((post) => { const canManage = Boolean(post.authorId) && (user.role === "owner" || post.authorEmail?.toLowerCase() === user.email.toLowerCase()); return <article key={post.id}><span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span><div><h3>{post.title}</h3><p>{post.body}</p><footer><span>{post.authorName}</span><time>{formatDate(post.createdAt)}</time>{post.linkUrl && <a href={post.linkUrl} target="_blank" rel="noreferrer">Abrir recurso ↗</a>}{canManage && <span className="content-actions"><button onClick={() => editPost(post)} type="button">Modificar</button><button onClick={() => deletePost(post)} type="button">Eliminar</button></span>}</footer></div></article>; })}</div>
    </section>
  );
}

function MaterialsSection({ files, user, canTeach, publish, upload, renameFile, deleteFile, status }: { files: CourseFile[]; user: User; canTeach: boolean; publish: (event: FormEvent<HTMLFormElement>) => void; upload: (event: FormEvent<HTMLFormElement>) => void; renameFile: (file: CourseFile) => void; deleteFile: (file: CourseFile) => void; status: string }) {
  return (
    <section className="materials-view">
      <div className="materials-list">
        <div className="section-title compact-title"><div><span className="eyebrow">Biblioteca del aula</span><h2>Archivos compartidos</h2></div></div>
        <a className="material-row featured" href="/biblioteca/index.html"><span className="file-icon">Σ</span><div><strong>Banco completo de Estática</strong><small>Certámenes, ejercicios resueltos, apuntes y material original</small></div><b>Abrir →</b></a>
        {files.length === 0 && <div className="empty-state"><strong>Aún no hay archivos del docente.</strong><p>Cuando publique una guía, PPT, PDF o dictamen aparecerá aquí.</p></div>}
        {files.map((file) => { const canManage = user.role === "owner" || file.authorEmail.toLowerCase() === user.email.toLowerCase(); return <div className="material-row" key={file.id}><span className="file-icon">{fileExtension(file.name)}</span><div><strong>{file.name}</strong><small>{file.authorName} · {formatBytes(file.size)} · {formatDate(file.createdAt)}</small></div><span className="material-actions"><a href={file.url} target="_blank" rel="noreferrer">Descargar</a>{canManage && <span className="content-actions"><button onClick={() => renameFile(file)} type="button">Modificar</button><button onClick={() => deleteFile(file)} type="button">Eliminar</button></span>}</span></div>; })}
      </div>
      {canTeach && <aside className="teacher-tools"><span className="eyebrow">Herramientas docentes</span><h2>Publicar en el aula</h2><form onSubmit={publish}><label>Título<input name="title" required /></label><label>Tipo<select name="kind"><option value="notice">Aviso</option><option value="guide">Guía</option><option value="assessment">Dictamen o certamen</option><option value="resource">Recurso</option></select></label><label>Mensaje<textarea name="body" rows={4} required /></label><label>Enlace Drive opcional<input name="linkUrl" type="url" placeholder="https://…" /></label><button className="primary-button" type="submit">Publicar aviso o enlace</button></form><div className="tool-divider"><span>o subir archivo</span></div><form onSubmit={upload}><label>PDF, PPT, DOCX, XLSX, ZIP o imagen<input name="file" type="file" required /></label><button className="secondary-button" type="submit">Subir al curso</button></form>{status && <p className="tool-status">{status}</p>}</aside>}
    </section>
  );
}

function ProgressSection({ user, completed, students }: { user: User; completed: number; students: StudentProgress[] }) {
  const canTeach = user.role === "teacher" || user.role === "owner";
  return (
    <section className="progress-view">
      <div className="section-title compact-title"><div><span className="eyebrow">Seguimiento</span><h2>{canTeach ? "Monitoreo del curso" : "Mi progreso en Estática"}</h2></div></div>
      {!canTeach && <div className="personal-progress"><strong>{completed}/{units.length}</strong><div><h3>Resultados de aprendizaje completados</h3><p>Tu avance se guarda en tu cuenta y aparece en todos tus dispositivos.</p><div className="big-progress"><span style={{ width: `${completed / units.length * 100}%` }} /></div></div></div>}
      {canTeach && <div className="progress-table"><div className="progress-table-head"><span>Estudiante</span><span>Avance</span><span>Última actividad</span></div>{students.length === 0 && <p className="empty-row">Los estudiantes aparecerán cuando creen su cuenta institucional.</p>}{students.map((student) => <div className="progress-table-row" key={student.userId}><span><b>{student.name}</b><small>{student.email}</small></span><span><b>{student.completed}/{student.total}</b><i><em style={{ width: `${student.completed / student.total * 100}%` }} /></i></span><span>{student.updatedAt ? formatDate(student.updatedAt) : "Sin actividad"}</span></div>)}</div>}
    </section>
  );
}

function PeopleSection({ user, students }: { user: User; students: StudentProgress[] }) {
  return (
    <section>
      <div className="section-title compact-title"><div><span className="eyebrow">Comunidad del aula</span><h2>Participantes</h2></div></div>
      <div className="people-grid"><article><span className="avatar large">PE</span><div><strong>Profesor de Estática</strong><small>Docente · Coordinación del curso</small></div></article><article><span className="avatar large">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{roleLabel(user.role)} · {user.email}</small></div></article>{students.filter((student) => student.email.toLowerCase() !== user.email.toLowerCase()).map((student) => <article key={student.userId}><span className="avatar large">{initials(student.name)}</span><div><strong>{student.name}</strong><small>Estudiante · {student.email}</small></div></article>)}</div>
    </section>
  );
}

function CalendarView() {
  const events = [
    ["18 AGO", "Estática · RA1", "Práctica de sistemas de fuerzas"],
    ["01 SEP", "Termodinámica Aplicada", "Test 01"],
    ["08 OCT", "Termodinámica Aplicada", "Evaluación 01 · Primera y Segunda ley"],
    ["26 NOV", "Termodinámica Aplicada", "Evaluación 02 · Combustión y ciclos de vapor"],
  ];
  return <section><div className="dashboard-hero small"><div><span className="eyebrow">Planificación</span><h1>Calendario académico</h1><p>Una vista rápida de prácticas y evaluaciones del semestre.</p></div></div><div className="timeline">{events.map(([date, title, detail]) => <article key={`${date}-${title}`}><time>{date}</time><div><strong>{title}</strong><p>{detail}</p></div></article>)}</div></section>;
}

function ResourcesView() {
  return <section><div className="dashboard-hero small"><div><span className="eyebrow">Biblioteca central</span><h1>Recursos de estudio</h1><p>Accede al contenido matemático y descarga la aplicación.</p></div></div><div className="resource-cards"><a href="/biblioteca/index.html"><span>∫</span><h2>Banco de certámenes</h2><p>Ejercicios completos, pautas, pistas y notación matemática.</p><b>Abrir biblioteca →</b></a><a href={APK_URL}><span>↓</span><h2>App para Android</h2><p>Instala el APK en Samsung y otros equipos Android.</p><b>Descargar →</b></a><a href="https://chatgpt.com" target="_blank" rel="noreferrer"><span>AI</span><h2>Tutor con inteligencia artificial</h2><p>Abre ChatGPT para resolver dudas con contexto.</p><b>Abrir tutor →</b></a></div></section>;
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
  return <section><div className="dashboard-hero small"><div><span className="eyebrow">Control desarrollador</span><h1>Administración de cuentas</h1><p>Supervisa los rangos detectados automáticamente por el dominio institucional y conserva el control general de la plataforma.</p></div></div><div className="admin-table"><div className="admin-head"><span>Cuenta</span><span>Rango</span><span>Acción</span></div>{accounts.map((account) => <div className="admin-row" key={account.id}><span><b>{account.name}</b><small>{account.email}</small></span><span className={`role-chip ${account.role}`}>{roleLabel(account.role)}</span><span>{account.role !== "owner" && <select value={account.role} onChange={(event) => changeRole(account.id, event.target.value as "teacher" | "student")}><option value="student">Estudiante</option><option value="teacher">Profesor UBB</option></select>}</span></div>)}</div>{message && <p className="tool-status">{message}</p>}</section>;
}

function InstallHelp({ close }: { close: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"><button className="modal-close" onClick={close} type="button">×</button><span className="eyebrow">Instalación multiplataforma</span><h2 id="install-title">Usa Centro de Estudio UBB como una app</h2><div className="install-options"><div><strong>iPhone y iPad</strong><p>Abre la página en Safari, toca Compartir y elige “Agregar a pantalla de inicio”.</p></div><div><strong>Android</strong><p>En Chrome, abre el menú y selecciona “Instalar aplicación”, o descarga el APK.</p><a href={APK_URL}>Descargar APK</a></div><div><strong>Windows, Mac y Linux</strong><p>En Chrome o Edge, presiona el icono de instalación ubicado junto a la dirección web.</p></div></div><button className="primary-button" onClick={close} type="button">Entendido</button></section></div>;
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

function kindLabel(kind: Post["kind"]) {
  return kind === "assessment" ? "Evaluación" : kind === "guide" ? "Guía" : kind === "resource" ? "Recurso" : "Aviso";
}

function firebasePostKind(value: string): Post["kind"] {
  const normalized = value.toLowerCase();
  if (normalized === "assessment" || normalized === "evaluacion" || normalized === "dictamen") return "assessment";
  if (normalized === "guide" || normalized === "guia") return "guide";
  if (normalized === "resource" || normalized === "recurso") return "resource";
  return "notice";
}

function tabTitle(tab: "home" | "materials" | "progress" | "people") {
  return tab === "materials" ? "Materiales del curso" : tab === "progress" ? "Progreso y monitoreo" : tab === "people" ? "Participantes" : "Portada del curso";
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
