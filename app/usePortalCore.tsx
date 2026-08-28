"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Bell, Books, CalendarBlank, FolderSimple, House, Stack } from "@phosphor-icons/react";
import {
  useExternalLinks,
  useHardwareBack,
  useIsMobileApp,
  useStatusBar,
} from "../lib/mobile-bridge";
import { COURSES, partitionAcademicCourses, type Course } from "../lib/courses";
import { loadMyCourses } from "../lib/teacher-course-client";
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
  type SessionState,
  type User,
} from "../lib/portal-utils";
import {
  announcementCursorKey,
  deriveNotifications,
  firebaseUserId,
  threadCursorKey,
  unreadCommunicationCount,
  unreadCursorKeys,
  type NotificationItem,
} from "../lib/communications.ts";
import { forgetPreferences, useReducedMotionPreference } from "../lib/user-preferences";
import { portalSessionReducer } from "./portal-session";
import { sectionRoleFor } from "../lib/section-roles";
import type { PaletteItem } from "./command-palette";
import type { MobileTab } from "./mobile-shell";

// Implements: REQ-QMD-01
export function usePortalCore(initialSession?: SessionState) {
  const [sessionState, dispatchSession] = useReducer(portalSessionReducer, {
    user: initialSession !== undefined ? initialSession.user : null,
    checking: initialSession === undefined,
    memberships: initialSession ? initialSession.memberships : [],
    academicSections: initialSession ? initialSession.sections : null,
    archivedNextCursor: initialSession ? initialSession.archivedNextCursor : null,
    archivedLoading: false,
    activity: [],
    gradebooks: [],
    communications: { threads: [], cursors: [] },
    communicationError: "",
  });

  const {
    user,
    checking,
    memberships,
    academicSections,
    archivedNextCursor,
    archivedLoading,
    activity,
    gradebooks,
    communications,
    communicationError,
  } = sessionState;

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
  const [seen, setSeen] = useState<Record<string, string>>(() => readSeen());
  const previousView = useRef<string | null>(null);

  const mobile = useIsMobileApp();
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
      dispatchSession({ type: "SET_ACADEMIC_SECTIONS", sections: session.sections });
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
          dispatchSession({
            type: "SESSION_LOADED",
            user: current,
            memberships: currentMemberships,
            sections,
            archivedNextCursor: nextArchivedCursor,
          });
        }
      )
      .catch(() => {
        if (!alive) return;
        dispatchSession({
          type: "SESSION_LOADED",
          user: null,
          memberships: [],
          sections: null,
          archivedNextCursor: null,
        });
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
    dispatchSession({ type: "SET_ARCHIVED_LOADING", loading: true });
    const page = await loadArchivedAcademicSections(archivedNextCursor);
    dispatchSession({
      type: "APPEND_ARCHIVED_SECTIONS",
      sections: page.sections,
      nextCursor: page.nextCursor,
    });
  }, [archivedLoading, archivedNextCursor]);

  // Implements: REQ-PERF-01, REQ-ASST-01, REQ-ASST-02
  useEffect(() => {
    if (!user || memberships.length > 0) return;
    let alive = true;
    loadEnrolledSectionMemberships().then((currentMemberships) => {
      if (alive && currentMemberships.length > 0) {
        dispatchSession({ type: "SET_MEMBERSHIPS", memberships: currentMemberships });
      }
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
      unsub = watchCourseActivity(
        sectionIds,
        (act) => dispatchSession({ type: "SET_ACTIVITY", activity: act }),
        () => {}
      );
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
          dispatchSession({
            type: "SET_COMMUNICATIONS",
            communications: { ...state, ready: true },
          });
        },
        (error) => {
          dispatchSession({ type: "SET_COMMUNICATION_ERROR", error });
        }
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
      unsub = watchGradebooks(
        sectionIds,
        (gb) => dispatchSession({ type: "SET_GRADEBOOKS", gradebooks: gb }),
        () => {}
      );
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

  const enterCourse = useCallback(
    (next: Course) => {
      const latest = activity.find((item) => item.courseId === next.id)?.createdAt;
      const merged = latest ? { ...seen, [next.id]: latest } : seen;
      try {
        window.localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
      } catch {
        // sin almacenamiento local los avisos se vuelven a marcar como nuevos
      }
      setSeen(merged);
      dispatchNav({ type: "ENTER_COURSE", course: next });
    },
    [activity, seen]
  );

  const openCourse = useCallback(
    (next: Course) => (mobile ? setPreview(next) : enterCourse(next)),
    [enterCourse, mobile, setPreview]
  );

  const persistRead = useCallback((keys: readonly string[]) => {
    if (keys.length === 0) return;
    void import("../lib/firebase-classroom-client").then(({ markCommunicationRead }) =>
      markCommunicationRead(keys).catch(() => {
        dispatchSession({
          type: "SET_COMMUNICATION_ERROR",
          error: "No se pudo actualizar el estado de lectura.",
        });
      })
    );
  }, []);

  // Implements: REQ-NOTIF-03
  const openNotification = useCallback(
    (item: NotificationItem) => {
      if (item.source === "announcement") {
        persistRead([announcementCursorKey(item.courseId)]);
        const target = courses.find((c) => c.id === item.courseId);
        if (target) enterCourse(target);
        return;
      }
      const threadId = item.threadId ?? "";
      persistRead([threadCursorKey(item.courseId, threadId)]);
      dispatchNav({ type: "OPEN_THREAD", key: `${item.courseId}:${threadId}` });
    },
    [courses, enterCourse, persistRead]
  );

  // Implements: REQ-NOTIF-04
  const markAllNotifications = useCallback(() => {
    persistRead(unreadCursorKeys(notifications));
  }, [notifications, persistRead]);

  const logout = useCallback(async () => {
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
    dispatchSession({ type: "LOGOUT" });
    dispatchNav({ type: "LOGOUT" });
  }, []);

  const finishSignedInWithSession = useCallback((session: SessionState) => {
    dispatchSession({ type: "SIGN_IN_SESSION", session });
  }, []);

  const finishSignedIn = useCallback(async (signedInUser: User) => {
    dispatchSession({ type: "SET_CHECKING", checking: true });
    const session = await loadCurrentSession();
    dispatchSession({
      type: "SESSION_LOADED",
      user: session.user ?? signedInUser,
      memberships: session.memberships,
      sections: session.sections ?? [],
      archivedNextCursor: session.archivedNextCursor,
    });
  }, []);

  const onPhotoChange = useCallback((photoUrl: string | null) => {
    dispatchSession({ type: "SET_USER_PHOTO", photoUrl: photoUrl ?? undefined });
  }, []);

  const openedCourse = course ?? courses[0] ?? archivedCourses[0] ?? null;
  const openedSectionRole = openedCourse
    ? (openedCourse.sectionRole ?? sectionRoleFor(memberships, openedCourse.id))
    : null;
  const views = useMemo(
    () =>
      user
        ? navItems.filter(
            (item) =>
              (item.key !== "admin" || user.role === "owner") &&
              (item.key !== "teacher" || user.role === "teacher" || user.role === "owner")
          )
        : [],
    [user]
  );
  const context =
    screen === "course" && openedCourse
      ? openedCourse.name
      : screen === "settings"
        ? SETTINGS_SCREEN_LABEL
        : (views.find((item) => item.key === screen)?.label ?? "Área personal");

  const paletteItems: PaletteItem[] = useMemo(
    () => [
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
    ],
    [courses, openCourse, setScreen, views]
  );

  const mobileTabs: MobileTab[] = useMemo(
    () => [
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
    ],
    [screen, setCoursesSheet, setScreen]
  );

  const entries = useMemo(() => calendarEntries(courses, gradebooks), [courses, gradebooks]);

  return {
    user,
    checking,
    courses,
    archivedCourses,
    archivedNextCursor,
    archivedLoading,
    loadMoreArchived,
    refreshCourses,
    activity,
    gradebooks,
    memberships,
    communications,
    communicationError,
    screen,
    course,
    preview,
    coursesSheet,
    focusThread,
    setScreen,
    setCoursesSheet,
    setPreview,
    sidebarOpen,
    setSidebarOpen,
    searchOpen,
    setSearchOpen,
    seen,
    mobile,
    prefersReducedMotion,
    notifications,
    notificationsLoading,
    unreadCommunications,
    enterCourse,
    openCourse,
    openNotification,
    markAllNotifications,
    logout,
    finishSignedIn,
    finishSignedInWithSession,
    onPhotoChange,
    openedCourse,
    openedSectionRole,
    context,
    paletteItems,
    mobileTabs,
    entries,
  };
}
