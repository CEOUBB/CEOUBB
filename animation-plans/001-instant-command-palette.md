# Remove command palette motion

- **Status**: DONE
- **Commit**: dfbeb6e
- **Severity**: HIGH
- **Category**: Purpose and frequency
- **Root**: `C:/Users/Pipe/.codex/worktrees/1daf/CEOUBB`
- **Estimated scope**: app/command-palette.tsx

## Problem

At `app/command-palette.tsx:184`, the current implementation contains:

```tsx
initial={{ opacity: 0 }}
transition={{ duration: 0.18, ease: EASE_OUT }}
```

The selected audit finding requires correction without changing academic or authorization behavior.

## Target

The palette opens and closes immediately for keyboard, pointer and touch. No opacity or position animation, and no exiting interactive subtree remains.

## Repo conventions to follow

Reuse `lib/ease.ts` and `app/globals.css:69`: the shared curve is `cubic-bezier(0.16, 1, 0.3, 1)`; `--duration-fast` is `150ms`. The portal owns MotionConfig. Keep existing semantic HTML and native dialog focus. No dependencies or parallel motion abstractions.

## Steps

1. Replace both animated overlay layers with native button/div elements. Remove AnimatePresence, PresenceGate, motion props and motion-only imports/constants.
2. Render the complete search overlay only while open. Preserve cmdk semantics, controlled state, scroll locking, focus, touch dismissal and keyboard shortcuts.

## Boundaries

Only edit the listed source surfaces and necessary QA coverage. Do not change protected files in `tests/`, authorization, provider workflows, loading contracts or academic calculations. Keep final layout and accessible names. If the commit's implementation has drifted, investigate before editing.

## Verification

- Mechanical: run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm test`, `pnpm qa:check` and affected `pnpm qa` scenarios.
- Feel check: inspect desktop and mobile including 320 CSS px; exercise pointer, touch, keyboard, rapid repeated activation, system reduction and product reduction. Inspect active Web Animations and computed geometry; use slow playback for remaining entrances. Record screenshots and any uncovered states.
- Done when: the target behavior is verified, accessibility remains intact and the protected test hashes pass. Record actual results in README; do not treat unexecuted checks as passing.
