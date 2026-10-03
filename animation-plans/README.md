# Motion audit execution

Base commit: `dfbeb6e`. All selected findings are authorized for implementation and PR delivery.

| Plan                                                                                | Severity | Status |
| ----------------------------------------------------------------------------------- | -------- | ------ |
| [Remove command palette motion](001-instant-command-palette.md)                     | HIGH     | DONE   |
| [Remove routine view transition waits](002-instant-navigation.md)                   | HIGH     | DONE   |
| [Honor product motion preference in CSS and React](003-effective-reduced-motion.md) | MEDIUM   | DONE   |
| [Stop tweening the whole campus grid](004-sidebar-layout.md)                        | MEDIUM   | DONE   |
| [Remove decorative hover travel](005-remove-hover-translation.md)                   | MEDIUM   | DONE   |
| [Simplify expanding actions and quiz progress](006-compositor-and-focus.md)         | MEDIUM   | DONE   |
| [Add restrained pointer-only import dialog entry](007-pointer-import-dialogs.md)    | MEDIUM   | DONE   |

Execute instant search/navigation first, then effective reduction, layout/hover simplifications and finally import entry. Plan 007 depends on 003's CSS suppression; plan 006 must use effective reduction. Other edits are independent. The current managed worktree is isolated; workers must not overwrite each other's changes.

## Validation and handoff

All selected plans are implemented. No dependency, authorization, academic calculation or protected test assertion changed. The effective reduced-motion hook uses the installed Motion API `useReducedMotionConfig`, preserving the hydration-safe server snapshot. CSS suppression reaches body portals and native dialogs, and the document marker is removed on preference changes and portal unmount.

| Check                                                     | Observed result                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm run format` and `pnpm run format:check`             | Passed                                                                                                    |
| `pnpm run typecheck`                                      | Passed                                                                                                    |
| `pnpm run lint`                                           | Exit 0, no errors, 2 existing TanStack Virtual compiler warnings in unchanged AdminView and GradesSection |
| Targeted ESLint on changed components, hook and QA helper | Passed with `--max-warnings 0`                                                                            |
| `pnpm run verify:fast`                                    | 627 unit tests passed; 72 protected file hashes validated; 31 specifications passed                       |
| `pnpm run verify:invariants`                              | 35 tests passed                                                                                           |
| `pnpm test`                                               | Production build passed; 627 unit tests and 25 HTML integration tests passed                              |
| `pnpm qa:check`                                           | 40 tests passed                                                                                           |
| Installed React Doctor on changed files                   | 91/100; 3 existing full Motion import warnings; no errors                                                 |

### Browser evidence

Evidence remains in the ignored local `qa-results/` directory. Open each run's `index.html` to inspect checkpoints, screenshots and coverage. These runs cover affected interactions, not the complete application state matrix.

| Run                            | Mode        | Result and coverage                                                                                                                      |
| ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `20261003T025225511Z-7d710224` | Production  | `shell.motion`: 6 browser projects passed across Chromium 320/390/768/1440, Firefox and WebKit; all 23 API contracts passed; 29/29 total |
| `20261003T025753069Z-0d735fe1` | Production  | `imports.motion`: all 4 Chromium viewport projects and all 23 API contracts passed; 27/27 total; no missing checkpoints                  |
| `20261003T025453467Z-eeb1317a` | Production  | `imports.motion`: Chromium 390 passed using actual touch activation; all pointer, keyboard and reduced checkpoints covered               |
| `20261003T025315420Z-35dfc332` | Development | `quizzes.attempt`: Chromium 390 passed                                                                                                   |

The earlier development import matrix (`20261003T024634592Z-040dc38d`) passed its four browser projects but failed the private-cache API contract, because development responses use development cache headers. The production shell run passed that same unchanged contract. The first import attempt (`20261003T023900817Z-11c67d25`) exposed a QA setup error: an open import menu intercepted the Participants tab. The scenario now closes that menu before continuing. Failed artifacts were retained rather than treated as passing evidence.

Direct visual review covered the 320 px search palette, desktop keyboard-selected classroom tab, mobile touch-opened import dialog and desktop reduced-motion import dialog. DOM assertions verify focus, immediate close and keyboard reopen, active animations, transition properties and product/system preference suppression. Import loading, cancellation during a real restore, error and confirmation states were not visually re-audited; provider delivery is outside these local motion checks. Slow playback and real hardware frame measurements were not performed, so no frame-rate or measured performance claim is made.

### Motion review

| Before                                                    | After                                                                                                          | Why                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Animated search overlay and retained exit subtree         | Immediate native overlay at `app/command-palette.tsx:164`                                                      | Frequent search responds without waiting                                                                       |
| Shared view entrance/exit and wait mode                   | Plain wrapper at `app/portal-ui.tsx:61`, immediate shell/classroom replacement                                 | Repeated navigation and keyboard tabs remain immediate                                                         |
| Product preference affected only part of React motion     | Context-aware hook at `lib/hooks/use-hydrated-reduced-motion.ts:10` and document CSS at `app/globals.css:1275` | Product reduction reaches React, CSS and body portals while retaining OS reduction                             |
| Animated grid columns and decorative hover translation    | Grid and hover travel removed                                                                                  | Avoid repeated layout animation and unhelpful movement                                                         |
| Animated action-bar dimensions, blur and shared highlight | Native static controls at `components/motion/expandable-action-bar.tsx:183`                                    | Focus and dismissal are immediate; keyboard activation retains focus                                           |
| Quiz progress animated width                              | Full-width fill with `scaleX` and a 150 ms transform transition at `app/campus-base.css:12246`                 | Existing progress feedback uses a composited property                                                          |
| Import dialog appeared abruptly                           | Pointer/touch-only opacity and scale(0.98) entry at `app/campus-base.css:10911`                                | Occasional modal opening gets a centered, 150 ms entrance; keyboard, close and reduced motion remain immediate |

Decision: **Approve the scoped motion change**. Remaining entrances use exact properties and the existing curve `cubic-bezier(0.16, 1, 0.3, 1)`. Native dialog close is immediate, and reopening by keyboard replaces pointer eligibility. No protected test changes or unrelated warning suppression are included.
