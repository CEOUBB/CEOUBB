"use client";

import { useEffect, use, useState } from "react";
import { browser } from "react-dom";

/**
 * Returns true on devices that can be touched, whatever else they claim.
 *
 * Implements: REQ-BROWSER-01
 */
export function useTouchCapable() {
  use(browser());
  const [canTouch, setCanTouch] = useState(() => {
    if (typeof window === "undefined") return false;
    const mq = window.matchMedia?.("(any-pointer: coarse)");
    return (
      Boolean(mq?.matches) || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );
  });

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
