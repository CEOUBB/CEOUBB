## 1. Scanner Boundaries and Dead Code Pruning

- [x] 1.1 Create `doctor.config.json` with ignore patterns for `.claude`, `.next`, `dist`, `build`, and verify scanner excludes ephemeral build directories
- [x] 1.2 Remove unused legacy files `app/components/AcademicContentClient.tsx` and `app/components/AcademicContentRenderer.tsx` and verify `pnpm run typecheck` passes
- [x] 1.3 Prune dead exports (`HOUR_LINES` in `app/views/calendar/calendar-constants.ts`, `FIREBASE_CONFIG_REQUIREMENT` in `lib/firebase-config.ts`, `PUBLICATION_WORKFLOW_REQUIREMENTS` in `lib/publication-workflow.ts`) and verify `pnpm run typecheck` passes

## 2. Navigation and Performance Optimizations

- [x] 2.1 Replace plain `<a>` tags with `next/link` in `app/views/resources/ResourcesView.tsx` and verify `nextjs-no-a-element` diagnostic clears
- [x] 2.2 Replace array `indexOf` in category tag loop with `Set.prototype.has` in `app/faq/FaqBrowser.tsx` and verify `js-set-map-lookups` diagnostic clears
- [x] 2.3 Convert sequential loop `await` calls to `Promise.all` in `lib/firebase/moodle-import.ts` and `lib/moodle/parser.ts`, verifying `async-await-in-loop` diagnostics clear

## 3. Lifecycle Safety and Memory Reclamation

- [x] 3.1 Implement `AbortController` cancellation cleanup for `fetch` calls in `app/views/SettingsView.tsx`, `app/views/classroom/PeopleSection.tsx`, and `lib/user-preferences.ts`, and verify `no-fetch-in-effect` diagnostics clear
- [x] 3.2 Add explicit `URL.revokeObjectURL` cleanup for avatar previews in `app/views/SettingsView.tsx` and verify `no-create-object-url-without-revoke` diagnostic clears
- [x] 3.3 Refine Firestore query authorization boundary in `lib/firebase/storage.ts` and verify `firebase-query-filter-as-auth` diagnostic clears

## 4. State Consolidation via Typed Reducers

- [x] 4.1 Consolidate multiple `useState` hooks in `app/views/TeacherCoursesView.tsx` into a typed `useReducer` and verify `prefer-useReducer` diagnostic clears
- [x] 4.2 Consolidate 8 interdependent `useState` hooks in `app/Portal.tsx` into a typed `useReducer` and verify `prefer-useReducer` diagnostic clears

## 5. Component Modularization (<300 LOC)

- [x] 5.1 Split `app/contacto/ContactForm.tsx` into cohesive subcomponents and verify `no-giant-component` diagnostic clears
- [x] 5.2 Split `app/privacidad/page.tsx` into subcomponents and verify `no-giant-component` diagnostic clears
- [x] 5.3 Split `app/Portal.tsx` layout/dialog helpers into subcomponents and verify `no-giant-component` diagnostic clears

## 6. End-to-End Validation

- [x] 6.1 Execute `pnpm run verify:fast` and verify 0 typecheck, lint, and unit test regressions
- [x] 6.2 Execute `npx react-doctor@latest --json --blocking none --yes` and verify 0 diagnostics remain and the health score reaches 100 (Clean)
