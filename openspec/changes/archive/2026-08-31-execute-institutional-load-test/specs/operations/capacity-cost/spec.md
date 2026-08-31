## ADDED Requirements

### Requirement: Fail-Closed Capacity Target (REQ-OPS-LOAD-01)

The capacity harness SHALL reject every target except the canonical Vercel, Firebase and Turso staging resources before it creates identities, fixtures, sessions or load.

#### Scenario: A production resource is supplied

- **GIVEN** a capacity run configuration
- **WHEN** the URL resolves to `ceoubb.com`, Firebase resolves to `centro-de-estudio-ubb`, or the Turso host lacks `ceoubb-staging`
- **THEN** the harness SHALL exit before its first remote write
- **AND** the error SHALL identify the invalid variable without revealing its credential

### Requirement: Distributed Institutional Load Profile (REQ-OPS-LOAD-02)

WHILE executing the full capacity profile, the harness SHALL distribute exactly 3,000 authenticated student sessions across at least six independent generators, SHALL synchronize those generators through one shared run barrier, SHALL ramp within ten minutes and SHALL maintain the aggregate full concurrency for at least 30 overlapping minutes against the representative staging dataset.

#### Scenario: The full profile reaches steady state

- **GIVEN** 12,000 synthetic students, 3,000 sections and 72,000 active enrollments in staging
- **WHEN** all six load generators reach their target
- **THEN** each generator SHALL maintain 500 distinct authenticated sessions
- **AND** each generator SHALL sustain a 1,860 second plateau
- **AND** aggregate steady state SHALL contain 3,000 sessions for at least 1,800 overlapping seconds

### Requirement: Representative Student Workload (REQ-OPS-LOAD-03)

WHEN an authenticated virtual student executes an iteration, the harness SHALL exercise Vercel navigation, Turso-backed enrollment/catalog routes, Firestore announcements, grade and quiz reads, and SHALL limit quiz-draft writes to at most ten percent of iterations.

#### Scenario: A student completes a load iteration

- **GIVEN** a synthetic student enrolled in six sections with a published synthetic quiz
- **WHEN** the student navigates the portal and opens one enrolled section
- **THEN** the iteration SHALL read only its permitted catalog, posts, gradebook, grade, quiz and draft
- **AND** any write SHALL target only that student's existing synthetic draft

### Requirement: Provider-Level Evidence (REQ-OPS-LOAD-04)

WHEN a capacity run completes, the evidence pipeline SHALL report Vercel/Turso/Firestore latency, HTTP p95 and p99, 5xx rate, initial authentication attempt failures, authorization failures during authenticated work, distinct authenticated sessions, peak VUs, steady-state duration, Firestore document reads/writes and Turso request volume for the measured interval; it SHOULD add Turso row counters when platform telemetry is configured.

#### Scenario: Six shard summaries are consolidated

- **GIVEN** one machine-readable summary from each generator and provider counter snapshots
- **WHEN** the evidence report is built
- **THEN** aggregate metrics SHALL preserve total counts and SHALL use the worst shard percentile as a conservative distributed gate
- **AND** exactly 3,000 distinct sessions SHALL have completed authentication
- **AND** HTTP 5xx and total unexpected response rates SHALL each remain below 0.1 percent while authorization failures SHALL remain zero
- **AND** missing provider telemetry or required latency percentiles SHALL be represented as unavailable rather than zero

### Requirement: Measured Cost Decision (REQ-OPS-LOAD-05)

WHEN provider counters and the load result are available, the reporter SHALL annualize recurring infrastructure cost with versioned assumptions, SHALL exclude promotional credits and MUST return `FAIL` above CLP 1,000 per active student-year.

#### Scenario: Evidence is incomplete or exceeds the ceiling

- **GIVEN** a completed load attempt
- **WHEN** a required Firestore counter is unavailable or the annualized projection exceeds the ceiling
- **THEN** the verdict SHALL be `INCOMPLETE` or `FAIL` respectively
- **AND** the dossier SHALL NOT claim institutional capacity is demonstrated

### Requirement: Reproducible and Secret-Safe Execution (REQ-OPS-LOAD-06)

WHERE the capacity workflow runs, it SHALL require an explicit staging confirmation, SHALL use only synthetic data, SHALL keep credentials out of artifacts and logs, and SHALL revoke every temporary Vercel bypass even after a failed load shard.

#### Scenario: A shard fails during steady state

- **GIVEN** an ephemeral Vercel bypass and local Firebase credentials
- **WHEN** k6 exits with a threshold or runtime failure
- **THEN** cleanup SHALL still revoke the bypass and remove the local credential file
- **AND** the uploaded artifact SHALL contain only non-secret summaries and evidence
