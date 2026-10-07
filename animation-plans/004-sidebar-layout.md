# Stop tweening the whole campus grid

- **Status**: DONE
- **Commit**: dfbeb6e
- **Severity**: MEDIUM
- **Category**: Performance
- **Root**: `C:/Users/Pipe/.codex/worktrees/1daf/CEOUBB`
- **Estimated scope**: app/campus-base.css

## Problem

At `app/campus-base.css:535`, the current implementation contains:

```tsx
transition: grid-template-columns var(--transition-base);
```

The selected audit finding requires correction without changing academic or authorization behavior.

## Target

Sidebar width reaches its final layout immediately. The shell has no grid-template-columns animation.

## Repo conventions to follow

Reuse `lib/ease.ts` and `app/globals.css:69`: the shared curve is `cubic-bezier(0.16, 1, 0.3, 1)`; `--duration-fast` is `150ms`. The portal owns MotionConfig. Keep existing semantic HTML and native dialog focus. No dependencies or parallel motion abstractions.

## Steps

1. Delete the grid-template-columns transition from .app-shell.
2. Keep final open/closed geometry and existing local sidebar behavior. Do not redesign the rail or change responsive breakpoints.

## Boundaries

Only edit the listed source surfaces and necessary QA coverage. Do not change protected files in `tests/`, authorization, provider workflows, loading contracts or academic calculations. Keep final layout and accessible names. If the commit's implementation has drifted, investigate before editing.

## Verification

- Mechanical: run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm test`, `pnpm qa:check` and affected `pnpm qa` scenarios.
- Feel check: inspect desktop and mobile including 320 CSS px; exercise pointer, touch, keyboard, rapid repeated activation, system reduction and product reduction. Inspect active Web Animations and computed geometry; use slow playback for remaining entrances. Record screenshots and any uncovered states.
- Done when: the target behavior is verified, accessibility remains intact and the protected test hashes pass. Record actual results in README; do not treat unexecuted checks as passing.
