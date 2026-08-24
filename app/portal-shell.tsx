"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  Bell,
  CaretDown,
  FolderSimple,
  MagnifyingGlass,
  PersonArmsSpread,
  SignOut,
} from "@phosphor-icons/react";
import type { Course } from "../lib/courses";
import { calendarEntries, firstName, roleLabel, type User } from "../lib/portal-utils";
import { Menu } from "./animated-menu";
import { navItems, type Screen } from "./portal-types";
import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import type { CommunicationReadCursor, MessageThreadSummary } from "../lib/communications.ts";
import type { ManagedCourse } from "../lib/course-management";
import { Avatar, Screen as PortalScreen } from "./portal-ui";
import { CoursesDashboard } from "./views/CoursesDashboard";
import type { SectionMembership, SectionRole } from "../lib/section-roles";

import {
  AdminSkeleton,
  CalendarSkeleton,
  ClassroomSkeleton,
  ResourcesSkeleton,
} from "./views/ViewSkeletons";

const CalendarView = dynamic(
  () => import("./views/calendar/CalendarView").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  }
);

const ResourcesView = dynamic(
  () => import("./views/resources/ResourcesView").then((m) => m.ResourcesView),
  {
    ssr: false,
    loading: () => <ResourcesSkeleton />,
  }
);

const CommunicationsCenter = dynamic(
  () => import("./views/CommunicationsCenter").then((m) => m.CommunicationsCenter),
  {
    ssr: false,
    loading: () => <ResourcesSkeleton />,
  }
);

const AdminView = dynamic(() => import("./views/AdminView").then((m) => m.AdminView), {
  ssr: false,
  loading: () => <AdminSkeleton />,
});

const TeacherCoursesView = dynamic(
  () => import("./views/TeacherCoursesView").then((m) => m.TeacherCoursesView),
  {
    ssr: false,
    loading: () => <AdminSkeleton />,
  }
);

const Classroom = dynamic(() => import("./Classroom"), {
  ssr: false,
  loading: () => <ClassroomSkeleton />,
});

export function PortalHeader({
  sidebarOpen,
  user,
  context,
  onLogout,
  onHome,
  onCommunications,
  onSearch,
  unreadCommunications,
  toggleSidebar,
}: {
  sidebarOpen: boolean;
  user: User;
  context: string;
  onLogout: () => void;
  onHome: () => void;
  onCommunications: () => void;
  onSearch: () => void;
  unreadCommunications: number;
  toggleSidebar: () => void;
}) {
  const shortcut =
    typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.userAgent)
      ? "⌘K"
      : "Ctrl K";
  const account = useRef<HTMLDetailsElement>(null);

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
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <header className="app-header">
      <button
        aria-controls="portal-sidebar"
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
        <Image
          src="/brand/ubb-shield.webp"
          alt=""
          aria-hidden="true"
          width={388}
          height={594}
          priority
        />
        <strong>Centro de Estudio UBB</strong>
      </button>
      {/* El contexto vive en su propia miga: pegarlo dentro de la marca deja el rótulo sin separación. */}
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
        <button
          aria-label={`Avisos y mensajes${unreadCommunications > 0 ? `, ${unreadCommunications} sin leer` : ""}`}
          className="header-notifications"
          data-requirement="Implements: REQ-COMM-02 REQ-COMM-08"
          onClick={onCommunications}
          type="button"
        >
          <Bell
            aria-hidden="true"
            size={20}
            weight={unreadCommunications > 0 ? "fill" : "regular"}
          />
          {unreadCommunications > 0 && (
            <span className="header-notification-count num">
              {unreadCommunications > 99 ? "99+" : unreadCommunications}
            </span>
          )}
        </button>
        <details className="account-menu" ref={account}>
          <summary aria-label={`Cuenta de ${user.name}`}>
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
              <SignOut aria-hidden="true" size={16} />
              Cerrar sesión
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}

export function PortalSidebar({
  open,
  screen,
  courses,
  openCourseId,
  user,
  setScreen,
  openCourse,
}: {
  open: boolean;
  screen: Screen;
  courses: Course[];
  openCourseId?: string;
  user: User;
  setScreen: (screen: Screen) => void;
  openCourse: (course: Course) => void;
}) {
  const views = navItems.filter(
    (item) =>
      (item.key !== "admin" || user.role === "owner") &&
      (item.key !== "teacher" || user.role === "teacher" || user.role === "owner")
  );
  return (
    // Con el menú plegado el panel sigue en el DOM para animar: `inert` lo saca del foco y del lector.
    <aside className="app-sidebar" id="portal-sidebar" inert={!open ? true : undefined}>
      <nav aria-label="Navegación principal" className="side-nav">
        {views.map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={active ? "side-item active" : "side-item"}
              key={key}
              onClick={() => setScreen(key)}
              type="button"
            >
              <span aria-hidden="true" className="side-icon">
                <Icon size={18} />
              </span>
              <span className="side-label">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Implements: REQ-DELIB-08 */}
      <div className="side-group">
        <span className="side-group-title">Mis ramos</span>
        {courses.length === 0 && (
          <p className="side-empty">
            Sin ramos en este período. Aparecerán aquí al quedar inscritos.
          </p>
        )}
        {courses.map((course) => {
          const active = screen === "course" && openCourseId === course.id;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={active ? "side-item active" : "side-item"}
              key={course.id}
              onClick={() => openCourse(course)}
              style={{ "--course-tone": course.tone } as React.CSSProperties}
              type="button"
            >
              <span aria-hidden="true" className="side-icon tone">
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

      <Link
        className="side-item side-foot"
        href="/biblioteca/index.html"
        prefetch={false}
        title="Biblioteca de Estudio (abre en la misma pestaña)"
      >
        <span aria-hidden="true" className="side-icon">
          <Archive size={18} />
        </span>
        <span className="side-label">Biblioteca de Estudio</span>
      </Link>
      <Link className="side-item side-foot side-foot-secondary" href="/accesibilidad">
        <span aria-hidden="true" className="side-icon">
          <PersonArmsSpread size={18} />
        </span>
        <span className="side-label">Accesibilidad</span>
      </Link>
    </aside>
  );
}

export function PortalMainView({
  screen,
  context,
  openedCourse,
  user,
  courses,
  archivedCourses,
  archivedHasMore,
  archivedLoading,
  activity,
  communicationCursors,
  communicationError,
  communicationThreads,
  gradebooks,
  memberships,
  seen,
  sectionRole,
  entries,
  openCourse,
  onLoadMoreArchived,
  onCoursesChanged,
  setScreen,
}: {
  screen: Screen;
  context: string;
  openedCourse: Course | null;
  user: User;
  courses: Course[];
  archivedCourses: Course[];
  archivedHasMore: boolean;
  archivedLoading: boolean;
  activity: CourseActivity[];
  communicationCursors: CommunicationReadCursor[];
  communicationError: string;
  communicationThreads: MessageThreadSummary[];
  gradebooks: CourseGradebook[];
  memberships: SectionMembership[];
  seen: Record<string, string>;
  sectionRole: SectionRole | null;
  entries: ReturnType<typeof calendarEntries>;
  openCourse: (course: Course) => void;
  onLoadMoreArchived: () => void;
  onCoursesChanged: () => Promise<void>;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <main
      aria-labelledby="portal-view-title"
      className="app-main"
      data-requirement="Implements: REQ-A11Y-01 REQ-A11Y-02"
      id="contenido-principal"
      tabIndex={-1}
    >
      <p aria-atomic="true" aria-live="polite" className="sr-only" id="portal-view-title">
        Vista actual: {context}
      </p>
      <AnimatePresence initial={false} mode="wait">
        {screen === "course" && openedCourse ? (
          <PortalScreen key={`course-${openedCourse.id}`}>
            <Classroom
              course={openedCourse}
              user={user}
              sectionRole={sectionRole}
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
                  archivedCourses={archivedCourses}
                  archivedHasMore={archivedHasMore}
                  archivedLoading={archivedLoading}
                  activity={activity}
                  seen={seen}
                  entries={entries}
                  manageCourses={
                    user.role === "teacher" || user.role === "owner"
                      ? () => setScreen("teacher")
                      : undefined
                  }
                  openCourse={openCourse}
                  onLoadMoreArchived={onLoadMoreArchived}
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
              {screen === "notifications" && (
                <CommunicationsCenter
                  activity={activity}
                  connectionError={communicationError}
                  courses={courses}
                  cursors={communicationCursors}
                  memberships={memberships}
                  openCourse={openCourse}
                  threads={communicationThreads}
                  user={user}
                />
              )}
              {screen === "resources" && <ResourcesView />}
              {screen === "teacher" && (user.role === "teacher" || user.role === "owner") && (
                <TeacherCoursesView
                  onCoursesChanged={onCoursesChanged}
                  openCourse={(course: ManagedCourse) => openCourse(course)}
                />
              )}
              {screen === "admin" && user.role === "owner" && <AdminView />}
            </div>
          </PortalScreen>
        )}
      </AnimatePresence>
    </main>
  );
}
