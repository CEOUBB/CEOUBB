"use client";

import { useState } from "react";

/**
 * Runs `start` during the render in which `open` becomes true.
 */
export function useOnOpen(open: boolean, start: () => void) {
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) start();
  }
}
