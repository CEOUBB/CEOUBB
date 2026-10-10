"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Plus } from "@phosphor-icons/react";
import {
  DAY_END_HOUR,
  DAY_END_MINUTES,
  DAY_START_HOUR,
  DAY_START_MINUTES,
  durationLabel,
  timeOfMinutes,
} from "../../../lib/planner";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";
import { dayOf, getSantiagoMinutes, weekdayOf } from "../../../lib/portal-utils";
import { MINUTE_SPAN, SLOT_HOURS, longDate, offsetOf, zoneLabel } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { rectOf } from "./CalendarParts";
import { PlannerBlockArticle } from "./PlannerBlock";
import { PlannerRibbon } from "./PlannerRibbon";
import { usePlannerDrag } from "./usePlannerDrag";

const NOW_LABEL_CLEARANCE_BEFORE = 15;
const NOW_LABEL_CLEARANCE_AFTER = 25;
const SCROLL_BREATHING = 14;

export type PendingRange = { day: string; start: number; end: number };

function spanStyle(start: number, end: number): React.CSSProperties {
  return { top: offsetOf(start), height: `${((end - start) / MINUTE_SPAN) * 100}%` };
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
  const coveredByNow = (hour: number) => {
    const distance = nowMinutes - hour * 60;
    return (
      showNow && distance > -NOW_LABEL_CLEARANCE_BEFORE && distance < NOW_LABEL_CLEARANCE_AFTER
    );
  };
  const dragged =
    selection && selection.mode !== "create"
      ? blocks.find((block) => block.id === selection.id)
      : undefined;
  const gridRef = useCallback(
    (node: HTMLDivElement | null) => {
      scroller.current = node;
      return surfaceRef(node);
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
            {days.map((day, index) => {
              const dayBlocks = byDay.get(day)?.blocks ?? [];
              const isToday = day === today;
              return (
                <div
                  className="planner-col"
                  data-day={day}
                  data-focus={day === focusDay ? "true" : undefined}
                  data-today={isToday ? "true" : undefined}
                  data-weekend={!single && index > 4 ? "true" : undefined}
                  key={day}
                >
                  {isToday && nowMinutes > DAY_START_MINUTES && (
                    <div
                      aria-hidden="true"
                      className="planner-spent"
                      style={
                        {
                          "--planner-spent": String(
                            (Math.min(nowMinutes, DAY_END_MINUTES) - DAY_START_MINUTES) /
                              MINUTE_SPAN
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
                          () =>
                            onCreate(day, hour * 60, Math.min(hour + 1, DAY_END_HOUR) * 60, anchor),
                          event.detail === 0
                        );
                      }}
                      onKeyDown={(event) => {
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
                      }}
                      tabIndex={day === focusDay && hour === firstFreeHour ? 0 : -1}
                      type="button"
                    >
                      <Plus aria-hidden="true" size={12} weight="bold" />
                    </button>
                  ))}
                  <AnimatePresence initial={false}>
                    {dayBlocks.map((block) => (
                      <PlannerBlockArticle
                        block={block}
                        click={click}
                        dragging={dragged?.id === block.id}
                        isLive={
                          isToday &&
                          nowMinutes >= block.startMinutes &&
                          nowMinutes < block.endMinutes
                        }
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
                        {durationLabel(
                          timeOfMinutes(selection.start),
                          timeOfMinutes(selection.end)
                        )}
                      </small>
                    </div>
                  )}
                  {isToday && showNow && (
                    <div
                      aria-hidden="true"
                      className="planner-now"
                      style={{ top: offsetOf(nowMinutes) }}
                    />
                  )}
                </div>
              );
            })}
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
