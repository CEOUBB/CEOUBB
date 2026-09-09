"use client";

import { useIsPresent } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

export interface PresenceGateRenderProps {
  /**
   * False from the render that starts the exit animation onward.
   */
  isPresent: boolean;
  /**
   * Spread onto every layer that takes pointer events while the overlay is open.
   */
  gate: {
    inert: boolean;
    style: CSSProperties;
  };
}

export interface PresenceGateProps {
  children: (props: PresenceGateRenderProps) => ReactNode;
}

/**
 * Reads the presence of the subtree it renders and hands it down.
 */
export function PresenceGate({ children }: PresenceGateProps) {
  const isPresent = useIsPresent();

  return children({
    isPresent,
    gate: {
      inert: !isPresent,
      style: { pointerEvents: isPresent ? "auto" : "none" },
    },
  });
}
