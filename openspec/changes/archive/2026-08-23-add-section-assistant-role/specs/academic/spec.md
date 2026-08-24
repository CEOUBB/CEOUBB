## ADDED Requirements

### Requirement: Section-Scoped Assistant Identity

**REQ-ASST-01:** WHEN an authenticated student holds an active enrollment with role `assistant`, the system SHALL grant that role only inside the matching section and SHALL preserve the account role `student` and every other section membership unchanged.

#### Scenario: The same student assists one section only

- **GIVEN** a global `student` account has role `assistant` in section `MAT-2026-2-1` and role `student` in section `FIS-2026-2-2`
- **WHEN** the account opens both classrooms
- **THEN** `MAT-2026-2-1` SHALL identify the account as «Ayudante»
- **AND** `FIS-2026-2-2` and the account menu SHALL continue to identify the account as «Estudiante»

### Requirement: Bounded Section Membership Transport

**REQ-ASST-02:** WHEN an authenticated session loads active enrollments, the server SHALL return a bounded list of `{ sectionId, role }` memberships derived from Turso and the client SHALL reject unknown roles, malformed section identifiers and duplicate section entries before computing capabilities.

#### Scenario: A malformed membership fails closed

- **GIVEN** a session response contains one valid assistant membership and malformed or unknown memberships
- **WHEN** the portal parses the response
- **THEN** it SHALL retain only the valid membership
- **AND** malformed entries SHALL grant no content or teaching capability

### Requirement: Assistant Content Authoring

**REQ-ASST-03:** WHILE an active section membership has role `assistant`, the system SHALL allow the member to create classroom publications and upload course material, and SHALL allow updates or deletion only when the stored author or Storage path belongs to that member.

#### Scenario: An assistant uploads material in the assigned section

- **GIVEN** an authenticated student with an active `assistant` membership in `MAT-2026-2-1`
- **WHEN** the student uploads a valid PDF and its material publication
- **THEN** Storage and Firestore SHALL allow both writes under `courses/MAT-2026-2-1`
- **AND** the material SHALL record the assistant as its author

#### Scenario: An assistant attempts to alter another author's material

- **GIVEN** a publication or file belongs to another member of the section
- **WHEN** the assistant attempts to update or delete it
- **THEN** Firestore or Storage SHALL reject the operation

### Requirement: Assistant Least Privilege

**REQ-ASST-04:** IF an assistant attempts to read aggregated progress, read or write another student's grades, edit gradebook metadata, or configure the section live-class link, THEN the system SHALL deny the operation and the portal SHALL keep those teacher-only controls and listeners disabled.

#### Scenario: Assistant remains a student for assessment data

- **GIVEN** an authenticated assistant has opened the assigned section
- **WHEN** the classroom initializes assessment and progress state
- **THEN** it SHALL subscribe only to that member's own grade and progress documents
- **AND** Firestore SHALL reject direct teacher-only reads and writes

### Requirement: Owner and Teaching-Team Compatibility

**REQ-ASST-05:** The system SHALL preserve full section capabilities for `owner`, active `teacher` memberships and active `coordinator` memberships while applying content-only capability to `assistant` and read-only classroom capability to `student`.

#### Scenario: Permission matrix remains deterministic

- **WHEN** capabilities are evaluated for every account and section-role combination
- **THEN** `owner`, `teacher` and `coordinator` SHALL retain teaching capabilities
- **AND** only `assistant`, `teacher`, `coordinator` and `owner` SHALL receive content-authoring capability
- **AND** `student` SHALL receive neither capability
