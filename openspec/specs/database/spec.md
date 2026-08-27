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

#### Requirement: Indexed Query Equality and Batch Multi-Row Persistence (REQ-DB-PERF-01)

The system SHALL perform indexed lookups using direct column equality without scalar function wrappers and SHALL execute bulk enrollment mutations using multi-row batch inserts within relational transactions.

##### Scenario: Querying by unique indexed course code or user email

- **GIVEN** an indexed unique column (`asignaturas.codigo` or `users.email`)
- **WHEN** looking up records during course creation or assistant assignment
- **THEN** the query MUST match the column directly with `eq()` so the database engine utilizes the B-Tree index without full table scans

##### Scenario: Reconciling roster from external Moodle import

- **GIVEN** a list of participants to enroll or queue
- **WHEN** committing the transaction in Turso
- **THEN** the system MUST insert participants in multi-row batches rather than single-row sequential HTTP roundtrips

#### Requirement: Active Enrollment Composite Indexing (REQ-DB-PERF-02)

The system SHALL maintain a composite index on `matriculas(usuario_id, estado)` to accelerate active enrollment resolution for historical students.

##### Scenario: Resolving active course enrollments for a student

- **GIVEN** a student identity with historical course enrollments
- **WHEN** fetching active sections at portal initialization
- **THEN** the query SHALL utilize the `(usuario_id, estado)` composite index to filter active records without scanning inactive history
