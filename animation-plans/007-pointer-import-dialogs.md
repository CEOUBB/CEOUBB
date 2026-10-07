# Add restrained pointer-only import dialog entry

- **Status**: DONE
- **Commit**: dfbeb6e
- **Severity**: MEDIUM
- **Category**: Preventing a jarring change
- **Root**: `C:/Users/Pipe/.codex/worktrees/1daf/CEOUBB`
- **Estimated scope**: app/views/classroom/MoodleImportDialog.tsx; app/views/classroom/AdeccaImportDialog.tsx; app/campus-base.css

## Problem

At `app/views/classroom/MoodleImportDialog.tsx:79`, the current implementation contains:

```tsx
onClick={() => dialogRef.current?.showModal()}
```

The selected audit finding requires correction without changing academic or authorization behavior.

## Target

Pointer/touch opening gains a brief composited entrance. Keyboard opening, Escape, cancellation and focus restoration stay immediate. Reopening with a different input modality does not reuse stale eligibility.

## Repo conventions to follow

Reuse `lib/ease.ts` and `app/globals.css:69`: the shared curve is `cubic-bezier(0.16, 1, 0.3, 1)`; `--duration-fast` is `150ms`. The portal owns MotionConfig. Keep existing semantic HTML and native dialog focus. No dependencies or parallel motion abstractions.

## Steps

1. In both import triggers, record pointer eligibility from the activation event before calling showModal. Keyboard and assistive activation (detail === 0) must clear eligibility.
2. Add shared .moodle-import-dialog styles using @starting-style. Only pointer-eligible open dialogs transition opacity 0 to 1 and transform scale(0.98) to scale(1).
3. Use 150ms var(--ease-spring), where --ease-spring is cubic-bezier(0.16, 1, 0.3, 1). Center the transform origin. Use entry only: close is native and immediate.
4. Under system or product reduced motion, remove scaling and obey the established global suppression. Do not delay focus or change running-import cancellation.

## Boundaries

Only edit the listed source surfaces and necessary QA coverage. Do not change protected files in `tests/`, authorization, provider workflows, loading contracts or academic calculations. Keep final layout and accessible names. If the commit's implementation has drifted, investigate before editing.

## Verification

- Mechanical: run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm test`, `pnpm qa:check` and affected `pnpm qa` scenarios.
- Feel check: inspect desktop and mobile including 320 CSS px; exercise pointer, touch, keyboard, rapid repeated activation, system reduction and product reduction. Inspect active Web Animations and computed geometry; use slow playback for remaining entrances. Record screenshots and any uncovered states.
- Done when: the target behavior is verified, accessibility remains intact and the protected test hashes pass. Record actual results in README; do not treat unexecuted checks as passing.
