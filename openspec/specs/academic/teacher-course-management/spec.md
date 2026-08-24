# academic/teacher-course-management Specification

## Purpose

Define the bounded, role-aware workflow that lets CEOUBB teachers create and configure their own course sections, evaluation schemes and registered assistants while preserving Turso as the academic source of truth and Firestore as an operational projection.

## Requirements

### Requirement: Restrict the Teacher Management Workspace (REQ-TCM-01)

The system SHALL expose `Administrar ramos` only to authenticated accounts with stored rank `teacher` or `owner`, and every mutation SHALL repeat that server-side authorization.

#### Scenario: A student attempts direct access

- **GIVEN** an authenticated account with rank `student`
- **WHEN** it invokes the teacher course endpoint directly
- **THEN** the endpoint SHALL respond HTTP 403
- **AND** no academic record SHALL change

### Requirement: Create a Complete Section Atomically (REQ-TCM-02)

WHEN an authorized teacher submits a valid course against an existing department and open period, the system SHALL create or reuse the subject and SHALL create its section profile and teacher enrollment in one Turso transaction; the enrollment projection SHALL complete or the local creation SHALL be compensated.

#### Scenario: A teacher creates a first section

- **GIVEN** an authenticated teacher, an open period and a valid department
- **WHEN** code, name, credits and section number pass validation
- **THEN** Turso SHALL persist the subject, section, profile and active teacher enrollment
- **AND** Firestore SHALL receive the teacher enrollment marker
- **AND** the API SHALL return HTTP 201 with a minimal serializable course DTO

### Requirement: Update Only Owned Section Presentation (REQ-TCM-03)

WHEN the responsible teacher changes the visible title, summary, modality, room or academic tone, the system SHALL update only that section profile; IF another teacher targets the section, THEN the system SHALL respond HTTP 403.

#### Scenario: Another teacher guesses the section identifier

- **GIVEN** two teachers responsible for different sections
- **WHEN** one submits a profile update for the other's section identifier
- **THEN** the API SHALL respond HTTP 403
- **AND** the stored profile SHALL remain unchanged

### Requirement: Configure a Valid Grade Scheme (REQ-TCM-04)

WHEN a responsible teacher saves evaluations, the system SHALL require non-empty names, positive weights totaling exactly 100 and a valid exemption grade, and SHALL persist them to the exact document `courses/{seccionId}/meta/gradebook`.

#### Scenario: Evaluation weights total ninety

- **GIVEN** a responsible teacher editing three evaluations
- **WHEN** their weights total 90
- **THEN** the interface SHALL block the save
- **AND** an accessible status SHALL request a total of 100 percent

### Requirement: Designate and Revert Registered Assistants (REQ-TCM-05)

WHEN the responsible teacher designates a registered institutional student as assistant, the system SHALL preserve the previous section role and state, SHALL activate role `assistant` and SHALL project it; WHEN the assistant is removed, the system SHALL restore the previous enrollment or SHALL withdraw an enrollment created solely for the assistant role.

#### Scenario: An enrolled student becomes assistant and returns to student

- **GIVEN** a registered student with an active student enrollment
- **WHEN** the responsible teacher designates the exact institutional email
- **THEN** the active enrollment SHALL carry role `assistant`
- **AND** the bounded assistant roster SHALL contain that account
- **WHEN** the teacher removes the assistant
- **THEN** the enrollment SHALL return to role `student` and its previous state

### Requirement: Derive Portal Courses from Active Enrollments (REQ-TCM-06)

WHILE a session is valid, the portal SHALL render course navigation from active enrollment DTOs returned by Turso and SHALL provide only those section identifiers to Firestore listeners; IF the catalog fails, THEN the portal SHALL fail closed with no course list.

#### Scenario: One enrollment is withdrawn

- **GIVEN** two active enrollments and one withdrawn enrollment
- **WHEN** the user opens the portal
- **THEN** exactly two course DTOs SHALL be rendered
- **AND** the withdrawn section SHALL not reach any activity or gradebook listener

### Requirement: Return Actionable Safe Errors (REQ-TCM-07)

IF input, authorization, catalog lookup or projection fails, THEN the system SHALL return the specified 400, 401, 403, 404, 409 or 503 status with a Chilean-Spanish message and SHALL NOT expose stack traces, secrets or provider payloads.

#### Scenario: Projection credentials are unavailable

- **GIVEN** a locally successful pending course creation
- **WHEN** the Firestore projection cannot authenticate
- **THEN** the system SHALL compensate the new section data
- **AND** the endpoint SHALL respond HTTP 503 without internal credential detail

### Requirement: Keep Management Work Bounded (REQ-TCM-08)

The system SHALL limit course, catalog and assistant queries to at most 100 rows per page and SHALL open at most one exact gradebook document listener for the selected section.

#### Scenario: A teacher manages many sections

- **GIVEN** more than 100 administrable sections
- **WHEN** the first page is requested
- **THEN** the response SHALL contain at most 100 rows and a cursor
- **AND** no collection-group query SHALL execute

### Requirement: Provide an Accessible Institutional Workspace (REQ-TCM-09)

The system SHALL present data, evaluations and team controls with CEOUBB typography and tokens, visible focus, live status feedback, tabular numerals, minimum 44 px touch targets and responsive composition while preserving the independent-platform disclaimer.

#### Scenario: A teacher configures a course on a phone

- **GIVEN** a 390 px viewport and reduced-motion preference
- **WHEN** the teacher navigates the three management panels
- **THEN** every control SHALL remain reachable without horizontal page overflow
- **AND** status changes SHALL be announced without motion required
