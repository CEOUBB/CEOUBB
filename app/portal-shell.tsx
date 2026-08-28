"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  Bell,
  CaretDown,
  FolderSimple,
  Gear,
  Lifebuoy,
  MagnifyingGlass,
  SignOut,
} from "@phosphor-icons/react";
import type { Course } from "../lib/courses";
import { calendarEntries, firstName, roleLabel, type User } from "../lib/portal-utils";
import { Menu } from "./animated-menu";
import { navItems, type Screen } from "./portal-types";
import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import type { CommunicationReadCursor, MessageThreadSummary } from "../lib/communications.ts";
import type { ManagedCourse } from "../lib/course-management";
import { Avatar, Screen as PortalScreen } from "./portal-ui";
import { NotificationList } from "./notification-panel";
import type { NotificationItem } from "../lib/communications.ts";
import { SiteFooter } from "./site-footer";
import { CoursesDashboard } from "./views/CoursesDashboard";
import type { SectionMembership, SectionRole } from "../lib/section-roles";

import {
  AdminSkeleton,
  CalendarSkeleton,
  ClassroomSkeleton,
  ResourcesSkeleton,
  SettingsSkeleton,
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

const SettingsView = dynamic(() => import("./views/SettingsView").then((m) => m.SettingsView), {
  ssr: false,
  loading: () => <SettingsSkeleton />,
});

const Classroom = dynamic(() => import("./Classroom"), {
  ssr: false,
  loading: () => <ClassroomSkeleton />,
});

const FOCUSABLE_POPOVER_ITEMS = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/*
  Resorte críticamente amortiguado del sistema. `MotionConfig` del portal ya
  degrada a cambio inmediato cuando el usuario pide movimiento reducido, así
  que aquí sólo se declara la física.
*/
// Implements: REQ-NOTIF-09
const PANEL_SPRING = { type: "spring", stiffness: 340, damping: 28 } as const;

/*
  Un solo descarte para los dos desplegables del header: cierre por puntero
  fuera, cierre con `Escape` devolviendo el foco al disparador, y ciclado de
  `Tab` dentro del contenido abierto para que el teclado no se escape a la
  vista que quedó detrás.
*/
// Implements: REQ-NOTIF-08 REQ-CFG-01
function useDismissablePopovers(
  first: React.RefObject<HTMLDetailsElement | null>,
  second: React.RefObject<HTMLDetailsElement | null>
) {
  useEffect(() => {
    const menus = [first, second];
    const openMenu = () => menus.map((ref) => ref.current).find((menu) => menu?.open);

    const close = (menu: HTMLDetailsElement) => {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      for (const ref of menus) {
        const menu = ref.current;
        if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const menu = openMenu();
      if (!menu) return;
      if (event.key === "Escape") {
        close(menu);
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...menu.querySelectorAll<HTMLElement>(FOCUSABLE_POPOVER_ITEMS)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === menu.querySelector("summary"))) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [first, second]);
}

export function PortalHeader({
  sidebarOpen,
  user,
  context,
  onLogout,
  onHome,
  onCommunications,
  onSettings,
  onSearch,
  onOpenNotification,
  onMarkAllNotifications,
  notifications,
  notificationsLoading,
  unreadCommunications,
  toggleSidebar,
}: {
  sidebarOpen: boolean;
  user: User;
  context: string;
  onLogout: () => void;
  onHome: () => void;
  onCommunications: () => void;
  onSettings: () => void;
  onSearch: () => void;
  onOpenNotification: (item: NotificationItem) => void;
  onMarkAllNotifications: () => void;
  notifications: readonly NotificationItem[];
  notificationsLoading: boolean;
  unreadCommunications: number;
  toggleSidebar: () => void;
}) {
  const shortcut =
    typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.userAgent)
      ? "⌘K"
      : "Ctrl K";
  const account = useRef<HTMLDetailsElement>(null);
  const notificationsMenu = useRef<HTMLDetailsElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useDismissablePopovers(account, notificationsMenu);

  const closeNotifications = useCallback(() => {
    const menu = notificationsMenu.current;
    if (menu) menu.open = false;
  }, []);

  const closeAccount = useCallback(() => {
    const menu = account.current;
    if (menu) menu.open = false;
  }, []);

  return (
    <header
      className="app-header"
      data-menu-open={notificationsOpen || accountOpen ? "true" : undefined}
    >
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
        <details
          className="notifications-menu"
          data-requirement="Implements: REQ-NOTIF-01 REQ-NOTIF-08 REQ-COMM-02 REQ-COMM-08"
          onToggle={(event) => setNotificationsOpen(event.currentTarget.open)}
          ref={notificationsMenu}
        >
          <summary
            aria-expanded={notificationsOpen}
            aria-haspopup="menu"
            aria-label={`Notificaciones${unreadCommunications > 0 ? `, ${unreadCommunications} sin leer` : ""}`}
            className="header-notifications"
          >
            <Bell
              aria-hidden="true"
              size={20}
              weight={unreadCommunications > 0 ? "fill" : "regular"}
            />
            {unreadCommunications > 0 && (
              <m.span
                animate={{ scale: 1 }}
                className="header-notification-count num"
                initial={{ scale: 0.86 }}
                key={unreadCommunications}
                transition={PANEL_SPRING}
              >
                {unreadCommunications > 99 ? "99+" : unreadCommunications}
              </m.span>
            )}
          </summary>
          {/*
            El contenido se monta al abrir para que el resorte de entrada corra
            en cada apertura: `details` conserva sus hijos montados y una
            animación declarada sobre ellos sólo se vería la primera vez.
          */}
          {notificationsOpen && (
            <>
              <button
                aria-hidden="true"
                aria-label="Cerrar notificaciones"
                className="notification-scrim"
                onClick={closeNotifications}
                tabIndex={-1}
                type="button"
              />
              <m.div
                animate={{ opacity: 1, y: 0 }}
                aria-labelledby="notification-panel-title"
                className="notification-popover"
                initial={{ opacity: 0, y: 8 }}
                transition={PANEL_SPRING}
              >
                <NotificationList
                  items={notifications}
                  loading={notificationsLoading}
                  onMarkAll={onMarkAllNotifications}
                  onOpen={(item) => {
                    closeNotifications();
                    onOpenNotification(item);
                  }}
                  onSeeAll={() => {
                    closeNotifications();
                    onCommunications();
                  }}
                />
              </m.div>
            </>
          )}
        </details>
        <details
          className="account-menu"
          onToggle={(event) => setAccountOpen(event.currentTarget.open)}
          ref={account}
        >
          <summary aria-haspopup="menu" aria-label={`Cuenta de ${user.name}`}>
            <Avatar email={user.email} name={user.name} photoUrl={user.photoUrl} />
            <span className="account-copy">
              <strong>{firstName(user.name)}</strong>
              <small>{roleLabel(user.role)}</small>
            </span>
            <CaretDown className="account-caret" size={13} weight="bold" aria-hidden="true" />
          </summary>
          <div className="account-popover">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <button
              data-requirement="Implements: REQ-CFG-01"
              onClick={() => {
                closeAccount();
                onSettings();
              }}
              type="button"
            >
              <Gear aria-hidden="true" size={16} />
              Configuración
            </button>
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

      {/*
        El grupo se ancla abajo. Ayuda y contacto es una fila de navegación
        igual que las de arriba, porque lleva a una vista más de la plataforma.
        La Biblioteca conserva su caja: sale del portal a un documento aparte.
        Accesibilidad ya no vive aquí, vive en el pie del sitio.
      */}
      <div className="side-foot-group">
        <Link className="side-item" href="/contacto">
          <span aria-hidden="true" className="side-icon">
            <Lifebuoy size={18} />
          </span>
          <span className="side-label">Ayuda y contacto</span>
        </Link>
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
      </div>
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
  focusThread,
  gradebooks,
  onLogout,
  onPhotoChange,
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
  focusThread: string;
  onLogout: () => void;
  onPhotoChange: (photoUrl: string | null) => void;
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
                  focusThread={focusThread}
                  memberships={memberships}
                  openCourse={openCourse}
                  threads={communicationThreads}
                  user={user}
                />
              )}
              {screen === "settings" && (
                <SettingsView onLogout={onLogout} onPhotoChange={onPhotoChange} user={user} />
              )}
              {screen === "resources" && <ResourcesView />}
              {screen === "teacher" && (user.role === "teacher" || user.role === "owner") && (
                <TeacherCoursesView
                  onCoursesChanged={onCoursesChanged}
                  openCourse={(course: ManagedCourse) => openCourse(course)}
                />
              )}
              {screen === "admin" && user.role === "owner" && <AdminView />}
              <SiteFooter />
            </div>
          </PortalScreen>
        )}
      </AnimatePresence>
    </main>
  );
}
