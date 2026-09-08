"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION
// Implements: REQ-SKELETON-01

import {
  Bell,
  ChartBar,
  ChatCircleDots,
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
import { dayOf, getSantiagoDateISO, weekRangeLabel, weekdayOf } from "../../lib/portal-utils";

/*
  Un esqueleto sólo dibuja huesos donde el contenido depende de datos. Los
  títulos, las pestañas y los rótulos de columna ya se conocen antes de la
  primera respuesta: escribirlos de verdad evita que la pantalla parpadee dos
  veces y deja la silueta legible incluso sin animación.
*/

/* Los mismos límites de la grilla semanal. Se repiten aquí a propósito: importar
   `lib/planner` arrastraría el agregador del calendario al paquete inicial que
   abre el portal, y el esqueleto viaja en ese paquete. */
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const SKELETON_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index
);

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function hourOffset(hour: number): string {
  return `${((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%`;
}

function shiftIsoDate(iso: string, days: number): string {
  const moment = new Date(`${iso}T12:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}

/** Lunes a domingo de la semana que contiene `anchor`, igual que el calendario. */
function weekOf(anchor: string): string[] {
  const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
  const start = shiftIsoDate(anchor, -(weekday === 0 ? 6 : weekday - 1));
  return Array.from({ length: 7 }, (_, index) => shiftIsoDate(start, index));
}

const SKELETON_FILTER_COURSES = [0, 1, 2];
const SKELETON_ADMIN_ROWS = [0, 1, 2, 3];
const SKELETON_ADMIN_PERIODS = [0, 1];

/* Los cuatro canales de aviso de la pantalla real, con el ancho de su rótulo. */
const SKELETON_SETTINGS_CHANNELS = [230, 210, 205, 260];
const SKELETON_SETTINGS_SESSIONS = [0, 1];

export function CalendarSkeleton() {
  const today = getSantiagoDateISO();
  const days = weekOf(today);

  return (
    <section aria-busy="true" aria-label="Cargando calendario…" className="planner" role="status">
      <header className="page-head planner-bar">
        <div className="planner-lead">
          <h1>Calendario</h1>
          {/* El rango de la semana no espera al servidor: se calcula del reloj. */}
          <p>
            <span>{weekRangeLabel(days[0], days[6])}</span>
            <span>·</span>
            <span
              className="sk sk-quiet"
              style={
                {
                  display: "inline-block",
                  width: "78px",
                  height: "12px",
                  "--sk-delay": "80ms",
                } as React.CSSProperties
              }
            />
            <span>·</span>
            <span
              className="sk sk-quiet"
              style={
                {
                  display: "inline-block",
                  width: "70px",
                  height: "12px",
                  "--sk-delay": "100ms",
                } as React.CSSProperties
              }
            />
          </p>
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
                width: "132px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                "--sk-delay": "170ms",
              } as React.CSSProperties
            }
          />
          <span
            className="sk"
            style={
              {
                width: "146px",
                height: "38px",
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
            className="sk"
            key={`cal-filt-${idx}`}
            style={
              {
                width: `${112 + (idx % 3) * 26}px`,
                height: "34px",
                borderRadius: "var(--radius-full)",
                "--sk-delay": `${200 + idx * 30}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* En teléfono la semana se navega con esta tira; sin ella el ancho móvil
          gana una fila al resolverse la vista. */}
      <nav aria-hidden="true" className="planner-daybar">
        {days.map((day) => (
          <span
            className="planner-daychip"
            data-today={day === today ? "true" : undefined}
            key={day}
          >
            <small>{weekdayOf(day)}</small>
            <b className="num">{dayOf(day)}</b>
          </span>
        ))}
      </nav>

      <div
        className="planner-frame"
        style={{ "--planner-rows": SKELETON_HOURS.length } as React.CSSProperties}
      >
        <div className="planner-head">
          <span className="planner-zone">GMT−4</span>
          {days.map((day) => (
            <div
              className="planner-headday"
              data-today={day === today ? "true" : undefined}
              key={day}
            >
              <small>{weekdayOf(day)}</small>
              <b className="num">{dayOf(day)}</b>
            </div>
          ))}
        </div>

        <div className="planner-grid">
          <div aria-hidden="true" className="planner-hours">
            {SKELETON_HOURS.map((hour) => (
              <span className="num" key={hour} style={{ top: hourOffset(hour) }}>
                {hourLabel(hour)}
              </span>
            ))}
          </div>
          {days.map((day, colIdx) => (
            <div
              className="planner-col"
              data-today={day === today ? "true" : undefined}
              data-weekend={colIdx > 4 ? "true" : undefined}
              key={day}
            >
              {colIdx === 1 && (
                <div
                  className="planner-block"
                  style={
                    {
                      top: "14%",
                      height: "13%",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-hairline)",
                      "--sk-delay": "260ms",
                    } as React.CSSProperties
                  }
                >
                  <span className="sk" style={{ gridColumn: "1 / -1", height: "11px" }} />
                  <span
                    className="sk sk-quiet"
                    style={{ gridColumn: "1 / -1", width: "52%", height: "9px" }}
                  />
                </div>
              )}
              {colIdx === 3 && (
                <div
                  className="planner-block"
                  style={
                    {
                      top: "36%",
                      height: "10%",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-hairline)",
                      "--sk-delay": "320ms",
                    } as React.CSSProperties
                  }
                >
                  <span className="sk" style={{ gridColumn: "1 / -1", height: "11px" }} />
                  <span
                    className="sk sk-quiet"
                    style={{ gridColumn: "1 / -1", width: "44%", height: "9px" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Encabezado de página: el título y su bajada son copia fija de cada vista, así
   que se escriben tal cual y no como huesos que después se reemplazan. */
function LeadHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-head lead">
      <h1>{title}</h1>
      <p>{description}</p>
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
      <LeadHeader
        description="Herramientas, material académico y convenios para acompañar tu estudio durante el semestre."
        title="Recursos de estudio"
      />

      <div className="res-top">
        {/* Portada: biblioteca académica */}
        <div className="library-panel" style={{ "--sk-delay": "110ms" } as React.CSSProperties}>
          <div className="library-lead">
            <span
              className="sk"
              style={{ width: "46px", height: "46px", borderRadius: "var(--radius-md)" }}
            />
            <span className="sk" style={{ width: "246px", height: "26px", marginTop: "10px" }} />
            <span
              className="sk sk-quiet"
              style={{ width: "100%", height: "13px", marginTop: "10px" }}
            />
            <span
              className="sk sk-quiet"
              style={{ width: "72%", height: "13px", marginTop: "6px" }}
            />
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
                className="sk sk-quiet"
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
            <span
              className="sk sk-quiet"
              style={{ width: "88%", height: "11px", marginTop: "5px" }}
            />
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
            <span className="sk sk-quiet" style={{ width: "18px", height: "12px" }} />
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
                    style={{ width: "26px", height: "26px", flex: "none", borderRadius: "6px" }}
                  />
                  <span style={{ flex: 1, minWidth: 0, display: "grid", gap: "4px" }}>
                    <span
                      className="sk"
                      style={{ width: `${58 + ((idx * 11) % 26)}%`, height: "13px" }}
                    />
                    <span
                      className="sk sk-quiet"
                      style={{ width: `${44 + ((idx * 13) % 32)}%`, height: "11px" }}
                    />
                  </span>
                  <span
                    className="sk sk-quiet"
                    style={{ width: "14px", height: "14px", flex: "none" }}
                  />
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
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        <p>
          <span
            className="sk sk-quiet"
            style={
              {
                display: "inline-block",
                width: "168px",
                height: "12px",
                "--sk-delay": "60ms",
              } as React.CSSProperties
            }
          />
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>

      <section aria-label="Cargando períodos académicos" className="admin-periods">
        <div>
          <h2>Períodos académicos</h2>
          <p>El cierre conserva todos los ramos y los mueve al historial de solo lectura.</p>
        </div>
        <div className="admin-period-list">
          {SKELETON_ADMIN_PERIODS.map((row) => (
            <article
              key={`admin-period-${row}`}
              style={{ "--sk-delay": `${90 + row * 40}ms` } as React.CSSProperties}
            >
              <span style={{ display: "grid", gap: "6px", minWidth: 0 }}>
                <span className="sk" style={{ width: "148px", height: "15px" }} />
                <span className="sk sk-quiet" style={{ width: "196px", height: "12px" }} />
              </span>
              <span
                className="sk"
                style={{ width: "84px", height: "24px", borderRadius: "var(--radius-full)" }}
              />
              <span
                className="sk"
                style={{ width: "158px", height: "38px", borderRadius: "var(--radius-md)" }}
              />
            </article>
          ))}
        </div>
      </section>

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
          <span className="sk sk-quiet" style={{ width: "160px", height: "13px" }} />
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
            style={{ "--sk-delay": `${180 + row * 35}ms` } as React.CSSProperties}
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
                className="sk sk-quiet"
                style={{
                  width: `${190 + (row % 2) * 30}px`,
                  height: "12px",
                  marginTop: "6px",
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

      <div className="admin-pagination">
        <span
          className="sk"
          style={{ width: "104px", height: "36px", borderRadius: "var(--radius-md)" }}
        />
        <span className="sk sk-quiet" style={{ width: "116px", height: "13px" }} />
        <span
          className="sk"
          style={{ width: "104px", height: "36px", borderRadius: "var(--radius-md)" }}
        />
      </div>
    </section>
  );
}

/*
  Avisos y mensajes tiene cabecera con contador, conmutador de pestañas y una
  lista de filas de 82px. Antes esta vista tomaba prestado el esqueleto de
  Recursos y la pantalla se rehacía entera al llegar el módulo.
*/
// Implements: REQ-COMM-01
export function CommunicationsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando avisos y mensajes…"
      className="communications-center"
      role="status"
    >
      <header className="page-head communications-heading">
        <div>
          <h1>Avisos y mensajes</h1>
          <p>Revisa lo nuevo en tus ramos y conversa en privado con el equipo docente.</p>
        </div>
        <div className="communications-summary">
          <span
            className="sk"
            style={{ width: "34px", height: "26px", "--sk-delay": "70ms" } as React.CSSProperties}
          />
          <small>
            <span
              className="sk sk-quiet"
              style={
                {
                  display: "inline-block",
                  width: "62px",
                  height: "10px",
                  marginTop: "6px",
                  "--sk-delay": "90ms",
                } as React.CSSProperties
              }
            />
          </small>
        </div>
      </header>

      <div className="communications-toolbar">
        <div className="communications-tabs">
          <span aria-selected="true" role="tab" tabIndex={-1}>
            <Bell aria-hidden="true" size={17} weight="fill" /> Avisos
          </span>
          <span aria-selected="false" role="tab" tabIndex={-1}>
            <ChatCircleDots aria-hidden="true" size={17} /> Mensajes
          </span>
        </div>
        <span
          className="sk"
          style={
            {
              width: "158px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              "--sk-delay": "120ms",
            } as React.CSSProperties
          }
        />
      </div>

      <div className="communications-panel">
        <ol className="announcement-list">
          {[0, 1, 2, 3].map((row) => (
            <li key={`announcement-${row}`}>
              <span
                className="announcement-row"
                style={{ "--sk-delay": `${150 + row * 45}ms` } as React.CSSProperties}
              >
                <span
                  className="sk"
                  style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)" }}
                />
                <span className="announcement-copy">
                  <span
                    className="sk sk-quiet"
                    style={{ width: `${142 + ((row * 37) % 96)}px`, height: "11px" }}
                  />
                  <span
                    className="sk"
                    style={{ width: `${52 + ((row * 13) % 30)}%`, height: "15px" }}
                  />
                  <span className="sk sk-quiet" style={{ width: "96px", height: "11px" }} />
                </span>
                <span
                  className="sk sk-quiet"
                  style={{ width: "10px", height: "10px", borderRadius: "var(--radius-full)" }}
                />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/*
  Espacio docente: lista pegajosa de secciones a la izquierda y ficha del ramo a
  la derecha. Reutilizar el esqueleto de administración dejaba una tabla donde
  después aparecían dos columnas.
*/
// Implements: REQ-TEACH-01
export function TeacherCoursesSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando espacio docente…"
      className="teacher-manager"
      role="status"
    >
      <header className="teacher-manager-hero">
        <div>
          <h1>Administrar ramos</h1>
          <p>Crea tu sección y mantén su ficha, evaluaciones y ayudantes desde un solo lugar.</p>
        </div>
      </header>
      <TeacherCoursesBodySkeleton />
    </section>
  );
}

/* El interior se reutiliza mientras la vista ya montada pide sus secciones. */
export function TeacherCoursesBodySkeleton() {
  return (
    <div aria-busy="true" className="teacher-manager-layout" role="status">
      <aside className="teacher-course-list">
        <div className="teacher-course-list-head">
          <span>Mis secciones</span>
          <span
            className="sk"
            style={{ width: "25px", height: "25px", borderRadius: "var(--radius-full)" }}
          />
        </div>
        {[0, 1, 2].map((row) => (
          <span
            className="teacher-course-row-skeleton"
            key={`teacher-course-${row}`}
            style={{ "--sk-delay": `${90 + row * 45}ms` } as React.CSSProperties}
          >
            <span className="sk" style={{ width: "4px", borderRadius: "var(--radius-full)" }} />
            <span style={{ display: "grid", gap: "6px", minWidth: 0, alignContent: "center" }}>
              <span
                className="sk"
                style={{ width: `${118 + ((row * 31) % 60)}px`, height: "14px" }}
              />
              <span className="sk sk-quiet" style={{ width: "96px", height: "11px" }} />
            </span>
          </span>
        ))}
      </aside>

      <div className="teacher-course-workspace">
        <div className="teacher-course-heading">
          <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
            <span className="sk sk-quiet" style={{ width: "128px", height: "11px" }} />
            <span className="sk" style={{ width: "268px", height: "26px" }} />
            <span className="sk sk-quiet" style={{ width: "146px", height: "13px" }} />
          </div>
          <span
            className="sk"
            style={{ width: "128px", height: "40px", borderRadius: "var(--radius-full)" }}
          />
        </div>
        <div className="teacher-manager-tabs-skeleton">
          {[132, 154, 118].map((width, index) => (
            <span
              className="sk"
              key={`teacher-tab-${width}`}
              style={
                {
                  width: `${width}px`,
                  height: "38px",
                  borderRadius: "var(--radius-md)",
                  "--sk-delay": `${210 + index * 30}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div className="teacher-course-form-skeleton">
          {[0, 1, 2, 3].map((row) => (
            <span key={`teacher-field-${row}`} style={{ display: "grid", gap: "8px", minWidth: 0 }}>
              <span className="sk sk-quiet" style={{ width: "112px", height: "11px" }} />
              <span
                className="sk"
                style={
                  {
                    height: "42px",
                    borderRadius: "var(--radius-sm)",
                    "--sk-delay": `${260 + row * 40}ms`,
                  } as React.CSSProperties
                }
              />
            </span>
          ))}
        </div>
      </div>
    </div>
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
              <span className="sk sk-quiet" style={{ width: "64px", height: "12px" }} />
              <span style={{ color: "var(--text-faint)" }}>/</span>
              <span className="sk sk-quiet" style={{ width: "90px", height: "12px" }} />
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
              {/* La portada llega con publicaciones: se dibujan como tales y no
                  como el estado vacío, que dice otra cosa. */}
              <div className="post-list">
                {[0, 1].map((row) => (
                  <article
                    key={`post-${row}`}
                    style={{ "--sk-delay": `${150 + row * 60}ms` } as React.CSSProperties}
                  >
                    <span
                      className="sk"
                      style={{ width: "76px", height: "22px", borderRadius: "var(--radius-full)" }}
                    />
                    <div>
                      <span className="sk" style={{ width: `${58 + row * 12}%`, height: "17px" }} />
                      <span className="sk sk-quiet" style={{ width: "100%", height: "13px" }} />
                      <span
                        className="sk sk-quiet"
                        style={{ width: `${72 - row * 9}%`, height: "13px" }}
                      />
                      <span style={{ display: "flex", gap: "var(--space-sm)", marginTop: "6px" }}>
                        <span className="sk sk-quiet" style={{ width: "104px", height: "11px" }} />
                        <span className="sk sk-quiet" style={{ width: "86px", height: "11px" }} />
                        <span className="sk sk-quiet" style={{ width: "68px", height: "11px" }} />
                      </span>
                    </div>
                  </article>
                ))}
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
      <LeadHeader
        description="Tu foto, los avisos que recibes y las sesiones abiertas en tu cuenta."
        title="Configuración"
      />

      <div className="settings-panel" style={{ "--sk-delay": "110ms" } as React.CSSProperties}>
        <div className="settings-panel-head">
          <h2>
            <ImageIcon aria-hidden="true" size={22} style={{ color: "var(--text-faint)" }} />
            Foto de perfil
          </h2>
          <span className="sk sk-quiet" style={{ width: "min(100%, 420px)", height: "13px" }} />
        </div>
        <div className="settings-photo">
          <div className="settings-photo-current">
            <span className="sk sk-round" style={{ width: "44px", height: "44px" }} />
            <span className="sk sk-quiet" style={{ width: "84px", height: "12px" }} />
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
            Avisos
          </h2>
          <span className="sk sk-quiet" style={{ width: "min(100%, 460px)", height: "13px" }} />
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
            Accesibilidad
          </h2>
          <span className="sk sk-quiet" style={{ width: "min(100%, 480px)", height: "13px" }} />
        </div>
        <div className="settings-switch">
          <span
            className="sk"
            style={{ width: "40px", height: "24px", borderRadius: "var(--radius-full)" }}
          />
          <span className="sk sk-quiet" style={{ width: "225px", height: "14px" }} />
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
            Cuenta y seguridad
          </h2>
          <span className="sk sk-quiet" style={{ width: "min(100%, 440px)", height: "13px" }} />
        </div>
        <div className="settings-facts">
          <div>
            <span className="sk sk-quiet" style={{ width: "130px", height: "12px" }} />
            <span className="sk" style={{ width: "245px", height: "15px" }} />
          </div>
          <div>
            <span className="sk sk-quiet" style={{ width: "60px", height: "12px" }} />
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
                <span className="sk sk-quiet" style={{ width: "175px", height: "12px" }} />
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

/* ── Esqueletos internos del aula ─────────────────────────────
   Cada uno reemplaza una línea de texto «Cargando…» por la silueta de lo que
   está por llegar, con las mismas clases de la lista o el panel real.
   ─────────────────────────────────────────────────────────── */

// Implements: REQ-QUIZ-01
export function QuizListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando cuestionarios…"
      className="quiz-student-list"
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <article
          className="quiz-student-card"
          key={`quiz-${row}`}
          style={{ "--sk-delay": `${60 + row * 50}ms` } as React.CSSProperties}
        >
          <span className="sk" style={{ width: "34px", height: "26px" }} />
          <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
            <span
              className="sk"
              style={{ width: "92px", height: "20px", borderRadius: "var(--radius-full)" }}
            />
            <span className="sk" style={{ width: `${46 + row * 9}%`, height: "17px" }} />
            <span className="sk sk-quiet" style={{ width: `${78 - row * 6}%`, height: "13px" }} />
            <span style={{ display: "flex", gap: "var(--space-md)" }}>
              <span className="sk sk-quiet" style={{ width: "104px", height: "12px" }} />
              <span className="sk sk-quiet" style={{ width: "92px", height: "12px" }} />
            </span>
          </div>
          <span
            className="sk"
            style={{ width: "126px", height: "40px", borderRadius: "var(--radius-full)" }}
          />
        </article>
      ))}
    </div>
  );
}

// Implements: REQ-INTEROP-01
export function InteropListSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Cargando recursos externos…"
      className="interop-resource-list"
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <li
          key={`interop-${row}`}
          style={{ "--sk-delay": `${60 + row * 45}ms` } as React.CSSProperties}
        >
          <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
            <span className="sk sk-quiet" style={{ width: "72px", height: "11px" }} />
            <span
              className="sk"
              style={{ width: `${188 + ((row * 43) % 120)}px`, height: "16px" }}
            />
          </div>
          <div className="interop-actions">
            <span
              className="sk"
              style={{ width: "132px", height: "38px", borderRadius: "var(--radius-md)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Implements: REQ-COMM-04
export function ConversationSkeleton() {
  return (
    <ol aria-busy="true" aria-label="Cargando conversación…" className="message-list" role="status">
      {[
        { own: false, width: "62%", lines: 2 },
        { own: true, width: "48%", lines: 1 },
        { own: false, width: "70%", lines: 2 },
      ].map((bubble, index) => (
        <li className={bubble.own ? "own" : undefined} key={`message-${index}`}>
          <span
            className="message-bubble"
            style={
              {
                display: "grid",
                gap: "8px",
                width: bubble.width,
                "--sk-delay": `${60 + index * 60}ms`,
              } as React.CSSProperties
            }
          >
            <span className="sk sk-quiet" style={{ width: "96px", height: "11px" }} />
            <span className="sk" style={{ width: "100%", height: "13px" }} />
            {bubble.lines === 2 && <span className="sk" style={{ width: "68%", height: "13px" }} />}
            <span className="sk sk-quiet" style={{ width: "62px", height: "10px" }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

// Implements: REQ-GRADE-HISTORY-01
export function GradeHistorySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando historial de la nota…"
      className="grade-history-skeleton"
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <span
          className="grade-history-skeleton-row"
          key={`grade-history-${row}`}
          style={{ "--sk-delay": `${60 + row * 45}ms` } as React.CSSProperties}
        >
          <span className="sk" style={{ width: "10px", height: "10px", borderRadius: "50%" }} />
          <span style={{ display: "grid", gap: "7px", minWidth: 0 }}>
            <span
              className="sk"
              style={{ width: `${168 + ((row * 37) % 90)}px`, height: "14px" }}
            />
            <span className="sk sk-quiet" style={{ width: "212px", height: "11px" }} />
          </span>
        </span>
      ))}
    </div>
  );
}

/* El visor de PDF pesa lo suyo: mientras baja, la bandeja muestra la hoja que
   va a ocupar, no un renglón de texto que después desaparece. */
// Implements: REQ-REV-01
export function DocumentPaneSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Preparando el visor de la entrega…"
      className="review-doc-skeleton"
      role="status"
    >
      <span className="sk review-doc-skeleton-page" />
    </div>
  );
}
