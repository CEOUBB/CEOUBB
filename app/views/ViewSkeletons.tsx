"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION

import {
  ArrowRight,
  Books,
  ChartBar,
  Check,
  DeviceMobile,
  DownloadSimple,
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
const SKELETON_ADMIN_ROWS = [0, 1, 2];

export function CalendarSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando calendario…" className="planner" role="status">
      <header className="page-head planner-bar">
        <div className="planner-lead">
          <span
            className="sk boot-title"
            style={{ width: "200px", height: "34px", "--sk-delay": "50ms" } as React.CSSProperties}
          />
          <p style={{ marginTop: "6px" }}>
            <span
              className="sk"
              style={
                { width: "130px", height: "14px", "--sk-delay": "80ms" } as React.CSSProperties
              }
            />
            <span
              className="sk"
              style={
                { width: "85px", height: "14px", "--sk-delay": "100ms" } as React.CSSProperties
              }
            />
            <span
              className="sk"
              style={
                { width: "80px", height: "14px", "--sk-delay": "120ms" } as React.CSSProperties
              }
            />
          </p>
        </div>
        <div className="planner-controls">
          <div className="planner-step">
            <span
              className="sk"
              style={
                { width: "36px", height: "34px", "--sk-delay": "130ms" } as React.CSSProperties
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
                  "--sk-delay": "140ms",
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
                width: "130px",
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
                width: "140px",
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
                "--sk-delay": `${210 + idx * 35}ms`,
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
        <h1>Recursos de estudio</h1>
        <p>
          <span>
            Herramientas, material académico y convenios para acompañar tu estudio durante el
            semestre.
          </span>
        </p>
      </div>

      <div className="resource-block">
        <div className="section-title">
          <h2>Ecosistema CEOUBB</h2>
        </div>
        <div className="resource-layout">
          <div className="resource-card" style={{ "--sk-delay": "120ms" } as React.CSSProperties}>
            <span className="resource-icon">
              <Books size={22} />
            </span>
            <h3>Biblioteca académica</h3>
            <p>
              Biblioteca colaborativa de certámenes, controles y apuntes que la comunidad va sumando
              período a período.
            </p>
            <ul className="resource-points">
              <li>
                <Check size={15} weight="bold" /> Evaluaciones completas con puntaje y tiempo real
                de aplicación.
              </li>
              <li>
                <Check size={15} weight="bold" /> Pautas desarrolladas paso a paso, no sólo la
                alternativa correcta.
              </li>
              <li>
                <Check size={15} weight="bold" /> Abierta a todas las facultades: se amplía con lo
                que aportan estudiantes y docentes.
              </li>
            </ul>
            <b>
              Abrir biblioteca <ArrowRight size={14} />
            </b>
          </div>

          <div className="resource-card" style={{ "--sk-delay": "160ms" } as React.CSSProperties}>
            <span className="resource-icon">
              <DeviceMobile size={22} />
            </span>
            <h3>CEOUBB Móvil</h3>
            <p>Accede a tu material de estudio en cualquier lugar con nuestra app oficial.</p>
            <div
              className="store-badges"
              role="group"
              aria-label="Aplicaciones móviles próximamente disponibles"
            >
              <div
                className="store-badge sk"
                style={{ width: "128px", height: "40px", borderRadius: "var(--radius-md)" }}
              />
              <div
                className="store-badge sk"
                style={{ width: "128px", height: "40px", borderRadius: "var(--radius-md)" }}
              />
            </div>
            <em>Publicación en preparación. Mientras tanto, el APK de Android está disponible.</em>
            <span className="resource-inline" style={{ color: "var(--text-muted)" }}>
              <DownloadSimple size={15} /> Descargar APK para Android
            </span>
          </div>
        </div>
      </div>

      <div className="resource-block">
        <div className="section-title">
          <h2>Asistentes de inteligencia artificial</h2>
        </div>
        <div className="tier-group">
          <div className="tier-head">
            <span className="tier-label green">GRATIS, SIN LÍMITES</span>
          </div>
          <ul className="chip-grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {["DeepSeek", "Qwen"].map((name, chip) => (
              <li key={`ai-chip-${name}`}>
                <span
                  className="brand-chip sk"
                  style={
                    {
                      width: "125px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      "--sk-delay": `${200 + chip * 40}ms`,
                    } as React.CSSProperties
                  }
                />
              </li>
            ))}
          </ul>
          <small className="tier-note" style={{ display: "block", marginTop: "8px" }}>
            * Conversación ilimitada con una cuenta gratuita.
          </small>
        </div>

        <div className="tier-group" style={{ marginTop: "var(--space-md)" }}>
          <div className="tier-head">
            <span className="tier-label amber">GRATIS, CON LÍMITES</span>
          </div>
          <ul className="chip-grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {["ChatGPT", "Claude", "Gemini", "Perplexity"].map((name, chip) => (
              <li key={`ai-chip-lim-${name}`}>
                <span
                  className="brand-chip sk"
                  style={
                    {
                      width: "130px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      "--sk-delay": `${280 + chip * 40}ms`,
                    } as React.CSSProperties
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function AdminSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando administración de cuentas…" role="status">
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        <p>
          <span>
            <span
              className="sk num"
              style={{
                width: "24px",
                height: "14px",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />{" "}
            cuentas registradas
          </span>
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <MagnifyingGlass aria-hidden="true" className="admin-search-icon" size={18} />
          <input
            aria-label="Buscar cuentas"
            className="admin-search-input"
            disabled
            placeholder="Buscar por nombre o correo…"
            style={{ pointerEvents: "none" }}
            type="search"
          />
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
            style={{ "--sk-delay": `${140 + row * 40}ms` } as React.CSSProperties}
          >
            <span>
              <span
                className="sk"
                style={{
                  width: `${160 + (row % 2) * 30}px`,
                  height: "15px",
                  display: "block",
                }}
              />
              <span
                className="sk"
                style={{
                  width: `${210 + (row % 2) * 20}px`,
                  height: "12px",
                  marginTop: "4px",
                  display: "block",
                }}
              />
            </span>
            <span className={`role-chip ${row === 0 ? "student" : "owner"}`}>
              {row === 0 ? "Estudiante" : "Desarrollador"}
            </span>
            <span>
              {row === 0 && (
                <span
                  className="sk"
                  style={{
                    width: "110px",
                    height: "34px",
                    borderRadius: "var(--radius-xs)",
                    display: "inline-block",
                  }}
                />
              )}
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
            <span className="breadcrumb">
              <span style={{ color: "var(--text-muted)" }}>Mis cursos</span> /{" "}
              <span
                className="sk"
                style={
                  {
                    width: "80px",
                    height: "13px",
                    display: "inline-block",
                    "--sk-delay": "40ms",
                  } as React.CSSProperties
                }
              />
            </span>
            <h1 style={{ marginTop: "4px" }}>
              <span
                className="sk boot-title"
                style={
                  {
                    width: "220px",
                    height: "36px",
                    display: "block",
                    "--sk-delay": "80ms",
                  } as React.CSSProperties
                }
              />
            </h1>
          </div>
          <div className="classroom-meta">
            <span
              className="course-reference sk"
              style={
                {
                  width: "150px",
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
                    height: "18px",
                    display: "block",
                    "--sk-delay": "140ms",
                  } as React.CSSProperties
                }
              />
              <span
                className="sk"
                style={
                  {
                    width: "80%",
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
                    "--sk-delay": "220ms",
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
                          width: "180px",
                          height: "16px",
                          display: "block",
                          "--sk-delay": "160ms",
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
                          width: "90px",
                          height: "16px",
                          display: "block",
                          "--sk-delay": "200ms",
                        } as React.CSSProperties
                      }
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
