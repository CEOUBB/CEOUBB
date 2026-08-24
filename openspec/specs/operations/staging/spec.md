# operations/staging Specification

## Purpose

Definir el aislamiento, los datos sintéticos y las puertas de promoción del ambiente staging de CEOUBB antes de cualquier cambio productivo.

## Requirements

### Requirement: Fail-Closed Environment Isolation (REQ-STG-01)

The staging toolchain SHALL require an explicit staging environment marker, a Firebase project different from `centro-de-estudio-ubb`, and a Turso URL identified as staging before performing any write.

#### Scenario: A staging command receives a production target

- **GIVEN** a seed or deployment command marked as staging
- **WHEN** its Firebase project or Turso URL resolves to production
- **THEN** the command SHALL fail before opening a write connection
- **AND** its error SHALL identify the invalid variable without revealing credentials

### Requirement: Idempotent Synthetic Dataset (REQ-STG-02)

WHEN the staging seed runs, the system SHALL apply the current Drizzle migrations and SHALL converge Turso and Firestore to a deterministic synthetic fixture without copying production data.

#### Scenario: The seed is repeated

- **GIVEN** an empty staging environment with valid dedicated credentials
- **WHEN** the same seed version runs twice
- **THEN** both executions SHALL succeed
- **AND** the second execution SHALL NOT duplicate users, sections, enrollments, posts or evaluations
- **AND** every fixture SHALL be recognizable as synthetic and contain no real personal data

### Requirement: Same-Commit Promotion Gate (REQ-STG-03)

WHEN a production infrastructure promotion is requested, the release workflow SHALL first verify, deploy, seed and smoke-test staging for the same Git commit and MUST block production if any staging step fails.

#### Scenario: Staging rejects a rules deployment

- **GIVEN** a promotion request for commit `abc123`
- **WHEN** Firebase staging rejects its rules or the seed fails
- **THEN** no production deployment job SHALL run
- **AND** the failed commit SHALL retain no passing promotion evidence

### Requirement: Preview Uses Staging Services (REQ-STG-04)

WHERE a Vercel Preview deployment is built for CEOUBB, the application SHALL use the staging Turso database and the staging Firebase web application through the stable OAuth-authorized alias `ceoubb-staging.vercel.app`, while the production deployment SHALL retain only production identifiers.

#### Scenario: Preview configuration is resolved

- **GIVEN** a Preview build with its environment variables
- **WHEN** Firebase and database configuration is evaluated
- **THEN** the Firebase project SHALL equal `centro-de-estudio-ubb-staging`
- **AND** the Turso host SHALL be identified as `ceoubb-staging`
- **AND** the workflow SHALL update `ceoubb-staging.vercel.app` to the new Preview deployment
- **AND** neither client nor server SHALL fall back to a mixed pair of environments

### Requirement: Regional Security Parity (REQ-STG-05)

The staging Firebase project SHALL host its default Firestore database in `southamerica-west1` and SHALL deploy the same Firestore rules, Storage rules, indexes and Cloud Functions source used for production.

#### Scenario: Staging infrastructure is inventoried

- **GIVEN** the provisioned staging project
- **WHEN** its database and release configuration are inspected
- **THEN** the database location SHALL be `southamerica-west1`
- **AND** the release SHALL reference repository files under `firebase/`
- **AND** no staging-only rule relaxation SHALL exist

### Requirement: Bounded Fixture Base (REQ-STG-06)

The ordinary staging seed SHALL remain below 20 users, 20 sections and 200 remote writes per execution; institutional load fixtures SHALL be generated only by the separate capacity-test process.

#### Scenario: The fixture manifest is validated

- **GIVEN** the committed ordinary seed manifest
- **WHEN** its entities and planned remote writes are counted
- **THEN** every bound SHALL pass
- **AND** the manifest SHALL NOT claim the 12,000-student capacity target is demonstrated
