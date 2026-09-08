"use client";

import { useEffect, useState } from "react";

/**
 * Returns true on devices that can be touched, whatever else they claim.
 */
export function useTouchCapable() {
  const [canTouch, setCanTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(any-pointer: coarse)");
    const update = () =>
      setCanTouch(
        Boolean(mq?.matches) || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
      );
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);

  return canTouch;
}
