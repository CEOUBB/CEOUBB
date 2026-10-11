const SWEEP_MS = 1300;
const SLANT = 0.5;

// Implements: REQ-STAGGERED-SHIMMER-MOTION, REQ-MOTION-05
export function skeletonWave(root: HTMLElement | null) {
  if (!root) return;

  const origin = root.getBoundingClientRect();
  const span = Math.max(origin.width, 1);
  root.style.setProperty("--sk-span", `${Math.round(span)}px`);

  for (const bone of root.querySelectorAll<HTMLElement>(".sk")) {
    const box = bone.getBoundingClientRect();
    const travel = box.left - origin.left + (box.top - origin.top) * SLANT;
    bone.style.setProperty("--sk-delay", `${Math.round((travel / span) * SWEEP_MS)}ms`);
  }
}
