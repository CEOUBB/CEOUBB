# academic Specification

### Purpose

Gobierna la estructura académica relacional en Turso/libSQL (facultades, carreras, asignaturas, secciones e inscripciones) y el aislamiento estricto de datos de cursos mediante proyecciones de membresía en Firestore.

### Requirements

#### Requirement: Course Identity as Section

The system SHALL treat every course exclusively as a formal **Section** (Subject $\times$ Academic Period $\times$ Section identifier), never as a plain unstructured string.

##### Scenario: Section identification

- **GIVEN** a course offering
- **WHEN** persisted or queried
- **THEN** it MUST contain `asignaturaId`, `periodo` and `seccion` fields

#### Requirement: Section Isolation and Membership Projection

The system SHALL grant access to course data IF AND ONLY IF an active enrollment projection exists at `enrollments/{uid}/sections/{seccionId}`.

##### Scenario: Enrolled student reads course materials

- **GIVEN** a student with an active projection at `enrollments/{uid}/sections/INF-2026-1-1`
- **WHEN** reading posts or materials in `courses/INF-2026-1-1`
- **THEN** access SHALL be granted by Firestore and Storage rules

##### Scenario: Unenrolled student blocked

- **GIVEN** a student without an active projection for `INF-2026-1-2`
- **WHEN** requesting posts in `courses/INF-2026-1-2`
- **THEN** access SHALL be rejected with permission denied

#### Requirement: No Collection-Group Wildcard Reads

The system SHALL prohibit wildcard collection-group reads (`match /{path=**}/...`) that bypass section boundary checks.

##### Scenario: Security rule compilation

- **WHEN** Firestore security rules are evaluated
- **THEN** every subcollection query MUST validate the caller's enrollment projection with `exists()`
