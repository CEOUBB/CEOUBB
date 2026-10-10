"use client";

import { useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { monthDates, shiftDate, shiftMonth } from "../../../lib/planner";
import { dayOf } from "../../../lib/portal-utils";
import { longDate, monthTitle } from "./calendar-constants";

const WEEKDAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

// Implements: REQ-CEO72-08 — mini mes con navegación propia, marcas académicas y flechas del teclado.
export function MiniMonth({
  selected,
  today,
  range,
  marks,
  onPick,
}: {
  selected: string;
  today: string;
  range: string[];
  marks: Set<string>;
  onPick: (date: string) => void;
}) {
  const month = selected.slice(0, 7);
  const [shown, setShown] = useState(month);
  const [synced, setSynced] = useState(month);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);

  if (synced !== month) {
    setSynced(month);
    setShown(month);
  }

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    buttons.current.get(target)?.focus();
  }, [shown]);

  const first = `${shown}-01`;
  const days = monthDates(first);
  const inRange = new Set(range);
  const tabStop = selected.startsWith(shown) ? selected : first;

  const move = (from: string, step: number) => {
    const next = shiftDate(from, step);
    const node = buttons.current.get(next);
    if (node && next.startsWith(shown)) {
      node.focus();
      return;
    }
    pendingFocus.current = next;
    setShown(next.slice(0, 7));
  };

  return (
    <div className="planner-mini">
      <div className="planner-mini-head">
        <p aria-live="polite" className="planner-mini-title">
          {monthTitle(first)}
        </p>
        <button
          aria-label="Retroceder un mes"
          className="planner-icon-button"
          onClick={() => setShown(shiftMonth(first, -1).slice(0, 7))}
          type="button"
        >
          <CaretLeft aria-hidden="true" size={14} weight="bold" />
        </button>
        <button
          aria-label="Avanzar un mes"
          className="planner-icon-button"
          onClick={() => setShown(shiftMonth(first, 1).slice(0, 7))}
          type="button"
        >
          <CaretRight aria-hidden="true" size={14} weight="bold" />
        </button>
      </div>
      <div aria-label={monthTitle(first)} className="planner-mini-grid" role="group">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span aria-hidden="true" className="planner-mini-weekday" key={index}>
            {initial}
          </span>
        ))}
        {days.map((day, index) => {
          const column = index % 7;
          const banded = inRange.has(day);
          return (
            <button
              aria-current={day === today ? "date" : undefined}
              aria-label={`${longDate(day)}${marks.has(day) ? ", con entregas o evaluaciones" : ""}`}
              aria-pressed={day === selected}
              className="planner-mini-day num"
              data-band={banded || undefined}
              data-band-end={
                (banded && (column === 6 || !inRange.has(shiftDate(day, 1)))) || undefined
              }
              data-band-start={
                (banded && (column === 0 || !inRange.has(shiftDate(day, -1)))) || undefined
              }
              data-mark={marks.has(day) || undefined}
              data-outside={!day.startsWith(shown) || undefined}
              key={day}
              onClick={() => onPick(day)}
              onKeyDown={(event) => {
                const step = KEY_STEPS[event.key];
                if (step === undefined) return;
                event.preventDefault();
                move(day, step);
              }}
              ref={(button) => {
                if (button) buttons.current.set(day, button);
                else buttons.current.delete(day);
              }}
              tabIndex={day === tabStop ? 0 : -1}
              type="button"
            >
              {Number(dayOf(day))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
