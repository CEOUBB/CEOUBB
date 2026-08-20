"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION

import {
  ChartBar,
  Files,
  GraduationCap,
  House,
  Info,
  MagnifyingGlass,
  UsersThree,
} from "@phosphor-icons/react";

const SKELETON_DAYS = [
  { day: "LUN", num: "17" },
  { day: "MAR", num: "18" },
  { day: "MIÉ", num: "19", today: true },
  { day: "JUE", num: "20" },
  { day: "VIE", num: "21" },
  { day: "SÁB", num: "22" },
  { day: "DOM", num: "23" },
];

const SKELETON_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
const SKELETON_FILTER_COURSES = [0, 1, 2, 3, 4];
const SKELETON_ADMIN_ROWS = [0, 1, 2, 3];

export function CalendarSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando calendario…" className="planner" role="status">
      <header className="page-head planner-bar">
        <div className="planner-lead">
          <span
            className="sk boot-title"
            style={{ width: "200px", height: "32px", "--sk-delay": "50ms" } as React.CSSProperties}
          />
          <span
            className="sk boot-subtitle"
            style={
              {
                width: "220px",
                height: "13px",
                marginTop: "6px",
                "--sk-delay": "80ms",
              } as React.CSSProperties
            }
          />
        </div>
        <div className="planner-controls">
          <div className="planner-step">
            <span
              className="sk"
              style={
                { width: "36px", height: "34px", "--sk-delay": "110ms" } as React.CSSProperties
              }
            />
            <span
              className="sk"
              style={
                {
                  width: "52px",
                  height: "34px",
                  borderLeft: "1px solid var(--border-hairline)",
                  borderRight: "1px solid var(--border-hairline)",
                  "--sk-delay": "130ms",
                } as React.CSSProperties
              }
            />
            <span
              className="sk"
              style={
                { width: "36px", height: "34px", "--sk-delay": "150ms" } as React.CSSProperties
              }
            />
          </div>
          <span
            className="sk"
            style={
              {
                width: "120px",
                height: "34px",
                borderRadius: "var(--radius-md)",
                "--sk-delay": "170ms",
              } as React.CSSProperties
            }
          />
          <span
            className="sk"
            style={
              {
                width: "130px",
                height: "34px",
                borderRadius: "var(--radius-full)",
                "--sk-delay": "190ms",
              } as React.CSSProperties
            }
          />
        </div>
      </header>

      <div aria-label="Cargando filtros" className="planner-filters">
        {SKELETON_FILTER_COURSES.map((idx) => (
          <span
            className="planner-pill sk"
            key={`cal-filt-${idx}`}
            style={
              {
                width: `${110 + (idx % 3) * 25}px`,
                height: "30px",
                borderRadius: "var(--radius-full)",
                "--sk-delay": `${200 + idx * 30}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="planner-frame"
        style={{ "--planner-rows": SKELETON_HOURS.length } as React.CSSProperties}
      >
        <div className="planner-head">
          <span className="planner-zone">GMT−4</span>
          {SKELETON_DAYS.map((item) => (
            <div
              className="planner-headday"
              data-today={item.today ? "true" : undefined}
              key={item.day}
            >
              <small>{item.day}</small>
              <b className="num" style={item.today ? { margin: "-3px auto" } : undefined}>
                {item.num}
              </b>
            </div>
          ))}
        </div>

        <div className="planner-grid" style={{ minHeight: "480px" }}>
          <div className="planner-hours">
            {SKELETON_HOURS.map((hr) => (
              <span className="planner-hour num" key={hr}>
                {hr}
              </span>
            ))}
          </div>
          {SKELETON_DAYS.map((item, colIdx) => (
            <div className="planner-col" key={`col-${item.day}`}>
              {colIdx === 1 && (
                <div
                  className="planner-block sk"
                  style={
                    {
                      top: "60px",
                      height: "110px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: "var(--radius-md)",
                      padding: "8px",
                      "--sk-delay": "260ms",
                    } as React.CSSProperties
                  }
                >
                  <span className="sk" style={{ width: "70%", height: "12px" }} />
                  <span className="sk" style={{ width: "40%", height: "10px", marginTop: "4px" }} />
                </div>
              )}
              {colIdx === 3 && (
                <div
                  className="planner-block sk"
                  style={
                    {
                      top: "140px",
                      height: "85px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: "var(--radius-md)",
                      padding: "8px",
                      "--sk-delay": "320ms",
                    } as React.CSSProperties
                  }
                >
                  <span className="sk" style={{ width: "80%", height: "12px" }} />
                  <span className="sk" style={{ width: "50%", height: "10px", marginTop: "4px" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ResourcesSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando recursos de estudio…"
      className="resources-hub"
      role="status"
    >
      <div className="page-head lead">
        <h1 style={{ margin: 0 }}>
          <span className="sr-only">Recursos de estudio</span>
          <span
            className="sk boot-title"
            style={{ width: "240px", height: "32px", "--sk-delay": "50ms" } as React.CSSProperties}
          />
        </h1>
        <p style={{ marginTop: "6px" }}>
          <span
            className="sk boot-subtitle"
            style={{ width: "440px", height: "13px", "--sk-delay": "80ms" } as React.CSSProperties}
          />
        </p>
      </div>

      <div className="resource-block">
        <div className="section-title">
          <span
            className="sk"
            style={
              {
                width: "170px",
                height: "22px",
                marginBottom: "var(--space-md)",
                "--sk-delay": "110ms",
              } as React.CSSProperties
            }
          />
        </div>
        <div className="resource-layout">
          {/* Tarjeta 1: Biblioteca académica */}
          <div className="resource-card" style={{ "--sk-delay": "140ms" } as React.CSSProperties}>
            <span
              className="sk"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                marginBottom: "4px",
              }}
            />
            <span className="sk" style={{ width: "170px", height: "20px", marginTop: "8px" }} />
            <span className="sk" style={{ width: "94%", height: "13px", marginTop: "8px" }} />
            <span className="sk" style={{ width: "78%", height: "13px", marginTop: "4px" }} />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                margin: "12px 0 16px 0",
              }}
            >
              {[88, 76, 92].map((w, idx) => (
                <div
                  key={`res-pt-${idx}`}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    className="sk"
                    style={{ width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0 }}
                  />
                  <span className="sk" style={{ width: `${w}%`, height: "12px" }} />
                </div>
              ))}
            </div>

            <span className="sk" style={{ width: "120px", height: "14px", marginTop: "auto" }} />
          </div>

          {/* Tarjeta 2: CEOUBB Móvil */}
          <div className="resource-card" style={{ "--sk-delay": "180ms" } as React.CSSProperties}>
            <span
              className="sk"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                marginBottom: "4px",
              }}
            />
            <span className="sk" style={{ width: "140px", height: "20px", marginTop: "8px" }} />
            <span className="sk" style={{ width: "90%", height: "13px", marginTop: "8px" }} />
            <span className="sk" style={{ width: "65%", height: "13px", marginTop: "4px" }} />

            <div
              className="store-badges"
              style={{ display: "flex", gap: "10px", margin: "14px 0 12px 0" }}
            >
              <span
                className="sk"
                style={{ width: "124px", height: "38px", borderRadius: "var(--radius-md)" }}
              />
              <span
                className="sk"
                style={{ width: "124px", height: "38px", borderRadius: "var(--radius-md)" }}
              />
            </div>

            <span className="sk" style={{ width: "82%", height: "11px" }} />
            <span className="sk" style={{ width: "175px", height: "14px", marginTop: "10px" }} />
          </div>
        </div>
      </div>

      <div className="resource-block" style={{ marginTop: "var(--space-xl)" }}>
        <div className="section-title">
          <span
            className="sk"
            style={
              {
                width: "250px",
                height: "22px",
                marginBottom: "var(--space-md)",
                "--sk-delay": "220ms",
              } as React.CSSProperties
            }
          />
        </div>

        {/* Tier 1: Gratis, sin límites */}
        <div className="tier-group">
          <span
            className="sk"
            style={{
              width: "110px",
              height: "14px",
              borderRadius: "var(--radius-xs)",
              marginBottom: "10px",
            }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            {[120, 110].map((w, idx) => (
              <span
                className="sk"
                key={`tier1-chip-${idx}`}
                style={{ width: `${w}px`, height: "38px", borderRadius: "var(--radius-md)" }}
              />
            ))}
          </div>
          <span className="sk" style={{ width: "230px", height: "11px", marginTop: "10px" }} />
        </div>

        {/* Tier 2: Gratis, con límites */}
        <div className="tier-group" style={{ marginTop: "var(--space-lg)" }}>
          <span
            className="sk"
            style={{
              width: "125px",
              height: "14px",
              borderRadius: "var(--radius-xs)",
              marginBottom: "10px",
            }}
          />
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[125, 115, 120, 130].map((w, idx) => (
              <span
                className="sk"
                key={`tier2-chip-${idx}`}
                style={{ width: `${w}px`, height: "38px", borderRadius: "var(--radius-md)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando administración de cuentas…" role="status">
      <div className="page-head lead">
        <h1 style={{ margin: 0 }}>
          <span className="sr-only">Administración de cuentas</span>
          <span
            className="sk boot-title"
            style={{ width: "280px", height: "32px", "--sk-delay": "50ms" } as React.CSSProperties}
          />
        </h1>
        <p style={{ marginTop: "6px" }}>
          <span
            className="sk boot-subtitle"
            style={{ width: "260px", height: "13px", "--sk-delay": "80ms" } as React.CSSProperties}
          />
        </p>
      </div>

      <div className="admin-toolbar">
        <div
          className="admin-search-box"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-sm)",
            height: "38px",
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <MagnifyingGlass aria-hidden="true" size={18} style={{ color: "var(--text-faint)" }} />
          <span className="sk" style={{ width: "160px", height: "13px", opacity: 0.6 }} />
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-head">
          <span>Cuenta</span>
          <span>Rango</span>
          <span>Acción</span>
        </div>
        {SKELETON_ADMIN_ROWS.map((row) => (
          <div
            className="admin-row"
            key={`admin-row-${row}`}
            style={{ "--sk-delay": `${120 + row * 35}ms` } as React.CSSProperties}
          >
            <span>
              <span
                className="sk"
                style={{
                  width: `${150 + (row % 2) * 35}px`,
                  height: "15px",
                  display: "block",
                }}
              />
              <span
                className="sk"
                style={{
                  width: `${190 + (row % 2) * 30}px`,
                  height: "12px",
                  marginTop: "4px",
                  display: "block",
                }}
              />
            </span>
            <span>
              <span
                className="sk"
                style={{
                  width: "76px",
                  height: "24px",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </span>
            <span>
              <span
                className="sk"
                style={{
                  width: "105px",
                  height: "32px",
                  borderRadius: "var(--radius-xs)",
                }}
              />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClassroomSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Abriendo aula virtual…"
      className="classroom-layout"
      role="status"
    >
      <main className="classroom-main">
        <header className="classroom-top">
          <div>
            <span
              className="breadcrumb"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span className="sk" style={{ width: "64px", height: "13px" }} />
              <span style={{ color: "var(--text-faint)" }}>/</span>
              <span className="sk" style={{ width: "90px", height: "13px" }} />
            </span>
            <h1 style={{ marginTop: "4px" }}>
              <span className="sr-only">Cargando aula virtual…</span>
              <span
                className="sk boot-title"
                style={
                  {
                    width: "220px",
                    height: "34px",
                    display: "block",
                    "--sk-delay": "80ms",
                  } as React.CSSProperties
                }
              />
            </h1>
          </div>
          <div className="classroom-meta">
            <span
              className="sk"
              style={
                {
                  width: "140px",
                  height: "34px",
                  borderRadius: "var(--radius-md)",
                  "--sk-delay": "110ms",
                } as React.CSSProperties
              }
            />
          </div>
        </header>

        <nav aria-label="Secciones del aula" className="course-tabs">
          <span aria-hidden="true" className="active" tabIndex={-1}>
            <House size={18} /> Portada
          </span>
          <span aria-hidden="true" tabIndex={-1}>
            <Files size={18} /> Materiales
          </span>
          <span aria-hidden="true" tabIndex={-1}>
            <GraduationCap size={18} /> Notas
          </span>
          <span aria-hidden="true" tabIndex={-1}>
            <ChartBar size={18} /> Progreso
          </span>
          <span aria-hidden="true" tabIndex={-1}>
            <UsersThree size={18} /> Participantes
          </span>
        </nav>

        <div>
          <div className="classroom-columns">
            <section className="posts-section">
              <div className="section-title compact-title">
                <h2>Avisos del curso</h2>
              </div>
              <div className="empty-state">
                <span
                  className="sk"
                  style={
                    {
                      width: "240px",
                      height: "16px",
                      display: "block",
                      "--sk-delay": "150ms",
                    } as React.CSSProperties
                  }
                />
                <span
                  className="sk"
                  style={
                    {
                      width: "85%",
                      height: "14px",
                      marginTop: "6px",
                      display: "block",
                      "--sk-delay": "180ms",
                    } as React.CSSProperties
                  }
                />
                <span
                  className="sk"
                  style={
                    {
                      width: "160px",
                      height: "14px",
                      marginTop: "12px",
                      display: "block",
                      "--sk-delay": "210ms",
                    } as React.CSSProperties
                  }
                />
              </div>
            </section>

            <aside className="course-rail">
              <div className="section-title compact-title">
                <h2>
                  <Info aria-hidden="true" size={19} weight="fill" />
                  Información del ramo
                </h2>
              </div>
              <div className="course-facts">
                <dl>
                  <div>
                    <dt>Coordinación</dt>
                    <dd>
                      <span
                        className="sk"
                        style={
                          {
                            width: "160px",
                            height: "16px",
                            display: "block",
                            "--sk-delay": "170ms",
                          } as React.CSSProperties
                        }
                      />
                      <small>Cuenta docente institucional</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Estudiantes</dt>
                    <dd>
                      <span
                        className="sk"
                        style={
                          {
                            width: "80px",
                            height: "16px",
                            display: "block",
                            "--sk-delay": "220ms",
                          } as React.CSSProperties
                        }
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
