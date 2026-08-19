# auth Specification

### Purpose

Gobierna la derivación de roles determinista por dominio institucional, la gestión de sesiones de usuario y la sincronización de la política de acceso a través de los 4 espejos institucionales.

### Requirements

#### Requirement: Role Derivation by Email Domain

The system SHALL deterministically derive user roles exclusively from their institutional email domain:

- `@alumnos.ubiobio.cl` $\rightarrow$ Student
- `@ubiobio.cl` $\rightarrow$ Teacher
- Any other domain MUST be rejected with HTTP 403 / Domain Error.

##### Scenario: Student signs in with valid institutional email

- **GIVEN** an unauthenticated user with email `estudiante@alumnos.ubiobio.cl`
- **WHEN** they authenticate via Firebase Google Auth
- **THEN** the system SHALL assign the role `Student`
- **AND** allow session creation

##### Scenario: Teacher signs in with valid institutional email

- **GIVEN** an unauthenticated user with email `profesor@ubiobio.cl`
- **WHEN** they authenticate via Firebase Google Auth
- **THEN** the system SHALL assign the role `Teacher`
- **AND** grant teacher portal capabilities

##### Scenario: External email rejected

- **GIVEN** an unauthenticated user with email `usuario@gmail.com`
- **WHEN** they attempt to authenticate
- **THEN** the system SHALL immediately reject the session with HTTP 403

#### Requirement: Superuser Owner Role Isolation

The system SHALL NOT derive the `Owner` (Superuser) role from an email address or domain. The `Owner` status MUST be an administrative state persisted in Turso (`users.role = 'owner'`) and projected to Firestore (`users/{uid}.role`).

##### Scenario: Owner access evaluation

- **GIVEN** an authenticated user whose persisted role in Turso is `owner`
- **WHEN** accessing administrative endpoints
- **THEN** the system SHALL authorize full administrative access

#### Requirement: Four-Mirror Synchronization

The system SHALL maintain strict synchronization of access policies across four mirrors:

1. `lib/access-policy.ts` (SSOT)
2. `firebase/firestore.rules`
3. `firebase/storage.rules`
4. `android/app/src/main/res/values/firebase.xml`

##### Scenario: Rule verification

- **WHEN** running security invariants check (`pnpm run verify:invariants`)
- **THEN** the system SHALL verify that domain checks and role derivations match identically across all mirrors
