"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { placeBeside } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";

// Implements: REQ-CEO72-06 — capa superior nativa: Escape o un toque fuera cierran y el foco vuelve al origen.
export function CalendarPopover({
  anchor,
  label,
  className,
  onClose,
  children,
}: {
  anchor: AnchorRect;
  label: string;
  className: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const node = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element.matches(":popover-open")) element.showPopover();
    const { width, height } = element.getBoundingClientRect();
    const { left, top } = placeBeside(anchor, width, height);
    element.style.setProperty("--popover-x", `${Math.round(left)}px`);
    element.style.setProperty("--popover-y", `${Math.round(top)}px`);
    element.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      const focus = document.activeElement;
      if (origin?.isConnected && (!focus || focus === document.body || element.contains(focus)))
        origin.focus({ preventScroll: true });
    };
  }, [anchor]);

  return (
    <div
      aria-label={label}
      className={`planner-popover ${className}`}
      onToggle={(event) => {
        if (!event.currentTarget.matches(":popover-open")) onClose();
      }}
      popover="auto"
      ref={node}
      role="dialog"
    >
      {children}
    </div>
  );
}
