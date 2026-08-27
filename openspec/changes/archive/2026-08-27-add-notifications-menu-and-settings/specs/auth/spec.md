## ADDED Requirements

### Requirement: Self-Service Active Session Management (REQ-AUTH-08)

The system SHALL let an authenticated user enumerate the non-expired rows of `sessions` that belong to that user, identify which row is the current session, and revoke any of the others; the enumeration SHALL use the indexed user column with an explicit limit, and no endpoint SHALL return or revoke a session that belongs to a different account.

#### Scenario: User enumerates their own sessions

- **GIVEN** an authenticated user with four non-expired session rows and two expired ones
- **WHEN** the user requests the list of active sessions
- **THEN** only the four non-expired rows for that user SHALL be returned
- **AND** exactly one of them SHALL be marked as the current session
- **AND** the query SHALL apply an explicit limit and use the indexed user column

#### Scenario: Revocation invalidates the target device only

- **GIVEN** an authenticated user with a session open on another device
- **WHEN** the user revokes that other session
- **THEN** its row SHALL be deleted from `sessions`
- **AND** the next request carrying that token SHALL be treated as unauthenticated
- **AND** the requesting session SHALL remain valid

#### Scenario: Session belonging to another account is not exposed

- **GIVEN** an authenticated user
- **WHEN** a request references a session token hash that belongs to a different user
- **THEN** the system SHALL respond with an authorization error
- **AND** SHALL NOT reveal whether that session exists
- **AND** SHALL delete nothing

#### Scenario: Revoking the current session ends it cleanly

- **GIVEN** an authenticated user viewing their session list
- **WHEN** the user revokes the session marked as current
- **THEN** that row SHALL be deleted
- **AND** the user SHALL be returned to the access screen as an unauthenticated visitor
