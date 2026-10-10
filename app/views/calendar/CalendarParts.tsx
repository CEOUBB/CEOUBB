"use client";

import { ClipboardText, Exam } from "@phosphor-icons/react";
import type { PlannerItem, PlannerKind } from "../../../lib/planner";
import { academicLabel, rectOf } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";

export function ItemIcon({ kind, size = 13 }: { kind: PlannerKind; size?: number }) {
  if (kind === "evaluation") return <Exam aria-hidden="true" size={size} weight="bold" />;
  return <ClipboardText aria-hidden="true" size={size} weight="bold" />;
}

export function ToneMark({ tone }: { tone: string }) {
  return (
    <span
      aria-hidden="true"
      className="planner-mark"
      style={{ "--course-tone": tone } as React.CSSProperties}
    />
  );
}

export function AcademicChip({
  item,
  onOpen,
}: {
  item: PlannerItem;
  onOpen: (item: PlannerItem, anchor: AnchorRect) => void;
}) {
  return (
    <button
      aria-label={`${academicLabel(item)}. ${item.detail}`}
      className="planner-chip"
      data-kind={item.kind}
      onClick={(event) => onOpen(item, rectOf(event.currentTarget))}
      style={{ "--course-tone": item.tone } as React.CSSProperties}
      type="button"
    >
      <ItemIcon kind={item.kind} size={12} />
      <span>{item.title}</span>
    </button>
  );
}
