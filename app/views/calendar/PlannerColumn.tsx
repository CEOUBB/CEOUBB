"use client";

import { AnimatePresence } from "motion/react";
import { Plus } from "@phosphor-icons/react";
import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  durationLabel,
  timeOfMinutes,
} from "../../../lib/planner";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";
import { MINUTE_SPAN, SLOT_HOURS, longDate, offsetOf, rectOf } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { PlannerBlockArticle } from "./PlannerBlock";
import type { DragSelection } from "./usePlannerDrag";

export type PendingRange = { day: string; start: number; end: number };

function spanStyle(start: number, end: number): React.CSSProperties {
  return { top: offsetOf(start), height: `${((end - start) / MINUTE_SPAN) * 100}%` };
}

function moveSlotFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
  const delta = {
    ArrowUp: -1,
    ArrowDown: 1,
    ArrowLeft: -SLOT_HOURS.length,
    ArrowRight: SLOT_HOURS.length,
  }[event.key];
  if (delta === undefined) return;
  event.preventDefault();
  const slots = Array.from(
    event.currentTarget
      .closest(".planner-grid")
      ?.querySelectorAll<HTMLButtonElement>(".planner-slot") ?? []
  );
  slots[slots.indexOf(event.currentTarget) + delta]?.focus();
}

export function PlannerColumn({
  day,
  weekend,
  isToday,
  focused,
  firstFreeHour,
  nowMinutes,
  showNow,
  blocks,
  pending,
  selection,
  dragged,
  click,
  onCreate,
  onEdit,
  onRemove,
  onToggleDone,
}: {
  day: string;
  weekend: boolean;
  isToday: boolean;
  focused: boolean;
  firstFreeHour: number;
  nowMinutes: number;
  showNow: boolean;
  blocks: PlacedBlock[];
  pending: PendingRange | null;
  selection: DragSelection | null;
  dragged: PlacedBlock | undefined;
  click: (action: () => void, keyboard?: boolean) => void;
  onCreate: (day: string, start: number, end: number, anchor: AnchorRect) => void;
  onEdit: (item: PlannerItem) => void;
  onRemove: (item: PlannerItem) => void;
  onToggleDone: (item: PlannerItem) => void;
}) {
  return (
    <div
      className="planner-col"
      data-day={day}
      data-focus={focused ? "true" : undefined}
      data-today={isToday ? "true" : undefined}
      data-weekend={weekend ? "true" : undefined}
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
          aria-label={`Crear un bloque el ${longDate(day)} a las ${timeOfMinutes(hour * 60)}`}
          className="planner-slot"
          data-drag="create"
          key={hour}
          onClick={(event) => {
            const anchor = rectOf(event.currentTarget);
            click(
              () => onCreate(day, hour * 60, Math.min(hour + 1, DAY_END_HOUR) * 60, anchor),
              event.detail === 0
            );
          }}
          onKeyDown={moveSlotFocus}
          tabIndex={focused && hour === firstFreeHour ? 0 : -1}
          type="button"
        >
          <Plus aria-hidden="true" size={12} weight="bold" />
        </button>
      ))}
      <AnimatePresence initial={false}>
        {blocks.map((block) => (
          <PlannerBlockArticle
            block={block}
            click={click}
            dragging={dragged?.id === block.id}
            isLive={isToday && nowMinutes >= block.startMinutes && nowMinutes < block.endMinutes}
            key={block.id}
            onEdit={onEdit}
            onRemove={onRemove}
            onToggleDone={onToggleDone}
          />
        ))}
      </AnimatePresence>
      {pending?.day === day && !selection && (
        <div
          aria-hidden="true"
          className="planner-pending num"
          style={spanStyle(pending.start, pending.end)}
        >
          <strong>Nuevo bloque</strong>
          <small>
            {timeOfMinutes(pending.start)}–{timeOfMinutes(pending.end)}
          </small>
        </div>
      )}
      {selection?.day === day && (
        <div
          aria-hidden="true"
          className="planner-drag-preview num"
          data-mode={selection.mode}
          style={
            {
              ...spanStyle(selection.start, selection.end),
              "--course-tone": dragged?.tone,
            } as React.CSSProperties
          }
        >
          <strong>{dragged?.title ?? "Nuevo bloque"}</strong>
          <small>
            {timeOfMinutes(selection.start)}–{timeOfMinutes(selection.end)} ·{" "}
            {durationLabel(timeOfMinutes(selection.start), timeOfMinutes(selection.end))}
          </small>
        </div>
      )}
      {isToday && showNow && (
        <div aria-hidden="true" className="planner-now" style={{ top: offsetOf(nowMinutes) }} />
      )}
    </div>
  );
}
