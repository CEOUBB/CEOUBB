## ADDED Requirements

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
