# React Doctor Quality & Frontend Hardening

## Purpose

Establishes structural code quality, React 19 lifecycle safety, deterministic state management via typed reducers, memory reclamation, bounded async batching, and dead-code elimination across all web views and utilities.

## Requirements

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

### Requirement: Safe URL Parsing and Runtime Guards (REQ-QMD-05)

The system SHALL defensively guard dynamic URL parsing and regular expression extractions using `URL.canParse()` and explicit match existence verifications, preventing uncaught runtime `TypeError` exceptions or crashes caused by malformed input or unhandled null matches.

#### Scenario: Malformed configuration URL is safely guarded

- **WHEN** an environment variable or request parameter contains a malformed URL string
- **THEN** the system SHALL verify its validity via `URL.canParse()` before constructing a `new URL()` instance
- **AND** SHALL return a deterministic HTTP 503 or 400 error response without crashing the server process

#### Scenario: Regular expression match handles null miss safely

- **WHEN** parsing structured XML tokens or document tags without matching the expected pattern
- **THEN** the system SHALL guard the match array before reading captured groups
- **AND** SHALL reject the invalid input with a controlled parsing exception rather than throwing a null property dereference

### Requirement: Concurrent Loop I/O and Combined Iterations (REQ-QMD-06)

WHEN performing batch operations over collections of files, database rows, or remote storage objects, the system SHALL process independent asynchronous tasks concurrently using `Promise.all` rather than blocking sequentially in `for...of` loops, and SHALL combine chained array transformations (`.filter().map()`) into single-pass traversals.

#### Scenario: Processing ZIP entries and storage uploads concurrently

- **WHEN** unpacking a course package or uploading multiple media assets to storage
- **THEN** all independent read and upload promises SHALL execute concurrently through `Promise.all`
- **AND** total elapsed time SHALL be bounded by maximum item latency rather than cumulative sum

#### Scenario: Filtering and mapping in a single pass

- **WHEN** processing lists of questions, XML elements, or feedback items
- **THEN** transformation and filtering SHALL execute in a single iteration pass without allocating intermediate arrays

### Requirement: Component Complexity Limits and Atomic Decomposition (REQ-QMD-07)

WHERE interactive React views exceed 300 lines of code or reach cyclomatic complexity greater than 15, the component architecture SHALL decouple sub-sections into atomic subcomponents and dedicated custom hooks, preserving strict single-responsibility boundaries and maintainability.

#### Scenario: Large form or dashboard view decomposes into subcomponents

- **WHEN** an interactive form or classroom view handles multiple tabs or sub-flows
- **THEN** each tab panel or section SHALL be rendered by an isolated subcomponent
- **AND** root component file size SHALL remain within the established architectural budget
