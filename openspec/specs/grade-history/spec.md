# grade-history Specification

## Purpose

Permitir al equipo docente consultar el historial inmutable de una nota sin modificarlo ni exponer notas de otras secciones.

## Requirements

### Requirement: Authorized history endpoint (REQ-HISTORY-01)

WHEN a user requests grade history, the system SHALL authorize a persisted owner or an active section teacher/coordinator with teacher account role or an active institutional assistant; IF authorization fails, THEN the system SHALL return 401 or 403 before querying audit records. The endpoint SHALL support GET only and SHALL remain available for archived sections.

#### Scenario: Section authorization matrix

- **GIVEN** owner, section teacher, coordinator, assistant, student and unrelated teacher accounts
- **WHEN** each requests the selected section history
- **THEN** only owner and authorized section staff SHALL receive events
- **AND** student, unauthenticated and unrelated accounts SHALL trigger no audit reads

### Requirement: Bounded precise chronology (REQ-HISTORY-02)

WHEN history is requested, the system SHALL filter score events by section, student and evaluation and SHALL return at most 25 events ordered newest first with a timestamp-and-ID cursor preserving server timestamp precision and a matching composite index.

#### Scenario: More than one page and equal timestamps

- **GIVEN** 26 score events, including equal server timestamps and events for other evaluations
- **WHEN** the client requests the first and next pages
- **THEN** filtering SHALL occur in Firestore before the 26-document read limit
- **AND** the cursor SHALL retain the last displayed event timestamp and ID
- **AND** malformed cursors or data SHALL fail closed

### Requirement: Read-only grade history dialog (REQ-HISTORY-03)

WHEN an authorized user selects a grade, the interface SHALL open one dialog naming the student and evaluation, showing original author, exact date in America/Santiago and previous/new grade values, including null values as absent grades; the dialog SHALL contain no mutation controls.

#### Scenario: Correction, creation and removal

- **GIVEN** a selected grade has creation, correction and removal events
- **WHEN** its history opens
- **THEN** the dialog SHALL show each transition and the original actor identity
- **AND** keyboard focus SHALL stay inside until Escape or Close restores the trigger focus

### Requirement: Resilient bounded interaction (REQ-HISTORY-04)

WHILE history is loading, empty or unavailable, the interface SHALL expose the matching status, allow retry after failure, cancel obsolete requests, and show at most one page at a time; authorized assistants SHALL use a paginated student directory and evaluation selector without grade editing controls.

#### Scenario: Retry and selection change

- **GIVEN** a request fails or returns no events
- **WHEN** the user retries, closes the dialog or selects another grade
- **THEN** status messages SHALL distinguish failure from absence of recorded events
- **AND** stale responses SHALL never overwrite the newly selected history
- **AND** the dialog SHALL fit desktop and mobile viewports without horizontal page overflow
