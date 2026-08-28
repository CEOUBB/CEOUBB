"use client";

import Image from "next/image";

const SKELETON_COURSES = [0, 1, 2, 3, 4, 5];
const SKELETON_NAV = [0, 1, 2];
const SKELETON_SIDE_COURSES = [0, 1, 2, 3, 4];

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
