"use client";

import { ArrowRight, CalendarPlus, X } from "@phosphor-icons/react";
import type { PlannerItem } from "../../../lib/planner";
import { countdown, evaluationUrgency } from "../../../lib/portal-utils";
import { longDate } from "./calendar-constants";
import type { AnchorRect } from "./calendar-constants";
import { CalendarPopover } from "./CalendarPopover";
import { ItemIcon, ToneMark, academicLabel } from "./CalendarParts";

export function ItemPeek({
  item,
  anchor,
  onClose,
  onPlan,
  onOpenCourse,
}: {
  item: PlannerItem;
  anchor: AnchorRect;
  onClose: () => void;
  onPlan: () => void;
  onOpenCourse?: () => void;
}) {
  const evaluation = item.kind === "evaluation";
  return (
    <CalendarPopover
      anchor={anchor}
      className="planner-peek"
      label={academicLabel(item)}
      onClose={onClose}
    >
      <div style={{ "--course-tone": item.tone } as React.CSSProperties}>
        <header>
          <h3>{item.title}</h3>
          <button
            aria-label="Cerrar"
            className="planner-icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={14} weight="bold" />
          </button>
        </header>
        <dl>
          <div>
            <dt>Tipo</dt>
            <dd>
              <ItemIcon kind={item.kind} size={13} />
              {evaluation ? "Evaluación" : "Entrega"}
            </dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>
              <span className="planner-peek-date">{longDate(item.date)}</span>
              <span className="num" data-urgency={evaluationUrgency(item.date)}>
                {countdown(item.date)}
              </span>
            </dd>
          </div>
          {item.courseName && (
            <div>
              <dt>Ramo</dt>
              <dd>
                <ToneMark tone={item.tone} />
                {item.courseName}
              </dd>
            </div>
          )}
          <div>
            <dt>{evaluation ? "Ponderación" : "Plazo"}</dt>
            <dd className="num">{item.detail}</dd>
          </div>
        </dl>
        <footer>
          {onOpenCourse && (
            <button className="secondary-button" onClick={onOpenCourse} type="button">
              Ir al aula <ArrowRight aria-hidden="true" size={14} weight="bold" />
            </button>
          )}
          <button className="primary-button" data-autofocus onClick={onPlan} type="button">
            <CalendarPlus aria-hidden="true" size={15} weight="bold" /> Planificar estudio
          </button>
        </footer>
      </div>
    </CalendarPopover>
  );
}
