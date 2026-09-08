# classroom/team-submissions Specification

## Purpose

Governs group submissions for workshops, laboratories and projects: how a teacher declares the submission modality of an evaluation, how a representative submits on behalf of a team, and how the receipt, the official grade and the private feedback reach every member of that team atomically and traceably.

This capability also records the retirement of the classroom progress tab, whose manually declared unit checkboxes were replaced by the evidence the section already produces: evaluations, submissions and official grades.

## Requirements

### Requirement: Declare the Submission Modality of an Evaluation (REQ-TEAM-01)

WHEN a section editor saves the grading scheme, the system SHALL persist for each evaluation a submission modality of `individual`, `team_free` or `team_fixed`, and SHALL treat any evaluation that declares none as `individual`.

WHEN the modality is `team_fixed`, the system SHALL persist the published team roster with the evaluation and SHALL reject a roster where a team has fewer than two members, exceeds the member ceiling, repeats a team name, or places one student in two teams of the same evaluation.

WHEN the modality is not `team_fixed`, the system SHALL persist an empty team roster, so that changing modality never leaves an invisible roster able to revive itself.

#### Scenario: A teacher publishes fixed teams

- **GIVEN** an authenticated teacher assigned to the section
- **WHEN** the teacher sets an evaluation to `team_fixed` and saves two teams of two students each
- **THEN** the audited gradebook SHALL store both teams with the evaluation
- **AND** the students of each team SHALL see that evaluation as a team submission

#### Scenario: A student placed in two teams is rejected

- **GIVEN** an evaluation in `team_fixed` modality
- **WHEN** the same student appears in two of its teams
- **THEN** the system SHALL reject the scheme with an error naming both teams
- **AND** SHALL NOT persist any part of the roster

### Requirement: Register One Team Submission for Every Member (REQ-TEAM-02)

WHEN a student uploads a file for an evaluation whose modality is `team_free` or `team_fixed`, the system SHALL write one submission receipt per team member in a single atomic commit, so that the whole team has a registered submission or none of them does.

The receipt SHALL be written by the server. A client SHALL NOT be able to create or modify the submission receipt of another student.

WHEN the modality is `team_fixed`, the system SHALL reject a submission whose declared members differ from the team published for the submitting student.

WHEN the modality is `team_free`, the submitting student SHALL declare the team members before the file leaves their device, choosing them from the section roster.

A team SHALL have between two and eight members, and the stored file path SHALL belong to the student who uploaded it.

#### Scenario: A representative submits for a team of three

- **GIVEN** a `team_free` evaluation and a student who selected two classmates
- **WHEN** the student uploads the report
- **THEN** Firestore SHALL contain three submission receipts pointing at the same stored file
- **AND** each receipt SHALL carry the same member list

#### Scenario: A student cannot forge a teammate's receipt

- **GIVEN** an authenticated student
- **WHEN** the client attempts to write a submission document whose `uid` is another student
- **THEN** the security rules SHALL deny the write

### Requirement: Record a Digital Receipt with a Content Hash (REQ-TEAM-03)

WHEN a submission is accepted, the system SHALL store the SHA-256 digest of the submitted file computed on the student's device, and SHALL show an abbreviated form of it to the student and to the teaching team.

WHEN the browser cannot compute a digest, the system SHALL store an empty digest rather than block the submission, and SHALL reject any value that is not a well-formed SHA-256 digest.

#### Scenario: The receipt proves what was submitted

- **GIVEN** an accepted submission
- **WHEN** the student or the teacher opens the receipt
- **THEN** the interface SHALL show the abbreviated digest with the complete value available on the element

### Requirement: Replicate Grade and Private Feedback Across the Team (REQ-TEAM-04)

WHEN a section editor records an official grade for a team evaluation, the system SHALL apply the same grade to every member of that team within a single transaction, and SHALL append one audit entry per affected student.

WHEN a section editor saves private feedback for a team evaluation, the system SHALL replicate that feedback to every member that already holds an official grade for the evaluation, within a single transaction.

Individual evaluations recorded in the same request SHALL NOT leave the student's own record.

An explicit grade sent for a member SHALL take precedence over the grade replicated from a teammate in the same request, and every affected student SHALL be written exactly once.

The submission receipt SHALL record which student uploaded the final version and when, and the review tray SHALL show it.

#### Scenario: One grade reaches the whole team

- **GIVEN** a team of three students with a submitted team evaluation
- **WHEN** the teacher records a 6.2 for one of them
- **THEN** the three grade records SHALL hold 6.2 for that evaluation
- **AND** the audit log SHALL hold one entry per student

#### Scenario: An individual evaluation is not replicated

- **GIVEN** a request that carries both a team evaluation and an individual one for the same student
- **WHEN** the grades are recorded
- **THEN** only the team evaluation SHALL reach the teammates

### Requirement: Consolidate Student Progress in Grades (REQ-EVAL-04)

The classroom SHALL NOT offer a progress tab with manually declared unit completion. Student progress SHALL be shown through evaluations, submissions and official grades.

WHEN a student opens a writable section, the system SHALL record a presence marker for that student, so that the teaching roster used by Participants and by the review tray covers every enrolled student rather than only those who simulated a grade.

#### Scenario: The classroom no longer offers a progress tab

- **GIVEN** any member of a section
- **WHEN** the classroom tabs are rendered
- **THEN** the tab set SHALL be portada, notas, cuestionarios, recursos externos and participantes

#### Scenario: A student who never simulates still appears in the roster

- **GIVEN** an enrolled student who has never recorded a grade simulation
- **WHEN** the student opens the classroom of an open period
- **THEN** the teaching roster SHALL include that student
