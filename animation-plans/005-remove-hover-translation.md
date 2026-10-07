# Remove decorative hover travel

- **Status**: DONE
- **Commit**: dfbeb6e
- **Severity**: MEDIUM
- **Category**: Purpose and frequency
- **Root**: `C:/Users/Pipe/.codex/worktrees/1daf/CEOUBB`
- **Estimated scope**: app/notification-panel.tsx; app/campus-base.css

## Problem

At `app/notification-panel.tsx:343`, the current implementation contains:

```tsx
whileHover={{ x: 2 }}
```

The selected audit finding requires correction without changing academic or authorization behavior.

## Target

Notification rows and next-evaluation arrows remain stationary on hover and touch. Focus remains visible.

## Repo conventions to follow

Reuse `lib/ease.ts` and `app/globals.css:69`: the shared curve is `cubic-bezier(0.16, 1, 0.3, 1)`; `--duration-fast` is `150ms`. The portal owns MotionConfig. Keep existing semantic HTML and native dialog focus. No dependencies or parallel motion abstractions.

## Steps

1. Remove the notification-row whileHover translation while retaining its color, focus and deliberate press feedback.
2. Delete .next-eval:hover .next-eval-action svg translation and its now-unused transform transition.
3. Preserve existing semantic button behavior and touch interaction.

## Boundaries

Only edit the listed source surfaces and necessary QA coverage. Do not change protected files in `tests/`, authorization, provider workflows, loading contracts or academic calculations. Keep final layout and accessible names. If the commit's implementation has drifted, investigate before editing.

## Verification

- Mechanical: run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm test`, `pnpm qa:check` and affected `pnpm qa` scenarios.
- Feel check: inspect desktop and mobile including 320 CSS px; exercise pointer, touch, keyboard, rapid repeated activation, system reduction and product reduction. Inspect active Web Animations and computed geometry; use slow playback for remaining entrances. Record screenshots and any uncovered states.
- Done when: the target behavior is verified, accessibility remains intact and the protected test hashes pass. Record actual results in README; do not treat unexecuted checks as passing.
