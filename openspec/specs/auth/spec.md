# auth Specification

### Purpose

Gobierna la derivación de roles determinista por dominio institucional, la gestión de sesiones de usuario y la sincronización de la política de acceso a través de los 4 espejos institucionales.

### Requirements

#### Requirement: Role Derivation by Email Domain

The system SHALL deterministically derive user roles exclusively from their institutional email domain:

- `@alumnos.ubiobio.cl` $\rightarrow$ Student
- `@ubiobio.cl` $\rightarrow$ Teacher
- Any other domain MUST be rejected with HTTP 403 / Domain Error.

##### Scenario: Student signs in with valid institutional email

- **GIVEN** an unauthenticated user with email `estudiante@alumnos.ubiobio.cl`
- **WHEN** they authenticate via Firebase Google Auth
- **THEN** the system SHALL assign the role `Student`
- **AND** allow session creation

##### Scenario: Teacher signs in with valid institutional email

- **GIVEN** an unauthenticated user with email `profesor@ubiobio.cl`
- **WHEN** they authenticate via Firebase Google Auth
- **THEN** the system SHALL assign the role `Teacher`
- **AND** grant teacher portal capabilities

##### Scenario: External email rejected

- **GIVEN** an unauthenticated user with email `usuario@gmail.com`
- **WHEN** they attempt to authenticate
- **THEN** the system SHALL immediately reject the session with HTTP 403

#### Requirement: Superuser Owner Role Isolation

The system SHALL NOT derive the `Owner` (Superuser) role from an email address or domain. The `Owner` status MUST be an administrative state persisted in Turso (`users.role = 'owner'`) and projected to Firestore (`users/{uid}.role`).

##### Scenario: Owner access evaluation

- **GIVEN** an authenticated user whose persisted role in Turso is `owner`
- **WHEN** accessing administrative endpoints
- **THEN** the system SHALL authorize full administrative access

#### Requirement: Four-Mirror Synchronization

The system SHALL maintain strict synchronization of access policies across four mirrors:

1. `lib/access-policy.ts` (SSOT)
2. `firebase/firestore.rules`
3. `firebase/storage.rules`
4. `android/app/src/main/res/values/firebase.xml`

##### Scenario: Rule verification

- **WHEN** running security invariants check (`pnpm run verify:invariants`)
- **THEN** the system SHALL verify that domain checks and role derivations match identically across all mirrors

## Requirements

### Requirement: Non-Production Quick Testing Access UI

WHERE the application executes in a local development environment (`process.env.NODE_ENV === 'development'`) or a Vercel preview deployment (`process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'`), the system SHALL render quick testing access buttons ("Entrar como estudiante" and "Entrar como docente") within the access portal interface.

#### Scenario: Quick access buttons render in non-production environments

- **GIVEN** an unauthenticated user on the login screen
- **WHEN** the runtime environment is development or Vercel preview
- **THEN** the system SHALL display the "Entrar como estudiante" and "Entrar como docente" quick testing buttons
- **AND** render them with non-obtrusive, accessible styling adhering to design tokens

#### Scenario: Quick access buttons are completely omitted in production

- **GIVEN** an unauthenticated user on the login screen
- **WHEN** the runtime environment is institutional production (`VERCEL_ENV === 'production'`)
- **THEN** the system SHALL NOT render any quick access testing button or development bypass UI element

### Requirement: Non-Production Fast Auth Session Issuance

WHERE a quick testing access request is initiated in an authorized non-production environment, the system SHALL authenticate or provision a deterministic institutional test account (`@alumnos.ubiobio.cl` for Student and `@ubiobio.cl` for Teacher) and issue a valid HTTP-only session cookie.

#### Scenario: Quick student authentication in dev or preview

- **GIVEN** an unauthenticated client in a development or preview environment
- **WHEN** the user triggers "Entrar como estudiante"
- **THEN** the system SHALL create or load a synthetic student user with an `@alumnos.ubiobio.cl` email
- **AND** issue a valid HTTP-only session cookie
- **AND** transition the user session directly into the student portal

#### Scenario: Quick teacher authentication in dev or preview

- **GIVEN** an unauthenticated client in a development or preview environment
- **WHEN** the user triggers "Entrar como docente"
- **THEN** the system SHALL create or load a synthetic teacher user with an `@ubiobio.cl` email
- **AND** issue a valid HTTP-only session cookie
- **AND** transition the user session directly into the teacher workspace portal

### Requirement: Strict Production Isolation Guard

IF any client sends a request to the quick testing authentication endpoint while the server executes in institutional production (`VERCEL_ENV === 'production'`), THEN the system SHALL reject the request immediately with HTTP 404 or HTTP 403 and MUST NOT create any session or mutate user records.

#### Scenario: Server rejects dev login route in production

- **GIVEN** a server environment configured with `VERCEL_ENV=production`
- **WHEN** a client submits a POST request to `/api/auth/dev-login`
- **THEN** the server SHALL respond with status code 404 (Not Found) or 403 (Forbidden)
- **AND** SHALL NOT set any session cookie
- **AND** SHALL NOT insert or update any record in Turso or Firestore

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
