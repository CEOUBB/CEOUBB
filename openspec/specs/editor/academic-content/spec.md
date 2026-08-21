# editor/academic-content Specification

## Purpose

Define the only trusted rendering boundary for teacher-authored academic HTML, including executable-content removal, institutional normalization and responsive presentation across Next.js SSR, browser hydration and the Capacitor shell.

## Requirements

### Requirement: Remove Executable Content (REQ-PROSE-01)

WHEN untrusted academic HTML enters the rendering pipeline, the system SHALL remove scripts, event attributes, executable elements, custom elements and unsafe URL protocols before creating a React HTML sink.

#### Scenario: An image carries an XSS payload

- **GIVEN** HTML containing `script`, `onerror` and a `javascript:` link
- **WHEN** the fragment is sanitized
- **THEN** no executable tag, event attribute or unsafe URL SHALL remain
- **AND** no payload SHALL execute during SSR or browser rendering

### Requirement: Preserve an Explicit Academic Allowlist (REQ-PROSE-02)

The sanitization pipeline SHALL preserve only approved semantic formatting, headings, paragraphs, quotes, lists, tables, code, figures, images and links with attributes explicitly valid for their element.

#### Scenario: A teacher formats a study guide

- **GIVEN** a fragment with headings, emphasis, a list, a table, a code block, an HTTPS image and an HTTPS link
- **WHEN** the fragment is sanitized
- **THEN** every approved semantic element SHALL remain
- **AND** unapproved attributes SHALL be absent

### Requirement: Normalize External Resources Safely (REQ-PROSE-03)

WHEN a sanitized fragment contains an absolute external HTTP(S) link, the system SHALL add `target="_blank"` and `rel="noopener noreferrer"`; IF an image source is not HTTPS or an internal relative URL, THEN the system SHALL remove the image.

#### Scenario: External links and images are hardened

- **GIVEN** a fragment with an external HTTPS link, an internal link, an HTTPS image and a data-URI image
- **WHEN** the fragment is sanitized
- **THEN** the external link SHALL open with opener isolation
- **AND** the internal link SHALL remain in the current context
- **AND** the data-URI image SHALL be absent

### Requirement: Strip Word and Moodle Presentation (REQ-PROSE-04)

WHEN HTML pasted from Word or Moodle contains `mso-*` declarations, fixed font families, absolute point sizes, source classes, IDs or legacy font tags, the system SHALL remove that presentation while preserving safe textual and tabular structure.

#### Scenario: A Word table adopts CEOUBB presentation

- **GIVEN** a table with `mso-*`, `font-family`, `font-size: 12pt`, classes, IDs and `font` elements
- **WHEN** the fragment is sanitized and rendered
- **THEN** those source styles and identifiers SHALL be absent
- **AND** the cell text and table structure SHALL remain

### Requirement: Render through the Institutional Container (REQ-PROSE-05)

The system SHALL expose an `AcademicProse` component that always sanitizes its `html` prop and renders it inside `.academic-prose` using the current Manrope body, Merriweather headings, CEOUBB tokens and monospace code typography.

#### Scenario: Server rendering uses the trusted boundary

- **GIVEN** a Server or Client Component supplies untrusted HTML
- **WHEN** `AcademicProse` renders it
- **THEN** `sanitizeAcademicHtml` SHALL run before `dangerouslySetInnerHTML`
- **AND** no bypass prop SHALL exist

### Requirement: Keep Tables Responsive and Output Stable (REQ-PROSE-06)

WHEN approved HTML contains a table, the system SHALL wrap it in a keyboard-focusable labelled region with horizontal overflow and SHALL produce idempotent sanitized output.

#### Scenario: A wide Moodle table renders on mobile

- **GIVEN** a multi-column table pasted from Moodle
- **WHEN** the fragment is sanitized twice and displayed at mobile width
- **THEN** exactly one `.academic-table-scroll` region SHALL wrap the table
- **AND** the table SHALL scroll horizontally without overflowing the publication container

### Requirement: Reject Oversized HTML Before Parsing (REQ-PROSE-07)

IF untrusted academic HTML exceeds 100,000 characters, THEN the system SHALL reject it before DOM parsing and `AcademicProse` SHALL render a static Chilean-Spanish message asking the author to divide the material.

#### Scenario: A pasted document exceeds the safe CPU budget

- **GIVEN** an academic HTML fragment with 100,001 characters
- **WHEN** the fragment enters the sanitization pipeline
- **THEN** `AcademicContentTooLargeError` SHALL be raised before DOMPurify runs
- **AND** the rendering boundary SHALL not create an HTML sink for that fragment
