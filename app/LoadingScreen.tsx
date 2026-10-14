"use client";

import Image from "next/image";
import {
  ArrowRight,
  Bell,
  Books,
  CalendarBlank,
  CaretDown,
  House,
  Lifebuoy,
  List,
  MagnifyingGlass,
  Stack,
} from "@phosphor-icons/react";
import { skeletonWave } from "../lib/skeleton-wave";
import { MobileBottomNav, type MobileTab } from "./mobile-shell";
import { navItems } from "./portal-types";
import { SiteFooter } from "./site-footer";
import { Bone, Line } from "./views/skeleton-bones";
import "./campus-base.css";
import "./mobile-shell.css";
import "./campus.css";

const SHARED_VIEWS = navItems.filter((item) => item.key !== "teacher" && item.key !== "admin");
const NEUTRAL_TONE = { "--course-tone": "oklch(0.62 0.01 265)" } as React.CSSProperties;
const MOBILE_TABS: MobileTab[] = [
  { key: "courses", label: "Inicio", Icon: House, active: true },
  { key: "list", label: "Cursos", Icon: Stack, active: false },
  { key: "notifications", label: "Avisos", Icon: Bell, active: false },
  { key: "calendar", label: "Calendario", Icon: CalendarBlank, active: false },
  { key: "resources", label: "Recursos", Icon: Books, active: false },
];

function CourseCardSkeleton({ index }: { index: number }) {
  return (
    <article className="course-card" style={NEUTRAL_TONE}>
      <div className="course-cover">
        <span className="course-code">
          <Line w="4.6em" />
        </span>
      </div>
      <div className="course-body">
        <h3>
          <Line w={index === 0 ? "74%" : "62%"} />
        </h3>
        <p>
          <Line quiet w="44%" />
        </p>
        <p className="course-section">
          <Line quiet w="58%" />
        </p>
        <div className="course-meta">
          <span>
            <Line quiet w="9em" />
          </span>
          <span>
            <Line quiet w="12em" />
          </span>
        </div>
        <button className="course-action" tabIndex={-1} type="button">
          <Line w="6.5em" />
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      </div>
    </article>
  );
}

// Implements: REQ-QMD-01, REQ-SKELETON-01
export function LoadingScreen() {
  return (
    <div aria-busy="true" className="app-shell" data-sidebar="auto" ref={skeletonWave}>
      <p className="sr-only" role="status">
        Abriendo Centro de Estudio UBB…
      </p>
      <header className="app-header" inert>
        <button
          aria-label="Abrir el menú"
          className="icon-button menu-button"
          tabIndex={-1}
          type="button"
        >
          <List aria-hidden="true" size={20} />
        </button>
        <button className="app-brand" tabIndex={-1} type="button">
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
        <p className="header-context">
          <span aria-hidden="true" className="header-context-sep">
            /
          </span>
          <span className="header-context-label">
            <Line quiet w="6.5em" />
          </span>
        </p>
        <button className="header-search" tabIndex={-1} type="button">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <span aria-hidden="true">Buscar ramos y vistas</span>
          <kbd aria-hidden="true">Ctrl K</kbd>
        </button>
        <div className="header-actions">
          <details className="notifications-menu">
            <summary aria-label="Notificaciones" className="header-notifications" tabIndex={-1}>
              <Bell aria-hidden="true" size={20} />
            </summary>
          </details>
          <details className="account-menu">
            <summary tabIndex={-1}>
              <Bone h={32} round w={32} />
              <span className="account-copy">
                <strong>
                  <Line w="4.5em" />
                </strong>
                <small>
                  <Line quiet w="5.5em" />
                </small>
              </span>
              <CaretDown className="account-caret" size={13} weight="bold" aria-hidden="true" />
            </summary>
          </details>
        </div>
      </header>

      <aside className="app-sidebar" inert>
        <nav className="side-nav">
          {SHARED_VIEWS.map(({ key, label, Icon }) => (
            <button
              className={key === "courses" ? "side-item active" : "side-item"}
              key={key}
              tabIndex={-1}
              type="button"
            >
              <span aria-hidden="true" className="side-icon">
                <Icon size={18} />
              </span>
              <span className="side-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-group">
          <span className="side-group-title">Mis ramos</span>
          {[0, 1, 2].map((row) => (
            <button className="side-item" key={row} tabIndex={-1} type="button">
              <span aria-hidden="true" className="side-icon">
                <Bone h={12} r="4px 4px 2px 2px" w={16} />
              </span>
              <span className="side-label">
                <span className="side-name">
                  <Line w={`${8 + ((row * 3) % 5)}em`} />
                </span>
                <small>
                  <Line quiet w="5em" />
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="side-foot-group">
          <span className="side-item">
            <span aria-hidden="true" className="side-icon">
              <Lifebuoy size={18} />
            </span>
            <span className="side-label">Ayuda y contacto</span>
          </span>
        </div>
      </aside>

      <main className="app-main">
        <div className="portal-main">
          <section className="page-head lead dashboard-heading">
            <div>
              <h1>
                <span className="sr-only">Cargando área personal</span>
                <Line w="7em" />
              </h1>
              <p>
                <Line quiet w="19em" />
              </p>
            </div>
          </section>
          <div className="dashboard-workspace">
            <section className="dashboard-section dashboard-courses">
              <div className="section-title">
                <h2>Mis cursos</h2>
                <span className="section-count">
                  <Line quiet w="5em" />
                </span>
              </div>
              <div className="course-grid">
                {[0, 1].map((card) => (
                  <CourseCardSkeleton index={card} key={card} />
                ))}
              </div>
            </section>
            <section className="dashboard-section dashboard-agenda">
              <div className="section-title">
                <h2>En tu agenda</h2>
                <span className="agenda-calendar-link">
                  <CalendarBlank size={16} aria-hidden="true" />
                  Calendario
                </span>
              </div>
              <div className="agenda-sheet">
                <article className="agenda-next" style={NEUTRAL_TONE}>
                  <span className="agenda-leaf">
                    <span>
                      <Line quiet w="2.2em" />
                    </span>
                    <b>
                      <Line w="1.2em" />
                    </b>
                    <span>
                      <Line quiet w="2.4em" />
                    </span>
                  </span>
                  <div className="agenda-next-copy">
                    <h3>
                      <Line w="88%" />
                    </h3>
                    <span className="agenda-meta">
                      <Line quiet w="72%" />
                    </span>
                  </div>
                  <div className="agenda-next-foot">
                    <span className="agenda-count">
                      <Line quiet w="4.5em" />
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </div>
          <SiteFooter />
        </div>
      </main>
      <div className="sk-contents" inert>
        <MobileBottomNav items={MOBILE_TABS} />
      </div>
    </div>
  );
}
