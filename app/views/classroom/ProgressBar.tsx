import * as m from "motion/react-m";
import { ease } from "../../../lib/portal-utils";

export function Bar({
  ratio,
  completed,
  total,
  label = "Progreso de unidades",
}: {
  ratio?: number;
  completed?: number;
  total?: number;
  label?: string;
}) {
  const safeCompleted = typeof completed === "number" && !Number.isNaN(completed) ? Math.max(0, completed) : undefined;
  const safeTotal = typeof total === "number" && !Number.isNaN(total) ? Math.max(0, total) : undefined;

  const calculatedRatio =
    safeTotal !== undefined && safeTotal > 0 && safeCompleted !== undefined
      ? safeCompleted / safeTotal
      : ratio;

  const safeRatio =
    typeof calculatedRatio === "number" && !Number.isNaN(calculatedRatio)
      ? Math.min(1, Math.max(0, calculatedRatio))
      : 0;

  const ariaValueNow = safeCompleted !== undefined ? safeCompleted : Math.round(safeRatio * 100);
  const ariaValueMax = safeTotal !== undefined ? safeTotal : 100;

  return (
    <m.span
      animate={{ transform: `scaleX(${safeRatio})` }}
      aria-label={label}
      aria-valuemax={ariaValueMax}
      aria-valuemin={0}
      aria-valuenow={ariaValueNow}
      initial={{ transform: "scaleX(0)" }}
      role="progressbar"
      style={{ transformOrigin: "left" }}
      transition={{ duration: 0.6, ease }}
    />
  );
}
