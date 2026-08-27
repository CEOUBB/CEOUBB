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

### Requirement: Atomic Private Grade Feedback (REQ-FEEDBACK-01)

WHEN an authorized teacher adds, changes or removes feedback for an official grade, the system SHALL atomically persist the normalized comment and one append-only audit document with trusted actor identity and server time.

#### Scenario: Teacher comments a graded evaluation

- **GIVEN** student `student-1` has an official score for `certamen-1`
- **AND** the authenticated teacher is assigned to the section
- **WHEN** the teacher saves `Revisa el equilibrio de momentos.`
- **THEN** `feedback.certamen-1` SHALL contain that text
- **AND** one `targetType: feedback` audit document SHALL contain its previous and new values

### Requirement: Owner-Isolated Feedback Reads (REQ-FEEDBACK-02)

WHILE a student reads the gradebook, the system SHALL expose only the feedback stored in that student's own grade document and SHALL preserve other students' feedback as inaccessible.

#### Scenario: Student attempts to read a classmate's feedback

- **GIVEN** two enrolled students have different grade documents
- **WHEN** the first student requests the second student's document or feedback audit
- **THEN** Firestore Security Rules SHALL deny the read
- **AND** the first student SHALL continue to read feedback whose `studentId` equals their own UID

### Requirement: Feedback in Student Web and Mobile Views (REQ-FEEDBACK-03)

WHERE an official grade has non-empty feedback, the student interface SHALL render the plain-text feedback with preserved line breaks beside that evaluation on desktop and inside its detail sheet on mobile; WHERE feedback is absent, the interface SHALL reserve no feedback panel.

#### Scenario: Student opens a commented evaluation

- **GIVEN** an evaluation has an official score and two-line feedback
- **WHEN** the student views grades on desktop and opens the same evaluation on mobile
- **THEN** both surfaces SHALL show the same two-line text
- **AND** no HTML from the comment SHALL execute

### Requirement: Accessible Teacher Feedback Editor (REQ-FEEDBACK-04)

WHEN a teacher activates the feedback action for a graded cell, the interface SHALL open one accessible editor identified by student and evaluation, SHALL expose the 2.000-character limit and SHALL report save success or failure without creating one editor per matrix cell.

#### Scenario: Teacher edits one matrix comment

- **GIVEN** a grade matrix with multiple students and evaluations
- **WHEN** the teacher activates the comment action in one graded cell
- **THEN** the dialog SHALL name the selected student and evaluation
- **AND** the matrix SHALL contain only one mounted feedback dialog
- **AND** the action SHALL visibly distinguish an existing comment

### Requirement: Bounded and Idempotent Feedback (REQ-FEEDBACK-05)

IF feedback is empty after trimming, THEN the system SHALL remove that evaluation key; IF feedback exceeds 2.000 characters, THEN the system SHALL reject it as `invalid-argument`; IF the normalized text is unchanged, THEN the system SHALL create no audit document.

#### Scenario: Teacher clears an existing comment

- **GIVEN** feedback exists for `certamen-1`
- **WHEN** the teacher saves whitespace only
- **THEN** `feedback.certamen-1` SHALL be absent
- **AND** the audit entry SHALL contain the previous text and `newValue: null`

#### Scenario: Oversized feedback is rejected

- **GIVEN** a comment containing 2.001 characters
- **WHEN** the teacher submits it
- **THEN** the Function SHALL return `invalid-argument`
- **AND** neither grade nor audit state SHALL change

### Requirement: Zero-Read-Amplification Feedback (REQ-FEEDBACK-06)

The system SHALL colocate feedback with the existing per-student grade document and SHALL use the existing grade listeners, adding no query, listener, index or document read to either role.

#### Scenario: Classroom feedback synchronization at section scale

- **GIVEN** a section gradebook already listens to student grade documents
- **WHEN** private feedback is enabled
- **THEN** student and teacher clients SHALL receive feedback through those same snapshots
- **AND** no feedback collection query or additional `onSnapshot` SHALL exist

### Requirement: Batch Partitioning for Large Section Grade Operations (REQ-PERF-02)

WHEN persisting bulk grade updates or audited score mutations for a section, the system SHALL partition operations into sequential chunks of no more than 400 operations per batch, guaranteeing that Firestore transactions and batch writes remain strictly within the 500-operation platform limit.

#### Scenario: Bulk score persistence in a 350-student section

- **GIVEN** a section with 350 enrolled students needing official score updates
- **WHEN** the client invokes `saveSectionScores`
- **THEN** the operations SHALL be partitioned into waves with maximum 100 rows per audited call and 400 operations per batch
- **AND** all 350 student grade records SHALL commit without exceeding Firestore batch limits
