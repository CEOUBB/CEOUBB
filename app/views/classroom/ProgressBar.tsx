import * as m from "motion/react-m";
import { ease } from "../../../lib/portal-utils";

export function Bar({ ratio }: { ratio: number }) {
  const safeRatio =
    typeof ratio === "number" && !Number.isNaN(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const percentage = Math.round(safeRatio * 100);

  return (
    <m.span
      animate={{ transform: `scaleX(${safeRatio})` }}
      aria-label="Progreso de avance"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percentage}
      initial={{ transform: "scaleX(0)" }}
      role="progressbar"
      style={{ transformOrigin: "left" }}
      transition={{ duration: 0.6, ease }}
    />
  );
}
