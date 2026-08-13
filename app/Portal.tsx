"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { Archive, Books, CalendarBlank, FolderSimple, House, SignOut, Sliders } from "@phosphor-icons/react";
import { signInWithInstitutionalGoogle } from "../lib/firebase-client";
import { COURSES, Course, courseById, PERIOD } from "../lib/courses";
import { CourseActivity, CourseGradebook, watchCourseActivity, watchGradebooks } from "../lib/firebase-classroom-client";
import { AdminView, CalendarView, CoursesDashboard, ResourcesView } from "./portal-views";
import { Avatar, Screen } from "./portal-ui";
import { calendarEntries, firstName, forgetPhoto, loadCurrentSession, rememberPhoto, roleLabel, type User } from "../lib/portal-utils";
import { Menu } from "./animated-menu";

const Classroom = dynamic(() => import("./Classroom"), {
  ssr: false,
  loading: () => <div className="empty-state"><strong>Abriendo el aula…</strong></div>,
});

const SEEN_KEY = "ceoubb:seen";

type Screen = "courses" | "course" | "calendar" | "resources" | "admin";

const navItems = [
  { key: "courses", label: "Área personal", Icon: House },
  { key: "calendar", label: "Calendario", Icon: CalendarBlank },
  { key: "resources", label: "Recursos", Icon: Books },
  { key: "admin", label: "Administración", Icon: Sliders },
] as const;

function readSeen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const saved = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "{}");
    return saved && typeof saved === "object" ? saved as Record<string, string> : {};
  } catch {
    return {};
  }
}

export function Portal() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<Screen>("courses");
  const [course, setCourse] = useState<Course | null>(null);
  const [activity, setActivity] = useState<CourseActivity[]>([]);
  const [gradebooks, setGradebooks] = useState<CourseGradebook[]>([]);
  const [seen, setSeen] = useState<Record<string, string>>(readSeen);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let active = true;
    loadCurrentSession()
      .then((sessionUser) => {
        if (active) setUser(sessionUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const stopActivity = watchCourseActivity(setActivity, () => undefined);
    const stopGradebooks = watchGradebooks(setGradebooks, () => undefined);
    return () => {
      stopActivity();
      stopGradebooks();
    };
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  const courses = COURSES;
  const entries = useMemo(() => calendarEntries(courses, gradebooks), [courses, gradebooks]);

  const openCourse = (next: Course) => {
    const merged = { ...seen, [next.id]: new Date().toISOString() };
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
    } catch {
      // sin almacenamiento local los avisos se vuelven a marcar como nuevos
    }
    setSeen(merged);
    setCourse(next);
    setScreen("course");
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        // Fallback gracefully on response error
      }
    } catch {
      // Ignore network failure
    }
    forgetPhoto();
    setUser(null);
    setCourse(null);
    setScreen("courses");
  };

  if (checking) return <LoadingScreen />;
  if (!user) return <AccessScreen onSignedIn={setUser} />;

  const openedCourse = course ?? courseById(COURSES[0].id);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="app-shell" data-sidebar={sidebarOpen ? "open" : "closed"}>
          <PortalHeader sidebarOpen={sidebarOpen} user={user} onLogout={logout} onHome={() => setScreen("courses")} toggleSidebar={() => setSidebarOpen((open) => !open)} />
          <PortalSidebar
            courses={courses}
            openCourse={openCourse}
            openCourseId={screen === "course" ? openedCourse?.id : undefined}
            screen={screen}
            setScreen={setScreen}
            user={user}
          />
          <button aria-label="Cerrar el menú" className="sidebar-scrim" onClick={() => setSidebarOpen(false)} type="button" />
          <main className="app-main">
            <AnimatePresence initial={false} mode="wait">
              {screen === "course" && openedCourse ? (
                <Screen key={`course-${openedCourse.id}`}><Classroom course={openedCourse} user={user} goBack={() => setScreen("courses")} /></Screen>
              ) : (
                <Screen key={screen}>
                  <div className="portal-main">
                    {screen === "courses" && <CoursesDashboard user={user} courses={courses} activity={activity} seen={seen} entries={entries} openCourse={openCourse} />}
                    {screen === "calendar" && <CalendarView courses={courses} entries={entries} />}
                    {screen === "resources" && <ResourcesView courses={courses} />}
                    {screen === "admin" && user.role === "owner" && <AdminView />}
                  </div>
                </Screen>
              )}
            </AnimatePresence>
          </main>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-orbit"><Image src="/brand/ubb-shield.webp" alt="" aria-hidden="true" width={388} height={594} /></div>
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
    if (!response.ok) {
      let errorMessage = "No fue posible continuar.";
      try {
        const errorData = await response.json();
        if (errorData?.error) errorMessage = errorData.error;
      } catch {
        // Non-JSON response
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
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
          <Image src="/brand/ubb-shield.webp" alt="Escudo de la Universidad del Bío-Bío" width={388} height={594} priority />
          <h1>Centro de <strong>Estudio UBB</strong></h1>
        </div>
      </section>
      <section className="access-panel">
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <h2>Ingresa con tu correo institucional</h2>
            <button className="google-button" disabled={working} onClick={googleAccess} type="button">
              {working ? <span className="google-spinner" aria-hidden="true" /> : <Image src="/brand/google-g.webp" alt="" aria-hidden="true" width={256} height={256} />}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="institution-note"><strong>Acceso exclusivo UBB.</strong> Usa tu cuenta @alumnos.ubiobio.cl o @ubiobio.cl. Cualquier otra universidad o correo personal será rechazado.</p>
          </div>
          <div className="store-block">
            <div className="store-badges" role="group" aria-label="Aplicaciones móviles próximamente disponibles">
              <div className="store-badge">
                <Image src="/brand/app-store-badge-es.webp" alt="App Store" width={3840} height={1284} />
              </div>
              <div className="store-badge">
                <Image src="/brand/google-play-badge-es.webp" alt="Google Play" width={2214} height={675} />
              </div>
            </div>
          </div>
          <p className="legal-note">Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la Universidad del Bío-Bío. <Link href="/privacidad">Privacidad</Link></p>
        </div>
      </section>
    </main>
  );
}

function PortalHeader({ sidebarOpen, user, onLogout, onHome, toggleSidebar }: { sidebarOpen: boolean; user: User; onLogout: () => void; onHome: () => void; toggleSidebar: () => void }) {
  return (
    <header className="app-header">
      <button aria-expanded={sidebarOpen} aria-label={sidebarOpen ? "Cerrar el menú" : "Abrir el menú"} className="icon-button menu-button" onClick={toggleSidebar} type="button"><Menu animate={sidebarOpen} aria-hidden="true" /></button>
      <button className="app-brand" onClick={onHome} type="button">
        <Image src="/brand/ubb-shield.webp" alt="" aria-hidden="true" width={388} height={594} />
        <span><strong>Centro de Estudio UBB</strong><small>Plataforma de estudio · {PERIOD}</small></span>
      </button>
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

function PortalSidebar({ user, screen, courses, openCourseId, setScreen, openCourse }: { user: User; screen: Screen; courses: Course[]; openCourseId?: string; setScreen: (screen: Screen) => void; openCourse: (course: Course) => void }) {
  return (
    <aside className="app-sidebar">
      <nav aria-label="Navegación principal" className="side-nav">
        {navItems.filter((item) => item.key !== "admin" || user.role === "owner").map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button aria-current={active ? "page" : undefined} className={active ? "side-item active" : "side-item"} key={key} onClick={() => setScreen(key)} type="button">
              <span className="side-icon"><Icon size={18} /></span>
              <span className="side-label">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="side-group">
        <span className="eyebrow">Mis ramos</span>
        {courses.map((course) => {
          return (
          <button
            aria-current={openCourseId === course.id ? "page" : undefined}
            className={openCourseId === course.id ? "side-item active" : "side-item"}
            key={course.id}
            onClick={() => openCourse(course)}
            style={{ "--course-tone": course.tone } as React.CSSProperties}
            type="button"
          >
            <span className="side-icon tone"><FolderSimple size={24} weight="fill" /></span>
            <span className="side-label">{course.name}<small>{course.code}</small></span>
          </button>
          );
        })}
      </div>
      <Link className="side-item side-foot" href="/biblioteca/index.html">
        <span className="side-icon"><Archive size={18} /></span>
        <span className="side-label">Biblioteca académica</span>
      </Link>
    </aside>
  );
}
