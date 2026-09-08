"use client";

import Image from "next/image";

const SKELETON_COURSES = [0, 1, 2, 3, 4, 5];
/* Los seis destinos fijos del portal más los dos accesos del pie. */
const SKELETON_NAV = [0, 1, 2, 3, 4, 5];
const SKELETON_NAV_FOOT = [0, 1];
const SKELETON_SIDE_COURSES = [0, 1, 2];

// Implements: REQ-QMD-01, REQ-SKELETON-01
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
      <main className="boot-main">
        <div className="boot-head">
          <span className="sk boot-title" style={{ "--sk-delay": "60ms" } as React.CSSProperties} />
          <span
            className="sk sk-quiet boot-subtitle"
            style={{ "--sk-delay": "110ms" } as React.CSSProperties}
          />
        </div>
        <div className="boot-strip" style={{ "--sk-delay": "160ms" } as React.CSSProperties}>
          <span className="sk boot-strip-date" />
          <span className="boot-strip-lines">
            <span className="sk" />
            <span className="sk sk-quiet" />
          </span>
          <span className="sk boot-strip-action" />
        </div>
        <span
          className="sk boot-section-title"
          style={{ "--sk-delay": "200ms" } as React.CSSProperties}
        />
        <div className="boot-grid">
          {SKELETON_COURSES.map((card) => (
            <article
              className="boot-card"
              key={card}
              style={{ "--sk-delay": `${230 + card * 60}ms` } as React.CSSProperties}
            >
              <span className="sk boot-cover" />
              <span className="sk sk-quiet boot-code" />
              <span className="sk boot-line wide" />
              <span className="sk sk-quiet boot-line short" />
              <span aria-hidden="true" className="boot-card-rule" />
              <span className="sk sk-quiet boot-line" style={{ width: "62%" }} />
              <span className="sk sk-quiet boot-line" style={{ width: "48%" }} />
              <span className="sk boot-card-action" />
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
