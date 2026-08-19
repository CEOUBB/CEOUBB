# database Specification

### Purpose

Gobierna el particionamiento dual de datos: Turso/libSQL con Drizzle ORM como Sistema de Registro (SoR) relacional transaccional, y Cloud Firestore como proyección operacional en tiempo real.

### Requirements

#### Requirement: Relational Academic System of Record

The system SHALL persist all relational academic structures (`facultades`, `carreras`, `asignaturas`, `secciones`, `inscripciones`, `usuarios`) in Turso/libSQL managed via Drizzle ORM.

##### Scenario: Enrolling a student

- **GIVEN** an enrollment mutation
- **WHEN** executed in the backend
- **THEN** it SHALL write to Turso within an ACID transaction
- **AND** update the Firestore enrollment projection

#### Requirement: Mandatory Query Bounds

The system SHALL enforce explicit `.limit()` bounds and indexed pagination on all database queries against Turso and Firestore.

##### Scenario: Fetching course listings

- **WHEN** querying courses or sections
- **THEN** the query MUST include a `.limit(N)` clause to prevent unbounded full-table scans
