"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia?.("(any-pointer: coarse)");
  mq?.addEventListener?.("change", callback);
  return () => mq?.removeEventListener?.("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(any-pointer: coarse)");
  return Boolean(
    Boolean(mq?.matches) || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
  );
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Returns true on devices that can be touched, whatever else they claim.
 *
 * Implements: REQ-BROWSER-01
 */
export function useTouchCapable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
