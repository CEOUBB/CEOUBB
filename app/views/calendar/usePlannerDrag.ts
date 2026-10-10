"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  gridMinutes,
  minutesOf,
  movedBlockTimes,
  resizedBlockTimes,
} from "../../../lib/planner";
import type { PlannerItem } from "../../../lib/planner";
import type { AnchorRect } from "./calendar-constants";

type DragMode = "create" | "move" | "resize";
type DragSelection = {
  mode: DragMode;
  day: string;
  start: number;
  end: number;
  id?: string;
};

const LONG_PRESS_MS = 350;
const TOUCH_SLOP = 8;
const MOUSE_SLOP = 5;
const SWIPE_COMMIT = 56;

type Gesture = {
  pointerId: number;
  touch: boolean;
  mode: DragMode | "swipe";
  active: boolean;
  x: number;
  y: number;
  dx: number;
  origin: number;
  offset: number;
  item?: PlannerItem;
  column: HTMLElement;
  selection: DragSelection;
  timer?: number;
};

function rectFor(column: HTMLElement, start: number, end: number): AnchorRect {
  const rect = column.getBoundingClientRect();
  const span = DAY_END_MINUTES - DAY_START_MINUTES;
  return {
    left: rect.left,
    top: rect.top + ((start - DAY_START_MINUTES) / span) * rect.height,
    width: rect.width,
    height: ((end - start) / span) * rect.height,
  };
}

function columnAt(grid: HTMLElement, x: number) {
  return Array.from(grid.querySelectorAll<HTMLElement>(".planner-col")).find((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && x >= rect.left && x <= rect.right;
  });
}

// Implements: REQ-CEO72-03, REQ-CEO72-07, REQ-CEO72-09 — ratón y lápiz actúan al instante;
// el tacto mantiene presionado para crear o mover y desliza en horizontal para cambiar de período.
export function usePlannerDrag({
  findItem,
  onCreate,
  onMove,
  onResize,
  onSwipe,
}: {
  findItem: (id: string) => PlannerItem | undefined;
  onCreate: (day: string, start: number, end: number, anchor: AnchorRect) => void;
  onMove: (item: PlannerItem, day: string, startTime: string, endTime: string) => void;
  onResize: (item: PlannerItem, endTime: string) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const [selection, setSelection] = useState<DragSelection | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const release = (settle = true) => {
    const current = gesture.current;
    if (!current) return;
    window.clearTimeout(current.timer);
    if (settle && current.mode === "swipe" && canvasRef.current) {
      canvasRef.current.dataset.swiping = "settle";
      canvasRef.current.style.setProperty("--planner-swipe", "0px");
    }
    gesture.current = null;
    setSelection(null);
  };

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !gesture.current) return;
      suppressClick.current = true;
      release();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  const surfaceRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const hold = (event: TouchEvent) => {
      if (gesture.current?.active && event.cancelable) event.preventDefault();
    };
    node.addEventListener("touchmove", hold, { passive: false });
    return () => node.removeEventListener("touchmove", hold);
  }, []);

  const activate = (current: Gesture) => {
    if (gesture.current !== current) return;
    current.active = true;
    suppressClick.current = true;
    if (current.mode === "create") {
      current.selection = {
        ...current.selection,
        end: Math.min(current.origin + 60, DAY_END_MINUTES),
      };
    }
    if (current.touch) navigator.vibrate?.(8);
    setSelection(current.selection);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || gesture.current || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>("[data-drag]");
    const column = target?.closest<HTMLElement>(".planner-col");
    const day = column?.dataset.day;
    if (!target || !column || !day) return;
    const drag = target.dataset.drag;
    const mode: DragMode = drag === "move" || drag === "resize" ? drag : "create";
    const item = mode === "create" ? undefined : findItem(target.dataset.id ?? "");
    if (mode !== "create" && !item?.startTime) return;
    const rect = column.getBoundingClientRect();
    const minute = gridMinutes(event.clientY, rect.top, rect.height);
    const begin = item?.startTime ? minutesOf(item.startTime) : minute;
    const end = item?.endTime ? minutesOf(item.endTime) : minute + 15;
    const touch = event.pointerType === "touch";
    suppressClick.current = false;
    const current: Gesture = {
      pointerId: event.pointerId,
      touch,
      mode,
      active: false,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      origin: minute,
      offset: mode === "resize" ? end - minute : minute - begin,
      item,
      column,
      selection: { mode, day, start: begin, end, id: item?.id },
    };
    gesture.current = current;
    if (!touch) target.setPointerCapture(event.pointerId);
    if (mode === "resize") activate(current);
    else if (touch) current.timer = window.setTimeout(() => activate(current), LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.active) {
      if (Math.hypot(dx, dy) < (current.touch ? TOUCH_SLOP : MOUSE_SLOP)) return;
      if (!current.touch) {
        current.active = true;
      } else if (Math.abs(dx) > Math.abs(dy) * 1.4) {
        window.clearTimeout(current.timer);
        current.mode = "swipe";
        current.active = true;
        suppressClick.current = true;
        if (canvasRef.current) canvasRef.current.dataset.swiping = "true";
      } else {
        release();
        return;
      }
    }
    if (current.mode === "swipe") {
      current.dx = dx;
      canvasRef.current?.style.setProperty("--planner-swipe", `${dx}px`);
      return;
    }
    const column =
      current.mode === "move" ? columnAt(event.currentTarget, event.clientX) : current.column;
    if (!column?.dataset.day) return;
    const rect = column.getBoundingClientRect();
    const minute = gridMinutes(event.clientY, rect.top, rect.height);
    const { item } = current;
    if (current.mode === "move" && item?.startTime && item.endTime) {
      const times = movedBlockTimes(
        minute - current.offset,
        minutesOf(item.endTime) - minutesOf(item.startTime)
      );
      current.column = column;
      current.selection = {
        ...current.selection,
        day: column.dataset.day,
        start: minutesOf(times.startTime),
        end: minutesOf(times.endTime),
      };
    } else if (current.mode === "resize") {
      const times = resizedBlockTimes(current.selection.start, minute + current.offset);
      current.selection = { ...current.selection, end: minutesOf(times.endTime) };
    } else {
      current.selection = {
        ...current.selection,
        start: Math.min(current.origin, minute),
        end: Math.max(current.origin, minute) + 15,
      };
    }
    setSelection(current.selection);
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const swiped = current.mode === "swipe" && Math.abs(current.dx) >= SWIPE_COMMIT;
    release(!swiped);
    if (!current.active) return;
    suppressClick.current = true;
    if (current.mode === "swipe") {
      if (swiped) onSwipe(current.dx < 0 ? 1 : -1);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      return;
    const { day, start, end } = current.selection;
    const { item } = current;
    if (current.mode === "create") {
      onCreate(day, start, end, rectFor(current.column, start, end));
      return;
    }
    if (!item?.startTime || !item.endTime) return;
    if (current.mode === "resize") {
      const { endTime } = resizedBlockTimes(start, end);
      if (endTime !== item.endTime) onResize(item, endTime);
      return;
    }
    const times = movedBlockTimes(start, end - start);
    if (day !== item.date || times.startTime !== item.startTime)
      onMove(item, day, times.startTime, times.endTime);
  };

  return {
    selection,
    canvasRef,
    surfaceRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => {
      if (gesture.current?.active) suppressClick.current = true;
      release();
    },
    onContextMenu: (event: MouseEvent) => {
      if (gesture.current?.touch) event.preventDefault();
    },
    click: (action: () => void, keyboard = false) => {
      if (suppressClick.current && !keyboard) suppressClick.current = false;
      else action();
    },
  };
}

// Implements: REQ-CEO72-09 — deslizar con el dedo sobre la tira de días o el mes cambia de período.
export function useSwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      start.current =
        event.pointerType === "touch"
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const origin = start.current;
      start.current = null;
      if (!origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.abs(dx) >= SWIPE_COMMIT && Math.abs(dx) > Math.abs(dy) * 1.4)
        onSwipe(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
