"use client";

import { addTransitionType, startTransition, useEffect } from "react";

export type ViewTransitionType = "tab-forward" | "tab-back";

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"]);

// Implements: REQ-MOTION-01
export function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!MODIFIER_KEYS.has(event.key)) root.dataset.input = "keyboard";
    };
    const onPointerDown = () => {
      root.dataset.input = "pointer";
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      delete root.dataset.input;
    };
  }, []);
}

function prefersInstantChange() {
  const root = document.documentElement;
  return (
    root.dataset.input === "keyboard" ||
    root.dataset.reducedMotion === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Implements: REQ-MOTION-01
export function transitionView(update: () => void, type?: ViewTransitionType) {
  if (prefersInstantChange()) {
    update();
    return;
  }

  startTransition(() => {
    if (type) addTransitionType(type);
    update();
  });
}
