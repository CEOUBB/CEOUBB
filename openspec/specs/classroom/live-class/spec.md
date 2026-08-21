# classroom/live-class Specification

## Purpose

Governs the validated live-class link stored per academic section, its bounded real-time delivery, its editing authorization and the prominent, accessible entry point shown on the classroom home page.

## Requirements

### Requirement: Persist One Live-Class Link per Section (REQ-LIVE-01)

WHEN an authorized section editor saves a valid live-class URL, the system SHALL persist one normalized document at `courses/{courseId}/meta/live-class` and SHALL expose it through the active classroom subscription.

#### Scenario: A teacher publishes Zoom

- **GIVEN** an authenticated teacher assigned to the section
- **WHEN** the teacher saves a valid Zoom meeting URL
- **THEN** Firestore SHALL store the normalized URL with provider `zoom`
- **AND** the classroom listener SHALL emit the new link without a page reload

### Requirement: Accept Only Known HTTPS Providers (REQ-LIVE-02)

IF a submitted value is not an HTTPS URL on `zoom.us`, a `zoom.us` subdomain, `teams.microsoft.com`, or `teams.cloud.microsoft`, THEN the system SHALL reject it before writing and SHALL present a Chilean-Spanish validation message.

#### Scenario: An unknown provider is rejected

- **GIVEN** an authorized teacher editing the live-class field
- **WHEN** the teacher submits `https://videollamada.example.com/reunion`
- **THEN** the UI SHALL request an HTTPS Zoom or Teams URL
- **AND** no Firestore write SHALL execute

### Requirement: Render the Banner Before Announcements (REQ-LIVE-03)

WHILE a valid live-class link exists and the course home tab is active, the system SHALL render a prominent provider-aware banner before ordinary announcements with an external `Entrar a la clase` action.

#### Scenario: A student opens a configured section

- **GIVEN** an enrolled student and a configured Teams link
- **WHEN** the student opens the section home page
- **THEN** the banner SHALL identify Microsoft Teams
- **AND** its entry action SHALL appear before the announcements

### Requirement: Reserve No Empty Student Space (REQ-LIVE-04)

WHILE no valid live-class link exists, the system SHALL render no banner container, placeholder or reserved live-class space for students.

#### Scenario: A section has no live class

- **GIVEN** an enrolled student and no `meta/live-class` document
- **WHEN** the student opens the section home page
- **THEN** no live-class banner element SHALL exist

### Requirement: Empty Input Removes the Link (REQ-LIVE-05)

WHEN an authorized section editor saves an empty value or invokes the removal action, the system SHALL delete `meta/live-class` and SHALL remove the banner through the same real-time state path.

#### Scenario: A teacher removes the current meeting

- **GIVEN** a section with a live-class document
- **WHEN** its teacher removes the link
- **THEN** Firestore SHALL delete the document
- **AND** the banner SHALL disappear without a page reload

### Requirement: Enforce Section Editing Authorization (REQ-LIVE-06)

IF a student, an unauthenticated client or a teacher outside the section attempts to create, update or delete `meta/live-class`, THEN Firestore SHALL reject the write; reads SHALL preserve the existing enrollment policy.

#### Scenario: A student attempts a direct write

- **GIVEN** an enrolled user with role `student`
- **WHEN** the client writes `courses/{courseId}/meta/live-class`
- **THEN** Firestore SHALL deny the operation

### Requirement: Provide Accessible Web and Capacitor Entry (REQ-LIVE-07)

The system SHALL provide an associated field label, keyboard-visible focus, live status/error feedback, minimum 44 px interactive targets and an ordinary HTTPS anchor that the Capacitor bridge can open externally.

#### Scenario: A keyboard user corrects an invalid link

- **GIVEN** a teacher using keyboard navigation
- **WHEN** an invalid meeting URL is submitted
- **THEN** the field SHALL receive focus with a visible focus indicator
- **AND** the validation message SHALL be announced as status feedback

### Requirement: Keep Live-Class Reads Bounded (REQ-LIVE-08)

The system SHALL add at most one exact-document listener per open section and SHALL NOT add a collection-group scan or a per-student copy of the live-class link.

#### Scenario: One classroom is opened

- **GIVEN** a user enrolled in any number of sections
- **WHEN** the user opens one classroom
- **THEN** the live-class feature SHALL subscribe only to that section's fixed metadata document
