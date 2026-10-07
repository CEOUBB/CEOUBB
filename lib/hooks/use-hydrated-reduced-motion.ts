"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotionConfig } from "motion/react";

const subscribe = () => () => {};
const serverSnapshot = () => false;

// Implements: REQ-PERF-LOAD-02, REQ-CFG-05
export function useHydratedReducedMotion(): boolean {
  const reducedMotion = useReducedMotionConfig();
  return useSyncExternalStore(subscribe, () => reducedMotion === true, serverSnapshot);
}
