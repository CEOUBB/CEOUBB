"use client";

import { CaretDown } from "@phosphor-icons/react";
import type { PlannerItem } from "../../../lib/planner";
import type { AnchorRect } from "./calendar-constants";
import { AcademicChip } from "./CalendarParts";

const VISIBLE_CHIPS = 2;

export function PlannerRibbon({
  days,
  ribbons,
  expanded,
  onExpand,
  onOpen,
}: {
  days: string[];
  ribbons: Map<string, PlannerItem[]>;
  expanded: boolean;
  onExpand: () => void;
  onOpen: (item: PlannerItem, anchor: AnchorRect) => void;
}) {
  const overflow = days.some((day) => (ribbons.get(day)?.length ?? 0) > VISIBLE_CHIPS);
  return (
    <div className="planner-ribbon">
      <div className="planner-ribbon-gutter">
        {overflow && (
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Mostrar menos entregas" : "Mostrar todas las entregas"}
            className="planner-ribbon-toggle"
            onClick={onExpand}
            type="button"
          >
            <CaretDown aria-hidden="true" size={13} weight="bold" />
          </button>
        )}
      </div>
      {days.map((day) => {
        const items = ribbons.get(day) ?? [];
        const shown = expanded ? items : items.slice(0, VISIBLE_CHIPS);
        const hidden = items.length - shown.length;
        return (
          <div className="planner-ribbon-cell" data-day={day} key={day}>
            {shown.map((item) => (
              <AcademicChip item={item} key={item.id} onOpen={onOpen} />
            ))}
            {hidden > 0 && (
              <button className="planner-ribbon-more num" onClick={onExpand} type="button">
                {hidden} más
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
