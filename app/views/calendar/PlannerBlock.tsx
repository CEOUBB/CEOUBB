"use client";

import * as m from "motion/react-m";
import { Check, X } from "@phosphor-icons/react";
import type { PersonalEventKind, PlacedBlock, PlannerItem } from "../../../lib/planner";
import { ease } from "../../../lib/portal-utils";
import { KIND_LABEL, MINUTE_SPAN, offsetOf } from "./calendar-constants";

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
  return (
    <m.article
      animate={{ opacity: 1, transform: "scale(1)" }}
      className="planner-block"
      data-done={block.completed ? "true" : undefined}
      exit={{ opacity: 0, transform: "scale(0.96)", transition: { duration: 0.12 } }}
      initial={{ opacity: 0, transform: "scale(0.94)" }}
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
      transition={{ duration: 0.2, ease }}
    >
      <button
        aria-label={
          block.completed
            ? `Marcar “${block.title}” como pendiente`
            : `Marcar “${block.title}” como hecho`
        }
        aria-pressed={block.completed}
        className="planner-check"
        onClick={() => onToggleDone(block)}
        type="button"
      >
        <m.span
          animate={{
            transform: block.completed ? "scale(1)" : "scale(0.2)",
            opacity: block.completed ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 620, damping: 26 }}
        >
          <Check aria-hidden="true" size={10} weight="bold" />
        </m.span>
      </button>
      <button className="planner-block-open" onClick={() => onEdit(block)} type="button">
        <strong>{block.title}</strong>
        <small>
          {block.startTime}–{block.endTime}
          {block.courseName
            ? ` · ${block.courseName}`
            : ` · ${KIND_LABEL[block.kind as PersonalEventKind] ?? ""}`}
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
