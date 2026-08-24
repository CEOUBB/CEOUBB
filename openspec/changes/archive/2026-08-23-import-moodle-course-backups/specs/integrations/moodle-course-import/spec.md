## Purpose

Gobierna la importación verificable de respaldos Moodle y nóminas de curso hacia una sección CEOUBB existente, incluyendo compatibilidad explícita, aislamiento, idempotencia, retención temporal y reporte de reconciliación.

## ADDED Requirements

### Requirement: Validate Moodle Containers Before Use (REQ-MOODLE-01)

WHEN a teacher selects a `.mbz`, the system SHALL detect TGZ or ZIP by signature, SHALL validate bounded archive paths, sizes, counts, checksums and XML without DTD, and SHALL reject the backup before any persistent write if the contract fails.

#### Scenario: A valid Moodle TGZ is analyzed

- **GIVEN** a Moodle 2+ TGZ containing `moodle_backup.xml`, course, sections and activities
- **WHEN** the teacher selects the file
- **THEN** the analyzer SHALL produce a normalized preview without uploading the `.mbz`
- **AND** no Turso, Firestore or Storage write SHALL occur

#### Scenario: A hostile archive path is rejected

- **GIVEN** an archive entry named `../escape.xml` or an XML document containing a DTD
- **WHEN** analysis begins
- **THEN** the analyzer SHALL reject the backup as invalid
- **AND** it SHALL NOT expose or persist the hostile content

### Requirement: Preview the Reconciliation Plan (REQ-MOODLE-02)

WHILE a valid backup or CSV has been analyzed but not confirmed, the system SHALL show source metadata, destination section, counts of sections, compatible activities, files, student participants, hidden items, omissions and estimated upload bytes.

#### Scenario: A teacher reviews before writing

- **GIVEN** a backup with pages, files, a quiz and 40 participants
- **WHEN** analysis completes
- **THEN** the preview SHALL distinguish restorable pages/files from the omitted quiz
- **AND** it SHALL offer an explicit control for including student participants

### Requirement: Restore Only Supported Course Content (REQ-MOODLE-03)

WHEN an authorized teacher confirms import, the system SHALL map Moodle sections to folders; pages, labels, URLs, assignments and book chapters to safe CEOUBB posts; resources and folders to materials; and SCORM packages to downloadable resources marked as non-executable.

#### Scenario: Historical materials preserve structure

- **GIVEN** a visible Moodle section `Unidad 2` with one page, one assignment and two PDFs
- **WHEN** it is imported into a CEOUBB section
- **THEN** the resulting posts SHALL use folder `Unidad 2`
- **AND** the assignment SHALL preserve a valid due date
- **AND** both PDFs SHALL retain their safe names and verified content

### Requirement: Verify and Bound Every Imported File (REQ-MOODLE-04)

IF a Moodle file is empty, exceeds 50 MiB, fails its declared SHA-1, has an active or executable extension, lacks a backing archive entry, or escapes its declared path, THEN the system SHALL skip the file and SHALL include the exact reason in the report.

#### Scenario: A tampered PDF is skipped

- **GIVEN** `files.xml` declares a SHA-1 that does not match the stored PDF bytes
- **WHEN** import reaches the file
- **THEN** Storage SHALL receive no upload for that file
- **AND** the final report SHALL mark it as failed integrity verification

### Requirement: Keep Reimports Idempotent and Non-Destructive (REQ-MOODLE-05)

WHEN the same Moodle course is imported again into the same CEOUBB section, the system SHALL address posts by deterministic source IDs, SHALL reuse matching stored files, SHALL update the same records, SHALL suppress student notifications and SHALL NOT delete older content missing from the newer backup.

#### Scenario: A backup is imported twice

- **GIVEN** an imported Moodle page and PDF
- **WHEN** the same backup is confirmed a second time
- **THEN** Firestore SHALL contain one post per source element rather than duplicates
- **AND** the PDF SHALL not be uploaded again when its stored metadata matches

### Requirement: Reconcile Student Rosters Without Synthetic Accounts (REQ-MOODLE-06)

WHERE participant import is explicitly enabled, the system SHALL accept only Moodle `student` participants with institutional email domains; SHALL enroll and project existing accounts; and SHALL retain unmatched emails without names for at most 90 days so the enrollment can be claimed after verified sign-in.

#### Scenario: Existing and future students share a roster

- **GIVEN** one participant already exists in CEOUBB and one valid UBB student has never signed in
- **WHEN** the roster chunk is imported
- **THEN** Turso SHALL upsert the existing student's active enrollment
- **AND** Firestore SHALL receive its section marker
- **AND** the future student SHALL receive one expiring pending enrollment without a synthetic user row

### Requirement: Enforce Destination Authorization Server-Side (REQ-MOODLE-07)

IF the current session is not owner or does not hold an active teacher/coordinator enrollment in the destination section, THEN the system SHALL reject every import API action with HTTP 403 regardless of client role, source metadata or payload.

#### Scenario: A teacher targets another section

- **GIVEN** a teacher enrolled in section A but not section B
- **WHEN** the client submits an import batch for section B
- **THEN** the API SHALL return HTTP 403
- **AND** Turso and Firestore SHALL remain unchanged

### Requirement: Produce an Auditable Import Report (REQ-MOODLE-08)

WHEN an import starts or finishes, the system SHALL maintain one bounded Turso job per destination section and semantic fingerprint, SHALL record actor, source, state and aggregate counts, and SHALL let the teacher download the detailed client report as JSON.

#### Scenario: A partial import remains explainable

- **GIVEN** nine compatible items and one oversized file
- **WHEN** the operation finishes
- **THEN** the job SHALL have status `partial`
- **AND** the UI SHALL report nine successes and the oversized-file warning
- **AND** a retry SHALL update the same job rather than create a duplicate

### Requirement: Keep Parsing and Writes Bounded (REQ-MOODLE-09)

The system SHALL cap backups at 250 MiB compressed, 512 MiB expanded, 20,000 entries and 8 MiB per XML document; SHALL process binary uploads sequentially; and SHALL partition API payloads at 100 records and Firestore commits at 400 writes.

#### Scenario: A high-volume course remains bounded

- **GIVEN** a valid course with 850 metadata records
- **WHEN** import is confirmed
- **THEN** the client SHALL send no batch above 100 records
- **AND** the server SHALL issue no Firestore commit above 400 writes

### Requirement: Report Unsupported Moodle Semantics Honestly (REQ-MOODLE-10)

IF a backup contains quizzes, question banks, attempts, grades, submissions, forum messages, logs, hidden activities, unknown plugins or non-student roles, THEN the system SHALL omit them, SHALL report each category and SHALL NOT describe the backup as a complete restoration.

#### Scenario: A quiz course is not overstated

- **GIVEN** a Moodle backup containing a quiz, attempts and final grades
- **WHEN** the preview and final report are shown
- **THEN** each unsupported category SHALL appear as omitted
- **AND** no official grade or attempt SHALL be written to CEOUBB

### Requirement: Provide an Accessible Teacher Workflow (REQ-MOODLE-11)

The system SHALL expose the import flow only within teacher tools, SHALL associate every field and option with a label, SHALL announce analysis/import status, SHALL expose native progress, SHALL manage dialog focus, and SHALL preserve minimum 44 px targets on web and Capacitor.

#### Scenario: A keyboard teacher completes import

- **GIVEN** a teacher navigating only by keyboard
- **WHEN** they select, review, confirm and close an import
- **THEN** focus SHALL remain visible and contained by the modal workflow
- **AND** progress and the final result SHALL be announced without relying on color
