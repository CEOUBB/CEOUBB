## ADDED Requirements

### Requirement: Separate Institutional Capacity Fixture (REQ-STG-07)

WHERE a full institutional capacity test is explicitly dispatched, the staging toolchain SHALL generate the 12,000-student capacity fixture through a separate idempotent process without increasing the bounds of the ordinary staging seed.

#### Scenario: Ordinary staging is reseeded after a capacity run

- **GIVEN** institutional capacity fixtures exist with reserved `load-` identifiers
- **WHEN** `pnpm run staging:seed` executes
- **THEN** its ordinary fixture SHALL remain below the REQ-STG-06 limits
- **AND** no production data SHALL be copied into either fixture
