"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Check, X } from "@phosphor-icons/react";
import type { PersonalEventKind, PlacedBlock, PlannerItem } from "../../../lib/planner";
import { ease, instantTransition } from "../../../lib/portal-utils";
import { KIND_LABEL, MINUTE_SPAN, offsetOf } from "./calendar-constants";

function getArticleAnimation(shouldReduceMotion: boolean | null) {
  if (shouldReduceMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: instantTransition,
    };
  }
  return {
    initial: { opacity: 0, transform: "scale(0.94)" },
    animate: { opacity: 1, transform: "scale(1)" },
    exit: { opacity: 0, transform: "scale(0.96)", transition: { duration: 0.12 } },
    transition: { duration: 0.2, ease },
  };
}

function getBlockDetailsLabel(block: PlacedBlock): string {
  const subtitle = block.courseName
    ? `, ${block.courseName}`
    : block.kind && KIND_LABEL[block.kind as PersonalEventKind]
      ? `, ${KIND_LABEL[block.kind as PersonalEventKind]}`
      : "";
  return `Ver detalles de “${block.title}”, ${block.startTime} a ${block.endTime}${subtitle}`;
}

function getBlockSubtitle(block: PlacedBlock): string {
  if (block.courseName) return ` · ${block.courseName}`;
  const label = KIND_LABEL[block.kind as PersonalEventKind];
  return label ? ` · ${label}` : "";
}

function PlannerCheckButton({
  block,
  shouldReduceMotion,
  onToggleDone,
}: {
  block: PlacedBlock;
  shouldReduceMotion: boolean | null;
  onToggleDone: (block: PlannerItem) => void;
}) {
  const checkLabel = block.completed
    ? `Marcar “${block.title}” como pendiente`
    : `Marcar “${block.title}” como hecho`;

  return (
    <button
      aria-label={checkLabel}
      aria-pressed={block.completed}
      className="planner-check"
      onClick={() => onToggleDone(block)}
      type="button"
    >
      <m.span
        animate={
          shouldReduceMotion
            ? { opacity: block.completed ? 1 : 0 }
            : {
                transform: block.completed ? "scale(1)" : "scale(0.2)",
                opacity: block.completed ? 1 : 0,
              }
        }
        transition={
          shouldReduceMotion ? instantTransition : { type: "spring", stiffness: 620, damping: 26 }
        }
      >
        <Check aria-hidden="true" size={10} weight="bold" />
      </m.span>
    </button>
  );
}

export function PlannerBlockArticle({
  block,
  onToggleDone,
  onEdit,
  onRemove,
}: {
  block: PlacedBlock;
  onToggleDone: (block: PlannerItem) => void;
  onEdit: (block: PlannerItem) => void;
  onRemove: (block: PlannerItem) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const motionProps = getArticleAnimation(shouldReduceMotion);

  return (
    <m.article
      animate={motionProps.animate}
      className="planner-block"
      data-done={block.completed ? "true" : undefined}
      exit={motionProps.exit}
      initial={motionProps.initial}
      key={block.id}
      style={
        {
          "--course-tone": block.tone,
          top: offsetOf(block.startMinutes),
          height: `${((block.endMinutes - block.startMinutes) / MINUTE_SPAN) * 100}%`,
          left: `${(block.column / block.columns) * 100}%`,
          width: `${100 / block.columns}%`,
        } as React.CSSProperties
      }
      transition={motionProps.transition}
    >
      <PlannerCheckButton
        block={block}
        onToggleDone={onToggleDone}
        shouldReduceMotion={shouldReduceMotion}
      />
      <button
        aria-label={getBlockDetailsLabel(block)}
        className="planner-block-open"
        onClick={() => onEdit(block)}
        type="button"
      >
        <strong>{block.title}</strong>
        <small>
          {block.startTime}–{block.endTime}
          {getBlockSubtitle(block)}
        </small>
      </button>
      {block.source === "user_personal" && (
        <button
          aria-label={`Eliminar “${block.title}”`}
          className="planner-block-remove"
          onClick={() => onRemove(block)}
          type="button"
        >
          <X aria-hidden="true" size={10} weight="bold" />
        </button>
      )}
    </m.article>
  );
}
