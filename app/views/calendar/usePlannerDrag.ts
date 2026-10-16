"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { gridMinutes, minutesOf, movedBlockTimes } from "../../../lib/planner";
import type { PlannerItem } from "../../../lib/planner";

type Selection = { day: string; start: number; end: number };

// Implements: REQ-CEO72-03 — Pointer Events cubre ratón, lápiz y tacto.
export function usePlannerDrag(
  onCreate: (day: string, hour: number, endHour?: number) => void,
  onMove: (item: PlannerItem, day: string, start: string, end: string) => void
) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [touchSelect, setTouchSelect] = useState(false);
  const suppressClick = useRef(false);
  const gesture = useRef<{
    pointerId: number;
    x: number;
    y: number;
    origin: number;
    offset: number;
    item?: PlannerItem;
    selection: Selection;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && gesture.current) {
        gesture.current = null;
        setSelection(null);
        suppressClick.current = true;
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  const start = (event: PointerEvent<HTMLButtonElement>, day: string, item?: PlannerItem) => {
    suppressClick.current = false;
    if (event.button !== 0 || (!item && event.pointerType === "touch" && !touchSelect)) return;
    const column = event.currentTarget.closest<HTMLElement>(".planner-col");
    if (!column) return;
    const rect = column.getBoundingClientRect();
    const minute = gridMinutes(event.clientY, rect.top, rect.height);
    const begin = item?.startTime ? minutesOf(item.startTime) : minute;
    const end = item?.endTime ? minutesOf(item.endTime) : minute + 15;
    suppressClick.current = false;
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: minute,
      offset: minute - begin,
      item,
      selection: { day, start: begin, end },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5 && !current.moved)
      return;
    const column = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(".planner-col")
    ).find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && event.clientX >= rect.left && event.clientX <= rect.right;
    });
    if (!column?.dataset.day) return;
    const rect = column.getBoundingClientRect();
    const minute = gridMinutes(event.clientY, rect.top, rect.height);
    if (current.item) {
      const duration =
        minutesOf(current.item.endTime ?? "") - minutesOf(current.item.startTime ?? "");
      const times = movedBlockTimes(minute - current.offset, duration);
      current.selection = {
        day: column.dataset.day,
        start: minutesOf(times.startTime),
        end: minutesOf(times.endTime),
      };
    } else {
      if (column.dataset.day !== current.selection.day) return;
      current.selection = {
        day: column.dataset.day,
        start: Math.min(current.origin, minute),
        end: Math.max(current.origin, minute) + 15,
      };
    }
    current.moved = true;
    setSelection(current.selection);
  };

  const cancel = () => {
    gesture.current = null;
    setSelection(null);
    suppressClick.current = true;
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setSelection(null);
    if (!current.moved) return;
    suppressClick.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      return;
    const { day, start, end } = current.selection;
    if (current.item) {
      const times = movedBlockTimes(start, end - start);
      onMove(current.item, day, times.startTime, times.endTime);
    } else onCreate(day, start / 60, end / 60);
  };
  return {
    selection,
    touchSelect,
    setTouchSelect,
    start,
    move,
    finish,
    cancel,
    click: (action: () => void, keyboard = false) => {
      if (suppressClick.current && !keyboard) suppressClick.current = false;
      else action();
    },
  };
}
