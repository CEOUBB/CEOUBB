"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION
// Implements: REQ-SKELETON-01

import { useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  Bell,
  ChatCircleText,
  Check,
  CopySimple,
  Eye,
  IdentificationCard,
  Image as ImageIcon,
  Info,
  LinkSimple,
  LockKey,
  LockSimple,
  MagnifyingGlass,
  Megaphone,
  PencilSimpleLine,
  Plus,
  SignOut,
  Trash,
  Tray,
  UploadSimple,
} from "@phosphor-icons/react";
import type { Course } from "../../lib/courses";
import { COURSE_TONES, courseToneLabel, courseToneValue } from "../../lib/course-management";
import { timeOfMinutes, viewDates, weekDates } from "../../lib/planner";
import type { CalendarView } from "../../lib/planner";
import { dayOf, getSantiagoDateISO, weekdayOf } from "../../lib/portal-utils";
import type { User } from "../../lib/portal-utils";
import { canManageSectionContent, canTeachSection } from "../../lib/section-roles";
import type { SectionRole } from "../../lib/section-roles";
import { skeletonWave } from "../../lib/skeleton-wave";
import {
  CHANNELS_WITHOUT_SENDER,
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  cachedPreferences,
} from "../../lib/user-preferences";
import { Avatar } from "../portal-ui";
import {
  SLOT_HOURS,
  initialCalendarView,
  initialSideOpen,
  longDate,
  monthShort,
  offsetOf,
  rangeTitle,
  scrollGridToHour,
  useCompactViewport,
  zoneLabel,
} from "./calendar/calendar-constants";
import { CalendarHeader, CalendarToolbar, DayStrip } from "./calendar/CalendarHeader";
import { CourseFilters } from "./calendar/CalendarSide";
import { MiniMonth } from "./calendar/MiniMonth";
import { ClassroomHeader, ClassroomTabs } from "./classroom/ClassroomChrome";
import { MobileStrip, ResourceGroupSection } from "./resources/resource-parts";
import { AccountFacts } from "./settings-parts";
import { RESOURCE_GROUPS } from "./resources/resources-data";
import { Bone, Line } from "./skeleton-bones";

const noop = () => {};
const NO_DAYS = new Set<string>();
const NO_TONES = new Map<string, string[]>();
const NEUTRAL_TONE = { "--course-tone": "oklch(0.62 0.01 265)" } as React.CSSProperties;

function LeadHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-head lead">
      <h1>{title}</h1>
      <p>
        <span>{description}</span>
      </p>
    </div>
  );
}

/* ── Calendario ─────────────────────────────────────────────── */

function UpcomingSkeleton() {
  return (
    <section className="planner-upcoming">
      <h2>Lo que viene</h2>
      <ul>
        {[0, 1, 2].map((row) => (
          <li key={row}>
            <span className="planner-upcoming-open">
              <Bone w={16} h={12} r="4px 4px 2px 2px" />
              <span className="planner-upcoming-when">
                <Line w="4.5em" quiet />
              </span>
              <strong>
                <Line w={row === 0 ? "92%" : `${62 + ((row * 17) % 30)}%`} />
                {row === 0 && <Line w="48%" />}
              </strong>
              <small>
                <Line w="70%" quiet />
              </small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GridSkeleton({ days, today }: { days: string[]; today: string }) {
  const single = days.length === 1;
  return (
    <div
      className="planner-frame"
      data-span={single ? "day" : "week"}
      style={
        {
          "--planner-days": days.length,
          "--planner-rows": SLOT_HOURS.length,
        } as React.CSSProperties
      }
    >
      <div className="planner-grid" ref={scrollGridToHour}>
        <div className="planner-sheet">
          <div className="planner-top">
            <div className="planner-head">
              <span className="planner-zone num">{zoneLabel(days[0])}</span>
              {days.map((day) => {
                const label = (
                  <>
                    <small>{weekdayOf(day)}</small>
                    <b className="num">{dayOf(day)}</b>
                  </>
                );
                const state = {
                  className: "planner-headday",
                  "data-focus": day === today ? "true" : undefined,
                  "data-today": day === today ? "true" : undefined,
                };
                return single ? (
                  <div key={day} {...state}>
                    {label}
                  </div>
                ) : (
                  <button key={day} {...state} tabIndex={-1} type="button">
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="planner-canvas">
            <div aria-hidden="true" className="planner-hours">
              {SLOT_HOURS.map((hour) => (
                <span className="num" key={hour} style={{ top: offsetOf(hour * 60) }}>
                  {timeOfMinutes(hour * 60)}
                </span>
              ))}
            </div>
            {days.map((day, index) => (
              <div
                className="planner-col"
                data-today={day === today ? "true" : undefined}
                data-weekend={index > 4 ? "true" : undefined}
                key={day}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthSkeleton({ days, today }: { days: string[]; today: string }) {
  const month = today.slice(0, 7);
  return (
    <div className="planner-month-layout">
      <div
        className="planner-month"
        role="group"
        style={{ "--planner-weeks": days.length / 7 } as React.CSSProperties}
      >
        {days.slice(0, 7).map((day) => (
          <div aria-hidden="true" className="planner-month-weekday" key={day}>
            {weekdayOf(day)}
          </div>
        ))}
        {days.map((day, index) => (
          <button
            aria-current={day === today ? "date" : undefined}
            aria-pressed={day === today}
            className="planner-month-day"
            data-outside={!day.startsWith(month) || undefined}
            data-weekend={index % 7 > 4 || undefined}
            key={day}
            tabIndex={-1}
            type="button"
          >
            <span className="planner-month-number num">{Number(dayOf(day))}</span>
            <span aria-hidden="true" className="planner-month-events" />
          </button>
        ))}
      </div>
      <section className="planner-day-agenda">
        <header>
          <h3>{longDate(today)}</h3>
          <button className="planner-quiet-button" tabIndex={-1} type="button">
            Abrir día <ArrowRight aria-hidden="true" size={13} weight="bold" />
          </button>
          <button className="secondary-button" tabIndex={-1} type="button">
            <Plus aria-hidden="true" size={15} weight="bold" /> Añadir bloque
          </button>
        </header>
        <p className="planner-day-empty">
          <Line w="11em" quiet />
        </p>
      </section>
    </div>
  );
}

function AgendaSkeleton({ days, today }: { days: string[]; today: string }) {
  return (
    <div className="planner-agenda">
      {days.slice(0, 5).map((day, index) => (
        <section className="planner-agenda-day" data-today={day === today || undefined} key={day}>
          <div aria-hidden="true" className="planner-agenda-date">
            <span>{weekdayOf(day)}</span>
            <b className="num">{Number(dayOf(day))}</b>
            <span>{monthShort(day)}</span>
          </div>
          <ul>
            <li className="planner-row">
              <span className="planner-row-open">
                <span className="planner-row-time">
                  <Line w="3em" quiet />
                </span>
                <Bone w={16} h={12} r="4px 4px 2px 2px" />
                <span className="planner-row-copy">
                  <strong>
                    <Line w={`${44 + ((index * 23) % 40)}%`} />
                  </strong>
                  <small>
                    <Line w="9em" quiet />
                  </small>
                </span>
              </span>
            </li>
          </ul>
        </section>
      ))}
    </div>
  );
}

function CalendarStageSkeleton({ view, today }: { view: CalendarView; today: string }) {
  const days = viewDates(view, today);
  return (
    <div className="planner-stage">
      {view === "day" && (
        <DayStrip
          days={weekDates(today)}
          direction={0}
          onPick={noop}
          onSwipe={noop}
          selected={today}
          today={today}
          tones={NO_TONES}
        />
      )}
      {view === "month" ? (
        <MonthSkeleton days={days} today={today} />
      ) : view === "agenda" ? (
        <AgendaSkeleton days={days} today={today} />
      ) : (
        <GridSkeleton days={days} today={today} />
      )}
    </div>
  );
}

// Implements: REQ-CEO72-05
export function CalendarSkeleton({
  courses,
  initialView,
}: {
  courses: Course[];
  initialView?: CalendarView;
}) {
  const [view] = useState(() => initialView ?? initialCalendarView());
  const [sideOpen] = useState(initialSideOpen);
  const shortcuts = useRef<HTMLButtonElement>(null);
  const compact = useCompactViewport();
  const today = getSantiagoDateISO();

  return (
    <section
      aria-busy="true"
      aria-label="Cargando calendario…"
      className="planner"
      data-side={sideOpen ? "open" : "closed"}
      data-view={view}
      ref={skeletonWave}
      role="status"
    >
      <div className="sk-contents" inert>
        <CalendarHeader
          loaded={false}
          onCreate={noop}
          onShortcuts={noop}
          shortcutsRef={shortcuts}
          summary=""
        />
      </div>
      <div className="planner-body" inert>
        <CalendarToolbar
          onPicker={noop}
          onStep={noop}
          onToday={noop}
          onToggleSide={noop}
          onView={noop}
          pickerOpen={false}
          sideOpen={sideOpen}
          title={rangeTitle(view, viewDates(view, today), today, compact)}
          view={view}
        />
        <div className="planner-columns">
          <aside className="planner-side">
            <MiniMonth
              marks={NO_DAYS}
              onPick={noop}
              range={view === "week" ? weekDates(today) : []}
              selected={today}
              today={today}
            />
            {view !== "agenda" && <UpcomingSkeleton />}
            <CourseFilters courses={courses} hidden={NO_DAYS} onToggle={noop} />
          </aside>
          <CalendarStageSkeleton today={today} view={view} />
        </div>
      </div>
    </section>
  );
}

/* ── Recursos ───────────────────────────────────────────────── */

export function ResourcesSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando recursos de estudio…"
      className="resources-hub"
      ref={skeletonWave}
      role="status"
    >
      <LeadHeader
        description="Herramientas, material académico y convenios para acompañar tu estudio durante el semestre."
        title="Recursos de estudio"
      />
      <div className="sk-contents" inert>
        <MobileStrip />
        <nav className="resource-index">
          {RESOURCE_GROUPS.map((group) => (
            <a href={`#recursos-${group.id}`} key={group.id}>
              {group.title}
            </a>
          ))}
        </nav>
        {RESOURCE_GROUPS.map((group) => (
          <ResourceGroupSection
            group={group}
            key={group.id}
            renderMark={() => <Bone w={24} h={24} r="var(--radius-sm)" />}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Administración ─────────────────────────────────────────── */

// Implements: REQ-DELIB-02
export function PeriodListSkeleton() {
  return (
    <div aria-busy="true" className="admin-period-list" role="status">
      <span className="sr-only">Cargando períodos…</span>
      {[0, 1].map((row) => (
        <article key={row}>
          <span>
            <strong>
              <Line w={`${9 + row * 2}em`} />
            </strong>
            <small>
              <Line w="13em" quiet />
            </small>
          </span>
          <Bone w={84} h={24} r="var(--radius-full)" quiet />
          <Bone w={168} h={40} r="var(--radius-md)" />
        </article>
      ))}
    </div>
  );
}

export function AccountRowsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando cuentas…" role="status">
      {[0, 1, 2, 3, 4].map((row) => (
        <div className="admin-row" key={row}>
          <span>
            <b>
              <Line w={`${9 + ((row * 3) % 5)}em`} />
            </b>
            <small>
              <Line w={`${13 + ((row * 5) % 6)}em`} quiet />
            </small>
          </span>
          <Bone w={92} h={24} r="var(--radius-full)" quiet />
          <span>
            <Bone w={132} h={34} r="var(--radius-md)" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando administración de cuentas…"
      ref={skeletonWave}
      role="status"
    >
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        <p>
          <span>
            <Line w="10em" quiet />
          </span>
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>

      <section className="admin-periods">
        <div>
          <h2>Períodos académicos</h2>
          <p>El cierre conserva todos los ramos y los mueve al historial de solo lectura.</p>
        </div>
        <PeriodListSkeleton />
      </section>

      <div className="admin-toolbar" inert>
        <div className="admin-search-box">
          <MagnifyingGlass size={18} className="admin-search-icon" aria-hidden="true" />
          <input
            aria-hidden="true"
            className="admin-search-input"
            placeholder="Buscar por nombre o correo…"
            tabIndex={-1}
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
        <AccountRowsSkeleton />
      </div>
    </section>
  );
}

/* ── Avisos y mensajes ──────────────────────────────────────── */

// Implements: REQ-COMM-01
export function AnnouncementListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando avisos…" ref={skeletonWave} role="status">
      <ol className="announcement-list">
        {[0, 1, 2, 3].map((row) => (
          <li key={row}>
            <span className="announcement-row" style={NEUTRAL_TONE}>
              <Bone w={40} h={40} r="var(--radius-md)" />
              <span className="announcement-copy">
                <span className="announcement-title">
                  <Line w={`${38 + ((row * 19) % 34)}%`} />
                </span>
                <span className="announcement-meta">
                  <strong>
                    <Line w={`${10 + ((row * 7) % 6)}em`} quiet />
                  </strong>
                  <time>
                    <Line w="8em" quiet />
                  </time>
                </span>
              </span>
              <span className="announcement-end">
                <ArrowRight aria-hidden="true" size={18} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Implements: REQ-COMM-04
export function ConversationListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando conversaciones…" ref={skeletonWave} role="status">
      <ol className="conversation-list">
        {[0, 1, 2].map((row) => (
          <li key={row}>
            <span className="conversation-row" style={NEUTRAL_TONE}>
              <Bone w={40} h={40} round />
              <span className="conversation-copy">
                <strong>
                  <Line w={`${9 + ((row * 3) % 5)}em`} />
                </strong>
                <small>
                  <Line w="7em" quiet />
                </small>
                <span>
                  <Line w={`${70 - row * 12}%`} quiet />
                </span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Implements: REQ-COMM-01
export function CommunicationsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando avisos y mensajes…"
      className="communications-center"
      ref={skeletonWave}
      role="status"
    >
      <header className="page-head communications-heading">
        <div>
          <h1>Avisos y mensajes</h1>
          <p>Revisa lo nuevo en tus ramos y conversa en privado con el equipo docente.</p>
        </div>
        <div className="communications-summary">
          <Bell aria-hidden="true" size={20} />
          <small>
            <Line w="5.5em" quiet />
          </small>
        </div>
      </header>

      <div className="communications-workspace">
        <div className="communications-toolbar" inert>
          <div className="communications-tabs">
            <button aria-selected="true" role="tab" tabIndex={-1} type="button">
              <Bell aria-hidden="true" size={18} weight="fill" />
              Avisos
            </button>
            <button aria-selected="false" role="tab" tabIndex={-1} type="button">
              <ChatCircleText aria-hidden="true" size={18} />
              Mensajes
            </button>
          </div>
          <p className="communications-rail-note">
            <LockSimple aria-hidden="true" size={18} />
            Tus consultas se comparten sólo con el equipo de tu sección.
          </p>
        </div>

        <div className="communications-content">
          <p className="communications-feedback" />
          <div className="communications-panel">
            <header className="communications-panel-heading">
              <div>
                <h2>Novedades de tus ramos</h2>
                <p>Avisos, materiales y evaluaciones publicados por el equipo docente.</p>
              </div>
              <span>
                <Line w="7em" quiet />
              </span>
            </header>
            <AnnouncementListSkeleton />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Administrar ramos ──────────────────────────────────────── */

// Implements: REQ-TEACH-01
export function TeacherCoursesSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando espacio docente…"
      className="teacher-manager"
      ref={skeletonWave}
      role="status"
    >
      <header className="teacher-manager-hero">
        <div>
          <h1>Administrar ramos</h1>
          <p>Crea tu sección y mantén su ficha, evaluaciones y ayudantes desde un solo lugar.</p>
        </div>
        <button className="primary-button teacher-create-trigger" inert type="button">
          <Plus aria-hidden="true" size={16} weight="bold" />
          Crear ramo
        </button>
      </header>
      <p className="teacher-manager-status" />
      <TeacherCoursesBodySkeleton />
    </section>
  );
}

export function TeacherCoursesBodySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando secciones docentes"
      className="teacher-manager-layout"
      ref={skeletonWave}
      role="status"
    >
      <aside className="teacher-course-list" inert>
        <div className="teacher-course-list-head">
          <span>Mis secciones</span>
          <Line w="1em" quiet />
        </div>
        {[0, 1, 2].map((row) => (
          <button
            className={row === 0 ? "active" : undefined}
            key={row}
            style={NEUTRAL_TONE}
            tabIndex={-1}
            type="button"
          >
            <span className="teacher-course-mark" aria-hidden="true" />
            <span>
              <strong>
                <Line w={`${9 + ((row * 4) % 5)}em`} />
              </strong>
              <small>
                <Line w="10em" quiet />
              </small>
            </span>
          </button>
        ))}
      </aside>

      <div className="teacher-course-workspace" inert style={NEUTRAL_TONE}>
        <div className="teacher-course-heading">
          <span aria-hidden="true" className="classroom-tab">
            <Line w="4.5em" />
          </span>
          <div>
            <h2>
              <Line w="11em" />
            </h2>
            <p>
              <Line w="13em" quiet />
            </p>
          </div>
          <button className="secondary-button" tabIndex={-1} type="button">
            Abrir aula
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
        <div className="teacher-manager-tabs">
          {["Datos del ramo", "Evaluaciones", "Ayudantes"].map((label, index) => (
            <button
              className={index === 0 ? "active" : undefined}
              key={label}
              role="tab"
              tabIndex={-1}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="teacher-config-panel">
          <div className="teacher-panel-intro">
            <h3>Datos del ramo</h3>
            <p>Esta información aparece en la portada y en la navegación de tus estudiantes.</p>
          </div>
          <div className="teacher-form-grid">
            <label className="teacher-field-full">
              Nombre visible
              <input readOnly tabIndex={-1} />
            </label>
            <label className="teacher-field-third">
              Modalidad
              <select tabIndex={-1}>
                <option />
              </select>
            </label>
            <label className="teacher-field-two-thirds">
              Sala o enlace
              <input readOnly tabIndex={-1} />
            </label>
            <fieldset className="teacher-tone-picker teacher-field-full">
              <legend>Identidad visual</legend>
              {COURSE_TONES.map((tone) => (
                <label
                  key={tone}
                  style={{ "--course-tone": courseToneValue(tone) } as React.CSSProperties}
                >
                  <input name="tone-skeleton" readOnly tabIndex={-1} type="radio" />
                  <span aria-hidden="true" className="teacher-tone-swatch" />
                  {courseToneLabel(tone)}
                </label>
              ))}
            </fieldset>
            <label className="teacher-field-full">
              Descripción
              <textarea readOnly rows={5} tabIndex={-1} />
            </label>
          </div>
          <div className="teacher-form-actions">
            <p />
            <button className="primary-button" tabIndex={-1} type="button">
              Guardar ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Aula ───────────────────────────────────────────────────── */

// Implements: REQ-SKELETON-01, REQ-PAGE-01
export function CoursePageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando la página del ramo…"
      className="page-sections"
      ref={skeletonWave}
      role="status"
    >
      {[0, 1].map((section) => (
        <section className="page-section" key={section}>
          <header className="page-section-head">
            <h2>
              <span className="page-section-toggle">
                <span aria-hidden="true" className="page-section-mark" />
                <Line w={`${34 + section * 14}%`} />
              </span>
            </h2>
          </header>
          <div className="page-section-body">
            <div className="page-item">
              <div className="academic-prose rich-text">
                <p>
                  <Line w="96%" quiet />
                  <Line w="88%" quiet />
                  <Line w={`${52 + section * 10}%`} quiet />
                </p>
              </div>
            </div>
            <div className="page-item" data-type="file">
              <span className="page-file">
                <Bone h={36} r="var(--radius-md)" w={36} />
                <span className="page-file-text">
                  <Line w="42%" />
                  <Line w="18%" quiet />
                </span>
              </span>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function CourseRailSkeleton({
  course,
  canTeach,
  readOnly,
}: {
  course: Course;
  canTeach: boolean;
  readOnly: boolean;
}) {
  return (
    <aside className="course-rail" inert>
      <section className="rail-announcements">
        <div className="section-title compact-title">
          <h2>
            <Megaphone size={19} weight="fill" aria-hidden="true" />
            Avisos
          </h2>
        </div>
        <div className="course-notices-card">
          <div className="course-notices-list">
            {[0, 1].map((row) => (
              <span className="course-notice-row" key={row}>
                <Line w={`${62 + row * 18}%`} />
                <Line w="92%" quiet />
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className="section-title compact-title">
        <h2>
          <Info size={19} weight="fill" aria-hidden="true" />
          Información del ramo
        </h2>
      </div>
      <div className="course-facts">
        <dl>
          <div>
            <dt>Coordinación</dt>
            <dd>
              <b>{course.teacher}</b>
              <small>Cuenta docente institucional</small>
            </dd>
          </div>
          {canTeach && (
            <div>
              <dt>Matrícula de la sección</dt>
              <dd>
                <button className="course-reference" tabIndex={-1} type="button">
                  Ver participantes
                </button>
              </dd>
            </div>
          )}
          <div>
            <dt>Código de la sección</dt>
            <dd>
              <button className="course-reference swap-button" tabIndex={-1} type="button">
                <span className="num">{`${course.code} - ${course.section}`}</span>
                <span className="swap-wrapper" aria-hidden="true">
                  <span className="swap-content state-default">
                    <CopySimple aria-hidden="true" size={14} />
                    Copiar
                  </span>
                  <span className="swap-content state-copied">
                    <Check aria-hidden="true" size={14} weight="bold" />
                    Copiado
                  </span>
                </span>
              </button>
            </dd>
          </div>
        </dl>
      </div>
      {canTeach && !readOnly && (
        <details className="rail-card live-class-editor">
          <summary tabIndex={-1}>
            <span className="rail-card-icon" aria-hidden="true">
              <LinkSimple size={16} />
            </span>
            <span className="rail-card-heading">
              <strong>Enlace de clase en vivo</strong>
              <small>
                <Line w="8em" quiet />
              </small>
            </span>
          </summary>
        </details>
      )}
    </aside>
  );
}

// Implements: REQ-MOTION-04
export function ClassroomSkeleton({
  course,
  user,
  sectionRole,
}: {
  course: Course;
  user: User;
  sectionRole: SectionRole | null;
}) {
  const readOnly = course.readOnly === true;
  const canTeach = canTeachSection(user.role, sectionRole);
  const canManage = !readOnly && canManageSectionContent(user.role, sectionRole);

  return (
    <div
      aria-busy="true"
      aria-label="Abriendo aula virtual…"
      className="classroom-layout"
      ref={skeletonWave}
      role="status"
      style={{ "--course-tone": course.tone } as React.CSSProperties}
    >
      <div className="classroom-main">
        {readOnly && (
          <div className="classroom-archive-notice">
            <LockKey aria-hidden="true" size={19} weight="fill" />
            <span>
              <strong>Solo lectura.</strong> Este ramo pertenece a {course.period} y conserva sus
              materiales, entregas y notas como historial académico.
            </span>
          </div>
        )}
        <div className="sk-contents" inert>
          <ClassroomHeader course={course}>
            {(canTeach || canManage) && (
              <div className="classroom-meta">
                {canTeach && (
                  <button className="review-cta" tabIndex={-1} type="button">
                    <Tray size={16} aria-hidden="true" />
                    Corregir entregas
                  </button>
                )}
                {canManage && canTeach && (
                  <details className="classroom-imports">
                    <summary tabIndex={-1}>Importar contenidos</summary>
                  </details>
                )}
                {canManage && (
                  <>
                    <button className="review-cta" tabIndex={-1} type="button">
                      <PencilSimpleLine size={16} aria-hidden="true" />
                      Editar página
                    </button>
                    <button className="publication-cta" tabIndex={-1} type="button">
                      <Plus size={17} weight="bold" aria-hidden="true" />
                      Nuevo aviso
                    </button>
                  </>
                )}
              </div>
            )}
          </ClassroomHeader>
        </div>
        <ClassroomTabs inert tab="home" />
        <div>
          <div className="classroom-columns">
            <section className="course-page">
              <CoursePageSkeleton />
            </section>
            <CourseRailSkeleton canTeach={canTeach} course={course} readOnly={readOnly} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Configuración ──────────────────────────────────────────── */

const SETTINGS_TARGETS = ["Web", "Push móvil"];

function SettingsSwitchSkeleton({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="settings-switch">
      <input
        checked={checked}
        className="settings-switch-input"
        disabled
        readOnly
        role="switch"
        type="checkbox"
      />
      <span aria-hidden="true" className="settings-switch-track" />
      <span>{label}</span>
    </label>
  );
}

// Implements: REQ-CFG-08
export function SessionListSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">Leyendo tus sesiones…</span>
      <ul className="settings-sessions">
        <li className="settings-session">
          <div className="settings-session-copy">
            <strong>
              <Line w="13em" />
            </strong>
            <small>
              <Line w="10em" quiet />
            </small>
          </div>
          <Bone w={118} h={34} r="var(--radius-md)" quiet />
        </li>
      </ul>
    </div>
  );
}

// Implements: REQ-CFG-08
export function SettingsSkeleton({ user }: { user: User }) {
  const [preferences] = useState(cachedPreferences);

  return (
    <section
      aria-busy="true"
      aria-label="Cargando configuración de la cuenta…"
      className="settings-view"
      ref={skeletonWave}
      role="status"
    >
      <LeadHeader
        description="Tu foto, los avisos que recibes y las sesiones abiertas en tu cuenta."
        title="Configuración"
      />
      <p className="settings-status" />

      <div className="sk-contents" inert>
        <section className="settings-panel">
          <div className="settings-panel-head">
            <h2>
              <ImageIcon aria-hidden="true" size={22} />
              Foto de perfil
            </h2>
            <p className="settings-note">
              Se sube el recorte cuadrado que dejes encuadrado, no la imagen original. Admite PNG,
              JPG y WEBP de hasta 2 MB.
            </p>
          </div>
          <div className="settings-photo">
            <div className="settings-photo-current">
              <Avatar email={user.email} large name={user.name} photoUrl={user.photoUrl} />
              <span className="settings-photo-caption">Avatar actual</span>
            </div>
          </div>
          <div className="settings-actions">
            <span className="settings-file">
              <span className="secondary-button">
                <UploadSimple aria-hidden="true" size={18} />
                Elegir imagen
              </span>
            </span>
            <button className="secondary-button" tabIndex={-1} type="button">
              <ArrowCounterClockwise aria-hidden="true" size={18} />
              Restablecer la foto de Google
            </button>
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-head">
            <h2>
              <Bell aria-hidden="true" size={22} />
              Avisos
            </h2>
            <p className="settings-note">
              Cada canal se controla por separado para el portal web y para las notificaciones push
              de la aplicación móvil. Los cambios se guardan en cuanto los haces.
            </p>
          </div>
          <div className="settings-channels">
            {NOTIFICATION_CHANNELS.map((channel) => (
              <div className="settings-channel" key={channel}>
                <div className="settings-channel-copy">
                  <strong>{CHANNEL_LABELS[channel]}</strong>
                  {CHANNELS_WITHOUT_SENDER.includes(channel) ? (
                    <small>
                      Tu preferencia queda guardada, pero este aviso todavía no tiene un emisor que
                      lo envíe.
                    </small>
                  ) : null}
                </div>
                <div className="settings-channel-toggles">
                  {SETTINGS_TARGETS.map((label, index) => (
                    <SettingsSwitchSkeleton
                      checked={preferences.channels[channel][index === 0 ? "web" : "push"]}
                      key={label}
                      label={label}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-head">
            <h2>
              <Eye aria-hidden="true" size={22} />
              Accesibilidad
            </h2>
            <p className="settings-note">
              Con el alternador apagado, la preferencia de movimiento de tu sistema operativo sigue
              aplicándose por su cuenta.
            </p>
          </div>
          <SettingsSwitchSkeleton
            checked={preferences.reducedMotion}
            label="Reducir el movimiento del portal"
          />
        </section>

        <section className="settings-panel">
          <div className="settings-panel-head">
            <h2>
              <IdentificationCard aria-hidden="true" size={22} />
              Cuenta y seguridad
            </h2>
            <p className="settings-note">
              Tu correo y tu rango se derivan de la cuenta institucional y no se editan desde aquí.
            </p>
          </div>
          <AccountFacts user={user} />
          <h3 className="settings-subhead">Sesiones activas</h3>
          <SessionListSkeleton />
          <div className="settings-actions">
            <button className="secondary-button settings-logout" tabIndex={-1} type="button">
              <SignOut aria-hidden="true" size={18} />
              Cerrar sesión en este dispositivo
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

/* ── Módulos internos del aula ──────────────────────────────── */

// Implements: REQ-EVAL-01
export function GradesSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando la ponderación del ramo…"
      className="grades-view"
      ref={skeletonWave}
      role="status"
    >
      <div className="grades-table">
        <div className="grades-head">
          <span>Evaluación</span>
          <span>Pondera</span>
          <span>Nota oficial</span>
          <span>Simulación</span>
          <span>Entrega</span>
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div className="grades-row" key={row}>
            <span>
              <b>
                <Line w={`${8 + ((row * 3) % 6)}em`} />
              </b>
              <small>
                <Line quiet w="5em" />
              </small>
            </span>
            <span className="grades-weight">
              <Line quiet w="2.2em" />
            </span>
            <span className="grades-official">
              <Line w="2.4em" />
            </span>
            <span>
              <Bone h={34} r="var(--radius-md)" w={72} />
            </span>
            <span className="grades-submission">
              <Bone h={34} quiet r="var(--radius-md)" w={110} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Implements: REQ-TEAM-01
export function GradebookEditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando la ponderación del ramo…" role="status">
      <fieldset className="grades-editor" inert ref={skeletonWave}>
        {[0, 1, 2].map((row) => (
          <div className="grades-editor-row" key={row}>
            <label>
              Evaluación
              <input readOnly tabIndex={-1} />
            </label>
            <label>
              Pondera %
              <input readOnly tabIndex={-1} type="number" />
            </label>
            <label>
              Fecha
              <input readOnly tabIndex={-1} type="date" />
            </label>
            <label>
              Entrega
              <select tabIndex={-1}>
                <option />
              </select>
            </label>
            <button className="remove-row" tabIndex={-1} type="button">
              <Trash aria-hidden="true" size={15} />
              Quitar
            </button>
          </div>
        ))}
      </fieldset>
    </div>
  );
}

// Implements: REQ-QUIZ-01
export function QuizListSkeleton({ teacher = false }: { teacher?: boolean }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando cuestionarios…"
      className={teacher ? "quiz-card-list" : "quiz-student-list"}
      ref={skeletonWave}
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <article className={teacher ? "quiz-card" : "quiz-student-card"} key={row}>
          <Bone w={teacher ? 44 : 34} h={teacher ? 44 : 26} r="var(--radius-md)" />
          <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
            <Bone w={92} h={22} r="var(--radius-sm)" quiet />
            <Line w={`${46 + row * 9}%`} />
            <Line w={`${78 - row * 6}%`} quiet />
            {teacher ? (
              <dl>
                {["Preguntas", "Tiempo", "Nota"].map((label) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <Line w="2.5em" quiet />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <span className="quiz-card-facts">
                <Line w="7em" quiet />
                <Line w="6em" quiet />
              </span>
            )}
          </div>
          {!teacher && <Bone w={128} h={40} r="var(--radius-md)" />}
        </article>
      ))}
    </div>
  );
}

// Implements: REQ-INTEROP-01
export function InteropListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando recursos externos…" ref={skeletonWave} role="status">
      <ul className="interop-resource-list">
        {[0, 1, 2].map((row) => (
          <li key={row}>
            <div style={{ display: "grid", gap: "4px", minWidth: 0 }}>
              <Line w="5em" quiet />
              <Line w={`${12 + ((row * 3) % 8)}em`} />
            </div>
            <div className="interop-actions">
              <Bone w={132} h={44} r="var(--radius-md)" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Implements: REQ-INTEROP-01
export function InteropWorkspaceSkeleton() {
  return (
    <section className="interop-workspace">
      <div className="section-title compact-title">
        <h2>Herramientas y objetos de aprendizaje</h2>
      </div>
      <p className="interop-lede">
        Abre los laboratorios, recursos y actividades que comparte tu equipo docente.
      </p>
      <InteropListSkeleton />
    </section>
  );
}

// Implements: REQ-COMM-04
export function ConversationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando conversación…" ref={skeletonWave} role="status">
      <ol className="message-list">
        {[
          { own: false, width: "62%", lines: 2 },
          { own: true, width: "44%", lines: 1 },
          { own: false, width: "70%", lines: 2 },
        ].map((bubble) => (
          <li className={bubble.own ? "own" : undefined} key={bubble.width}>
            <span
              className="message-bubble"
              style={{ display: "grid", gap: "2px", width: bubble.width }}
            >
              <Line w="6em" quiet />
              <Line w="100%" />
              {bubble.lines === 2 && <Line w="68%" />}
              <Line w="4em" quiet />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Implements: REQ-GRADE-HISTORY-01
export function GradeHistorySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando historial de la nota…"
      className="grade-history-skeleton overflow-hidden rounded-xl border border-surface-border bg-surface-raised"
      ref={skeletonWave}
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
                    <Line w={column === 0 ? "80%" : "52%"} />
                    {column === 0 && <Line w="56%" quiet />}
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

// Implements: REQ-REV-01
export function DocumentPaneSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Preparando el visor de la entrega…"
      className="review-doc-skeleton"
      ref={skeletonWave}
      role="status"
    >
      <span className="review-doc-skeleton-page">
        <Line w="46%" />
        <Line w="92%" quiet />
        <Line w="88%" quiet />
        <Line w="94%" quiet />
        <Line w="61%" quiet />
      </span>
    </div>
  );
}
