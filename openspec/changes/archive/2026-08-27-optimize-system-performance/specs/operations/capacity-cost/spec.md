## ADDED Requirements

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
