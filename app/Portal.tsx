"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import {
  Archive,
  Books,
  CalendarBlank,
  CaretDown,
  FolderSimple,
  House,
  MagnifyingGlass,
  SignOut,
  Sliders,
  Stack,
} from "@phosphor-icons/react";
import { signInWithInstitutionalGoogle } from "../lib/firebase-client";
import {
  useExternalLinks,
  useHardwareBack,
  useIsMobileApp,
  useStatusBar,
} from "../lib/mobile-bridge";
import { MobileBottomNav, MobileSheet, type MobileTab } from "./mobile-shell";
import { registerPushNotifications } from "../lib/push-notifications";
import { COURSES, Course, courseById } from "../lib/courses";
import {
  CourseActivity,
  CourseGradebook,
  watchCourseActivity,
  watchGradebooks,
} from "../lib/firebase-classroom-client";
import { CoursesDashboard } from "./views/CoursesDashboard";
import { Avatar, Screen } from "./portal-ui";
import {
  calendarEntries,
  firstName,
  forgetPhoto,
  loadCurrentSession,
  rememberPhoto,
  roleLabel,
  type User,
} from "../lib/portal-utils";
import { Menu } from "./animated-menu";
import { CommandPalette, type PaletteItem } from "./command-palette";

// Implements: REQ-PERF-06
const CalendarView = dynamic(
  () => import("./views/calendar/CalendarView").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="empty-state">
        <strong>Cargando calendario…</strong>
      </div>
    ),
  }
);

const ResourcesView = dynamic(
  () => import("./views/resources/ResourcesView").then((m) => m.ResourcesView),
  {
    ssr: false,
    loading: () => (
      <div className="empty-state">
        <strong>Cargando recursos…</strong>
      </div>
    ),
  }
);

const AdminView = dynamic(() => import("./views/AdminView").then((m) => m.AdminView), {
  ssr: false,
  loading: () => (
    <div className="empty-state">
      <strong>Cargando administración…</strong>
    </div>
  ),
});

const Classroom = dynamic(() => import("./Classroom"), {
  ssr: false,
  loading: () => (
    <div className="empty-state">
      <strong>Abriendo el aula…</strong>
    </div>
  ),
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
    return saved && typeof saved === "object" ? (saved as Record<string, string>) : {};
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
  const [searchOpen, setSearchOpen] = useState(false);
  // En móvil el riel lateral no cabe: la lista de ramos y el detalle de una
  // asignatura pasan a hojas arrastrables sobre la barra del pulgar.
  const [coursesSheet, setCoursesSheet] = useState(false);
  const [preview, setPreview] = useState<Course | null>(null);
  const mobile = useIsMobileApp();

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
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    // Implements: REQ-CAP-10 — el token se pide con sesión ya abierta; si el
    // permiso está denegado la función se retira sola y la navegación sigue igual.
    void registerPushNotifications();
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setSearchOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Implements: REQ-CAP-07 — la franja de estado sigue a la superficie visible.
  useStatusBar(user ? "canvas" : "hero");
  // Implements: REQ-CAP-15
  useExternalLinks();
  useHardwareBack(
    useCallback(() => {
      /* Capacitor reemplaza el gesto atrás por completo: sin esto un `<dialog>` abierto
       —la búsqueda, el editor de bloques— manda la app al fondo en vez de cerrarse.
       Se resuelve una vez aquí, donde pasa cualquier diálogo nativo del portal. */
      const dialog = document.querySelector("dialog[open]");
      if (dialog instanceof HTMLDialogElement) return (dialog.close(), true);
      if (preview) return (setPreview(null), true);
      if (coursesSheet) return (setCoursesSheet(false), true);
      if (screen !== "courses") return (setScreen("courses"), true);
      // Desde la pestaña raíz nadie consume el gesto: la app se va al fondo.
      return false;
    }, [coursesSheet, preview, screen])
  );

  const courses = COURSES;
  const entries = useMemo(() => calendarEntries(courses, gradebooks), [courses, gradebooks]);

  const enterCourse = (next: Course) => {
    const merged = { ...seen, [next.id]: new Date().toISOString() };
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
    } catch {
      // sin almacenamiento local los avisos se vuelven a marcar como nuevos
    }
    setSeen(merged);
    setPreview(null);
    setCoursesSheet(false);
    setCourse(next);
    setScreen("course");
  };

  /*
    En móvil una tarjeta de ramo no salta directo al aula: abre la ficha en una hoja
    inferior, que es donde el pulgar ya está. El salto al aula queda a un toque.
  */
  // Implements: REQ-CAP-05
  const openCourse = (next: Course) => (mobile ? setPreview(next) : enterCourse(next));

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
  const views = navItems.filter((item) => item.key !== "admin" || user.role === "owner");
  const context =
    screen === "course" && openedCourse
      ? openedCourse.name
      : (views.find((item) => item.key === screen)?.label ?? "Área personal");

  const paletteItems: PaletteItem[] = [
    ...views.map(({ key, label, Icon }) => ({
      id: `view-${key}`,
      group: "Ir a",
      label,
      icon: <Icon size={18} />,
      run: () => setScreen(key),
    })),
    ...courses.map((item) => ({
      id: `course-${item.id}`,
      group: "Mis ramos",
      label: item.name,
      hint: item.code,
      tone: item.tone,
      icon: <FolderSimple size={20} weight="fill" />,
      run: () => openCourse(item),
    })),
  ];

  /*
    Implements: REQ-CAP-04 — Inicio, Cursos, Calendario y Recursos en la zona del pulgar.
    La cuarta pestaña decía «Biblioteca» y abría el HTML estático, mientras la vista
    titulada «Recursos de estudio» —que es la que contiene la biblioteca, los asistentes
    y los beneficios— no tenía pestaña y dejaba la barra sin ningún rótulo activo.
    Ahora el rótulo nombra su destino y la biblioteca entra desde la primera tarjeta.
  */
  const mobileTabs: MobileTab[] = [
    {
      key: "courses",
      label: "Inicio",
      Icon: House,
      active: screen === "courses",
      onSelect: () => setScreen("courses"),
    },
    {
      key: "list",
      label: "Cursos",
      Icon: Stack,
      active: screen === "course",
      onSelect: () => setCoursesSheet(true),
    },
    {
      key: "calendar",
      label: "Calendario",
      Icon: CalendarBlank,
      active: screen === "calendar",
      onSelect: () => setScreen("calendar"),
    },
    {
      key: "resources",
      label: "Recursos",
      Icon: Books,
      active: screen === "resources",
      onSelect: () => setScreen("resources"),
    },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div
          className="app-shell"
          data-mobile={mobile}
          data-sidebar={sidebarOpen ? "open" : "closed"}
        >
          <PortalHeader
            context={context}
            onHome={() => setScreen("courses")}
            onLogout={logout}
            onSearch={() => setSearchOpen(true)}
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen((open) => !open)}
            user={user}
          />
          <CommandPalette
            items={paletteItems}
            onClose={() => setSearchOpen(false)}
            open={searchOpen}
          />
          <PortalSidebar
            courses={courses}
            open={sidebarOpen}
            openCourse={openCourse}
            openCourseId={screen === "course" ? openedCourse?.id : undefined}
            screen={screen}
            setScreen={setScreen}
            user={user}
          />
          <button
            aria-label="Cerrar el menú"
            className="sidebar-scrim"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <main className="app-main">
            <AnimatePresence initial={false} mode="wait">
              {screen === "course" && openedCourse ? (
                <Screen key={`course-${openedCourse.id}`}>
                  <Classroom
                    course={openedCourse}
                    user={user}
                    goBack={() => setScreen("courses")}
                  />
                </Screen>
              ) : (
                <Screen key={screen}>
                  <div className="portal-main">
                    {screen === "courses" && (
                      <CoursesDashboard
                        user={user}
                        courses={courses}
                        activity={activity}
                        seen={seen}
                        entries={entries}
                        openCourse={openCourse}
                      />
                    )}
                    {screen === "calendar" && (
                      <CalendarView
                        courses={courses}
                        gradebooks={gradebooks}
                        activity={activity}
                        openCourse={openCourse}
                      />
                    )}
                    {screen === "resources" && <ResourcesView />}
                    {screen === "admin" && user.role === "owner" && <AdminView />}
                  </div>
                </Screen>
              )}
            </AnimatePresence>
          </main>
          {mobile && <MobileBottomNav items={mobileTabs} />}
          {mobile && (
            <MobileSheet
              onOpenChange={setCoursesSheet}
              open={coursesSheet}
              title="Mis ramos"
              description={courses[0]?.period ?? ""}
            >
              <div className="sheet-list">
                {courses.length === 0 && (
                  <p className="side-empty">
                    Sin ramos en este período. Aparecerán aquí al quedar inscritos.
                  </p>
                )}
                {courses.map((item) => (
                  <button
                    className="sheet-row"
                    data-active={screen === "course" && openedCourse?.id === item.id}
                    key={item.id}
                    onClick={() => openCourse(item)}
                    style={{ "--course-tone": item.tone } as React.CSSProperties}
                    type="button"
                  >
                    <span className="sheet-row-icon">
                      <FolderSimple size={20} weight="fill" />
                    </span>
                    <span>
                      {item.name}
                      <small>{item.code}</small>
                    </span>
                  </button>
                ))}
                <Link
                  className="sheet-row"
                  href="/biblioteca/index.html"
                  prefetch={false}
                  onClick={() => setCoursesSheet(false)}
                >
                  <span className="sheet-row-icon">
                    <Archive size={20} />
                  </span>
                  <span>Biblioteca académica</span>
                </Link>
                {user.role === "owner" && (
                  <button
                    className="sheet-row"
                    onClick={() => {
                      setCoursesSheet(false);
                      setScreen("admin");
                    }}
                    type="button"
                  >
                    <span className="sheet-row-icon">
                      <Sliders size={20} />
                    </span>
                    <span>Administración</span>
                  </button>
                )}
              </div>
            </MobileSheet>
          )}
          {mobile && preview && (
            <MobileSheet
              onOpenChange={(open) => !open && setPreview(null)}
              open
              title={preview.name}
              description={preview.eyebrow}
            >
              <dl className="sheet-facts">
                <div>
                  <dt>Código</dt>
                  <dd>{preview.code}</dd>
                </div>
                <div>
                  <dt>Sección</dt>
                  <dd>{preview.section}</dd>
                </div>
                <div>
                  <dt>Período</dt>
                  <dd>{preview.period}</dd>
                </div>
                <div>
                  <dt>Docente</dt>
                  <dd>{preview.teacher}</dd>
                </div>
              </dl>
              <button className="sheet-cta" onClick={() => enterCourse(preview)} type="button">
                Entrar al aula
              </button>
            </MobileSheet>
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

/*
  Carga — el esqueleto del portal, no una pantalla aparte.
  Reproduce la geometría real del shell (cabecera de papel con filete hairline,
  barra lateral de 268px, rejilla de ramos) con los bloques todavía en gris. Cuando la
  sesión resuelve, el contenido cae exactamente donde ya estaba dibujado: sin salto de
  layout y sin una pantalla intermedia que no se parezca a nada del producto.
  El barrido de luz es uno solo y cruza toda la página en diagonal — una ola, no
  veintitantos parpadeos sueltos. `--sk-delay` retrasa cada bloque contra esa ola.
*/
const SKELETON_COURSES = [0, 1, 2, 3, 4, 5];
const SKELETON_NAV = [0, 1, 2];
const SKELETON_SIDE_COURSES = [0, 1, 2, 3, 4];

function LoadingScreen() {
  return (
    <div aria-busy="true" className="boot-shell">
      <p className="sr-only" role="status">
        Abriendo Centro de Estudio UBB…
      </p>
      <header className="boot-header">
        <span className="sk sk-round boot-menu" />
        <Image
          src="/brand/ubb-shield.webp"
          alt=""
          aria-hidden="true"
          width={388}
          height={594}
          priority
        />
        <strong>Centro de Estudio UBB</strong>
        <span className="sk boot-search" style={{ "--sk-delay": "80ms" } as React.CSSProperties} />
        <span
          className="sk sk-round boot-avatar"
          style={{ "--sk-delay": "120ms" } as React.CSSProperties}
        />
      </header>
      <aside className="boot-side">
        {SKELETON_NAV.map((row) => (
          <span
            className="sk boot-row"
            key={`nav-${row}`}
            style={{ "--sk-delay": `${row * 45}ms` } as React.CSSProperties}
          />
        ))}
        <span className="sk boot-legend" style={{ "--sk-delay": "180ms" } as React.CSSProperties} />
        {SKELETON_SIDE_COURSES.map((row) => (
          <span
            className="sk boot-row"
            key={`course-${row}`}
            style={{ "--sk-delay": `${220 + row * 45}ms` } as React.CSSProperties}
          />
        ))}
      </aside>
      <main className="boot-main">
        <div className="boot-head">
          <span className="sk boot-title" style={{ "--sk-delay": "60ms" } as React.CSSProperties} />
          <span
            className="sk boot-subtitle"
            style={{ "--sk-delay": "110ms" } as React.CSSProperties}
          />
        </div>
        <span className="sk boot-strip" style={{ "--sk-delay": "160ms" } as React.CSSProperties} />
        <div className="boot-grid">
          {SKELETON_COURSES.map((card) => (
            <article
              className="boot-card"
              key={card}
              style={{ "--sk-delay": `${220 + card * 70}ms` } as React.CSSProperties}
            >
              <span className="sk boot-cover" />
              <span className="sk boot-line wide" />
              <span className="sk boot-line" />
              <span className="sk boot-line short" />
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

function AccessScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const finishGoogleAccess = useCallback(
    async (idToken: string) => {
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
    },
    [onSignedIn]
  );

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
          <Image
            src="/brand/ubb-shield.webp"
            alt="Escudo de la Universidad del Bío-Bío"
            width={388}
            height={594}
            priority
          />
          <h1>
            Centro de <strong>Estudio UBB</strong>
          </h1>
        </div>
      </section>
      <section className="access-panel">
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <span className="login-rule" aria-hidden="true" />
            <h2>Ingresa con tu correo institucional</h2>
            <button
              className="google-button"
              disabled={working}
              onClick={googleAccess}
              type="button"
            >
              {working ? (
                <span className="google-spinner" aria-hidden="true" />
              ) : (
                <Image
                  src="/brand/google-g.webp"
                  alt=""
                  aria-hidden="true"
                  width={256}
                  height={256}
                />
              )}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="institution-note">
              <strong>Acceso exclusivo UBB.</strong> Usa tu cuenta @alumnos.ubiobio.cl o
              @ubiobio.cl. Cualquier otra universidad o correo personal será rechazado.
            </p>
          </div>
          <div className="store-block">
            <div
              className="store-badges"
              role="group"
              aria-label="Aplicaciones móviles próximamente disponibles"
            >
              <div className="store-badge">
                <Image
                  src="/brand/app-store-badge-es.webp"
                  alt="App Store"
                  width={3840}
                  height={1284}
                />
              </div>
              <div className="store-badge">
                <Image
                  src="/brand/google-play-badge-es.webp"
                  alt="Google Play"
                  width={2214}
                  height={675}
                />
              </div>
            </div>
          </div>

          <p className="legal-note">
            Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la
            Universidad del Bío-Bío. <Link href="/privacidad">Privacidad</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function PortalHeader({
  sidebarOpen,
  user,
  context,
  onLogout,
  onHome,
  onSearch,
  toggleSidebar,
}: {
  sidebarOpen: boolean;
  user: User;
  context: string;
  onLogout: () => void;
  onHome: () => void;
  onSearch: () => void;
  toggleSidebar: () => void;
}) {
  // El atajo se rotula según el teclado real: ⌘K en Mac, Ctrl K en Windows y Linux.
  const shortcut =
    typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.userAgent)
      ? "⌘K"
      : "Ctrl K";
  const account = useRef<HTMLDetailsElement>(null);

  // El menú de cuenta es un <details>: el navegador no lo cierra al pulsar fuera ni con Escape.
  useEffect(() => {
    const dismiss = (event: Event) => {
      const menu = account.current;
      if (!menu?.open) return;
      if (event.type === "pointerdown") {
        if (!menu.contains(event.target as Node)) menu.open = false;
        return;
      }
      if ((event as KeyboardEvent).key !== "Escape") return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <header className="app-header">
      <button
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Cerrar el menú" : "Abrir el menú"}
        className="icon-button menu-button"
        onClick={toggleSidebar}
        type="button"
      >
        <Menu animate={sidebarOpen} aria-hidden="true" />
      </button>
      <button
        aria-label="Centro de Estudio UBB · ir al área personal"
        className="app-brand"
        onClick={onHome}
        type="button"
      >
        <Image src="/brand/ubb-shield.webp" alt="" aria-hidden="true" width={388} height={594} />
        <strong>Centro de Estudio UBB</strong>
      </button>
      <p className="header-context">
        <span aria-hidden="true" className="header-context-sep">
          /
        </span>
        <span className="header-context-label">{context}</span>
      </p>
      {/* El rótulo se oculta en pantallas angostas: el nombre accesible tiene que sobrevivir a eso. */}
      <button
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Buscar ramos y vistas"
        className="header-search"
        onClick={onSearch}
        type="button"
      >
        <MagnifyingGlass size={17} aria-hidden="true" />
        <span aria-hidden="true">Buscar ramos y vistas</span>
        <kbd aria-hidden="true">{shortcut}</kbd>
      </button>
      <div className="header-actions">
        <details className="account-menu" ref={account}>
          <summary>
            <Avatar email={user.email} name={user.name} />
            <span className="account-copy">
              <strong>{firstName(user.name)}</strong>
              <small>{roleLabel(user.role)}</small>
            </span>
            <CaretDown className="account-caret" size={13} weight="bold" aria-hidden="true" />
          </summary>
          <div className="account-popover">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <button onClick={onLogout} type="button">
              <SignOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}

function PortalSidebar({
  user,
  screen,
  courses,
  open,
  openCourseId,
  setScreen,
  openCourse,
}: {
  user: User;
  screen: Screen;
  courses: Course[];
  open: boolean;
  openCourseId?: string;
  setScreen: (screen: Screen) => void;
  openCourse: (course: Course) => void;
}) {
  return (
    // Con el menú plegado el panel sigue en el DOM para animar: `inert` lo saca del foco y del lector.
    <aside className="app-sidebar" inert={!open}>
      <nav aria-label="Navegación principal" className="side-nav">
        {navItems
          .filter((item) => item.key !== "admin" || user.role === "owner")
          .map(({ key, label, Icon }) => {
            const active = screen === key;
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={active ? "side-item active" : "side-item"}
                key={key}
                onClick={() => setScreen(key)}
                type="button"
              >
                <span className="side-icon">
                  <Icon size={18} />
                </span>
                <span className="side-label">{label}</span>
              </button>
            );
          })}
      </nav>
      <div className="side-group">
        <span className="eyebrow">Mis ramos</span>
        {courses.length === 0 && (
          <p className="side-empty">
            Sin ramos en este período. Aparecerán aquí al quedar inscritos.
          </p>
        )}
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
              <span className="side-icon tone">
                <FolderSimple size={18} weight="fill" />
              </span>
              <span className="side-label">
                <span className="side-name">{course.name}</span>
                <small>{course.code}</small>
              </span>
            </button>
          );
        })}
      </div>
      <Link className="side-item side-foot" href="/biblioteca/index.html" prefetch={false}>
        <span className="side-icon">
          <Archive size={18} />
        </span>
        <span className="side-label">Biblioteca académica</span>
      </Link>
    </aside>
  );
}
