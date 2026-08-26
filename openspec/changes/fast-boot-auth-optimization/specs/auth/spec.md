## ADDED Requirements

### Requirement: Server-Side Session Bootstrap

The system SHALL inspect the session cookie (`centro_estudio_session`) during Server Component execution in `app/page.tsx` on initial HTTP request to immediately resolve the user's authentication state without triggering client-side waterfalls.

#### Scenario: Unauthenticated visitor initial page load

- **GIVEN** a visitor without a valid `centro_estudio_session` cookie
- **WHEN** the user navigates to `/`
- **THEN** the server SHALL render and return the `AccessScreen` immediately in the initial HTML payload
- **AND** the client SHALL NOT execute an initial client-side network request to check authentication state

#### Scenario: Authenticated user initial page load

- **GIVEN** a user with a valid `centro_estudio_session` cookie
- **WHEN** the user navigates to `/`
- **THEN** the server SHALL resolve the session and academic course memberships on the server
- **AND** pass the initial user and section data directly to the client portal component

### Requirement: Unified Post-Auth Payload

The `/api/auth/firebase` endpoint SHALL return user profile, enrolled section IDs, section memberships, and active academic courses in a single JSON response upon successful institutional authentication.

#### Scenario: Successful Google institutional sign-in

- **GIVEN** a valid Google `idToken` for an authorized institutional email
- **WHEN** the client submits the token to `POST /api/auth/firebase`
- **THEN** the endpoint SHALL verify the token, create the session cookie
- **AND** return a JSON object containing `{ user, photoUrl, sectionIds, memberships, sections }`
- **AND** the client SHALL render the dashboard immediately without performing a separate fetch to `/api/auth/me`
