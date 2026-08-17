"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { Books, CalendarBlank, FolderSimple, House, Stack } from "@phosphor-icons/react";
import {
  useExternalLinks,
  useHardwareBack,
  useIsMobileApp,
  useStatusBar,
} from "../lib/mobile-bridge";
import { MobileBottomNav, type MobileTab } from "./mobile-shell";
import { registerPushNotifications } from "../lib/push-notifications";
import { COURSES, Course, courseById } from "../lib/courses";
import {
  CourseActivity,
  CourseGradebook,
  watchCourseActivity,
  watchGradebooks,
} from "../lib/firebase-classroom-client";
import { CoursesDashboard } from "./views/CoursesDashboard";
import { Screen as PortalScreen } from "./portal-ui";
import { AccessScreen, LoadingScreen } from "./portal-screens";
import { PortalHeader, PortalSidebar } from "./portal-shell";
import { MobileCoursePreviewSheet, MobileCoursesSheet } from "./portal-sheets";
import { navItems, type NavAction, type NavState, type Screen } from "./portal-types";
import { calendarEntries, forgetPhoto, loadCurrentSession, type User } from "../lib/portal-utils";
import { CommandPalette, type PaletteItem } from "./command-palette";

const ViewSkeleton = ({ label }: { label: string }) => (
  <div className="boot-head" aria-busy="true" aria-label={label} role="status">
    <span className="boot-title sk" />
    <span className="boot-subtitle sk" />
    <div className="boot-strip sk" style={{ marginTop: "1rem" }} />
  </div>
);

// Implements: REQ-PERF-06
const CalendarView = dynamic(
  () => import("./views/calendar/CalendarView").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => <ViewSkeleton label="Cargando calendario…" />,
  }
);

const ResourcesView = dynamic(
  () => import("./views/resources/ResourcesView").then((m) => m.ResourcesView),
  {
    ssr: false,
    loading: () => <ViewSkeleton label="Cargando recursos…" />,
  }
);

const AdminView = dynamic(() => import("./views/AdminView").then((m) => m.AdminView), {
  ssr: false,
  loading: () => <ViewSkeleton label="Cargando administración…" />,
});

const Classroom = dynamic(() => import("./Classroom"), {
  ssr: false,
  loading: () => <ViewSkeleton label="Abriendo el aula…" />,
});

const SEEN_KEY = "ceoubb:seen";

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "SET_SCREEN":
      return { ...state, screen: action.screen };
    case "ENTER_COURSE":
      return {
        ...state,
        screen: "course",
        course: action.course,
        preview: null,
        coursesSheet: false,
      };
    case "SET_PREVIEW":
      return { ...state, preview: action.preview };
    case "SET_COURSES_SHEET":
      return { ...state, coursesSheet: action.open };
    case "LOGOUT":
      return {
        ...state,
        screen: "courses",
        course: null,
        preview: null,
        coursesSheet: false,
      };
    default:
      return state;
  }
}

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
  const [seen, setSeen] = useState<Record<string, string>>(() => readSeen());

  const mobile = useIsMobileApp();
  useStatusBar(user !== null ? "canvas" : "hero");
  useExternalLinks();

  const handleHardwareBack = useCallback(() => {
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
      .then((current) => {
        if (!alive) return;
        setUser(current);
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

  useEffect(() => {
    if (!user) return;
    return watchCourseActivity(setActivity, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchGradebooks(setGradebooks, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    registerPushNotifications().catch(() => {});
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
          <main className="app-main">
            <AnimatePresence initial={false} mode="wait">
              {screen === "course" && openedCourse ? (
                <PortalScreen key={`course-${openedCourse.id}`}>
                  <Classroom
                    course={openedCourse}
                    user={user}
                    goBack={() => setScreen("courses")}
                  />
                </PortalScreen>
              ) : (
                <PortalScreen key={screen}>
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
                </PortalScreen>
              )}
            </AnimatePresence>
          </main>
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
