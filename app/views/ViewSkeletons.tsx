"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION
// Implements: REQ-SKELETON-01

import {
  Bell,
  CaretLeft,
  CaretRight,
  BookOpenText,
  LinkSimple,
  Plus,
  ChatCircleDots,
  Eye,
  IdentificationCard,
  Image as ImageIcon,
  Info,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { RESOURCE_GROUPS } from "./resources/resources-data";
import { COURSE_TABS } from "./classroom/classroom-utils";
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
        <div className="planner-controls" aria-hidden="true" inert>
          <div className="planner-step">
            <button type="button" disabled aria-label="Semana anterior">
              <CaretLeft size={16} />
            </button>
            <button type="button" disabled className="planner-now-button">
              Hoy
            </button>
            <button type="button" disabled aria-label="Semana siguiente">
              <CaretRight size={16} />
            </button>
          </div>
          <label className="planner-jump">
            <span className="sr-only">Ir a una fecha</span>
            <input type="date" value={days[0]} disabled />
          </label>
          <button type="button" disabled className="planner-create">
            <Plus size={15} /> Nuevo bloque
          </button>
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
            aria-current={day === today ? "date" : undefined}
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
              data-focus={day === today ? "true" : undefined}
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
              data-focus={day === today ? "true" : undefined}
              data-today={day === today ? "true" : undefined}
              data-weekend={colIdx > 4 ? "true" : undefined}
              key={day}
            ></div>
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
            style={{ width: "142px", height: "20px", borderRadius: "var(--radius-full)" }}
          />
        </div>
      </div>

      <nav className="resource-index" aria-hidden="true" inert>
        {RESOURCE_GROUPS.map((group) => (
          <a href={`#recursos-${group.id}`} key={group.id} tabIndex={-1}>
            {group.title}
          </a>
        ))}
      </nav>
      {RESOURCE_GROUPS.map((group) => (
        <section className={`res-group${group.disclaimer ? " res-group-ubb" : ""}`} key={group.id}>
          <div className="section-title compact-title">
            <h2>{group.title}</h2>
            <span className="res-group-count num">{group.items.length}</span>
          </div>
          <ul className="res-index" aria-hidden="true" inert>
            {group.items.map((item) => (
              <li className="res-row" key={item.url}>
                <a href={item.url} aria-label={item.name} tabIndex={-1}>
                  <span className="res-mark">
                    <span className="sk" style={{ width: 24, height: 24 }} />
                  </span>
                  <span className="res-body">
                    <span className="sk" style={{ width: "65%", height: 14 }} />
                    <span
                      className="sk sk-quiet"
                      style={{ width: "90%", height: 12, marginTop: 6 }}
                    />
                  </span>
                  <span className="sk" style={{ width: 14, height: 14 }} />
                </a>
              </li>
            ))}
          </ul>
          {group.notes && (
            <ul className="res-notes">
              {group.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {group.disclaimer && <p className="res-disclaimer">{group.disclaimer}</p>}
        </section>
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
        <div className="communications-tabs" aria-hidden="true" inert>
          <button type="button" disabled aria-selected="true" role="tab" tabIndex={-1}>
            <Bell aria-hidden="true" size={17} weight="fill" /> Avisos
          </button>
          <button type="button" disabled aria-selected="false" role="tab" tabIndex={-1}>
            <ChatCircleDots aria-hidden="true" size={17} /> Mensajes
          </button>
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
                  style={{ width: "10px", height: "10px", borderRadius: "var(--radius-md)" }}
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
        <button
          className="primary-button teacher-create-trigger"
          type="button"
          disabled
          aria-hidden="true"
          tabIndex={-1}
        >
          <Plus size={17} /> Crear ramo
        </button>
      </header>
      <TeacherCoursesBodySkeleton />
    </section>
  );
}

/* El interior se reutiliza mientras la vista ya montada pide sus secciones. */
export function TeacherCoursesBodySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando secciones docentes"
      className="teacher-manager-layout"
      role="status"
    >
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
            <span className="sk" style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
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
            <span className="sk" style={{ width: "268px", height: "26px" }} />
            <span className="sk sk-quiet" style={{ width: "146px", height: "13px" }} />
          </div>
          <span
            className="sk"
            style={{ width: "128px", height: "40px", borderRadius: "var(--radius-md)" }}
          />
        </div>
        <div className="teacher-manager-tabs" aria-hidden="true" inert>
          {["Datos del ramo", "Evaluaciones", "Ayudantes"].map((label, index) => (
            <button
              type="button"
              disabled
              className={index === 0 ? "active" : undefined}
              key={label}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="teacher-config-panel">
          <div className="teacher-panel-intro">
            <BookOpenText size={22} aria-hidden="true" />
            <div>
              <h3>Datos del ramo</h3>
              <p>Esta información aparece en la portada y en la navegación de tus estudiantes.</p>
            </div>
          </div>
          <div className="teacher-form-grid" aria-hidden="true" inert>
            <label className="teacher-field-full">
              Nombre visible
              <input disabled />
            </label>
            <label>
              Modalidad
              <select disabled>
                <option />
              </select>
            </label>
            <label>
              Sala o enlace
              <input disabled />
            </label>
            <label>
              Identidad visual
              <select disabled>
                <option />
              </select>
            </label>
            <label className="teacher-field-full">
              Descripción
              <textarea disabled rows={5} />
            </label>
          </div>
          <div className="teacher-form-actions">
            <span className="sk" style={{ width: 150, height: 44 }} />
          </div>
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
          <div className="classroom-heading">
            <span
              className="breadcrumb"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span className="sk sk-quiet" style={{ width: "64px", height: "12px" }} />
              <span style={{ color: "var(--text-faint)" }}>/</span>
              <span className="sk sk-quiet" style={{ width: "90px", height: "12px" }} />
            </span>
            <h1>
              <span className="sr-only">Cargando aula virtual…</span>
              <span
                className="sk"
                style={
                  {
                    width: "220px",
                    height: "1.25em",
                    display: "block",
                    "--sk-delay": "80ms",
                  } as React.CSSProperties
                }
              />
            </h1>
            <p className="classroom-identity">
              <span className="sk sk-quiet" style={{ width: "190px", height: "1.5em" }} />
            </p>
          </div>
          <div className="classroom-meta" aria-hidden="true">
            {[164, 150, 150, 176].map((width, index) => (
              <span
                className="sk"
                key={index}
                style={{ width, height: "44px", borderRadius: "8px" }}
              />
            ))}
          </div>
        </header>

        <div className="course-tabs" aria-hidden="true" inert>
          {COURSE_TABS.map(({ key, label, Icon }) => (
            <button
              type="button"
              disabled
              key={key}
              className={key === "home" ? "active" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "home" && <span className="course-tab-indicator" />}
            </button>
          ))}
        </div>

        <div>
          <div className="classroom-columns">
            <section className="posts-section">
              <div className="section-title compact-title">
                <h2>Publicaciones del ramo</h2>
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
                  <div>
                    <dt>Código de la sección</dt>
                    <dd>
                      <span className="sk" style={{ width: "176px", height: "32px" }} />
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rail-card live-class-editor" aria-hidden="true">
                <div className="skeleton-rail-summary">
                  <span className="rail-card-icon">
                    <LinkSimple size={16} />
                  </span>
                  <span className="rail-card-heading">
                    <strong>Enlace de clase en vivo</strong>
                    <span className="sk sk-quiet" style={{ width: 90, height: 11 }} />
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

/*
  Reutiliza los paneles y el texto fijo para conservar su distribución al cargar.
  El número de sesiones se conoce sólo cuando responde el servidor.
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
          <p className="settings-note">
            Se sube el recorte cuadrado que dejes encuadrado, no la imagen original. Admite PNG, JPG
            y WEBP de hasta 2 MB.
          </p>
        </div>
        <div className="settings-photo">
          <div className="settings-photo-current">
            <span className="sk sk-round avatar large" />
            <span className="sk sk-quiet" style={{ width: "84px", height: "12px" }} />
          </div>
        </div>
        <div className="settings-actions">
          <span
            className="sk"
            style={{ width: "160px", height: "44px", borderRadius: "var(--radius-md)" }}
          />
          <span
            className="sk"
            style={{ width: "230px", height: "44px", borderRadius: "var(--radius-md)" }}
          />
        </div>
      </div>

      <div className="settings-panel" style={{ "--sk-delay": "160ms" } as React.CSSProperties}>
        <div className="settings-panel-head">
          <h2>
            <Bell aria-hidden="true" size={22} style={{ color: "var(--text-faint)" }} />
            Avisos
          </h2>
          <p className="settings-note">
            Cada canal se controla por separado para el portal web y para las notificaciones push de
            la aplicación móvil. Los cambios se guardan en cuanto los haces.
          </p>
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
                {index > 1 && (
                  <small>
                    Tu preferencia queda guardada, pero este aviso todavía no tiene un emisor que lo
                    envíe.
                  </small>
                )}
              </div>
              <div className="settings-channel-toggles">
                {["Web", "Push móvil"].map((label) => (
                  <span className="settings-switch" key={label}>
                    <span className="sk sk-round" style={{ width: 40, height: 24 }} />
                    {label}
                  </span>
                ))}
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
          <p className="settings-note">
            Con el alternador apagado, la preferencia de movimiento de tu sistema operativo sigue
            aplicándose por su cuenta.
          </p>
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
          <p className="settings-note">
            Tu correo y tu rango se derivan de la cuenta institucional y no se editan desde aquí.
          </p>
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
            style={{ width: "270px", height: "44px", borderRadius: "var(--radius-md)" }}
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
export function QuizListSkeleton({ teacher = false }: { teacher?: boolean } = {}) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando cuestionarios…"
      className={teacher ? "quiz-card-list" : "quiz-student-list"}
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <article
          className={teacher ? "quiz-card" : "quiz-student-card"}
          key={`quiz-${row}`}
          style={{ "--sk-delay": `${60 + row * 50}ms` } as React.CSSProperties}
        >
          <span className="sk" style={{ width: teacher ? 44 : 34, height: teacher ? 44 : 26 }} />
          <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
            <span
              className="sk"
              style={{ width: "92px", height: "20px", borderRadius: "var(--radius-full)" }}
            />
            <span className="sk" style={{ width: `${46 + row * 9}%`, height: "17px" }} />
            <span className="sk sk-quiet" style={{ width: `${78 - row * 6}%`, height: "13px" }} />
            {teacher ? (
              <>
                <span className="sk" style={{ width: 130, height: 44 }} />
                <dl>
                  {["Preguntas", "Tiempo", "Nota"].map((label) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <span className="sk sk-quiet" style={{ width: 40, height: 12 }} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <span className="quiz-card-facts">
                <span className="sk sk-quiet" style={{ width: 104, height: 12 }} />
                <span className="sk sk-quiet" style={{ width: 92, height: 12 }} />
              </span>
            )}
          </div>
          {!teacher && (
            <button
              className="primary-button"
              type="button"
              disabled
              aria-hidden="true"
              tabIndex={-1}
            >
              <span className="sk" style={{ width: 90, height: 13 }} />
            </button>
          )}
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
              style={{ width: "132px", height: "44px", borderRadius: "var(--radius-md)" }}
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
      className="grade-history-skeleton overflow-hidden rounded-xl border border-surface-border bg-surface-raised"
      role="status"
    >
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <strong className="text-xs">Auditoría de rectificaciones</strong>
        <span className="text-xs">Más recientes primero</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm num">
          <colgroup>
            {[28, 18, 18, 14, 22].map((width, index) => (
              <col key={index} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {["Fecha y Acción", "Nota Anterior", "Nota Nueva", "Delta", "Autor"].map((label) => (
                <th key={label} className="px-3 py-2.5 text-xs">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((row) => (
              <tr key={row} className="border-t">
                {[0, 1, 2, 3, 4].map((column) => (
                  <td key={column} className="px-3 py-2.5">
                    <span className="sk" style={{ width: "80%", height: 14 }} />
                    <span
                      className="sk sk-quiet"
                      style={{ width: "60%", height: 11, marginTop: 8 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
