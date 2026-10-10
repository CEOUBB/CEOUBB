"use client";

import type { RefObject } from "react";
import * as m from "motion/react-m";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Keyboard,
  Plus,
  SidebarSimple,
} from "@phosphor-icons/react";
import type { CalendarView } from "../../../lib/planner";
import { dayOf, weekdayOf } from "../../../lib/portal-utils";
import { VIEWS, longDate, rectOf } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { useSwipe } from "./usePlannerDrag";

const STEP_LABEL: Record<CalendarView, [string, string]> = {
  day: ["Día anterior", "Día siguiente"],
  week: ["Semana anterior", "Semana siguiente"],
  month: ["Mes anterior", "Mes siguiente"],
  agenda: ["Cuatro semanas antes", "Cuatro semanas después"],
};

export function CalendarHeader({
  summary,
  loaded,
  shortcutsRef,
  onCreate,
  onShortcuts,
}: {
  summary: string;
  loaded: boolean;
  shortcutsRef: RefObject<HTMLButtonElement | null>;
  onCreate: () => void;
  onShortcuts: (anchor: AnchorRect) => void;
}) {
  return (
    <header className="page-head planner-bar">
      <div className="planner-lead">
        <h1>Calendario</h1>
        <p className="num">
          {loaded ? summary : <span role="status">Sincronizando bloques…</span>}
        </p>
      </div>
      <div className="planner-actions">
        <button
          aria-keyshortcuts="Shift+?"
          aria-label="Atajos de teclado"
          className="planner-icon-button planner-shortcuts-button"
          onClick={(event) => onShortcuts(rectOf(event.currentTarget))}
          ref={shortcutsRef}
          type="button"
        >
          <Keyboard aria-hidden="true" size={18} />
        </button>
        <button
          aria-keyshortcuts="C"
          className="primary-button planner-create"
          onClick={onCreate}
          type="button"
        >
          <Plus aria-hidden="true" size={16} weight="bold" />
          <span>Nuevo bloque</span>
        </button>
      </div>
    </header>
  );
}

export function CalendarToolbar({
  view,
  title,
  sideOpen,
  pickerOpen,
  onView,
  onToday,
  onStep,
  onToggleSide,
  onPicker,
}: {
  view: CalendarView;
  title: string;
  sideOpen: boolean;
  pickerOpen: boolean;
  onView: (view: CalendarView) => void;
  onToday: () => void;
  onStep: (direction: 1 | -1) => void;
  onToggleSide: () => void;
  onPicker: (anchor: AnchorRect) => void;
}) {
  const [previous, next] = STEP_LABEL[view];
  return (
    <div className="planner-toolbar">
      <button
        aria-label={sideOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
        aria-pressed={sideOpen}
        className="planner-icon-button planner-side-toggle"
        onClick={onToggleSide}
        type="button"
      >
        <SidebarSimple aria-hidden="true" size={18} />
      </button>
      <button aria-keyshortcuts="T" className="planner-today" onClick={onToday} type="button">
        Hoy
      </button>
      <div className="planner-step">
        <button
          aria-keyshortcuts="K"
          aria-label={previous}
          onClick={() => onStep(-1)}
          type="button"
        >
          <CaretLeft aria-hidden="true" size={16} weight="bold" />
        </button>
        <button aria-keyshortcuts="J" aria-label={next} onClick={() => onStep(1)} type="button">
          <CaretRight aria-hidden="true" size={16} weight="bold" />
        </button>
      </div>
      <h2 className="planner-range">
        <button
          aria-expanded={pickerOpen}
          aria-haspopup="dialog"
          onClick={(event) => onPicker(rectOf(event.currentTarget))}
          type="button"
        >
          <span>{title}</span>
          <CaretDown aria-hidden="true" size={14} weight="bold" />
        </button>
      </h2>
      <div aria-label="Vista del calendario" className="planner-view-switch" role="group">
        {VIEWS.map((option) => (
          <button
            aria-keyshortcuts={option.key.toUpperCase()}
            aria-pressed={view === option.id}
            key={option.id}
            onClick={() => onView(option.id)}
            type="button"
          >
            {view === option.id && (
              <m.span
                aria-hidden="true"
                className="planner-view-indicator"
                layoutId="planner-view-indicator"
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
              />
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Implements: REQ-CEO72-09 — tira semanal del teléfono con indicadores por ramo y deslizamiento lateral.
export function DayStrip({
  days,
  selected,
  today,
  tones,
  direction,
  onPick,
  onSwipe,
}: {
  days: string[];
  selected: string;
  today: string;
  tones: Map<string, string[]>;
  direction: number;
  onPick: (day: string) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const swipe = useSwipe(onSwipe);
  return (
    <nav aria-label="Días de la semana" className="planner-strip" {...swipe}>
      <div
        className="planner-strip-days"
        data-entering={direction === 0 ? undefined : "true"}
        key={days[0]}
        style={{ "--planner-dir": direction } as React.CSSProperties}
      >
        {days.map((day) => {
          const dots = tones.get(day) ?? [];
          return (
            <button
              aria-current={day === today ? "date" : undefined}
              aria-label={`${longDate(day)}${dots.length ? `, ${dots.length} ${dots.length === 1 ? "actividad" : "actividades"}` : ""}`}
              aria-pressed={day === selected}
              className="planner-strip-day"
              key={day}
              onClick={() => onPick(day)}
              type="button"
            >
              <small>{weekdayOf(day)}</small>
              <b className="num">{Number(dayOf(day))}</b>
              <span aria-hidden="true">
                {dots.slice(0, 3).map((tone, index) => (
                  <i key={index} style={{ "--course-tone": tone } as React.CSSProperties} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
