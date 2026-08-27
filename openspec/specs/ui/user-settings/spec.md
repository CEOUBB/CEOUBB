# ui/user-settings Specification

## Purpose

Defines the user settings screen of the portal, reached from the account menu in the header, covering profile photo management, per-channel notification preferences, a reduced-motion preference, the read-only institutional profile card, and the listing and revocation of the user's own active sessions.

## Requirements

### Requirement: Reach Settings From the Account Menu (REQ-CFG-01)

The system SHALL render a `Configuración` entry with a `Gear` icon inside the header account menu, above `Cerrar sesión`, and activating it SHALL open the settings screen inside the portal shell and close the account menu.

#### Scenario: User opens settings from the header

- **GIVEN** an authenticated user with the account menu open
- **WHEN** the user activates `Configuración`
- **THEN** the account menu SHALL close
- **AND** the settings screen SHALL become the active portal screen inside the existing header and sidebar shell

#### Scenario: Menu remains operable by keyboard

- **GIVEN** an authenticated user navigating the account menu by keyboard
- **WHEN** the user reaches `Configuración`
- **THEN** the entry SHALL show a visible focus indicator
- **AND** `Escape` SHALL close the menu and return focus to its summary control

### Requirement: Upload and Replace the Profile Photo (REQ-CFG-02)

WHEN an authenticated user submits a profile photo, the system SHALL validate its type and size with a Zod schema on the server, store the object under a Storage prefix owned by that user, persist its reference in `users.photo_url` in Turso, and project it to `users/{uid}` in Firestore within the same request.

#### Scenario: Student uploads a cropped photo

- **GIVEN** an authenticated student with no custom photo
- **WHEN** the student selects an image, adjusts the crop and confirms
- **THEN** the cropped image SHALL be uploaded under the Storage prefix for that user
- **AND** `users.photo_url` SHALL be updated in Turso
- **AND** `users/{uid}.photoUrl` SHALL be updated in Firestore
- **AND** the header avatar SHALL show the new photo without a page reload

#### Scenario: Unsupported file is rejected before storage

- **GIVEN** an authenticated user
- **WHEN** the user submits a file that is not a supported image type or exceeds the configured size limit
- **THEN** the API SHALL respond with a structured validation error
- **AND** no object SHALL be written to Storage and no row SHALL be updated

#### Scenario: Another user's photo cannot be written

- **GIVEN** an authenticated user with a valid session
- **WHEN** a request attempts to write an object under the Storage prefix of a different user
- **THEN** the Storage rules SHALL deny the write

### Requirement: Restore the Institutional Google Photo (REQ-CFG-03)

WHEN a user invokes the action to restore the default photo, the system SHALL clear `users.photo_url` and the Firestore projection, delete the stored custom object, and the avatar SHALL fall back to the Google OAuth photo, or to the user's initials when no Google photo resolves.

#### Scenario: User reverts to the Google photo

- **GIVEN** an authenticated user with a custom photo stored
- **WHEN** the user invokes the restore action and confirms
- **THEN** `users.photo_url` SHALL be null
- **AND** the stored custom object SHALL be deleted
- **AND** the avatar SHALL render the Google OAuth photo

#### Scenario: Fallback when no Google photo resolves

- **GIVEN** an authenticated user with no custom photo whose Google photo fails to load
- **WHEN** the avatar renders
- **THEN** it SHALL render the user's initials

### Requirement: Persist Per-Channel Notification Preferences (REQ-CFG-04)

The system SHALL let an authenticated user enable or disable each notification channel independently for section publications, teaching announcements, grade changes and upcoming assessment reminders, for both the in-app web surface and Capacitor push, validate the submitted shape with a Zod schema, and persist it in the user's own preferences document.

#### Scenario: Student disables push for grade changes

- **GIVEN** an authenticated student with every channel enabled
- **WHEN** the student disables push for grade changes and the change is saved
- **THEN** the preferences document for that user SHALL record push disabled for that channel
- **AND** a confirmation toast SHALL be shown
- **AND** the in-app channel for grade changes SHALL remain enabled

#### Scenario: Malformed preferences are rejected

- **GIVEN** an authenticated user
- **WHEN** a request submits a preferences payload with an unknown channel or a non-boolean value
- **THEN** the API SHALL respond with a structured validation error and persist nothing

#### Scenario: Defaults apply to a user who never opened settings

- **GIVEN** an authenticated user with no preferences document
- **WHEN** the settings screen loads
- **THEN** every channel SHALL render as enabled
- **AND** no write SHALL occur until the user changes a value

#### Scenario: Disabled channel is honored on send

- **GIVEN** a student who disabled push for section publications
- **WHEN** a publication is created in one of that student's sections
- **THEN** no push message SHALL be sent to that student for that publication

### Requirement: Offer a User-Level Reduced Motion Preference (REQ-CFG-05)

The system SHALL provide a reduced-motion toggle whose enabled state suppresses portal animation for that user regardless of the operating system setting, and the operating system preference SHALL continue to suppress animation on its own when the toggle is off.

#### Scenario: User opts out of motion on a device that does not

- **GIVEN** an authenticated user on a device reporting `prefers-reduced-motion: no-preference`
- **WHEN** the user enables the reduced-motion toggle
- **THEN** portal animations SHALL be suppressed for that user
- **AND** the preference SHALL survive a reload and apply on another device with the same account

#### Scenario: System preference still wins when the toggle is off

- **GIVEN** an authenticated user with the toggle off on a device reporting `prefers-reduced-motion: reduce`
- **WHEN** any animated portal surface renders
- **THEN** its animation SHALL be suppressed

### Requirement: Present the Institutional Profile as Read Only (REQ-CFG-06)

The system SHALL display the user's institutional email, derived role, career and faculty as read-only fields, and SHALL NOT expose any control that edits the email or the role.

#### Scenario: Student reviews the profile card

- **GIVEN** an authenticated student with email `alumno@alumnos.ubiobio.cl`
- **WHEN** the settings screen renders the account module
- **THEN** the email, the role `Estudiante`, the career and the faculty SHALL be shown as read-only text
- **AND** no editable control for email or role SHALL exist on the screen

#### Scenario: Role remains derived from the email domain

- **GIVEN** any authenticated user
- **WHEN** the profile card resolves the role label
- **THEN** it SHALL read the role derived by `lib/access-policy.ts` and SHALL NOT re-derive it from the email string

### Requirement: List and Revoke the User's Own Active Sessions (REQ-CFG-07)

The system SHALL list the authenticated user's own non-expired sessions with a bounded, indexed query, mark the current one, allow revoking any other one, and SHALL NOT expose any session belonging to another account.

#### Scenario: User closes a session left open on another device

- **GIVEN** an authenticated user with three non-expired sessions, one of them the current session
- **WHEN** the user revokes one of the other two
- **THEN** that session row SHALL be deleted from `sessions`
- **AND** the revoked device SHALL be unauthenticated on its next request
- **AND** the current session SHALL remain valid

#### Scenario: Query stays bounded

- **GIVEN** an authenticated user
- **WHEN** the session list loads
- **THEN** the query SHALL apply an explicit limit and use the indexed user column
- **AND** it SHALL exclude expired rows

#### Scenario: Foreign session cannot be revoked

- **GIVEN** an authenticated user
- **WHEN** a request attempts to revoke a session token hash that does not belong to that user
- **THEN** the API SHALL respond with an authorization error and delete nothing

### Requirement: Meet Portal Accessibility and Design Governance on the Settings Screen (REQ-CFG-08)

The settings screen SHALL use the OKLCH surface tokens and Phosphor icons of the design system, group each module under a labelled heading, associate every control with its label and its validation message, keep touch targets at 44 CSS pixels, reflow without horizontal page scrolling at 320 CSS pixels, and render a layout-faithful skeleton while its dynamic chunk loads.

#### Scenario: Screen is operable at 320 CSS pixels with keyboard only

- **GIVEN** a viewport of 320 CSS pixels and keyboard-only navigation
- **WHEN** the user traverses the settings modules
- **THEN** every control SHALL be reachable with a visible focus indicator
- **AND** no horizontal page scrolling SHALL be required
- **AND** each validation message SHALL be programmatically associated with its control

#### Scenario: Loading state matches the real layout

- **GIVEN** a user navigating to the settings screen while its dynamic chunk loads
- **WHEN** the skeleton renders
- **THEN** it SHALL match the module grid, headings and control rows of the real screen
- **AND** its container SHALL carry `role="status"`, `aria-busy="true"` and a descriptive `aria-label`
