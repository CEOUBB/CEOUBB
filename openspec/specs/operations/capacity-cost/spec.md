# operations/capacity-cost Specification

## Purpose

Governs the institutional capacity envelope, recurring infrastructure cost per active student and service-continuity objectives that CEOUBB must validate before claiming university-scale readiness.

## Requirements

### Requirement: Institutional Population Envelope (REQ-OPS-CAP-01)

The system SHALL be designed and validated for 12,000 active students, 15,000 total identities, 3,000 active section-periods and 72,000 active student-section enrollments per semester.

#### Scenario: A representative institutional dataset is prepared

- **GIVEN** a staging capacity test dataset
- **WHEN** its academic population is counted
- **THEN** it SHALL contain 12,000 active students
- **AND** it SHALL contain 3,000 active sections and 72,000 active enrollments
- **AND** total identities SHALL reach 15,000 with teachers and staff

### Requirement: Exam-Week Concurrency (REQ-OPS-CAP-02)

WHILE validating exam-week capacity, the test harness SHALL establish 3,000 simultaneous authenticated student sessions within at most 10 minutes and SHALL sustain them for at least 30 minutes.

#### Scenario: Exam-week peak is exercised

- **GIVEN** the representative staging dataset
- **WHEN** the exam-week test reaches steady state
- **THEN** 3,000 student sessions SHALL remain active concurrently for 30 minutes
- **AND** the ramp SHALL NOT exceed 10 minutes

### Requirement: Bounded Student Portal Read Budget (REQ-OPS-CAP-03)

WHEN an ordinary student enrolled in up to eight sections opens the portal, the system SHALL consume no more than 200 billed Firestore document reads for the initial portal state, including security-rule dependent reads.

#### Scenario: An eight-section student opens the portal

- **GIVEN** a student with eight active section enrollments
- **WHEN** the initial portal state settles in staging
- **THEN** measured Firestore document reads SHALL be at most 200
- **AND** no document from an unrelated section SHALL be read

### Requirement: Infrastructure Cost Guardrail (REQ-OPS-COST-01)

The recurring infrastructure model SHALL use CLP 450 per active student-year as its base case, SHALL warn at CLP 750 and MUST block institutional expansion when the annualized projection exceeds CLP 1,000 per active student-year.

#### Scenario: The measured run rate exceeds the ceiling

- **GIVEN** a cost report that excludes promotional credits and uses unique active students as denominator
- **WHEN** its annualized infrastructure cost exceeds CLP 1,000 per student
- **THEN** institutional expansion MUST stop
- **AND** optimization or provider remediation SHALL be completed before repeating the decision

### Requirement: Reproducible Cost Measurement (REQ-OPS-COST-02)

WHEN each academic semester closes, the operations team SHALL recompute cost per active student using all recurring infrastructure invoices, the budgeting rate recorded by the model and the number of unique students with an active enrollment; it SHALL update provider prices at least annually.

#### Scenario: Semester cost is reported

- **GIVEN** provider invoices and the active-enrollment population for a completed semester
- **WHEN** operations publishes the cost review
- **THEN** promotional credits SHALL NOT reduce the sustainable run rate
- **AND** teachers, staff and service accounts SHALL NOT increase the student denominator

### Requirement: Product Availability Objective (REQ-OPS-RES-01)

The service SHALL target 99.9% monthly product availability, excluding at most two hours of announced maintenance per semester scheduled outside declared exam and grade-publication windows.

#### Scenario: A 30-day month is evaluated

- **GIVEN** a 30-day reporting month
- **WHEN** unplanned outage intervals are summed
- **THEN** they SHALL NOT exceed 43 minutes and 12 seconds

### Requirement: Academic Recovery Objectives (REQ-OPS-RES-02)

IF a critical incident requires restoration, THEN the recovery process SHALL restore critical academic service within four hours and SHALL lose no more than one hour of academic data; non-critical historical files SHOULD be restored within 24 hours.

#### Scenario: A restoration drill is completed

- **GIVEN** a staged failure with timestamped academic records
- **WHEN** the documented recovery runbook is executed
- **THEN** verified critical service SHALL return within four hours
- **AND** the newest missing academic record SHALL be no more than one hour older than the incident

### Requirement: Evidence Before Scale Claim (REQ-OPS-VERIFY-01)

IF the capacity test and restoration drill have not passed the published criteria in staging, THEN CEOUBB SHALL NOT claim that the institutional capacity, cost ceiling, RPO or RTO is demonstrated.

#### Scenario: Targets are documented but untested

- **GIVEN** this operational baseline
- **WHEN** no passing staging evidence is attached
- **THEN** reports SHALL label the values as targets rather than achieved guarantees

### Requirement: Critical Asset Payload and Font Optimization (REQ-OPS-PERF-01)

The system SHALL restrict initial font downloads to actively used institutional weights and SHALL prevent render-blocking formula styling on public non-mathematical views.

#### Scenario: Loading public landing and authentication screens

- **WHEN** a user visits `/`, `/privacidad`, `/terminos` or initial dashboard
- **THEN** the initial HTML document SHALL NOT include render-blocking KaTeX global stylesheet tags
- **AND** the Google Font preload for Merriweather SHALL be restricted to the active display weight (`700`)

### Requirement: Non-Blocking Webhook Processing and Deferred Integrations (REQ-OPS-PERF-02)

The system SHALL process external webhooks and interactive bots with parallel network requests and asynchronous non-blocking acknowledgments to respect third-party platform deadlines.

#### Scenario: Executing automated pull request review from Discord

- **GIVEN** a pull request review trigger from Discord
- **WHEN** fetching pull request metadata, diff and comments
- **THEN** all three GitHub API calls MUST be executed concurrently via `Promise.all`
- **AND** the Discord interaction response SHALL be acknowledged within the 3,000ms platform limit

### Requirement: Fail-Closed Capacity Target (REQ-OPS-LOAD-01)

The capacity harness SHALL reject every target except the canonical Cloudflare, Firebase and Turso staging resources before it creates identities, fixtures, sessions or load.

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

WHEN an authenticated virtual student executes an iteration, the harness SHALL exercise Cloudflare navigation, Turso-backed enrollment/catalog routes, Firestore announcements, grade and quiz reads, and SHALL limit quiz-draft writes to at most ten percent of iterations.

#### Scenario: A student completes a load iteration

- **GIVEN** a synthetic student enrolled in six sections with a published synthetic quiz
- **WHEN** the student navigates the portal and opens one enrolled section
- **THEN** the iteration SHALL read only its permitted catalog, posts, gradebook, grade, quiz and draft
- **AND** any write SHALL target only that student's existing synthetic draft

### Requirement: Provider-Level Evidence (REQ-OPS-LOAD-04)

WHEN a capacity run completes, the evidence pipeline SHALL report Cloudflare/Turso/Firestore latency, HTTP p95 and p99, 5xx rate, initial authentication attempt failures, authorization failures during authenticated work, distinct authenticated sessions, peak VUs, steady-state duration, Firestore document reads/writes and Turso request volume for the measured interval; it SHOULD add Turso row counters when platform telemetry is configured.

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

WHERE the capacity workflow runs, it SHALL require an explicit staging confirmation, SHALL use only synthetic data, SHALL keep credentials out of artifacts and logs, and SHALL remove every local temporary credential even after a failed load shard.

#### Scenario: A shard fails during steady state

- **GIVEN** local temporary Firebase credentials
- **WHEN** k6 exits with a threshold or runtime failure
- **THEN** cleanup SHALL still remove the local credential file
- **AND** the uploaded artifact SHALL contain only non-secret summaries and evidence
