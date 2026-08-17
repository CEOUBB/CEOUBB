"use client";

import { AnimatePresence } from "motion/react";
import { Plus } from "@phosphor-icons/react";
import { DAY_END_MINUTES, DAY_START_MINUTES, timeOfMinutes } from "../../../lib/planner";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";
import { dayOf, weekdayOf } from "../../../lib/portal-utils";
import { HOUR_LINES, MINUTE_SPAN, SLOT_HOURS, offsetOf } from "./calendar-constants";
import { PlannerBlockArticle } from "./PlannerBlock";

export function PlannerGrid({
  days,
  today,
  focusDay,
  byDay,
  nowMinutes,
  blockCount,
  weekLoaded,
  onOpenGrid,
  onNewBlock,
  onToggleDone,
  onEditBlock,
  onRemoveBlock,
  firstFreeHour,
}: {
  days: string[];
  today: string;
  focusDay: string;
  byDay: Map<string, { ribbon: PlannerItem[]; blocks: PlacedBlock[] }>;
  nowMinutes: number;
  blockCount: number;
  weekLoaded: boolean;
  onOpenGrid: (node: HTMLDivElement | null) => void;
  onNewBlock: (day: string, hour: number) => void;
  onToggleDone: (block: PlannerItem) => void;
  onEditBlock: (block: PlannerItem) => void;
  onRemoveBlock: (block: PlannerItem) => void;
  firstFreeHour: number;
}) {
  return (
    <div className="planner-grid" key={`grid-${days[0]}`} ref={onOpenGrid}>
      <div aria-hidden="true" className="planner-hours">
        {HOUR_LINES.map((hour) => (
          <span key={hour} style={{ top: offsetOf(hour * 60) }}>
            {timeOfMinutes(hour * 60)}
          </span>
        ))}
        {days.includes(today) &&
          nowMinutes >= DAY_START_MINUTES &&
          nowMinutes <= DAY_END_MINUTES && (
            <b className="planner-hours-now" style={{ top: offsetOf(nowMinutes) }}>
              {timeOfMinutes(nowMinutes)}
            </b>
          )}
      </div>
      {days.map((day, index) => {
        const blocks = byDay.get(day)?.blocks ?? [];
        const isToday = day === today;
        return (
          <div
            className="planner-col"
            data-focus={day === focusDay ? "true" : undefined}
            data-today={isToday ? "true" : undefined}
            data-weekend={index > 4 ? "true" : undefined}
            key={day}
          >
            {isToday && nowMinutes > DAY_START_MINUTES && (
              <div
                aria-hidden="true"
                className="planner-spent"
                style={
                  {
                    "--planner-spent": String(
                      (Math.min(nowMinutes, DAY_END_MINUTES) - DAY_START_MINUTES) / MINUTE_SPAN
                    ),
                  } as React.CSSProperties
                }
              />
            )}
            {SLOT_HOURS.map((hour) => (
              <button
                aria-label={`Crear un bloque el ${weekdayOf(day)} ${dayOf(day)} a las ${timeOfMinutes(hour * 60)}`}
                className="planner-slot"
                key={hour}
                onClick={() => onNewBlock(day, hour)}
                tabIndex={-1}
                type="button"
              >
                <Plus aria-hidden="true" size={13} weight="bold" />
              </button>
            ))}
            <AnimatePresence initial={false}>
              {blocks.map((block) => (
                <PlannerBlockArticle
                  block={block}
                  key={block.id}
                  onEdit={onEditBlock}
                  onRemove={onRemoveBlock}
                  onToggleDone={onToggleDone}
                />
              ))}
            </AnimatePresence>
            {isToday && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES && (
              <div
                aria-hidden="true"
                className="planner-now"
                style={{ top: offsetOf(nowMinutes) }}
              />
            )}
          </div>
        );
      })}
      {blockCount === 0 && weekLoaded && (
        <div className="planner-blank">
          <div>
            <strong>Tu semana está vacía.</strong>
            <p>
              Elige una hora y resérvala para estudiar. El calendario la recuerda y la sincroniza
              con las entregas de tus ramos.
            </p>
            <button
              className="planner-create"
              onClick={() => onNewBlock(focusDay, firstFreeHour)}
              type="button"
            >
              <Plus size={15} weight="bold" /> Crear el primer bloque
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
