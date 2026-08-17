"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Archive, CaretDown, FolderSimple, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import type { Course } from "../lib/courses";
import { Avatar } from "./portal-ui";
import { firstName, roleLabel, type User } from "../lib/portal-utils";
import { Menu } from "./animated-menu";
import { navItems, type Screen } from "./portal-types";

export function PortalHeader({
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
      <div className="app-header-left">
        <button
          aria-label={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          aria-expanded={sidebarOpen}
          className="sidebar-toggle"
          onClick={toggleSidebar}
          type="button"
        >
          <Menu animate={sidebarOpen} size={20} />
        </button>
        <button className="app-brand" onClick={onHome} type="button">
          <Image
            src="/brand/ubb-shield.webp"
            alt=""
            aria-hidden="true"
            width={388}
            height={594}
            priority
          />
          <span className="brand-copy">
            <strong>Centro de Estudio UBB</strong>
            <small>{context}</small>
          </span>
        </button>
      </div>
      <div className="app-header-right">
        <button
          aria-keyshortcuts="Control+k Meta+k"
          aria-label="Abrir buscador rápido (Ctrl K)"
          className="search-trigger"
          onClick={onSearch}
          type="button"
        >
          <MagnifyingGlass size={15} />
          <span>Buscar…</span>
          <kbd>{shortcut}</kbd>
        </button>
        <details className="account-menu" ref={account}>
          <summary aria-label={`Cuenta de ${user.name}`} className="account-trigger">
            <Avatar email={user.email} name={user.name} />
            <span className="account-name">{firstName(user.name)}</span>
            <CaretDown className="account-caret" size={13} />
          </summary>
          <div className="account-popover">
            <div className="account-profile">
              <Avatar email={user.email} large name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
                <span className="account-role-pill">{roleLabel(user.role)}</span>
              </div>
            </div>
            <div className="account-actions">
              <button className="account-signout" onClick={onLogout} type="button">
                <SignOut size={16} /> Cerrar sesión
              </button>
            </div>
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
  const views = navItems.filter((item) => item.key !== "admin" || user.role === "owner");
  return (
    <aside aria-label="Navegación principal" className="app-sidebar" data-open={open}>
      <nav className="side-group">
        {views.map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button
              className="side-link"
              data-active={active}
              key={key}
              onClick={() => setScreen(key)}
              type="button"
            >
              <span className="side-icon">
                <Icon size={18} />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="side-courses">
        <div className="side-courses-header">
          <span className="side-courses-title">Mis ramos</span>
          <span className="side-courses-period">{courses[0]?.period ?? ""}</span>
        </div>
        <div className="side-courses-list">
          {courses.length === 0 && (
            <p className="side-empty">
              Sin ramos en este período. Aparecerán aquí al quedar inscritos.
            </p>
          )}
          {courses.map((course) => {
            const active = screen === "course" && openCourseId === course.id;
            return (
              <button
                className="side-course-card"
                data-active={active}
                key={course.id}
                onClick={() => openCourse(course)}
                style={{ "--course-tone": course.tone } as React.CSSProperties}
                type="button"
              >
                <span className="side-course-icon">
                  <FolderSimple size={18} weight="fill" />
                </span>
                <span className="side-course-text">
                  <span className="side-course-name">{course.name}</span>
                  <span className="side-course-code">{course.code}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="side-footer">
        <Link
          className="side-footer-link"
          href="/biblioteca/index.html"
          prefetch={false}
          title="Biblioteca de Estudio (abre en la misma pestaña)"
        >
          <Archive size={16} /> Biblioteca de Estudio
        </Link>
      </div>
    </aside>
  );
}
