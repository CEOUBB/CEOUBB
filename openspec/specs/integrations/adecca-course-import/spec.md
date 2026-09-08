# integrations/adecca-course-import Specification

## Purpose

Gobierna la importación verificable de materiales ADECCA organizados en un paquete local hacia una sección CEOUBB existente, sin conexión viva, credenciales ni tratamiento innecesario de datos personales.

## Requirements

### Requirement: Accept Only Local ADECCA Material Packages (REQ-ADECCA-01)

The system SHALL accept a local ZIP, versioned JSON manifest or UTF-8 CSV and SHALL NOT accept or transmit an ADECCA URL, RUT, password, cookie, token or API key.

Secrets in manifest keys or values SHALL invalidate the package. Personal email/RUT in descriptive metadata SHALL be redacted; unsafe and ADECCA-hosted links SHALL be omitted. Binary documents are not scanned for personal data and SHALL require teacher review before confirmation.

#### Scenario: A teacher selects a local package

- **GIVEN** a teacher has organized downloaded ADECCA materials in a local ZIP
- **WHEN** the teacher selects the ZIP
- **THEN** the browser SHALL analyze it without sending the container to a server
- **AND** the workflow SHALL expose no ADECCA credential or URL field

### Requirement: Reject Hostile or Oversized Packages (REQ-ADECCA-02)

IF an archive exceeds 250 MiB compressed, 512 MiB expanded, 20,000 entries, contains traversal, duplicate paths, encryption, invalid CRC, active files or an individual file above 50 MiB, THEN the system SHALL reject or omit the affected content before any persistent write.

#### Scenario: An archive escapes its root

- **GIVEN** a ZIP entry named `../escape.pdf`
- **WHEN** local analysis begins
- **THEN** the analyzer SHALL reject the package
- **AND** Turso, Firestore and Storage SHALL remain unchanged

The URL privacy checks SHALL remove trailing prose punctuation in linear time, without regular-expression backtracking, while preserving credential and unsafe-link detection.

#### Scenario: A URL contains adversarial punctuation

- **GIVEN** imported text contains an HTTP URL with 200,000 repeated closing parentheses, followed by a non-punctuation character or the end of the URL
- **WHEN** credential and unsafe-link detection inspect the text
- **THEN** both checks SHALL complete within the isolated regression process budget of five seconds
- **AND** punctuation inside the URL SHALL remain intact and unsafe URLs SHALL still be rejected

### Requirement: Preview the Local Reconciliation Plan (REQ-ADECCA-03)

WHILE a valid source has been analyzed but not confirmed, the system SHALL show source, destination, folders, posts, files, upload bytes, students and omissions without persistent writes.

The preview SHALL show bounded lists of detected unit, post and file names, total counts and remaining-item counts.

#### Scenario: A teacher reviews a package

- **GIVEN** a package with two folders, three compatible files and one unsupported file
- **WHEN** analysis completes
- **THEN** the preview SHALL show the folders, compatible content, total bytes and omission
- **AND** it SHALL require an explicit confirmation before importing

### Requirement: Convert Only Compatible Academic Materials (REQ-ADECCA-04)

WHEN an authorized teacher confirms import, the system SHALL map folder paths to bounded units, recognized descriptions to sanitized posts, program and guide files to guides, passive files and safe links to resources, and descriptive assignments to assessments without historical submissions.

#### Scenario: Folder materials preserve structure

- **GIVEN** a ZIP containing `Unidad 1/README.md` and `Unidad 1/Apuntes.pdf`
- **WHEN** the package is imported
- **THEN** both resulting posts SHALL use folder `Unidad 1`
- **AND** the PDF SHALL remain a passive downloadable resource

### Requirement: Keep ADECCA Reimports Idempotent (REQ-ADECCA-05)

WHEN the same source path or manifest item is imported again into the same section, the system SHALL update deterministic `adecca-*` documents, SHALL reuse only blobs whose full SHA-256 metadata and size match, SHALL suppress notifications and SHALL NOT delete older imported material absent from the package.

#### Scenario: A package is imported twice

- **GIVEN** a previously imported ADECCA material with matching full SHA-256 metadata
- **WHEN** the teacher confirms the same package again
- **THEN** Firestore SHALL update the deterministic document instead of duplicating it
- **AND** Storage SHALL reuse the verified blob

### Requirement: Reconcile ADECCA Rosters by Explicit Opt-In (REQ-ADECCA-06)

WHERE participant import is explicitly enabled, the system SHALL accept only institutional student emails, SHALL enroll existing accounts, SHALL retain unmatched emails without names for at most 90 days, and SHALL keep the option disabled by default.

Expired pending emails SHALL grant no access and SHALL be purged in bounded daily batches by the production Cloudflare scheduled handler or the existing Vercel cron endpoint.

#### Scenario: A roster contains mixed roles and domains

- **GIVEN** a CSV with an institutional student, an institutional teacher and an external address
- **WHEN** roster import is enabled
- **THEN** only the institutional student SHALL be enrolled or retained as pending
- **AND** no name or rejected address SHALL be persisted

### Requirement: Enforce Open-Period Authorization (REQ-ADECCA-07)

IF the actor lacks owner, active teacher or active coordinator authorization in the destination section, or the academic period is not open, THEN every server import action SHALL reject the request without writes.

#### Scenario: A closed section receives an import request

- **GIVEN** an active teacher belongs to a section whose period is closed
- **WHEN** the client starts an ADECCA import
- **THEN** the API SHALL return HTTP 409
- **AND** no import job SHALL be created

### Requirement: Maintain a Bounded ADECCA Audit Trail (REQ-ADECCA-08)

WHEN an import starts or completes, the system SHALL maintain one bounded ADECCA job per destination section and fingerprint and SHALL provide a detailed downloadable local JSON report.

Every batch SHALL bind to a server-issued run token, actor, source and declared cumulative plan. The server SHALL serialize concurrent batches and derive final counts from unique applied item hashes. Completed jobs SHALL reject writes; restarting SHALL rotate the token and clear technical item tracking.

#### Scenario: A retry cannot inflate counters or reuse a finished run

- **GIVEN** a run has already applied a participant batch
- **WHEN** the same batch is retried and the run is completed
- **THEN** the server SHALL count each participant once
- **AND** subsequent writes using the completed token SHALL be rejected

#### Scenario: An import finishes partially

- **GIVEN** compatible posts and one failed file
- **WHEN** the operation completes
- **THEN** the job SHALL record partial status and bounded aggregate counts
- **AND** the teacher SHALL be able to download the complete client report

### Requirement: Omit Unsupported ADECCA Semantics (REQ-ADECCA-09)

IF source content represents grades, submissions, attempts, forum data, peer-review data, journals, logs, executable files or unknown interactive modules, THEN the system SHALL omit and report it without creating official records.

Attachments SHALL match the Storage extension/MIME allowlist and expected signatures. TXT/CSV attachments containing sensitive data SHALL be omitted.

#### Scenario: A source declares grades and submissions

- **GIVEN** a source package containing historical grades and submitted work
- **WHEN** it is analyzed
- **THEN** those categories SHALL appear as omissions
- **AND** no grade or submission record SHALL be written

### Requirement: Keep the Teacher Workflow Accessible and Bounded (REQ-ADECCA-10)

The system SHALL expose a teacher-only keyboard workflow with labels, visible focus, live status, native progress and 44 px targets; SHALL load the parser dynamically; SHALL cap API batches at 100 and Firestore commits at 400.

#### Scenario: A keyboard teacher completes an import

- **GIVEN** a teacher navigating only with a keyboard
- **WHEN** the teacher selects, reviews, confirms and closes an import
- **THEN** progress and results SHALL be announced without relying on color
- **AND** focus SHALL remain within the native modal workflow

### Requirement: Preserve CEOUBB Independence (REQ-ADECCA-11)

WHILE CEOUBB lacks written institutional authorization, implementation and review SHALL use synthetic fixtures only and SHALL preserve all non-official disclaimers.

#### Scenario: The feature is reviewed before an agreement exists

- **GIVEN** no written UBB authorization has been recorded
- **WHEN** automated or manual verification runs
- **THEN** all fixtures SHALL be synthetic
- **AND** the product SHALL NOT describe the importer as an official ADECCA integration
