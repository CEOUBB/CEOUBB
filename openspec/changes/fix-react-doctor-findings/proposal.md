## Why

The codebase scan with React Doctor revealed 27 diagnostics across 22 files (health score 50, critical level) comprising lifecycle hazards (`no-fetch-in-effect` race conditions, unrevoked `URL.createObjectURL` Blob memory leaks), state synchronization antipatterns (multiple interdependent `useState` hooks instead of unified `useReducer` in `Portal.tsx` and `TeacherCoursesView.tsx`), sequential loop blocking (`async-await-in-loop` in Moodle processing), linear scan overhead (`js-set-map-lookups` in FAQ filtering), Next.js navigation regressions (plain `<a>` in `ResourcesView.tsx`), giant monolithic components (>300 lines), unused dead exports, and scanner noise from build directories (`.claude`, `.next`).

Remediating these findings hardens CEOUBB's runtime stability, prevents memory leaks on low-end client devices, boosts Moodle import performance, and enforces strict React 19 / Next.js 16 best practices aligned with our institutional scale mission.

## What Changes

- **State Consolidation & Reducers**:
  - Refactor `app/Portal.tsx` to consolidate 8 interdependent `useState` values into a typed `useReducer` and modularize helper layout components.
  - Refactor `app/views/TeacherCoursesView.tsx` to unify course management states into a typed `useReducer`.
- **Lifecycle & Memory Safety**:
  - Replace unmanaged `fetch()` inside `useEffect` with AbortController-guarded data-fetching hooks or server actions in `app/views/SettingsView.tsx`, `app/views/classroom/PeopleSection.tsx`, and `lib/user-preferences.ts`.
  - Ensure object URLs created via `URL.createObjectURL` in `app/views/SettingsView.tsx` are deterministically revoked via `URL.revokeObjectURL` in cleanup effects.
- **Client-side Navigation & Routing**:
  - Replace plain `<a>` links in `app/views/resources/ResourcesView.tsx` with Next.js `Link` component from `next/link`.
- **Async Batching & Performance**:
  - Convert sequential `await` operations in for-loops into bounded concurrent `Promise.all` batches in `lib/firebase/moodle-import.ts` and `lib/moodle/parser.ts`.
  - Replace array linear scans (`indexOf`) with `Set.prototype.has` constant-time lookups in `app/faq/FaqBrowser.tsx`.
- **Component Decomposition**:
  - Modularize oversized (>300 LOC) components (`app/contacto/ContactForm.tsx`, `app/privacidad/page.tsx`, `app/Portal.tsx`) into cohesive sub-components.
- **Dead Code Pruning**:
  - Remove unreachable/unused files (`app/components/AcademicContentClient.tsx`, `app/components/AcademicContentRenderer.tsx`) and unreferenced exports (`HOUR_LINES`, `FIREBASE_CONFIG_REQUIREMENT`, `PUBLICATION_WORKFLOW_REQUIREMENTS`).
- **Scanner Configuration**:
  - Configure `doctor.config.json` (or doctor ignore settings) to exclude ephemeral build artifacts (`.claude`, `.next`, `dist`, `node_modules`).

### Non-Goals

- Modifying the core role derivation policy (`lib/access-policy.ts`) or security invariant mirrors.
- Redesigning visual themes, color tokens, or UI layouts beyond component decomposition and navigation preservation.
- Altering existing database schemas in Turso or Firestore collections.

## Capabilities

### New Capabilities

- `quality/react-doctor-hardening`: Comprehensive React Doctor quality gate, lifecycle safety, reducer consolidation, asynchronous batching, and dead-code eradication across all web views and utilities.

### Modified Capabilities

<!-- None: functional requirements of existing capabilities remain preserved; this change hardens implementation quality and compliance. -->

## Impact

- **Affected Files**:
  - `app/Portal.tsx`
  - `app/views/TeacherCoursesView.tsx`
  - `app/views/SettingsView.tsx`
  - `app/views/classroom/PeopleSection.tsx`
  - `app/views/resources/ResourcesView.tsx`
  - `app/contacto/ContactForm.tsx`
  - `app/privacidad/page.tsx`
  - `app/faq/FaqBrowser.tsx`
  - `lib/user-preferences.ts`
  - `lib/firebase/moodle-import.ts`
  - `lib/moodle/parser.ts`
  - `lib/firebase-config.ts`
  - `lib/publication-workflow.ts`
  - `app/views/calendar/calendar-constants.ts`
  - `app/components/AcademicContentClient.tsx` (pruned)
  - `app/components/AcademicContentRenderer.tsx` (pruned)
  - `doctor.config.json` (scanner ignore boundaries)
- **Dependencies**: No external npm packages needed; leverages standard React 19, Next.js 16, and web APIs.
- **Verification Harness**: `pnpm run verify:fast`, `pnpm run typecheck`, `pnpm run lint`, and `npx react-doctor@latest --json --blocking none --yes`.
