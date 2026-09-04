"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION

import {
  Bell,
  ChartBar,
  Eye,
  Files,
  GraduationCap,
  House,
  IdentificationCard,
  Image as ImageIcon,
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

/* Los cuatro canales de aviso de la pantalla real, con el ancho de su rótulo. */
const SKELETON_SETTINGS_CHANNELS = [230, 210, 205, 260];
const SKELETON_SETTINGS_SESSIONS = [0, 1];

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

function LeadHeaderSkeleton({
  title,
  titleWidth,
  subtitleWidth,
}: {
  title: string;
  titleWidth: string;
  subtitleWidth: string;
}) {
  return (
    <div className="page-head lead">
      <h1 style={{ margin: 0 }}>
        <span className="sr-only">{title}</span>
        <span
          className="sk boot-title"
          style={{ width: titleWidth, height: "32px", "--sk-delay": "50ms" } as React.CSSProperties}
        />
      </h1>
      <p style={{ marginTop: "6px" }}>
        <span
          className="sk boot-subtitle"
          style={
            { width: subtitleWidth, height: "13px", "--sk-delay": "80ms" } as React.CSSProperties
          }
        />
      </p>
    </div>
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
      <LeadHeaderSkeleton subtitleWidth="440px" title="Recursos de estudio" titleWidth="240px" />

      <div className="res-top">
        {/* Portada: biblioteca académica */}
        <div className="library-panel" style={{ "--sk-delay": "110ms" } as React.CSSProperties}>
          <div className="library-lead">
            <span
              className="sk"
              style={{ width: "46px", height: "46px", borderRadius: "var(--radius-md)" }}
            />
            <span className="sk" style={{ width: "246px", height: "26px", marginTop: "10px" }} />
            <span className="sk" style={{ width: "100%", height: "13px", marginTop: "10px" }} />
            <span className="sk" style={{ width: "72%", height: "13px", marginTop: "4px" }} />
            <span
              className="sk"
              style={{
                width: "182px",
                height: "44px",
                marginTop: "16px",
                borderRadius: "var(--radius-full)",
              }}
            />
          </div>
          <div className="library-points">
            {[94, 88, 96].map((w, idx) => (
              <span
                className="sk"
                key={`lib-point-${idx}`}
                style={{ width: `${w}%`, height: "13px" }}
              />
            ))}
          </div>
        </div>

        {/* Tira de la app móvil */}
        <div className="mobile-strip" style={{ "--sk-delay": "150ms" } as React.CSSProperties}>
          <span
            className="sk"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "var(--radius-md)",
              flex: "none",
            }}
          />
          <div className="mobile-strip-text">
            <span className="sk" style={{ width: "116px", height: "13px" }} />
            <span className="sk" style={{ width: "88%", height: "11px", marginTop: "5px" }} />
          </div>
          <span
            className="sk"
            style={{ width: "196px", height: "30px", borderRadius: "var(--radius-sm)" }}
          />
          <span
            className="sk"
            style={{ width: "142px", height: "20px", borderRadius: "var(--radius-md)" }}
          />
        </div>
      </div>

      {/* Índice de servicios externos */}
      {[
        { id: "ia", title: 268, rows: 8, delay: 220 },
        { id: "beneficios", title: 302, rows: 7, delay: 260 },
        { id: "portales", title: 288, rows: 5, delay: 300 },
      ].map((group) => (
        <div
          className="res-group"
          key={group.id}
          style={{ "--sk-delay": `${group.delay}ms` } as React.CSSProperties}
        >
          <div className="section-title compact-title">
            <span className="sk" style={{ width: `${group.title}px`, height: "20px" }} />
            <span className="sk" style={{ width: "18px", height: "12px" }} />
          </div>
          <ul className="res-index">
            {Array.from({ length: group.rows }, (_, idx) => (
              <li className="res-row" key={`${group.id}-row-${idx}`}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    width: "100%",
                    minHeight: "64px",
                    padding: "12px var(--space-md)",
                  }}
                >
                  <span
                    className="sk"
                    style={{ width: "22px", height: "22px", flex: "none", borderRadius: "6px" }}
                  />
                  <span style={{ flex: 1, minWidth: 0, display: "grid", gap: "6px" }}>
                    <span
                      className="sk"
                      style={{ width: `${58 + ((idx * 11) % 26)}%`, height: "13px" }}
                    />
                    <span
                      className="sk"
                      style={{ width: `${44 + ((idx * 13) % 32)}%`, height: "11px" }}
                    />
                  </span>
                  <span className="sk" style={{ width: "14px", height: "14px", flex: "none" }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function AdminSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando administración de cuentas…" role="status">
      <LeadHeaderSkeleton
        subtitleWidth="260px"
        title="Administración de cuentas"
        titleWidth="280px"
      />

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

/*
  El esqueleto repite las clases reales de la pantalla, no una aproximación:
  así los cuatro módulos ocupan exactamente el alto que ocuparán después y la
  llegada del bundle no desplaza nada bajo el cursor.
*/
// Implements: REQ-CFG-08
export function SettingsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando configuración de la cuenta…"
      className="settings-view"
      role="status"
    >
      <div className="page-head lead">
        <h1 style={{ margin: 0 }}>
          <span className="sr-only">Configuración</span>
          <span
            className="sk boot-title"
            style={{ width: "220px", height: "32px", "--sk-delay": "50ms" } as React.CSSProperties}
          />
        </h1>
        <p style={{ margin: 0 }}>
          <span
            className="sk boot-subtitle"
            style={{ width: "330px", height: "13px", "--sk-delay": "80ms" } as React.CSSProperties}
          />
        </p>
      </div>

      <div className="settings-panel" style={{ "--sk-delay": "110ms" } as React.CSSProperties}>
        <div className="settings-panel-head">
          <h2>
            <ImageIcon aria-hidden="true" size={22} style={{ color: "var(--text-faint)" }} />
            <span className="sr-only">Foto de perfil</span>
            <span className="sk" style={{ width: "150px", height: "18px" }} />
          </h2>
          <span className="sk" style={{ width: "min(100%, 420px)", height: "13px" }} />
        </div>
        <div className="settings-photo">
          <div className="settings-photo-current">
            <span className="sk sk-round" style={{ width: "44px", height: "44px" }} />
            <span className="sk" style={{ width: "84px", height: "12px" }} />
          </div>
        </div>
        <div className="settings-actions">
          <span
            className="sk"
            style={{ width: "160px", height: "44px", borderRadius: "var(--radius-full)" }}
          />
          <span
            className="sk"
            style={{ width: "230px", height: "44px", borderRadius: "var(--radius-full)" }}
          />
        </div>
      </div>

      <div className="settings-panel" style={{ "--sk-delay": "160ms" } as React.CSSProperties}>
        <div className="settings-panel-head">
          <h2>
            <Bell aria-hidden="true" size={22} style={{ color: "var(--text-faint)" }} />
            <span className="sr-only">Avisos</span>
            <span className="sk" style={{ width: "90px", height: "18px" }} />
          </h2>
          <span className="sk" style={{ width: "min(100%, 460px)", height: "13px" }} />
        </div>
        <div className="settings-channels">
          {SKELETON_SETTINGS_CHANNELS.map((width, index) => (
            <div
              className="settings-channel"
              key={`settings-channel-${width}`}
              style={{ "--sk-delay": `${190 + index * 30}ms` } as React.CSSProperties}
            >
              <div className="settings-channel-copy">
                <span className="sk" style={{ width: `${width}px`, height: "15px" }} />
              </div>
              <div className="settings-channel-toggles">
                <span
                  className="sk"
                  style={{ width: "40px", height: "24px", borderRadius: "var(--radius-full)" }}
                />
                <span
                  className="sk"
                  style={{ width: "40px", height: "24px", borderRadius: "var(--radius-full)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-panel" style={{ "--sk-delay": "330ms" } as React.CSSProperties}>
        <div className="settings-panel-head">
          <h2>
            <Eye aria-hidden="true" size={22} style={{ color: "var(--text-faint)" }} />
            <span className="sr-only">Accesibilidad</span>
            <span className="sk" style={{ width: "130px", height: "18px" }} />
          </h2>
          <span className="sk" style={{ width: "min(100%, 480px)", height: "13px" }} />
        </div>
        <div className="settings-switch">
          <span
            className="sk"
            style={{ width: "40px", height: "24px", borderRadius: "var(--radius-full)" }}
          />
          <span className="sk" style={{ width: "225px", height: "14px" }} />
        </div>
      </div>

      <div className="settings-panel" style={{ "--sk-delay": "380ms" } as React.CSSProperties}>
        <div className="settings-panel-head">
          <h2>
            <IdentificationCard
              aria-hidden="true"
              size={22}
              style={{ color: "var(--text-faint)" }}
            />
            <span className="sr-only">Cuenta y seguridad</span>
            <span className="sk" style={{ width: "180px", height: "18px" }} />
          </h2>
          <span className="sk" style={{ width: "min(100%, 440px)", height: "13px" }} />
        </div>
        <div className="settings-facts">
          <div>
            <span className="sk" style={{ width: "130px", height: "12px" }} />
            <span className="sk" style={{ width: "245px", height: "15px" }} />
          </div>
          <div>
            <span className="sk" style={{ width: "60px", height: "12px" }} />
            <span className="sk" style={{ width: "110px", height: "15px" }} />
          </div>
        </div>
        <span className="sk" style={{ width: "140px", height: "15px" }} />
        <div className="settings-sessions">
          {SKELETON_SETTINGS_SESSIONS.map((row) => (
            <div
              className="settings-session"
              key={`settings-session-${row}`}
              style={{ "--sk-delay": `${420 + row * 35}ms` } as React.CSSProperties}
            >
              <div className="settings-session-copy">
                <span className="sk" style={{ width: "210px", height: "14px" }} />
                <span className="sk" style={{ width: "175px", height: "12px" }} />
              </div>
              <span
                className="sk"
                style={{ width: "132px", height: "44px", borderRadius: "var(--radius-md)" }}
              />
            </div>
          ))}
        </div>
        <div className="settings-actions">
          <span
            className="sk"
            style={{ width: "270px", height: "44px", borderRadius: "var(--radius-full)" }}
          />
        </div>
      </div>
    </section>
  );
}
