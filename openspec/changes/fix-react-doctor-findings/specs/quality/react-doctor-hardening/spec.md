## Purpose

Establishes structural code quality, React 19 lifecycle safety, deterministic state management via typed reducers, memory reclamation, bounded async batching, and dead-code elimination across all web views and utilities.

## ADDED Requirements

### Requirement: Co-located State Management via Typed Reducers (REQ-QMD-01)

WHERE complex portal shells or course dashboards manage multiple interdependent state variables, the system SHALL coordinate state transitions atomically through typed reducers, ensuring that related state transitions occur in a single dispatch without state tearing or inconsistent intermediate renders.

#### Scenario: Portal switches view and selection state atomically
- **GIVEN** an authenticated user in the portal shell
- **WHEN** the user selects a course, tab, or quick action that modifies multiple viewport states
- **THEN** the state machine SHALL update all associated properties in a single deterministic reducer action
- **AND** no intermediate mismatched visual state SHALL be presented

#### Scenario: Teacher course dashboard updates filter and selection criteria
- **GIVEN** a teacher viewing their assigned course sections
- **WHEN** the teacher filters or sorts their courses
- **THEN** the view state SHALL transition through a typed reducer action maintaining query and pagination consistency

### Requirement: Asynchronous Lifecycle Safety and Memory Reclamation (REQ-QMD-02)

WHEN client components execute asynchronous requests or instantiate temporary object URLs, the system SHALL bind data fetching to cancellable lifecycles (via AbortController or server actions) to prevent race conditions on fast unmounts, and SHALL explicitly invoke `URL.revokeObjectURL` whenever an image preview Blob URL is superseded or unmounted.

#### Scenario: Avatar upload revokes preview object URLs
- **GIVEN** an authenticated user selecting an image file in user settings
- **WHEN** the user chooses an image and subsequent images or cancels
- **THEN** the previously created object URL SHALL be revoked via `URL.revokeObjectURL`
- **AND** no orphaned Blob references SHALL remain pinned in browser memory

#### Scenario: Component unmount cancels in-flight fetch requests
- **GIVEN** a student navigating away from a classroom or settings view while a fetch is pending
- **WHEN** the component unmounts
- **THEN** the active `AbortController` SHALL abort the in-flight network request
- **AND** no state updates SHALL be dispatched to the unmounted component

### Requirement: Next.js Client Routing and Bounded Async Batching (REQ-QMD-03)

Internal application links SHALL use Next.js `Link` components to preserve client cache and prefetching, and data transformation or import utilities SHALL process independent asynchronous tasks using `Promise.all` concurrent batching and $O(1)$ `Set` lookups rather than sequential blocking loops or linear array scans.

#### Scenario: Resources link navigation uses client-side router
- **GIVEN** a user navigating internal platform resources in `ResourcesView`
- **WHEN** the user clicks an internal link
- **THEN** the transition SHALL execute client-side via Next.js routing without a full page reload

#### Scenario: Moodle parser batches asynchronous entry extraction
- **GIVEN** an import payload containing multiple courses and sections
- **WHEN** the parser processes entries
- **THEN** independent item transformations SHALL run concurrently through `Promise.all`
- **AND** import execution time SHALL scale with concurrency rather than linear cumulative item latency

#### Scenario: FAQ browser matches tags with constant-time set lookups
- **GIVEN** a large list of FAQ questions and filter tags
- **WHEN** the user filters questions by category
- **THEN** matching SHALL execute against a `Set` index in $O(1)$ lookup time per item

### Requirement: Dead Export and Unused File Pruning (REQ-QMD-04)

The codebase SHALL eliminate unused components, unreferenced files, and dead public constants to prevent maintenance confusion and reduce total bundle size.

#### Scenario: Pruning orphan files and unused exports
- **GIVEN** unreachable components or dead exports in the codebase
- **WHEN** the build and typecheck runs
- **THEN** all components in production SHALL be actively imported by live application routes
- **AND** no unreferenced exports or orphan mock files SHALL remain in source directories
