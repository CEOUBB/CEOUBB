## ADDED Requirements

### Requirement: Public access loading

The system SHALL render useful anonymous access content from a static public entry without waiting for client session discovery, without server service imports in the client graph, and without speculative public route prefetch (REQ-PERF-LOAD-01).

#### Scenario: Anonymous initial navigation

- **WHEN** an anonymous browser requests the public entry
- **THEN** access content SHALL exist in the initial HTML and campus-only dependencies and styles SHALL remain outside its initial graph
- **AND** hashed static assets SHALL have immutable cache headers and branding SHALL preserve its visual design using appropriately sized local variants

### Requirement: Private session bootstrap and cache isolation

When a session cookie exists, the system SHALL validate the session on the server, supply a resolved initial session, and exclude personalized HTML and RSC from shared and offline caches (REQ-PERF-LOAD-02).

#### Scenario: Session lifecycle

- **WHEN** a user signs in, signs out, or navigates with an expired session
- **THEN** the existing institutional authentication and native behavior SHALL remain valid
- **AND** no stale user data SHALL be served from an anonymous or offline response cache

### Requirement: Compact authorized activity

Where compact activity is enabled after verified backfill, the system SHALL read server owned summary documents under each authorized section, preserving realtime readiness and enrollment isolation (REQ-PERF-LOAD-03).

#### Scenario: Projection lifecycle

- **WHEN** a post is created, imported, edited or deleted and events are duplicated or reordered
- **THEN** activity SHALL represent the current source using compact fields only
- **AND** client writes and unauthorized reads SHALL be denied
- **AND** backfill SHALL use explicit bounded pagination without a university wide collection group

### Requirement: Evidence gated optional changes

The implementation SHALL record measured checks and limitations for compiler, SQL placement and public prerender cache changes, and SHALL NOT claim unmeasured speedups or enable unsafe private caching (REQ-PERF-LOAD-04).

#### Scenario: Missing external prerequisites

- **WHEN** dedicated staging or provider inventory access is unavailable
- **THEN** the report SHALL state the missing evidence and preserve conditional rollout rather than migrate production data
