"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_HOUR,
  DAY_START_MINUTES,
  timeOfMinutes,
} from "../../../lib/planner";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";
import { dayOf, getSantiagoMinutes, weekdayOf } from "../../../lib/portal-utils";
import { SLOT_HOURS, longDate, offsetOf, zoneLabel } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { PlannerColumn } from "./PlannerColumn";
import type { PendingRange } from "./PlannerColumn";
import { PlannerRibbon } from "./PlannerRibbon";
import { usePlannerDrag } from "./usePlannerDrag";

const NOW_LABEL_CLEARANCE_BEFORE = 15;
const NOW_LABEL_CLEARANCE_AFTER = 25;
const SCROLL_BREATHING = 14;

function PlannerHead({
  days,
  today,
  focusDay,
  onPickDay,
}: {
  days: string[];
  today: string;
  focusDay: string;
  onPickDay: (day: string) => void;
}) {
  const single = days.length === 1;
  return (
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
          "data-focus": day === focusDay ? "true" : undefined,
          "data-today": day === today ? "true" : undefined,
        };
        return single ? (
          <div {...state} key={day}>
            {label}
          </div>
        ) : (
          <button
            {...state}
            aria-label={`Ver el ${longDate(day)}`}
            key={day}
            onClick={() => onPickDay(day)}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function HourGutter({ nowMinutes, showNow }: { nowMinutes: number; showNow: boolean }) {
  const coveredByNow = (hour: number) => {
    const distance = nowMinutes - hour * 60;
    return (
      showNow && distance > -NOW_LABEL_CLEARANCE_BEFORE && distance < NOW_LABEL_CLEARANCE_AFTER
    );
  };
  return (
    <div aria-hidden="true" className="planner-hours">
      {SLOT_HOURS.map((hour) => (
        <span
          className="num"
          data-covered={coveredByNow(hour) || undefined}
          key={hour}
          style={{ top: offsetOf(hour * 60) }}
        >
          {timeOfMinutes(hour * 60)}
        </span>
      ))}
      {showNow && (
        <b className="planner-hours-now num" style={{ top: offsetOf(nowMinutes) }}>
          {timeOfMinutes(nowMinutes)}
        </b>
      )}
    </div>
  );
}

export function PlannerGrid({
  days,
  today,
  focusDay,
  byDay,
  nowMinutes,
  loaded,
  firstFreeHour,
  pending,
  direction,
  onCreate,
  onMove,
  onResize,
  onEdit,
  onRemove,
  onToggleDone,
  onOpenItem,
  onPickDay,
  onSwipe,
}: {
  days: string[];
  today: string;
  focusDay: string;
  byDay: Map<string, { ribbon: PlannerItem[]; blocks: PlacedBlock[] }>;
  nowMinutes: number;
  loaded: boolean;
  firstFreeHour: number;
  pending: PendingRange | null;
  direction: number;
  onCreate: (day: string, start: number, end: number, anchor: AnchorRect) => void;
  onMove: (item: PlannerItem, day: string, startTime: string, endTime: string) => void;
  onResize: (item: PlannerItem, endTime: string) => void;
  onEdit: (item: PlannerItem) => void;
  onRemove: (item: PlannerItem) => void;
  onToggleDone: (item: PlannerItem) => void;
  onOpenItem: (item: PlannerItem, anchor: AnchorRect) => void;
  onPickDay: (day: string) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const ribbons = new Map(days.map((day) => [day, byDay.get(day)?.ribbon ?? []]));
  const blocks = days.flatMap((day) => byDay.get(day)?.blocks ?? []);
  const hasRibbon = days.some((day) => (ribbons.get(day)?.length ?? 0) > 0);
  const {
    selection,
    canvasRef,
    surfaceRef,
    click,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
  } = usePlannerDrag({
    findItem: (id) => blocks.find((block) => block.id === id),
    onCreate,
    onMove,
    onResize,
    onSwipe,
  });
  const span = days.length;
  const single = span === 1;
  const showNow =
    days.includes(today) && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES;
  const dragged =
    selection && selection.mode !== "create"
      ? blocks.find((block) => block.id === selection.id)
      : undefined;
  const gridRef = useCallback(
    (node: HTMLDivElement) => {
      scroller.current = node;
      const release = surfaceRef(node);
      return () => {
        scroller.current = null;
        release();
      };
    },
    [surfaceRef]
  );

  useLayoutEffect(() => {
    const node = scroller.current;
    const column = node?.querySelector<HTMLElement>(".planner-col");
    if (!node || !column) return;
    const now = node.querySelector(".planner-col[data-today]")
      ? getSantiagoMinutes()
      : DAY_START_MINUTES + 60;
    const hour = Math.min(Math.max(Math.floor(now / 60) - 1, DAY_START_HOUR), DAY_END_HOUR - 1);
    const sticky = node.querySelector<HTMLElement>(".planner-top")?.offsetHeight ?? 0;
    const columnTop =
      column.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop;
    node.scrollTop =
      columnTop +
      ((hour - DAY_START_HOUR) / SLOT_HOURS.length) * column.offsetHeight -
      sticky -
      SCROLL_BREATHING;
  }, [span]);

  return (
    <div
      className="planner-frame"
      data-span={single ? "day" : "week"}
      style={
        {
          "--planner-days": span,
          "--planner-rows": SLOT_HOURS.length,
          "--planner-dir": direction,
        } as React.CSSProperties
      }
    >
      <p className="sr-only" id="planner-gesture-help">
        Arrastra sobre una hora, o mantenla presionada en una pantalla táctil, para reservarla.
        Arrastra un bloque para moverlo y su borde inferior para cambiar la duración. Con el
        teclado, abre el bloque para cambiar fecha y hora.
      </p>
      <div
        aria-describedby="planner-gesture-help"
        aria-label={single ? "Horario del día" : "Horario semanal"}
        className="planner-grid"
        ref={gridRef}
        role="region"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- El horario desplazable necesita foco para usar las flechas del teclado.
        tabIndex={0}
        onContextMenu={onContextMenu}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="planner-sheet"
          data-entering={direction === 0 ? undefined : "true"}
          key={`${days[0]}:${span}`}
          ref={canvasRef}
        >
          <div className="planner-top">
            <PlannerHead days={days} focusDay={focusDay} onPickDay={onPickDay} today={today} />
            {hasRibbon && (
              <PlannerRibbon
                days={days}
                expanded={ribbonOpen}
                onExpand={() => setRibbonOpen((open) => !open)}
                onOpen={onOpenItem}
                ribbons={ribbons}
              />
            )}
          </div>

          <div className="planner-canvas">
            <HourGutter nowMinutes={nowMinutes} showNow={showNow} />
            {days.map((day, index) => (
              <PlannerColumn
                blocks={byDay.get(day)?.blocks ?? []}
                click={click}
                day={day}
                dragged={dragged}
                firstFreeHour={firstFreeHour}
                focused={day === focusDay}
                isToday={day === today}
                key={day}
                nowMinutes={nowMinutes}
                onCreate={onCreate}
                onEdit={onEdit}
                onRemove={onRemove}
                onToggleDone={onToggleDone}
                pending={pending}
                selection={selection}
                showNow={showNow}
                weekend={!single && index > 4}
              />
            ))}
          </div>
        </div>
      </div>
      {loaded && blocks.length === 0 && !hasRibbon && !selection && !pending && (
        <div className="planner-blank">
          <strong>{single ? "Día libre" : "Semana libre"}</strong>
          <p>
            Arrastra sobre una hora para reservar tiempo de estudio, o mantenla presionada en el
            teléfono.
          </p>
        </div>
      )}
    </div>
  );
}
