"use client";

import { useRef } from "react";
import { ArrowRight, Plus } from "@phosphor-icons/react";
import type { PlannerItem } from "../../../lib/planner";
import { shiftDate } from "../../../lib/planner";
import { dayOf, weekdayOf } from "../../../lib/portal-utils";
import { longDate } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { AgendaRow } from "./CalendarAgenda";
import { ItemIcon } from "./CalendarParts";
import { useSwipe } from "./usePlannerDrag";

const EMPTY_ITEMS: PlannerItem[] = [];
const VISIBLE_EVENTS = 3;
const VISIBLE_DOTS = 4;

function dayLabel(day: string, events: PlannerItem[]): string {
  const count = events.length === 1 ? "1 actividad" : `${events.length} actividades`;
  const evaluations = events.filter((item) => item.kind === "evaluation").length;
  const deadlines = events.filter((item) => item.kind === "deadline").length;
  return [
    longDate(day),
    count,
    evaluations > 0 && (evaluations === 1 ? "1 evaluación" : `${evaluations} evaluaciones`),
    deadlines > 0 && (deadlines === 1 ? "1 entrega" : `${deadlines} entregas`),
  ]
    .filter(Boolean)
    .join(", ");
}

// Implements: REQ-CEO72-01, REQ-CEO72-04
export function CalendarMonth({
  days,
  anchor,
  today,
  selected,
  items,
  direction,
  onSelect,
  onOpen,
  onToggleDone,
  onCreate,
  onOpenDay,
  onSwipe,
}: {
  days: string[];
  anchor: string;
  today: string;
  selected: string;
  items: PlannerItem[];
  direction: number;
  onSelect: (date: string) => void;
  onOpen: (item: PlannerItem, anchor: AnchorRect) => void;
  onToggleDone: (item: PlannerItem) => void;
  onCreate: (date: string) => void;
  onOpenDay: (date: string) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const swipe = useSwipe(onSwipe);
  const itemsByDate = Map.groupBy(items, (item) => item.date);
  const selectedItems = itemsByDate.get(selected) ?? EMPTY_ITEMS;
  const month = anchor.slice(0, 7);

  return (
    <div className="planner-month-layout">
      <div
        aria-label="Calendario mensual"
        className="planner-month"
        data-entering={direction === 0 ? undefined : "true"}
        key={month}
        role="group"
        style={
          {
            "--planner-dir": direction,
            "--planner-weeks": days.length / 7,
          } as React.CSSProperties
        }
        {...swipe}
      >
        {days.slice(0, 7).map((day) => (
          <div aria-hidden="true" className="planner-month-weekday" key={day}>
            {weekdayOf(day)}
          </div>
        ))}
        {days.map((day, index) => {
          const events = itemsByDate.get(day) ?? EMPTY_ITEMS;
          return (
            <button
              aria-controls="planner-day-agenda"
              aria-current={day === today ? "date" : undefined}
              aria-label={dayLabel(day, events)}
              aria-pressed={day === selected}
              className="planner-month-day"
              data-day={day}
              data-outside={!day.startsWith(month) || undefined}
              data-weekend={index % 7 > 4 || undefined}
              key={day}
              onClick={() => onSelect(day)}
              onDoubleClick={() => onOpenDay(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.shiftKey) {
                  event.preventDefault();
                  onOpenDay(day);
                  return;
                }
                const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
                  event.key
                ];
                if (delta === undefined) return;
                event.preventDefault();
                const next = shiftDate(day, delta);
                const target = buttons.current.get(next);
                if (!target) return;
                onSelect(next);
                target.focus();
              }}
              ref={(node) => {
                if (node) buttons.current.set(day, node);
                else buttons.current.delete(day);
              }}
              tabIndex={day === selected ? 0 : -1}
              type="button"
            >
              <span className="planner-month-number num">{Number(dayOf(day))}</span>
              <span aria-hidden="true" className="planner-month-events">
                {events.slice(0, VISIBLE_EVENTS).map((item) => (
                  <span
                    className="planner-month-event"
                    data-kind={item.kind}
                    data-done={item.completed || undefined}
                    key={item.id}
                    style={{ "--course-tone": item.tone } as React.CSSProperties}
                  >
                    {item.startTime ? (
                      <>
                        <i className="planner-month-dot" />
                        <span className="num">{item.startTime}</span>
                      </>
                    ) : (
                      <ItemIcon kind={item.kind} size={11} />
                    )}
                    <span className="planner-month-title">{item.title}</span>
                  </span>
                ))}
                {events.length > VISIBLE_EVENTS && (
                  <span className="planner-month-more num">
                    {events.length - VISIBLE_EVENTS} más
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="planner-month-dots">
                {events.slice(0, VISIBLE_DOTS).map((item) => (
                  <i key={item.id} style={{ "--course-tone": item.tone } as React.CSSProperties} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <section
        aria-labelledby="planner-day-title"
        className="planner-day-agenda"
        id="planner-day-agenda"
      >
        <header>
          <h3 id="planner-day-title">{longDate(selected)}</h3>
          <button
            className="planner-quiet-button"
            onClick={() => onOpenDay(selected)}
            type="button"
          >
            Abrir día <ArrowRight aria-hidden="true" size={13} weight="bold" />
          </button>
          <button className="secondary-button" onClick={() => onCreate(selected)} type="button">
            <Plus aria-hidden="true" size={15} weight="bold" /> Añadir bloque
          </button>
        </header>
        {selectedItems.length === 0 ? (
          <p className="planner-day-empty">Sin actividades este día.</p>
        ) : (
          <ul>
            {selectedItems.map((item) => (
              <AgendaRow item={item} key={item.id} onOpen={onOpen} onToggleDone={onToggleDone} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
