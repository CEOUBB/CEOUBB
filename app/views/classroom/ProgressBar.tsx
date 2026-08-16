import * as m from "motion/react-m";
import { ease } from "../../../lib/portal-utils";

export function Bar({ ratio }: { ratio: number }) {
  const safeRatio =
    typeof ratio === "number" && !Number.isNaN(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return (
    <m.span
      animate={{ scaleX: safeRatio }}
      initial={{ scaleX: 0 }}
      style={{ transformOrigin: "left" }}
      transition={{ duration: 0.6, ease }}
    />
  );
}
