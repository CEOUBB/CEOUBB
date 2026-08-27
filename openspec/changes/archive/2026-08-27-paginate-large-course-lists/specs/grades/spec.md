## ADDED Requirements

### Requirement: Batch Partitioning for Large Section Grade Operations (REQ-PERF-02)

WHEN persisting bulk grade updates or audited score mutations for a section, the system SHALL partition operations into sequential chunks of no more than 400 operations per batch, guaranteeing that Firestore transactions and batch writes remain strictly within the 500-operation platform limit.

#### Scenario: Bulk score persistence in a 350-student section

- **GIVEN** a section with 350 enrolled students needing official score updates
- **WHEN** the client invokes `saveSectionScores`
- **THEN** the operations SHALL be partitioned into waves with maximum 100 rows per audited call and 400 operations per batch
- **AND** all 350 student grade records SHALL commit without exceeding Firestore batch limits
