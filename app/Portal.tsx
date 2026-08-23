"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { Books, CalendarBlank, FolderSimple, House, Stack } from "@phosphor-icons/react";
import {
  useExternalLinks,
  useHardwareBack,
  useIsMobileApp,
  useStatusBar,
} from "../lib/mobile-bridge";
import { MobileBottomNav, type MobileTab } from "./mobile-shell";
import { COURSES, Course, courseById } from "../lib/courses";
import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import { PortalHeader, PortalMainView, PortalSidebar } from "./portal-shell";
import { MobileCoursePreviewSheet, MobileCoursesSheet } from "./portal-sheets";
import { SEEN_KEY, navItems, navReducer, readSeen, type Screen } from "./portal-types";
import {
  calendarEntries,
  forgetPhoto,
  loadCurrentSession,
  loadEnrolledSectionMemberships,
  rememberPhoto,
  type User,
} from "../lib/portal-utils";
import { CommandPalette, type PaletteItem } from "./command-palette";
import { sectionRoleFor, type SectionMembership } from "../lib/section-roles";

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

export function AccessScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
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
            Universidad del Bío-Bío. <Link href="/privacidad">Privacidad</Link> ·{" "}
            <Link href="/terminos">Términos</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export function Portal() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [navState, dispatchNav] = useReducer(navReducer, {
    screen: "courses",
    course: null,
    coursesSheet: false,
    preview: null,
  });
  const { screen, course, preview, coursesSheet } = navState;
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
  const [memberships, setMemberships] = useState<SectionMembership[]>([]);
  const [seen, setSeen] = useState<Record<string, string>>(() => readSeen());

  const mobile = useIsMobileApp();
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

  useEffect(() => {
    let alive = true;
    loadCurrentSession()
      .then(({ user: current, memberships: currentMemberships }) => {
        if (!alive) return;
        setUser(current);
        if (currentMemberships.length > 0) setMemberships(currentMemberships);
        setChecking(false);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const courses = useMemo(() => COURSES, []);
  const sectionIds = useMemo(
    () => memberships.map((membership) => membership.sectionId),
    [memberships]
  );

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
    dispatchNav({ type: "LOGOUT" });
  };

  if (checking) return <LoadingScreen />;
  if (!user) return <AccessScreen onSignedIn={setUser} />;

  const openedCourse = course ?? courseById(COURSES[0].id);
  const openedSectionRole = openedCourse ? sectionRoleFor(memberships, openedCourse.id) : null;
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
          <PortalMainView
            activity={activity}
            courses={courses}
            entries={entries}
            gradebooks={gradebooks}
            openCourse={openCourse}
            openedCourse={openedCourse}
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
