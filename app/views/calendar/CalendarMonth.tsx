"use client";

import { useRef } from "react";
import { CalendarCheck, ClipboardText } from "@phosphor-icons/react";
import type { PlannerItem } from "../../../lib/planner";
import { shiftDate } from "../../../lib/planner";
import { dayOf, weekdayOf } from "../../../lib/portal-utils";
import { KIND_LABEL } from "./calendar-constants";

// Implements: REQ-CEO72-01, REQ-CEO72-04
export function CalendarMonth({
  days,
  anchor,
  today,
  selected,
  items,
  onSelect,
  onOpen,
  onCreate,
}: {
  days: string[];
  anchor: string;
  today: string;
  selected: string;
  items: PlannerItem[];
  onSelect: (date: string) => void;
  onOpen: (item: PlannerItem) => void;
  onCreate: (date: string, hour: number) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const selectedItems = items.filter((item) => item.date === selected);
  return (
    <>
      <div className="planner-month" aria-label="Calendario mensual">
        {days.slice(0, 7).map((day) => (
          <div className="planner-month-weekday" key={day}>
            {weekdayOf(day)}
          </div>
        ))}
        {days.map((day) => {
          const events = items.filter((item) => item.date === day);
          return (
            <button
              key={day}
              type="button"
              className="planner-month-day num"
              ref={(node) => {
                if (node) buttons.current.set(day, node);
                else buttons.current.delete(day);
              }}
              data-outside={day.slice(0, 7) !== anchor.slice(0, 7) || undefined}
              aria-current={day === today ? "date" : undefined}
              aria-pressed={day === selected}
              aria-label={`${day}, ${events.length} actividades${events.some((item) => item.kind === "evaluation") ? ", evaluación" : ""}${events.some((item) => item.kind === "deadline") ? ", entrega" : ""}`}
              tabIndex={day === selected ? 0 : -1}
              onClick={() => onSelect(day)}
              onKeyDown={(event) => {
                const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
                  event.key
                ];
                if (delta === undefined) return;
                event.preventDefault();
                const next = shiftDate(day, delta);
                if (days.includes(next)) {
                  onSelect(next);
                  buttons.current.get(next)?.focus();
                }
              }}
            >
              <span className="planner-month-number">{dayOf(day)}</span>
              <span className="planner-month-events" aria-hidden="true">
                {events.slice(0, 3).map((item) => (
                  <span className="planner-month-event" key={item.id}>
                    {item.kind === "evaluation" ? (
                      <CalendarCheck size={13} />
                    ) : item.kind === "deadline" ? (
                      <ClipboardText size={13} />
                    ) : (
                      <span className="planner-month-dot" style={{ background: item.tone }} />
                    )}
                    <span>
                      {item.kind === "evaluation"
                        ? "Evaluación: "
                        : item.kind === "deadline"
                          ? "Entrega: "
                          : `${item.startTime} `}
                      {item.title}
                    </span>
                  </span>
                ))}
                {events.length > 3 && (
                  <span className="planner-month-more">+{events.length - 3} más</span>
                )}
              </span>
              {events.length > 0 && (
                <span className="planner-month-count" aria-hidden="true">
                  {events.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <section className="planner-day-agenda" aria-label="Actividades del día seleccionado">
        <header>
          <h2 className="num">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </h2>
          <button className="planner-create" type="button" onClick={() => onCreate(selected, 9)}>
            Añadir bloque
          </button>
        </header>
        {selectedItems.length === 0 ? (
          <p>No hay actividades para este día.</p>
        ) : (
          <ul>
            {selectedItems.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onOpen(item)}>
                  <span className="num">
                    {item.startTime
                      ? `${item.startTime}–${item.endTime}`
                      : item.kind === "evaluation"
                        ? "Evaluación"
                        : "Entrega"}
                  </span>
                  <strong>{item.title}</strong>
                  <span>
                    {item.courseName ??
                      (item.kind in KIND_LABEL
                        ? KIND_LABEL[item.kind as keyof typeof KIND_LABEL]
                        : item.detail)}
                    {item.completed ? " · Completado" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
