# grades Specification

### Purpose

Gobierna la aritmética pura de calificaciones en el sistema universitario chileno (escala 1.0 a 7.0), los promedios ponderados, redondeos institucionales y las validaciones de aprobación.

### Requirements

#### Requirement: Chilean Grade Scale Bounds

The system SHALL strictly validate that all grade inputs are real numbers within the inclusive interval $[1.0, 7.0]$.

##### Scenario: Grade within bounds accepted

- **GIVEN** a grade value of `5.5`
- **WHEN** submitted for recording
- **THEN** the system SHALL accept the value

##### Scenario: Grade out of bounds rejected

- **GIVEN** a grade value of `7.5` or `0.8`
- **WHEN** validated by `validateGrade()`
- **THEN** the system SHALL return a validation error

#### Requirement: Institutional Grade Rounding

The system SHALL round all calculated weighted averages to exactly one decimal place using half-up arithmetic (`roundGrade()` in `lib/grades.ts`).

##### Scenario: Rounding calculated average

- **GIVEN** an unrounded average of `3.94`
- **WHEN** rounded by `roundGrade()`
- **THEN** the resulting grade SHALL be `3.9`

##### Scenario: Rounding approval threshold

- **GIVEN** an unrounded average of `3.95`
- **WHEN** rounded by `roundGrade()`
- **THEN** the resulting grade SHALL be `4.0` (Approval)

#### Requirement: Weighted Average Calculation

The system SHALL compute course final grades based on evaluation weights summing to 100%.

##### Scenario: Weighted evaluation average

- **GIVEN** grades `[5.0, 6.0]` with weights `[40%, 60%]`
- **WHEN** calculating weighted average
- **THEN** the final grade SHALL be `5.6`

## Requirements

### Requirement: Atomic Score Audit (REQ-AUDIT-01)

WHEN an authorized editor adds, changes or removes an official student score, the system SHALL atomically persist the new score state and one append-only audit document for every changed evaluation.

#### Scenario: A teacher corrects one score

- **GIVEN** a student has score `5.0` for evaluation `certamen-1`
- **AND** an authenticated teacher is assigned to the student's section
- **WHEN** the teacher saves score `6.0`
- **THEN** the grade document SHALL contain `6.0`
- **AND** one audit document SHALL contain previous value `5.0` and new value `6.0`

#### Scenario: Removing a score remains traceable

- **GIVEN** a student has score `4.5` for evaluation `laboratorio-2`
- **WHEN** an authorized editor clears the score
- **THEN** the audit document SHALL contain previous value `4.5` and new value `null`

### Requirement: Trusted Audit Identity and Time (REQ-AUDIT-02)

WHEN an audit document is committed, the system SHALL derive the actor identity from the verified Firebase Authentication context and SHALL assign the change time with the Firestore server clock.

#### Scenario: Payload attempts to impersonate another actor

- **GIVEN** a callable request authenticated as UID `teacher-1`
- **WHEN** its payload includes an unrelated actor UID or timestamp
- **THEN** the persisted audit SHALL identify `teacher-1`
- **AND** the persisted timestamp SHALL be assigned by Firestore

### Requirement: Immutable and Unbypassable History (REQ-AUDIT-03)

The system SHALL deny every client create, update or delete operation on grade-audit documents and SHALL deny direct client mutations of audited grade and gradebook documents.

#### Scenario: A modified client bypasses the callable

- **GIVEN** an authenticated teacher assigned to a section
- **WHEN** the client writes directly to `grades/{uid}` or `gradeAudit/{eventId}`
- **THEN** Firestore Security Rules SHALL deny the operation

### Requirement: Section-Scoped Authorization (REQ-AUDIT-04)

WHILE processing an audited grade mutation, the system SHALL authorize only an owner or a verified teacher with an active enrollment projection in the target section.

#### Scenario: Teacher from another section attempts a change

- **GIVEN** a user whose projected role is `teacher`
- **AND** no enrollment exists for the target section
- **WHEN** the user invokes an audited grade mutation
- **THEN** the Function SHALL return `permission-denied`
- **AND** neither grade nor audit state SHALL change

### Requirement: Isolated Audit Reads (REQ-AUDIT-05)

WHILE reading grade history, the system SHALL allow section teachers and owners to read the section audit and SHALL allow a student to read only score-audit documents whose `studentId` equals their authenticated UID.

#### Scenario: Student queries another student's history

- **GIVEN** an authenticated student enrolled in the section
- **WHEN** the student requests an audit document for another UID
- **THEN** Firestore Security Rules SHALL deny the read

### Requirement: Bounded and Idempotent Mutations (REQ-AUDIT-06)

IF a request exceeds 100 student rows or 100 score keys per row, THEN the system SHALL reject it as `invalid-argument`; IF the normalized value is unchanged, THEN the system SHALL create no audit document.

#### Scenario: Saving the same score twice

- **GIVEN** a stored score of `5.5`
- **WHEN** an authorized editor saves `5.5` again
- **THEN** the Function SHALL report zero changes
- **AND** no additional audit document SHALL exist

#### Scenario: Oversized bulk request

- **GIVEN** a payload containing 101 student rows
- **WHEN** the caller invokes the score mutation
- **THEN** the Function SHALL return `invalid-argument` before writing data

### Requirement: Gradebook Configuration Audit (REQ-AUDIT-07)

WHEN an authorized editor changes evaluation definitions, weights, dates or the exemption threshold, the system SHALL atomically persist one audit document containing the complete previous and new gradebook values.

#### Scenario: A teacher changes an evaluation weight

- **GIVEN** an existing gradebook with `certamen-1` weighted at 30 percent
- **WHEN** an authorized teacher saves the same evaluation weighted at 40 percent
- **THEN** the gradebook SHALL contain 40 percent
- **AND** one immutable audit document SHALL contain both complete configurations
