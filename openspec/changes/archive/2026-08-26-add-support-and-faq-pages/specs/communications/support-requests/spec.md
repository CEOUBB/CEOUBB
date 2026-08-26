## Purpose

Governs the public support intake pipeline of Centro de Estudio UBB: the single validation schema shared between browser and server, the abuse controls that make an unauthenticated write endpoint safe, the durable record written before delivery is attempted, the provider-agnostic delivery of each request to the institutional mailbox `contacto@ceoubb.com`, and the honest degraded behavior when no mail provider is configured.

## ADDED Requirements

### Requirement: Single Shared Submission Schema (REQ-SUP-01)

The platform SHALL define the support request shape exactly once, as a Zod schema in `lib/support-request.ts`, and both the browser form and the server route handler SHALL validate against that same schema.

The schema SHALL bound every field: `nombre` 2–120 characters, `email` a valid address of at most 254 characters normalized to lower case, `categoria` one of `soporte-tecnico`, `sugerencia`, `reporte-error`, `duda-academica`, `asunto` 4–160 characters, and `mensaje` 20–4000 characters. Every string field SHALL be trimmed before validation.

The server SHALL revalidate every request regardless of client-side validation, and SHALL NOT trust any field, bound or verdict produced by the browser.

#### Scenario: A submission omits a required field

- **GIVEN** a POST to `/api/soporte` whose body has no `mensaje`
- **WHEN** the route handler validates the body
- **THEN** the response SHALL be HTTP 400
- **AND** the body SHALL name the invalid field
- **AND** no row SHALL be written to `solicitudes_soporte`
- **AND** no message SHALL be delivered

#### Scenario: A submission exceeds a field bound

- **GIVEN** a POST to `/api/soporte` whose `mensaje` is 4001 characters
- **WHEN** the route handler validates the body
- **THEN** the response SHALL be HTTP 400
- **AND** no row SHALL be written to `solicitudes_soporte`

#### Scenario: A client bypasses browser validation

- **GIVEN** a request crafted outside the form and sent directly to `/api/soporte`
- **WHEN** its body fails the schema
- **THEN** the server SHALL reject it with the same verdict it would apply to a form submission

### Requirement: Bounded Request Body (REQ-SUP-02)

The route handler SHALL reject any request body larger than 8 KB before parsing it as JSON, and SHALL reject any request whose content type is not JSON.

#### Scenario: An oversized body is submitted

- **GIVEN** a POST to `/api/soporte` carrying a 2 MB body
- **WHEN** the route handler inspects the request
- **THEN** the response SHALL be HTTP 413
- **AND** the handler SHALL NOT parse the body
- **AND** no database query SHALL be issued

### Requirement: Automated Submission Controls (REQ-SUP-03)

The support endpoint is public and unauthenticated, and SHALL therefore apply three controls before any database write.

The submission SHALL carry a honeypot field that is hidden from layout and from assistive technology and never announced as a form control; a request in which that field is non-empty SHALL be rejected. The submission SHALL be rejected when less than three seconds elapsed between the form being presented and the submission being sent. Both rejections SHALL be indistinguishable from success in the response body, so an automated client learns nothing from the difference.

#### Scenario: The honeypot field is populated

- **GIVEN** a POST to `/api/soporte` whose honeypot field contains any text
- **WHEN** the route handler evaluates the submission
- **THEN** no row SHALL be written to `solicitudes_soporte`
- **AND** no message SHALL be delivered
- **AND** the response SHALL be indistinguishable from an accepted submission

#### Scenario: A submission arrives faster than a person can type it

- **GIVEN** a POST to `/api/soporte` reporting less than three seconds since the form was presented
- **WHEN** the route handler evaluates the submission
- **THEN** no row SHALL be written to `solicitudes_soporte`
- **AND** the response SHALL be indistinguishable from an accepted submission

#### Scenario: A person using assistive technology completes the form

- **GIVEN** a screen reader user navigating the support form
- **WHEN** the form fields are announced
- **THEN** the honeypot field SHALL NOT be announced as a form control
- **AND** the user SHALL be able to submit successfully without encountering it

### Requirement: Durable Rate Limiting (REQ-SUP-04)

The platform SHALL limit support submissions to at most 3 per hour for a given client IP hash and at most 20 per hour in total, evaluated by a bounded, indexed query over `solicitudes_soporte` rather than by process-local memory.

The counting query SHALL use the composite index on IP hash and creation time and SHALL carry an explicit `.limit()`.

#### Scenario: A single client exceeds its hourly allowance

- **GIVEN** a client IP hash with 3 support requests recorded in the last hour
- **WHEN** a fourth request arrives from the same IP hash
- **THEN** the response SHALL be HTTP 429
- **AND** no row SHALL be written to `solicitudes_soporte`
- **AND** no message SHALL be delivered

#### Scenario: The limit is enforced across serverless instances

- **GIVEN** two requests from the same IP hash served by different serverless instances
- **WHEN** the hourly allowance is already exhausted
- **THEN** both instances SHALL reach the same verdict
- **AND** the verdict SHALL NOT depend on which instance served an earlier request

### Requirement: Client Address Is Stored Only as a Peppered Hash (REQ-SUP-05)

The platform SHALL store the client IP address of a support submission only as `SHA-256(ip + server pepper)` and SHALL NOT persist, log, or transmit the raw address.

#### Scenario: A support request is recorded

- **GIVEN** a valid support submission from a known IP address
- **WHEN** the row is written to `solicitudes_soporte`
- **THEN** the stored `ip_hash` SHALL NOT equal the address in any readable form
- **AND** no column, log entry or outbound message SHALL contain the raw address

### Requirement: Institutional Domain Is Annotated, Not Enforced (REQ-SUP-06)

The support endpoint SHALL accept any syntactically valid email address, and SHALL derive the declared role by calling `roleForEmail()` from `lib/access-policy.ts`, storing `null` when the domain is not institutional.

The endpoint SHALL NOT reimplement domain parsing, and SHALL NOT reject a submission on the grounds of its email domain.

WHERE the address is not institutional, the form SHALL show a non-blocking notice stating that the message will still be answered but that enrollment cannot be verified from that address.

#### Scenario: A student writes from a personal address because they cannot access their institutional one

- **GIVEN** a support submission from `persona@gmail.com`
- **WHEN** the route handler evaluates the submission
- **THEN** the submission SHALL be accepted
- **AND** the stored declared role SHALL be null
- **AND** the response SHALL NOT be HTTP 403

#### Scenario: A teacher writes from their institutional address

- **GIVEN** a support submission from `docente@ubiobio.cl`
- **WHEN** the route handler evaluates the submission
- **THEN** the stored declared role SHALL be `teacher`
- **AND** that role SHALL be the value returned by `roleForEmail()`

#### Scenario: The domain policy changes

- **GIVEN** a change to the institutional domains in `lib/access-policy.ts`
- **WHEN** the support endpoint derives a declared role
- **THEN** it SHALL reflect the new policy without any edit to the support code

### Requirement: The Record Is Written Before Delivery Is Attempted (REQ-SUP-07)

The platform SHALL persist an accepted support request to `solicitudes_soporte` with state `pendiente` before invoking the mail transport, and SHALL update that row to `enviado` with a delivery timestamp on success or to `fallido` with the failure reason on error.

A delivery failure SHALL NOT discard the request and SHALL NOT cause the row to be deleted or rolled back.

#### Scenario: The mail provider is unreachable

- **GIVEN** a valid support submission
- **AND** a mail provider that returns an error
- **WHEN** delivery is attempted
- **THEN** the row SHALL remain in `solicitudes_soporte` with state `fallido`
- **AND** the recorded reason SHALL identify the failure without revealing credentials
- **AND** the response SHALL be HTTP 202

#### Scenario: Delivery succeeds

- **GIVEN** a valid support submission
- **AND** a configured mail provider that accepts the message
- **WHEN** delivery completes
- **THEN** the row state SHALL be `enviado`
- **AND** the row SHALL carry the delivery timestamp
- **AND** the response SHALL be HTTP 201

#### Scenario: A signed-in user submits the form

- **GIVEN** a support submission carrying a valid session
- **WHEN** the row is written
- **THEN** it SHALL reference the authenticated user
- **AND** the absence of a session SHALL NOT prevent the submission

### Requirement: Provider-Agnostic Delivery to the Institutional Mailbox (REQ-SUP-08)

The platform SHALL deliver support requests to `contacto@ceoubb.com` through a single port, `enviarCorreoSoporte()` in `lib/services/support-mail.ts`, whose transport is selected by environment variable and which requires no vendor SDK.

The outbound message SHALL be plain text with no HTML part, SHALL set `reply-to` to the sender's address and SHALL NOT set `from` to it, and SHALL carry every user-supplied value as escaped plain text.

The platform SHALL NOT deliver user-authored support content to Discord or to any internal engineering channel.

#### Scenario: The mail provider is replaced

- **GIVEN** a decision to change transactional mail provider
- **WHEN** the new provider's endpoint and credentials are configured
- **THEN** delivery SHALL continue to work with no source change and no dependency change

#### Scenario: A message body contains markup

- **GIVEN** a support submission whose `mensaje` contains HTML tags
- **WHEN** the message is delivered
- **THEN** the outbound message SHALL render that content as literal text
- **AND** SHALL NOT contain an HTML part

#### Scenario: Sender authentication is preserved

- **GIVEN** any support submission
- **WHEN** the outbound message is composed
- **THEN** its `from` address SHALL be the platform's configured sender
- **AND** the submitter's address SHALL appear only in `reply-to`

### Requirement: Honest Degradation Without a Mail Provider (REQ-SUP-09)

WHILE no mail provider is configured, the support endpoint SHALL continue to accept and persist submissions, SHALL leave them in state `pendiente`, SHALL respond HTTP 202, and SHALL NOT report the request as delivered.

The confirmation shown to the person SHALL state that the message was received and SHALL offer the direct address `contacto@ceoubb.com` as an immediately usable alternative.

#### Scenario: The platform is deployed before the mail account exists

- **GIVEN** no mail driver configured in the environment
- **WHEN** a valid support submission is sent
- **THEN** the row SHALL be written with state `pendiente`
- **AND** the response SHALL be HTTP 202
- **AND** the confirmation SHALL NOT claim the message was delivered
- **AND** the confirmation SHALL offer the direct institutional address

### Requirement: Bounded Queries on Support Data (REQ-SUP-10)

Every query over `solicitudes_soporte` SHALL carry an explicit `.limit()` and SHALL be served by one of the table's indexes.

#### Scenario: The support table grows large

- **GIVEN** a `solicitudes_soporte` table with a large number of rows
- **WHEN** the rate-limit count or any operational read runs
- **THEN** the query SHALL use an index
- **AND** SHALL NOT perform an unbounded scan
