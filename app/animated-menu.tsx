"use client";

import { motion, type SVGMotionProps, type Variants } from "motion/react";

type MenuProps = Omit<SVGMotionProps<SVGSVGElement>, "animate"> & {
  animate?: boolean;
  size?: number;
};

const lineTransition = { type: "spring", stiffness: 200, damping: 20 } as const;

const lineVariants = {
  initial: { rotate: 0, x: 0, y: 0 },
  active: { rotate: -45, x: -2.35, y: 0.35, transformOrigin: "top right", transition: lineTransition },
} satisfies Variants;

const lastLineVariants = {
  initial: { rotate: 0, x: 0, y: 0 },
  active: { rotate: 45, x: -2.35, y: -0.35, transformOrigin: "bottom right", transition: lineTransition },
} satisfies Variants;

export function Menu({ animate = false, size = 20, ...props }: MenuProps) {
  return (
    <motion.svg
      animate={animate ? "active" : "initial"}
      fill="none"
      height={size}
      initial="initial"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <motion.line x1={4} x2={20} y1={6} y2={6} variants={lineVariants} />
      <motion.line x1={4} x2={20} y1={12} y2={12} variants={{ initial: { opacity: 1 }, active: { opacity: 0, transition: { ease: "easeInOut", duration: 0.2 } } }} />
      <motion.line x1={4} x2={20} y1={18} y2={18} variants={lastLineVariants} />
    </motion.svg>
  );
}
