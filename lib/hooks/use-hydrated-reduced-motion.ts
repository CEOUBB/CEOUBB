"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

const subscribe = () => () => {};
const serverSnapshot = () => false;

// Implements: REQ-PERF-LOAD-02
export function useHydratedReducedMotion(): boolean {
  const reducedMotion = useReducedMotion();
  return useSyncExternalStore(subscribe, () => reducedMotion === true, serverSnapshot);
}
