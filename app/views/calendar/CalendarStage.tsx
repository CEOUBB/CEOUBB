"use client";

import { shiftDate } from "../../../lib/planner";
import type { CalendarView, PlacedBlock, PlannerItem } from "../../../lib/planner";
import type { AnchorRect } from "./calendar-constants";
import { CalendarAgenda } from "./CalendarAgenda";
import { DayStrip } from "./CalendarHeader";
import { CalendarMonth } from "./CalendarMonth";
import type { PendingRange } from "./PlannerColumn";
import { PlannerGrid } from "./PlannerGrid";

// Implements: REQ-CEO72-05 — una sola superficie elige entre cuadrícula, mes y agenda.
export function CalendarStage({
  view,
  days,
  loadDays,
  date,
  today,
  direction,
  items,
  byDay,
  tones,
  loaded,
  nowMinutes,
  firstFreeHour,
  pending,
  onGoTo,
  onStep,
  onOpenDay,
  onOpenItem,
  onNewBlock,
  onCreate,
  onEdit,
  onMove,
  onRemove,
  onToggleDone,
}: {
  view: CalendarView;
  days: string[];
  loadDays: string[];
  date: string;
  today: string;
  direction: number;
  items: PlannerItem[];
  byDay: Map<string, { ribbon: PlannerItem[]; blocks: PlacedBlock[] }>;
  tones: Map<string, string[]>;
  loaded: boolean;
  nowMinutes: number;
  firstFreeHour: number;
  pending: PendingRange | null;
  onGoTo: (date: string) => void;
  onStep: (direction: 1 | -1) => void;
  onOpenDay: (date: string) => void;
  onOpenItem: (item: PlannerItem, anchor: AnchorRect) => void;
  onNewBlock: (date: string) => void;
  onCreate: (day: string, start: number, end: number, anchor: AnchorRect) => void;
  onEdit: (item: PlannerItem) => void;
  onMove: (item: PlannerItem, day: string, startTime: string, endTime: string) => void;
  onRemove: (item: PlannerItem) => void;
  onToggleDone: (item: PlannerItem) => void;
}) {
  return (
    <div className="planner-stage">
      {view === "day" && (
        <DayStrip
          days={loadDays}
          direction={direction}
          onPick={onGoTo}
          onSwipe={(sign) => onGoTo(shiftDate(date, 7 * sign))}
          selected={date}
          today={today}
          tones={tones}
        />
      )}
      {view === "month" ? (
        <CalendarMonth
          anchor={date}
          days={days}
          direction={direction}
          items={items}
          onCreate={onNewBlock}
          onOpen={onOpenItem}
          onOpenDay={onOpenDay}
          onSelect={onGoTo}
          onSwipe={onStep}
          onToggleDone={onToggleDone}
          selected={date}
          today={today}
        />
      ) : view === "agenda" ? (
        <CalendarAgenda
          days={days}
          items={items}
          onOpen={onOpenItem}
          onToggleDone={onToggleDone}
          today={today}
        />
      ) : (
        <PlannerGrid
          byDay={byDay}
          days={days}
          direction={direction}
          firstFreeHour={firstFreeHour}
          focusDay={date}
          loaded={loaded}
          nowMinutes={nowMinutes}
          onCreate={onCreate}
          onEdit={onEdit}
          onMove={onMove}
          onOpenItem={onOpenItem}
          onPickDay={onOpenDay}
          onRemove={onRemove}
          onResize={(item, endTime) => onMove(item, item.date, item.startTime ?? "", endTime)}
          onSwipe={onStep}
          onToggleDone={onToggleDone}
          pending={pending}
          today={today}
        />
      )}
    </div>
  );
}
