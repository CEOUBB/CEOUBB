## Purpose

Proporciona verificación de desafío antibot invisible, accesible y nativa de Cloudflare en formularios y endpoints públicos de CEOUBB mediante la integración declarativa de Cloudflare Turnstile.

## ADDED Requirements

### Requirement: Declarative Non-Intrusive Bot Challenge Verification (REQ-TURN-01)

WHEN an unauthenticated or public user accesses a submission form (such as the support contact form at `/contacto`), the system SHALL render a declarative Turnstile challenge widget that obtains an authorization token without presenting disruptive interactive puzzles to legitimate users.

#### Scenario: Silent token acquisition on contact form load

- **GIVEN** a user visiting the `/contacto` support page
- **WHEN** the form loads in the browser
- **THEN** the Turnstile component SHALL acquire a valid verification token asynchronously
- **AND** the token SHALL be automatically attached to the submission payload sent to `/api/soporte`

#### Scenario: Backend token validation failure handling

- **GIVEN** a submission request containing an invalid or rejected Turnstile token
- **WHEN** the backend verifies the token against Cloudflare siteverify API
- **THEN** the submission SHALL be rejected with HTTP 403 / Bot Challenge Failed
- **AND** the client UI SHALL prompt the user to retry without losing previously typed field contents

### Requirement: Token Expiration and Error Auto-Recovery (REQ-TURN-02)

WHEN a Turnstile verification token expires prior to form submission or encounters a transient network error, the system SHALL automatically refresh or reset the challenge widget to obtain a fresh token without requiring manual page reload.

#### Scenario: Automatic reset on token expiration

- **GIVEN** a user who has stayed on the contact form until the Turnstile token expires
- **WHEN** the expiration event triggers
- **THEN** the system SHALL reset the widget state and automatically request a new verification token
- **AND** the form submission button SHALL remain disabled until a valid token is re-acquired

### Requirement: Theme Consistency and Layout Shift Prevention (REQ-TURN-03)

WHILE the Turnstile widget container is mounting or resolving challenges, the system SHALL adapt to the platform light or dark theme and maintain a stable layout footprint that prevents Cumulative Layout Shift (CLS).

#### Scenario: Visual stability during widget mount

- **GIVEN** a user on mobile or desktop viewport
- **WHEN** the Turnstile widget is inserted into the form DOM
- **THEN** the placeholder container SHALL reserve the required dimensions in advance
- **AND** no layout displacement of surrounding input fields or submit buttons SHALL occur
