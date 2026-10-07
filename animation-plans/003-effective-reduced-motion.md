# Honor product motion preference in CSS and React

- **Status**: DONE
- **Commit**: dfbeb6e
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Root**: `C:/Users/Pipe/.codex/worktrees/1daf/CEOUBB`
- **Estimated scope**: app/Portal.tsx; app/globals.css; lib/hooks/use-hydrated-reduced-motion.ts; app/views/classroom/SubmissionSlot.tsx; affected motion consumers; qa/session-refresh.test.mjs

## Problem

At `app/Portal.tsx:108`, the current implementation contains:

```tsx
<MotionConfig reducedMotion={prefersReducedMotion ? "always" : "user"}>
```

The selected audit finding requires correction without changing academic or authorization behavior.

## Target

The product setting adds suppression; it cannot override OS reduction. Progress changes immediately and CSS spinners stop under either preference. SSR hydration remains stable.

## Repo conventions to follow

Reuse `lib/ease.ts` and `app/globals.css:69`: the shared curve is `cubic-bezier(0.16, 1, 0.3, 1)`; `--duration-fast` is `150ms`. The portal owns MotionConfig. Keep existing semantic HTML and native dialog focus. No dependencies or parallel motion abstractions.

## Steps

1. Project the authenticated product preference onto document.documentElement using data-reduced-motion, with effect cleanup on preference changes and unmount.
2. Add a global CSS rule scoped to html[data-reduced-motion="true"] that suppresses CSS animation and transition movement, including body portals and native dialogs. Preserve the independent system media query.
3. Make the existing useHydratedReducedMotion hook combine MotionConfig's always setting with useReducedMotion's system preference. Preserve the false server snapshot.
4. Use that shared hook in SubmissionSlot instead of an OS-only hook, and omit animate-spin when reduction is effective. Scan sibling consumers of full transform motion and use the shared hook where needed.
5. Add regression coverage of product-only reduction, OS-only reduction, reset, and portal-hosted content. Keep protected tests unchanged.

## Boundaries

Only edit the listed source surfaces and necessary QA coverage. Do not change protected files in `tests/`, authorization, provider workflows, loading contracts or academic calculations. Keep final layout and accessible names. If the commit's implementation has drifted, investigate before editing.

## Verification

- Mechanical: run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm test`, `pnpm qa:check` and affected `pnpm qa` scenarios.
- Feel check: inspect desktop and mobile including 320 CSS px; exercise pointer, touch, keyboard, rapid repeated activation, system reduction and product reduction. Inspect active Web Animations and computed geometry; use slow playback for remaining entrances. Record screenshots and any uncovered states.
- Done when: the target behavior is verified, accessibility remains intact and the protected test hashes pass. Record actual results in README; do not treat unexecuted checks as passing.
