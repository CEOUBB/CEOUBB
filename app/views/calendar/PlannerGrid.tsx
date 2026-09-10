"use client";

import { AnimatePresence } from "motion/react";
import { Plus } from "@phosphor-icons/react";
import { DAY_END_MINUTES, DAY_START_MINUTES, timeOfMinutes } from "../../../lib/planner";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";
import { dayOf, weekdayOf } from "../../../lib/portal-utils";
import { MINUTE_SPAN, SLOT_HOURS, offsetOf } from "./calendar-constants";
import { PlannerBlockArticle } from "./PlannerBlock";
import { usePlannerDrag } from "./usePlannerDrag";

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
  onMoveBlock,
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
  onNewBlock: (day: string, hour: number, endHour?: number) => void;
  onMoveBlock: (block: PlannerItem, day: string, start: string, end: string) => void;
  onToggleDone: (block: PlannerItem) => void;
  onEditBlock: (block: PlannerItem) => void;
  onRemoveBlock: (block: PlannerItem) => void;
  firstFreeHour: number;
}) {
  const drag = usePlannerDrag(onNewBlock, onMoveBlock);
  return (
    <>
      <div className="planner-gesture-bar">
        <p id="planner-gesture-help">
          Arrastra una hora para reservarla. Usa el control Mover de cada bloque o ábrelo para
          cambiar fecha y hora con teclado.
        </p>
        <button
          className="planner-touch-toggle"
          type="button"
          aria-pressed={drag.touchSelect}
          onClick={() => {
            drag.cancel();
            drag.setTouchSelect(!drag.touchSelect);
          }}
        >
          Selección táctil {drag.touchSelect ? "activada" : "desactivada"}
        </button>
      </div>
      <div
        className="planner-grid"
        key={`grid-${days[0]}`}
        ref={onOpenGrid}
        role="region"
        aria-label="Horario semanal"
        aria-describedby="planner-gesture-help"
        data-touch-select={drag.touchSelect || undefined}
        onPointerMove={drag.move}
        onPointerUp={drag.finish}
        onPointerCancel={drag.cancel}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- El horario desplazable necesita foco para usar las flechas del teclado.
        tabIndex={0}
      >
        <div aria-hidden="true" className="planner-hours">
          {SLOT_HOURS.map((hour) => (
            <span className="num" key={hour} style={{ top: offsetOf(hour * 60) }}>
              {timeOfMinutes(hour * 60)}
            </span>
          ))}
          {days.includes(today) &&
            nowMinutes >= DAY_START_MINUTES &&
            nowMinutes <= DAY_END_MINUTES && (
              <b className="planner-hours-now num" style={{ top: offsetOf(nowMinutes) }}>
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
              data-day={day}
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
                  onPointerDown={(event) => drag.start(event, day)}
                  onClick={(event) => drag.click(() => onNewBlock(day, hour), event.detail === 0)}
                  tabIndex={day === focusDay && hour === firstFreeHour ? 0 : -1}
                  onKeyDown={(event) => {
                    const delta = {
                      ArrowUp: -1,
                      ArrowDown: 1,
                      ArrowLeft: -SLOT_HOURS.length,
                      ArrowRight: SLOT_HOURS.length,
                    }[event.key];
                    if (delta === undefined) return;
                    event.preventDefault();
                    const grid = event.currentTarget.closest(".planner-grid");
                    const slots = Array.from(
                      grid?.querySelectorAll<HTMLButtonElement>(".planner-slot") ?? []
                    ).filter((slot) => slot.getBoundingClientRect().width > 0);
                    const target = slots[slots.indexOf(event.currentTarget) + delta];
                    target?.focus();
                  }}
                  type="button"
                >
                  <Plus aria-hidden="true" size={13} weight="bold" />
                </button>
              ))}
              <AnimatePresence initial={false}>
                {blocks.map((block) => {
                  const isLive =
                    isToday && nowMinutes >= block.startMinutes && nowMinutes < block.endMinutes;
                  return (
                    <PlannerBlockArticle
                      block={block}
                      isLive={isLive}
                      key={block.id}
                      onEdit={onEditBlock}
                      onMoveStart={(event, item) => drag.start(event, day, item)}
                      onMoveClick={(item, keyboard) =>
                        drag.click(() => onEditBlock(item), keyboard)
                      }
                      onRemove={onRemoveBlock}
                      onToggleDone={onToggleDone}
                    />
                  );
                })}
              </AnimatePresence>
              {drag.selection?.day === day && (
                <div
                  aria-hidden="true"
                  className="planner-drag-preview num"
                  style={{
                    top: offsetOf(drag.selection.start),
                    height: `${((drag.selection.end - drag.selection.start) / MINUTE_SPAN) * 100}%`,
                  }}
                >
                  {timeOfMinutes(drag.selection.start)}–{timeOfMinutes(drag.selection.end)}
                </div>
              )}
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
        {blockCount === 0 && weekLoaded && !drag.selection && (
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
    </>
  );
}
