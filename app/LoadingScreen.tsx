"use client";

import Image from "next/image";
import { CalendarBlank } from "@phosphor-icons/react";
import { SiteFooter } from "./site-footer";

const SKELETON_COURSES = [0, 1];
/* La navegación reserva los destinos del portal y el acceso de ayuda. */
const SKELETON_NAV = [0, 1, 2, 3, 4, 5];
const SKELETON_NAV_FOOT = [0];
const SKELETON_SIDE_COURSES = [0, 1, 2];

// Implements: REQ-QMD-01, REQ-SKELETON-01
export function LoadingScreen() {
  return (
    <div aria-busy="true" className="app-shell boot-shell">
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
        <span className="sk boot-crumb" style={{ "--sk-delay": "60ms" } as React.CSSProperties} />
        <span className="sk boot-search" style={{ "--sk-delay": "80ms" } as React.CSSProperties} />
        <span
          className="sk sk-round boot-bell"
          style={{ "--sk-delay": "100ms" } as React.CSSProperties}
        />
        <span className="boot-identity">
          <span
            className="sk sk-round boot-avatar"
            style={{ "--sk-delay": "120ms" } as React.CSSProperties}
          />
          <span className="boot-identity-lines">
            <span className="sk" style={{ "--sk-delay": "130ms" } as React.CSSProperties} />
            <span
              className="sk sk-quiet"
              style={{ "--sk-delay": "140ms" } as React.CSSProperties}
            />
          </span>
        </span>
      </header>
      <aside className="boot-side">
        {SKELETON_NAV.map((row) => (
          <span
            className="boot-row"
            key={`nav-${row}`}
            style={{ "--sk-delay": `${row * 40}ms` } as React.CSSProperties}
          >
            <span className="sk boot-row-icon" />
            <span className="sk boot-row-label" style={{ width: `${86 + ((row * 23) % 52)}px` }} />
          </span>
        ))}
        <span className="sk boot-legend" style={{ "--sk-delay": "250ms" } as React.CSSProperties} />
        {SKELETON_SIDE_COURSES.map((row) => (
          <span
            className="boot-row"
            key={`course-${row}`}
            style={{ "--sk-delay": `${280 + row * 40}ms` } as React.CSSProperties}
          >
            <span className="sk boot-row-icon" />
            <span className="boot-row-lines">
              <span className="sk" style={{ width: `${96 + ((row * 29) % 46)}px` }} />
              <span className="sk sk-quiet" />
            </span>
          </span>
        ))}
        <span className="boot-side-foot">
          {SKELETON_NAV_FOOT.map((row) => (
            <span
              className="boot-row"
              key={`foot-${row}`}
              style={{ "--sk-delay": `${420 + row * 40}ms` } as React.CSSProperties}
            >
              <span className="sk boot-row-icon" />
              <span
                className="sk boot-row-label"
                style={{ width: row === 0 ? "126px" : "152px" }}
              />
            </span>
          ))}
        </span>
      </aside>
      <main className="portal-main boot-main">
        <section className="page-head lead dashboard-heading">
          <div>
            <h1>
              <span className="sr-only">Cargando área personal</span>
              <span className="sk" style={{ width: "240px", height: "1.22em" }} />
            </h1>
            <p>
              <span className="sk sk-quiet" style={{ width: "270px", height: "1.6em" }} />
            </p>
          </div>
        </section>
        <div className="dashboard-workspace">
          <section className="dashboard-section dashboard-courses">
            <div className="section-title">
              <h2>Mis cursos</h2>
              <span className="sk sk-quiet" style={{ width: "64px", height: "12px" }} />
            </div>
            <div className="course-grid">
              {SKELETON_COURSES.map((card) => (
                <article
                  className="course-card"
                  key={card}
                  style={{ "--sk-delay": `${160 + card * 60}ms` } as React.CSSProperties}
                >
                  <div className="course-body">
                    <div className="course-head">
                      <span className="course-identity">
                        <span className="sk course-symbol" />
                        <span className="sk" style={{ width: "60px", height: "12px" }} />
                      </span>
                    </div>
                    <h3>
                      <span className="sr-only">Cargando curso</span>
                      <span className="sk" style={{ width: "72%", height: "1.3em" }} />
                    </h3>
                    <p>
                      <span className="sk sk-quiet" style={{ width: "42%", height: "1.5em" }} />
                    </p>
                    <p className="course-section">
                      <span className="sk sk-quiet" style={{ width: "48%", height: "1.5em" }} />
                    </p>
                    <div className="course-meta">
                      <span className="sk sk-quiet" style={{ width: "62%", height: "1.6em" }} />
                      <span className="sk sk-quiet" style={{ width: "70%", height: "1.6em" }} />
                    </div>
                    <div className="course-action">
                      <span className="sk" style={{ width: "100px", height: "13px" }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="dashboard-section dashboard-agenda">
            <div className="section-title">
              <h2>En tu agenda</h2>
              <CalendarBlank size={20} aria-hidden="true" />
            </div>
            <div className="agenda-clear">
              <h3>
                <span className="sr-only">Cargando agenda</span>
                <span className="sk" style={{ width: "90%", height: "1.4em" }} />
              </h3>
              <p>
                <span className="sk sk-quiet" style={{ width: "100%", height: "1.7em" }} />
                <span className="sk sk-quiet" style={{ width: "82%", height: "1.7em" }} />
              </p>
              <div className="empty-state-action">
                <span className="sk" style={{ width: "130px", height: "13px" }} />
              </div>
            </div>
          </section>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
