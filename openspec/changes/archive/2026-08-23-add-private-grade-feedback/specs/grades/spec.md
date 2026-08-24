## ADDED Requirements

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
