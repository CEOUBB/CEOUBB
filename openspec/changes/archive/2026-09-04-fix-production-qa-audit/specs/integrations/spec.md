## MODIFIED Requirements

### Requirement: Webhook Signature Verification

The system SHALL verify HMAC-SHA256 signatures on all incoming webhooks from external providers (GitHub, Linear) before processing payloads.
WHERE a webhook secret is not configured in the host environment, the route handler SHALL immediately respond with HTTP 404 Not Found to prevent revealing endpoint configuration status and prevent infinite redelivery retry loops from external services.

#### Scenario: Valid webhook signature

- **GIVEN** an incoming webhook with a valid signature header
- **WHEN** evaluated by the webhook route handler
- **THEN** it SHALL proceed to payload processing

#### Scenario: Invalid webhook signature

- **GIVEN** an incoming webhook with a missing or mismatched signature
- **WHEN** evaluated
- **THEN** it SHALL immediately reject the request with HTTP 401 Unauthorized

#### Scenario: Webhook secret unconfigured in environment

- **GIVEN** an incoming request to `/api/webhooks/github` or `/api/webhooks/linear`
- **WHEN** the host environment lacks the corresponding secret variable (`GITHUB_WEBHOOK_SECRET` or `LINEAR_WEBHOOK_SECRET`)
- **THEN** the handler SHALL respond with HTTP 404 Not Found
- **AND** SHALL NOT return HTTP 500 Internal Server Error
