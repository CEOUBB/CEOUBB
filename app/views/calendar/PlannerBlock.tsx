"use client";

import { useHydratedReducedMotion } from "../../../lib/hooks/use-hydrated-reduced-motion";
import * as m from "motion/react-m";
import { Check, X } from "@phosphor-icons/react";
import type { PlacedBlock, PlannerItem } from "../../../lib/planner";
import { ease, instantTransition } from "../../../lib/portal-utils";
import { MINUTE_SPAN, itemContext, offsetOf } from "./calendar-constants";

function blockMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: instantTransition,
    };
  }
  return {
    initial: { opacity: 0, transform: "scale(0.96)" },
    animate: { opacity: 1, transform: "scale(1)" },
    exit: { opacity: 0, transform: "scale(0.97)", transition: { duration: 0.12 } },
    transition: { duration: 0.18, ease },
  };
}

export function PlannerBlockArticle({
  block,
  isLive,
  dragging,
  onToggleDone,
  onEdit,
  onRemove,
  click,
}: {
  block: PlacedBlock;
  isLive: boolean;
  dragging: boolean;
  onToggleDone: (block: PlannerItem) => void;
  onEdit: (block: PlannerItem) => void;
  onRemove: (block: PlannerItem) => void;
  click: (action: () => void, keyboard?: boolean) => void;
}) {
  const reduced = useHydratedReducedMotion();
  const motion = blockMotion(reduced);
  const context = itemContext(block);
  const done = block.completed;

  return (
    <m.article
      animate={motion.animate}
      className="planner-block"
      data-done={done ? "true" : undefined}
      data-dragging={dragging || undefined}
      data-live={isLive ? "true" : undefined}
      exit={motion.exit}
      initial={motion.initial}
      style={
        {
          "--course-tone": block.tone,
          top: offsetOf(block.startMinutes),
          height: `${((block.endMinutes - block.startMinutes) / MINUTE_SPAN) * 100}%`,
          left: `calc(${(block.column / block.columns) * 100}% + 1px)`,
          width: `calc(${100 / block.columns}% - 3px)`,
        } as React.CSSProperties
      }
      transition={motion.transition}
    >
      <button
        aria-label={
          done ? `Marcar “${block.title}” como pendiente` : `Marcar “${block.title}” como hecho`
        }
        aria-pressed={done}
        className="planner-check"
        onClick={() => onToggleDone(block)}
        type="button"
      >
        <m.span
          animate={
            reduced
              ? { opacity: done ? 1 : 0 }
              : { transform: done ? "scale(1)" : "scale(0.2)", opacity: done ? 1 : 0 }
          }
          initial={false}
          transition={reduced ? instantTransition : { type: "spring", stiffness: 620, damping: 26 }}
        >
          <Check aria-hidden="true" size={9} weight="bold" />
        </m.span>
      </button>
      <button
        aria-label={`Ver detalles de “${block.title}”, ${block.startTime} a ${block.endTime}${context ? `, ${context}` : ""}`}
        className="planner-block-open"
        data-drag="move"
        data-id={block.id}
        onClick={(event) => click(() => onEdit(block), event.detail === 0)}
        type="button"
      >
        <strong>{block.title}</strong>
        <small className="num">
          <span className="planner-block-time">
            {block.startTime}
            <span>–{block.endTime}</span>
          </span>
          {context && <span>{context}</span>}
        </small>
        {isLive && <span className="planner-live-status">En curso</span>}
      </button>
      <button
        aria-label={`Eliminar “${block.title}”`}
        className="planner-block-remove"
        onClick={() => onRemove(block)}
        type="button"
      >
        <X aria-hidden="true" size={11} weight="bold" />
      </button>
      <span
        aria-hidden="true"
        className="planner-block-resize"
        data-drag="resize"
        data-id={block.id}
      />
    </m.article>
  );
}
