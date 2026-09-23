## Purpose

Provide any terminal-capable coding agent with reproducible web scenarios, trustworthy verification results, and inspectable evidence without production access.

## ADDED Requirements

### Requirement: REQ-QA-01 On-demand agent interface

WHEN an agent invokes QA, the system SHALL support changed-area verification, explicit area or scenario selection, interactive exploration, and a complete run without requiring agent-specific integrations.

#### Scenario: Select a scenario

- **GIVEN** a registered scenario and installed prerequisites
- **WHEN** the agent selects that scenario from the command line
- **THEN** the runner executes only the selected scenario and required setup and records its reproduction command.

### Requirement: REQ-QA-02 Disposable local runtime

WHEN a local run starts, the system SHALL isolate its relational database, Firebase emulator data, ports, and artifacts from other runs, staging, and production; IF a target is not an explicitly validated local QA target, the system MUST abort before mutation.

#### Scenario: Reject a remote target

- **GIVEN** a local QA invocation with a remote database or emulator endpoint
- **WHEN** the target is validated
- **THEN** startup fails before data is written.

### Requirement: REQ-QA-03 Real application authentication and authorization

WHILE local integration scenarios execute, the system SHALL use institutional emulator identities, the ordinary application session exchange, original authorization rules, and matching relational and enrollment projections for account and section roles.

#### Scenario: Section isolation

- **GIVEN** two synthetic students with different active section memberships
- **WHEN** one attempts to access the other's section through the real application backend
- **THEN** access is denied and the foreign section remains unchanged.

### Requirement: REQ-QA-04 Complete semantic state inventory

The system SHALL maintain an executable inventory of every shipped web surface and applicable semantic state, including role-specific experiences, forms, overlays, loading, empty, populated, failed, and forbidden states. IF a required state lacks executable evidence, the coverage report MUST identify the gap and MUST NOT label the full catalog complete.

#### Scenario: Coverage gap detection

- **GIVEN** a required inventory entry without a completed scenario checkpoint
- **WHEN** the complete catalog report is generated
- **THEN** that entry is reported as uncovered rather than passed.

### Requirement: REQ-QA-05 Shared exploration and verification

WHEN an agent opens an interactive scenario, the system SHALL use the same identities, fixture data, and preparation used by automated verification and allow subsequent browser interaction and reset.

#### Scenario: Reproduce a state interactively

- **GIVEN** an automated scenario with known setup
- **WHEN** the agent opens it in exploration mode
- **THEN** the browser remains available in the prepared state with its environment and cleanup instructions reported.

### Requirement: REQ-QA-06 Functional and accessibility gates

WHEN functional or automated accessibility assertions fail, the system SHALL return a failing status with evidence. Existing application defects SHALL remain visible and reproducible without weakening tests or automatically repairing unrelated features.

#### Scenario: A pre-existing application defect

- **GIVEN** a valid scenario that reveals an application defect
- **WHEN** verification completes
- **THEN** the result is failed with expected and actual behavior and a reproduction command.

### Requirement: REQ-QA-07 Visual evidence and comparison

WHEN screenshots are requested, the system SHALL capture registered checkpoints with stable scenario, role, state, browser, and viewport identifiers and compare compatible references without making visual differences alone a blocking functional failure. Missing or incompatible references SHALL be explicit.

#### Scenario: A visual-only difference

- **GIVEN** a compatible reference and passing functional assertions
- **WHEN** the screenshot differs
- **THEN** the report includes the comparison for review and does not classify the functional scenario as failed.

### Requirement: REQ-QA-08 Browser matrix

The complete local catalog SHALL cover Chromium at widths 320, 390, 768, and 1440 pixels; critical journeys SHALL also run in Firefox and WebKit.

#### Scenario: Full matrix selection

- **GIVEN** a complete-run request
- **WHEN** the runner enumerates its selected scenarios
- **THEN** all four Chromium sizes and the two additional critical-journey browser projects are present.

### Requirement: REQ-QA-09 Evidence contract

WHEN a run finishes or fails, the system SHALL emit a machine-readable summary and human-readable evidence index identifying checks, scope, failures, missing coverage, environment errors, screenshots, and available traces, without exposing credentials.

#### Scenario: Startup failure

- **GIVEN** a missing prerequisite
- **WHEN** startup fails
- **THEN** an environment-error result explains the remedy and does not report application tests as passed.

### Requirement: REQ-QA-10 Conservative affected-area selection

WHEN changed-area verification is requested, the system SHALL include critical journeys and mapped affected areas; IF changes cannot be safely mapped or affect shared infrastructure, the system SHALL select the complete applicable suite.

#### Scenario: Unknown source file

- **GIVEN** a changed application source file outside registered area mappings
- **WHEN** affected verification is selected
- **THEN** the runner falls back to complete coverage instead of silently omitting the change.

### Requirement: REQ-QA-11 CI and external verification

The pipeline SHALL run affected and critical checks for PRs, complete checks nightly and on demand, and genuine external-provider checks only in an explicitly requested staging run with dedicated synthetic identities and destinations. Unavailable or manual provider verification MUST NOT count as a pass.

#### Scenario: External provider not configured

- **GIVEN** a staging integration that lacks required test credentials or human interaction
- **WHEN** the provider check is requested
- **THEN** the report identifies external verification as required and never substitutes a local simulation as proof of delivery.

### Requirement: REQ-QA-12 Agent instructions and scenario maintenance

The repository SHALL provide English instructions telling agents when and how to run QA after changes, inspect evidence, add scenarios for new functionality, preserve locked tests, and distinguish local, simulated, staging, failed, and uncovered results.

#### Scenario: A new feature is introduced

- **GIVEN** an agent adding a web feature
- **WHEN** it follows repository completion instructions
- **THEN** it registers applicable states and executable checks and reports the resulting QA evidence before declaring the feature verified.
