# Simplify expanding actions and quiz progress

- **Status**: DONE
- **Commit**: dfbeb6e
- **Severity**: MEDIUM
- **Category**: Performance and keyboard response
- **Root**: `C:/Users/Pipe/.codex/worktrees/1daf/CEOUBB`
- **Estimated scope**: components/motion/expandable-action-bar.tsx; app/views/classroom/StudentQuizzes.tsx; app/campus-base.css

## Problem

At `components/motion/expandable-action-bar.tsx:297`, the current implementation contains:

```tsx
width: isExpanded ? "auto" : 0,
marginLeft: isExpanded ? 8 : 0,
```

The selected audit finding requires correction without changing academic or authorization behavior.

## Target

No action-bar width, margin, position or highlight animation runs on focus. Quiz progress animates transform only for 150ms cubic-bezier(0.16, 1, 0.3, 1).

## Repo conventions to follow

Reuse `lib/ease.ts` and `app/globals.css:69`: the shared curve is `cubic-bezier(0.16, 1, 0.3, 1)`; `--duration-fast` is `150ms`. The portal owns MotionConfig. Keep existing semantic HTML and native dialog focus. No dependencies or parallel motion abstractions.

## Steps

1. Replace animated width/margin label expansion with immediate static dimensions. Remove layout movement and shared-layout highlight animation that would still move focus-driven controls.
2. Keep optional opacity feedback only when appropriate; keyboard focus and dismissal must remain immediate. Preserve hover/touch expansion, label aria-hidden and action activation.
3. Change StudentQuizzes progress fill to fixed full width and transform: scaleX(percentage / 100), transform-origin: left.
4. Replace transition: width with transition: transform var(--duration-fast) var(--ease-spring). Effective reduced motion disables the transition.

## Boundaries

Only edit the listed source surfaces and necessary QA coverage. Do not change protected files in `tests/`, authorization, provider workflows, loading contracts or academic calculations. Keep final layout and accessible names. If the commit's implementation has drifted, investigate before editing.

## Verification

- Mechanical: run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm test`, `pnpm qa:check` and affected `pnpm qa` scenarios.
- Feel check: inspect desktop and mobile including 320 CSS px; exercise pointer, touch, keyboard, rapid repeated activation, system reduction and product reduction. Inspect active Web Animations and computed geometry; use slow playback for remaining entrances. Record screenshots and any uncovered states.
- Done when: the target behavior is verified, accessibility remains intact and the protected test hashes pass. Record actual results in README; do not treat unexecuted checks as passing.
