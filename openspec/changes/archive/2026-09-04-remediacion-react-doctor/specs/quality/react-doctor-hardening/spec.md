## ADDED Requirements

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
