"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import {
  Bell,
  Books,
  CalendarBlank,
  ChalkboardTeacher,
  FolderSimple,
  GraduationCap,
  House,
  Stack,
} from "@phosphor-icons/react";
import {
  useExternalLinks,
  useHardwareBack,
  useIsMobileApp,
  useStatusBar,
} from "../lib/mobile-bridge";
import { MobileBottomNav, type MobileTab } from "./mobile-shell";
import {
  COURSES,
  parseAcademicSections,
  partitionAcademicCourses,
  type AcademicSectionSummary,
  type Course,
} from "../lib/courses";
import { loadMyCourses } from "../lib/teacher-course-client";
import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import { PortalHeader, PortalMainView, PortalSidebar } from "./portal-shell";
import { MobileCoursePreviewSheet, MobileCoursesSheet } from "./portal-sheets";
import {
  SEEN_KEY,
  SETTINGS_SCREEN_LABEL,
  navItems,
  navReducer,
  readSeen,
  type Screen,
} from "./portal-types";
import {
  calendarEntries,
  forgetPhoto,
  loadArchivedAcademicSections,
  loadCurrentSession,
  loadEnrolledSectionMemberships,
  rememberPhoto,
  type SessionState,
  type User,
} from "../lib/portal-utils";
import { CommandPalette, type PaletteItem } from "./command-palette";
import {
  parseSectionMemberships,
  sectionRoleFor,
  type SectionMembership,
} from "../lib/section-roles";
import {
  announcementCursorKey,
  deriveNotifications,
  firebaseUserId,
  threadCursorKey,
  unreadCommunicationCount,
  unreadCursorKeys,
  type CommunicationState,
  type NotificationItem,
} from "../lib/communications.ts";
import { forgetPreferences, useReducedMotionPreference } from "../lib/user-preferences";

const SKELETON_COURSES = [0, 1, 2, 3, 4, 5];
const SKELETON_NAV = [0, 1, 2];
const SKELETON_SIDE_COURSES = [0, 1, 2, 3, 4];

export function LoadingScreen() {
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

export function AccessScreen({
  onSignedIn,
  onSignedInWithSession,
  isQuickAuthAvailable,
}: {
  onSignedIn?: (user: User) => void;
  onSignedInWithSession?: (session: SessionState) => void;
  isQuickAuthAvailable?: boolean;
}) {
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
      if (data.sections && onSignedInWithSession) {
        onSignedInWithSession({
          user: data.user,
          sectionIds: Array.isArray(data.sectionIds)
            ? data.sectionIds.filter((value: unknown): value is string => typeof value === "string")
            : [],
          memberships: parseSectionMemberships(data.memberships),
          sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
          archivedNextCursor:
            typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
        });
      } else if (onSignedIn) {
        onSignedIn(data.user);
      }
    },
    [onSignedIn, onSignedInWithSession]
  );

  const googleAccess = async () => {
    setError("");
    setWorking(true);
    try {
      const { signInWithInstitutionalGoogle } = await import("../lib/firebase-client");
      const idToken = await signInWithInstitutionalGoogle();
      await finishGoogleAccess(idToken);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible continuar.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  const quickAuthActive =
    isQuickAuthAvailable ??
    (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview");

  const devAccess = async (role: "student" | "teacher") => {
    setError("");
    setWorking(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        let errorMessage = "No fue posible acceder en modo testing.";
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
      if (data.sections && onSignedInWithSession) {
        onSignedInWithSession({
          user: data.user,
          sectionIds: Array.isArray(data.sectionIds)
            ? data.sectionIds.filter((value: unknown): value is string => typeof value === "string")
            : [],
          memberships: parseSectionMemberships(data.memberships),
          sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
          archivedNextCursor:
            typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
        });
      } else if (onSignedIn) {
        onSignedIn(data.user);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible acceder.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="access-page">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
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
      <section
        aria-labelledby="access-title"
        className="access-panel"
        id="contenido-principal"
        tabIndex={-1}
      >
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <span className="login-rule" aria-hidden="true" />
            <h2 id="access-title">Ingresa con tu correo institucional</h2>
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
                  priority
                />
              )}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            {quickAuthActive && (
              <div
                className="dev-auth-container"
                role="region"
                aria-label="Accesos rápidos de testing"
              >
                <div className="dev-auth-divider">
                  <span>Accesos rápidos de prueba</span>
                </div>
                <div className="dev-auth-actions">
                  <button
                    className="dev-auth-button dev-auth-button-student"
                    disabled={working}
                    onClick={() => devAccess("student")}
                    type="button"
                  >
                    <GraduationCap aria-hidden="true" size={18} weight="bold" />
                    <span>Entrar como estudiante</span>
                  </button>
                  <button
                    className="dev-auth-button dev-auth-button-teacher"
                    disabled={working}
                    onClick={() => devAccess("teacher")}
                    type="button"
                  >
                    <ChalkboardTeacher aria-hidden="true" size={18} weight="bold" />
                    <span>Entrar como docente</span>
                  </button>
                </div>
              </div>
            )}
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
            Universidad del Bío-Bío. <Link href="/faq">Preguntas frecuentes</Link> ·{" "}
            <Link href="/contacto">Contacto</Link> · <Link href="/privacidad">Privacidad</Link> ·{" "}
            <Link href="/terminos">Términos</Link> ·{" "}
            <Link href="/accesibilidad">Accesibilidad</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export function Portal({
  initialSession,
  isQuickAuthAvailable,
}: {
  initialSession?: SessionState;
  isQuickAuthAvailable?: boolean;
} = {}) {
  const [user, setUser] = useState<User | null>(
    initialSession !== undefined ? initialSession.user : null
  );
  const [checking, setChecking] = useState(initialSession === undefined);
  const [navState, dispatchNav] = useReducer(navReducer, {
    screen: "courses",
    course: null,
    coursesSheet: false,
    preview: null,
    focusThread: "",
  });
  const { screen, course, preview, coursesSheet, focusThread } = navState;
  const setScreen = useCallback((s: Screen) => dispatchNav({ type: "SET_SCREEN", screen: s }), []);
  const setCoursesSheet = useCallback(
    (open: boolean) => dispatchNav({ type: "SET_COURSES_SHEET", open }),
    []
  );
  const setPreview = useCallback(
    (p: Course | null) => dispatchNav({ type: "SET_PREVIEW", preview: p }),
    []
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activity, setActivity] = useState<CourseActivity[]>([]);
  const [gradebooks, setGradebooks] = useState<CourseGradebook[]>([]);
  const [memberships, setMemberships] = useState<SectionMembership[]>(
    initialSession ? initialSession.memberships : []
  );
  const [academicSections, setAcademicSections] = useState<AcademicSectionSummary[] | null>(
    initialSession ? initialSession.sections : null
  );
  const [archivedNextCursor, setArchivedNextCursor] = useState<string | null>(
    initialSession ? initialSession.archivedNextCursor : null
  );
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [communications, setCommunications] = useState<CommunicationState>({
    threads: [],
    cursors: [],
  });
  const [communicationError, setCommunicationError] = useState("");
  const [seen, setSeen] = useState<Record<string, string>>(() => readSeen());
  const previousView = useRef<string | null>(null);

  const mobile = useIsMobileApp();
  /*
    La preferencia del usuario sólo puede sumar supresión de movimiento: con
    "user" Motion ya respeta `prefers-reduced-motion`, y "always" la impone
    cuando la cuenta lo pidió desde Configuración.
  */
  // Implements: REQ-CFG-05
  const prefersReducedMotion = useReducedMotionPreference(user !== null);
  useStatusBar(user !== null ? "canvas" : "hero");
  useExternalLinks();

  const handleHardwareBack = useCallback(() => {
    const dialog = document.querySelector("dialog[open]");
    if (dialog instanceof HTMLDialogElement) {
      dialog.close();
      return true;
    }
    if (coursesSheet) {
      setCoursesSheet(false);
      return true;
    }
    if (preview) {
      setPreview(null);
      return true;
    }
    if (searchOpen) {
      setSearchOpen(false);
      return true;
    }
    if (sidebarOpen) {
      setSidebarOpen(false);
      return true;
    }
    if (screen !== "courses") {
      setScreen("courses");
      return true;
    }
    return false;
  }, [
    coursesSheet,
    preview,
    searchOpen,
    sidebarOpen,
    screen,
    setCoursesSheet,
    setPreview,
    setScreen,
  ]);

  useHardwareBack(handleHardwareBack);

  const refreshCourses = useCallback(async () => {
    const session = await loadCurrentSession();
    if (session.sections) {
      setAcademicSections(session.sections);
    }
    await loadMyCourses();
  }, []);

  useEffect(() => {
    if (initialSession !== undefined && initialSession.user !== null) return;
    let alive = true;
    loadCurrentSession()
      .then(
        ({
          user: current,
          memberships: currentMemberships,
          sections,
          archivedNextCursor: nextArchivedCursor,
        }) => {
          if (!alive) return;
          if (current) {
            setUser(current);
            if (currentMemberships.length > 0) setMemberships(currentMemberships);
            setAcademicSections(sections);
            setArchivedNextCursor(nextArchivedCursor);
          }
          setChecking(false);
        }
      )
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [initialSession]);

  const { current, archived } = useMemo(
    () =>
      academicSections === null
        ? { current: COURSES, archived: [] }
        : partitionAcademicCourses(academicSections),
    [academicSections]
  );
  const courses = current;
  const archivedCourses = archived;
  const sectionIds = useMemo(() => current.map((item) => item.id), [current]);

  const loadMoreArchived = useCallback(async () => {
    if (!archivedNextCursor || archivedLoading) return;
    setArchivedLoading(true);
    const page = await loadArchivedAcademicSections(archivedNextCursor);
    setAcademicSections((existing) => {
      const byId = new Map((existing ?? []).map((section) => [section.seccionId, section]));
      for (const section of page.sections) byId.set(section.seccionId, section);
      return [...byId.values()];
    });
    setArchivedNextCursor(page.nextCursor);
    setArchivedLoading(false);
  }, [archivedLoading, archivedNextCursor]);

  // Implements: REQ-PERF-01, REQ-ASST-01, REQ-ASST-02
  useEffect(() => {
    if (!user || memberships.length > 0) return;
    let alive = true;
    loadEnrolledSectionMemberships().then((currentMemberships) => {
      if (alive && currentMemberships.length > 0) setMemberships(currentMemberships);
    });
    return () => {
      alive = false;
    };
  }, [user, memberships.length]);

  useEffect(() => {
    if (!user || sectionIds.length === 0) return;
    let alive = true;
    let unsub: (() => void) | undefined;
    import("../lib/firebase-classroom-client").then(({ watchCourseActivity }) => {
      if (!alive) return;
      unsub = watchCourseActivity(sectionIds, setActivity, () => {});
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [user, sectionIds]);

  useEffect(() => {
    if (!user || memberships.length === 0) return;
    let alive = true;
    let unsub: (() => void) | undefined;
    import("../lib/firebase-classroom-client").then(({ watchCommunications }) => {
      if (!alive) return;
      unsub = watchCommunications(
        memberships,
        user.role,
        (state) => {
          setCommunications({ ...state, ready: true });
          setCommunicationError("");
        },
        setCommunicationError
      );
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [user, memberships]);

  useEffect(() => {
    if (!user || sectionIds.length === 0) return;
    let alive = true;
    let unsub: (() => void) | undefined;
    import("../lib/firebase-classroom-client").then(({ watchGradebooks }) => {
      if (!alive) return;
      unsub = watchGradebooks(sectionIds, setGradebooks, () => {});
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [user, sectionIds]);

  useEffect(() => {
    if (!user) return;
    import("../lib/push-notifications").then(({ registerPushNotifications }) => {
      registerPushNotifications().catch(() => {});
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      previousView.current = null;
      return;
    }
    const view = [screen, course?.id ?? ""].join(":");
    if (previousView.current === null) {
      previousView.current = view;
      return;
    }
    if (previousView.current === view) return;
    previousView.current = view;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#contenido-principal")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [course?.id, screen, user]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entries = useMemo(() => calendarEntries(courses, gradebooks), [courses, gradebooks]);
  const unreadCommunications = useMemo(
    () =>
      user
        ? unreadCommunicationCount(
            activity,
            communications.threads,
            communications.cursors,
            firebaseUserId(user.id)
          )
        : 0,
    [activity, communications, user]
  );
  // Implements: REQ-NOTIF-02
  const notifications = useMemo(
    () =>
      user
        ? deriveNotifications(
            activity,
            communications.threads,
            communications.cursors,
            firebaseUserId(user.id),
            courses
          )
        : [],
    [activity, communications, courses, user]
  );
  const notificationsLoading = memberships.length > 0 && !communications.ready;

  const enterCourse = (next: Course) => {
    const latest = activity.find((item) => item.courseId === next.id)?.createdAt;
    const merged = latest ? { ...seen, [next.id]: latest } : seen;
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
    } catch {
      // sin almacenamiento local los avisos se vuelven a marcar como nuevos
    }
    setSeen(merged);
    dispatchNav({ type: "ENTER_COURSE", course: next });
  };

  const openCourse = (next: Course) => (mobile ? setPreview(next) : enterCourse(next));

  const persistRead = (keys: readonly string[]) => {
    if (keys.length === 0) return;
    void import("../lib/firebase-classroom-client").then(({ markCommunicationRead }) =>
      markCommunicationRead(keys).catch(() => {
        setCommunicationError("No se pudo actualizar el estado de lectura.");
      })
    );
  };

  // Implements: REQ-NOTIF-03
  const openNotification = (item: NotificationItem) => {
    if (item.source === "announcement") {
      persistRead([announcementCursorKey(item.courseId)]);
      const target = courses.find((course) => course.id === item.courseId);
      if (target) enterCourse(target);
      return;
    }
    const threadId = item.threadId ?? "";
    persistRead([threadCursorKey(item.courseId, threadId)]);
    dispatchNav({ type: "OPEN_THREAD", key: `${item.courseId}:${threadId}` });
  };

  // Implements: REQ-NOTIF-04
  const markAllNotifications = () => {
    persistRead(unreadCursorKeys(notifications));
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
    forgetPreferences();
    setCommunications({ threads: [], cursors: [] });
    setCommunicationError("");
    setActivity([]);
    setGradebooks([]);
    setUser(null);
    setMemberships([]);
    setAcademicSections(null);
    setArchivedNextCursor(null);
    dispatchNav({ type: "LOGOUT" });
  };

  const finishSignedInWithSession = useCallback((session: SessionState) => {
    setUser(session.user);
    setMemberships(session.memberships);
    setAcademicSections(session.sections ?? []);
    setArchivedNextCursor(session.archivedNextCursor);
    setChecking(false);
  }, []);

  const finishSignedIn = useCallback(async (signedInUser: User) => {
    setChecking(true);
    const session = await loadCurrentSession();
    setUser(session.user ?? signedInUser);
    setMemberships(session.memberships);
    setAcademicSections(session.sections ?? []);
    setArchivedNextCursor(session.archivedNextCursor);
    setChecking(false);
  }, []);

  if (checking) return <LoadingScreen />;
  if (!user) {
    return (
      <AccessScreen
        isQuickAuthAvailable={isQuickAuthAvailable}
        onSignedIn={finishSignedIn}
        onSignedInWithSession={finishSignedInWithSession}
      />
    );
  }

  const openedCourse = course ?? courses[0] ?? archivedCourses[0] ?? null;
  const openedSectionRole = openedCourse
    ? (openedCourse.sectionRole ?? sectionRoleFor(memberships, openedCourse.id))
    : null;
  const views = navItems.filter(
    (item) =>
      (item.key !== "admin" || user.role === "owner") &&
      (item.key !== "teacher" || user.role === "teacher" || user.role === "owner")
  );
  const context =
    screen === "course" && openedCourse
      ? openedCourse.name
      : screen === "settings"
        ? SETTINGS_SCREEN_LABEL
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
      key: "notifications",
      label: "Avisos",
      Icon: Bell,
      active: screen === "notifications",
      onSelect: () => setScreen("notifications"),
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
      <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "user"}>
        <a className="skip-link" href="#contenido-principal">
          Saltar al contenido principal
        </a>
        <div
          className="app-shell"
          data-requirement="Implements: REQ-A11Y-01 REQ-A11Y-02 REQ-A11Y-05"
          data-mobile={mobile}
          data-sidebar={sidebarOpen ? "open" : "closed"}
        >
          <PortalHeader
            context={context}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            onHome={() => setScreen("courses")}
            onCommunications={() => setScreen("notifications")}
            onLogout={logout}
            onMarkAllNotifications={markAllNotifications}
            onOpenNotification={openNotification}
            onSearch={() => setSearchOpen(true)}
            onSettings={() => setScreen("settings")}
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen((open) => !open)}
            unreadCommunications={unreadCommunications}
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
          <PortalMainView
            activity={activity}
            archivedCourses={archivedCourses}
            archivedHasMore={archivedNextCursor !== null}
            archivedLoading={archivedLoading}
            communicationCursors={communications.cursors}
            communicationError={communicationError}
            communicationThreads={communications.threads}
            courses={courses}
            focusThread={focusThread}
            onLogout={logout}
            onPhotoChange={(photoUrl) =>
              setUser((current) => (current ? { ...current, photoUrl } : current))
            }
            context={context}
            entries={entries}
            gradebooks={gradebooks}
            memberships={memberships}
            openCourse={openCourse}
            onLoadMoreArchived={loadMoreArchived}
            openedCourse={openedCourse}
            onCoursesChanged={refreshCourses}
            screen={screen}
            seen={seen}
            sectionRole={openedSectionRole}
            setScreen={setScreen}
            user={user}
          />
          {mobile && <MobileBottomNav items={mobileTabs} />}
          {mobile && (
            <MobileCoursesSheet
              courses={courses}
              onOpenChange={setCoursesSheet}
              open={coursesSheet}
              openCourse={openCourse}
              openedCourseId={openedCourse?.id}
              screen={screen}
            />
          )}
          {mobile && preview && (
            <MobileCoursePreviewSheet
              enterCourse={enterCourse}
              onClose={() => setPreview(null)}
              preview={preview}
            />
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
