## Purpose

Proporciona un sistema institucional unificado de notificaciones flotantes (toasts) reactivas, accesibles y optimizadas para interfaces táctiles y de escritorio, comunicando estados operativos, confirmaciones de guardado y errores asíncronos en CEOUBB.

## ADDED Requirements

### Requirement: Ephemeral Feedback for User Mutations and System Actions (REQ-TOAST-01)

WHEN an academic mutation, grade modification, file operation or administrative action completes or fails, the system SHALL display an ephemeral toast notification styled with institutional OKLCH tokens without interrupting user keyboard focus or displacing underlying layout elements.

#### Scenario: Displaying success notification upon grade persistence

- **GIVEN** an authorized teacher updating an evaluation score
- **WHEN** the grade score is successfully persisted
- **THEN** the system SHALL display a success toast with confirmation text
- **AND** the toast SHALL automatically dismiss after its display duration expires

#### Scenario: Displaying contextual error notification on network failure

- **GIVEN** an active user performing an action while offline or experiencing connection drops
- **WHEN** an operation fails due to network or server error
- **THEN** the system SHALL display an error toast clearly indicating the failure
- **AND** the error notification SHALL persist until dismissed or superseded by retry

### Requirement: Asynchronous Promise-Driven Status Transitions (REQ-TOAST-02)

WHEN an asynchronous long-running mutation begins (such as uploading submission attachments, importing student enrollment rosters or calculating final grade records), the system SHALL present a promise-driven toast that transitions fluidly from a loading state to a success or failure outcome.

#### Scenario: Visual progression during file upload

- **GIVEN** a student uploading an evaluation deliverable
- **WHEN** the file upload begins
- **THEN** the system SHALL display a loading toast
- **AND** WHEN the upload finishes successfully, the system SHALL update the same toast to indicate completion without mounting duplicate notification cards

### Requirement: Mobile Touch Ergonomics and Accessibility Compliance (REQ-TOAST-03)

WHILE rendered on touch-first viewports (mobile web and Capacitor WebView) or under active reduced-motion settings, the system SHALL support swipe gestures to dismiss notifications and SHALL suppress vestibular-triggering entrance scales.

#### Scenario: Swiping to dismiss on mobile devices

- **GIVEN** an active toast rendered on a mobile viewport
- **WHEN** the user swipes the notification card horizontally or downward
- **THEN** the system SHALL dismiss the toast immediately following the touch gesture

#### Scenario: Respecting reduced motion user preference

- **GIVEN** a user with `prefers-reduced-motion: reduce` configured in their operating system
- **WHEN** a toast notification is triggered
- **THEN** the system SHALL present the notification without elastic bounce physics or entrance scale translations
