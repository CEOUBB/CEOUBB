"use client";

import { Check } from "@phosphor-icons/react";
import type { PlannerItem } from "../../../lib/planner";
import { dayOf, weekdayOf } from "../../../lib/portal-utils";
import { itemContext, itemTimeLabel, longDate, monthShort, rectOf } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { ItemIcon, ToneMark } from "./CalendarParts";

export function AgendaRow({
  item,
  onOpen,
  onToggleDone,
}: {
  item: PlannerItem;
  onOpen: (item: PlannerItem, anchor: AnchorRect) => void;
  onToggleDone: (item: PlannerItem) => void;
}) {
  const personal = item.source === "user_personal";
  const time = itemTimeLabel(item);
  const context = itemContext(item);
  return (
    <li
      className="planner-row"
      data-done={item.completed || undefined}
      data-kind={item.kind}
      style={{ "--course-tone": item.tone } as React.CSSProperties}
    >
      <button
        aria-label={`Ver detalles de “${item.title}”, ${time}, ${context}${item.completed ? ", completado" : ""}`}
        className="planner-row-open"
        onClick={(event) => onOpen(item, rectOf(event.currentTarget))}
        type="button"
      >
        <span className="planner-row-time num">
          {item.startTime && item.endTime ? (
            <>
              <span>{item.startTime}</span>
              <span>{item.endTime}</span>
            </>
          ) : (
            time
          )}
        </span>
        {personal ? (
          <ToneMark tone={item.tone} />
        ) : (
          <span className="planner-row-icon">
            <ItemIcon kind={item.kind} size={13} />
          </span>
        )}
        <span className="planner-row-copy">
          <strong>{item.title}</strong>
          <small>{context}</small>
        </span>
      </button>
      {personal && (
        <button
          aria-label={
            item.completed
              ? `Marcar “${item.title}” como pendiente`
              : `Marcar “${item.title}” como hecho`
          }
          aria-pressed={item.completed}
          className="planner-row-check"
          onClick={() => onToggleDone(item)}
          type="button"
        >
          <Check aria-hidden="true" size={11} weight="bold" />
        </button>
      )}
    </li>
  );
}

// Implements: REQ-CEO72-05 — agenda continua de cuatro semanas con hojas de fecha.
export function CalendarAgenda({
  days,
  today,
  items,
  onOpen,
  onToggleDone,
}: {
  days: string[];
  today: string;
  items: PlannerItem[];
  onOpen: (item: PlannerItem, anchor: AnchorRect) => void;
  onToggleDone: (item: PlannerItem) => void;
}) {
  const byDate = Map.groupBy(items, (item) => item.date);
  const shown = days.filter((day) => byDate.has(day) || day === today);

  if (shown.length === 0) {
    return (
      <div className="planner-agenda planner-agenda-empty">
        <strong>Cuatro semanas sin actividades</strong>
        <p>No hay evaluaciones, entregas ni bloques entre estas fechas.</p>
      </div>
    );
  }

  return (
    <div className="planner-agenda">
      {shown.map((day) => {
        const entries = byDate.get(day) ?? [];
        return (
          <section className="planner-agenda-day" data-today={day === today || undefined} key={day}>
            <h3 className="sr-only">{longDate(day)}</h3>
            <div aria-hidden="true" className="planner-agenda-date">
              <span>{weekdayOf(day)}</span>
              <b className="num">{Number(dayOf(day))}</b>
              <span>{monthShort(day)}</span>
            </div>
            {entries.length === 0 ? (
              <p className="planner-agenda-free">Nada programado para hoy.</p>
            ) : (
              <ul>
                {entries.map((item) => (
                  <AgendaRow
                    item={item}
                    key={item.id}
                    onOpen={onOpen}
                    onToggleDone={onToggleDone}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
