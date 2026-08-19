# integrations Specification

### Purpose

Gobierna las integraciones con servicios externos de automatización y notificaciones: bot de Discord para bridges de agentes y standups diarios, webhooks de Linear para issues y webhooks de GitHub.

### Requirements

#### Requirement: Webhook Signature Verification

The system SHALL verify HMAC-SHA256 signatures on all incoming webhooks from external providers (GitHub, Linear) before processing payloads.

##### Scenario: Valid webhook signature

- **GIVEN** an incoming webhook with a valid signature header
- **WHEN** evaluated by the webhook route handler
- **THEN** it SHALL proceed to payload processing

##### Scenario: Invalid webhook signature

- **GIVEN** an incoming webhook with a missing or mismatched signature
- **WHEN** evaluated
- **THEN** it SHALL immediately reject the request with HTTP 401 Unauthorized

#### Requirement: Multi-Agent Discord Bridge

The system SHALL support agentic bridge routing (Claude, Codex, Antigravity) via Discord slash commands and standup notifications.

##### Scenario: Agent interaction

- **WHEN** a Discord interaction is received on `/api/discord/interactions`
- **THEN** it SHALL validate Discord cryptographic signatures and dispatch response payloads
