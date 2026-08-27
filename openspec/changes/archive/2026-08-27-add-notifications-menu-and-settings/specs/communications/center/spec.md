## MODIFIED Requirements

### Requirement: Provide Accessible Web and Capacitor Navigation (REQ-COMM-08)

The system SHALL expose `Avisos y mensajes` from desktop navigation, from the Capacitor bottom bar and from a `Ver todas las notificaciones` action inside the header notification panel, and the labelled header notification control SHALL open that panel instead of navigating; every one of these surfaces SHALL keep semantic tabs, live unread status, associated form feedback, visible keyboard focus, 44 px touch targets, reduced-motion support and reflow without horizontal page scrolling at 320 CSS pixels.

#### Scenario: Mobile student starts a conversation with keyboard assistance

- **GIVEN** a student using the mobile-width portal with reduced motion enabled
- **WHEN** the student opens Messages, selects a section and submits an empty body
- **THEN** focus SHALL remain in the associated composer with an announced validation message
- **AND** no motion-dependent or horizontally clipped control SHALL block correction

#### Scenario: Header control opens the panel instead of the screen

- **GIVEN** an authenticated user on any portal screen
- **WHEN** the user activates the labelled header notification control
- **THEN** the notification panel SHALL open over the current screen
- **AND** the active portal screen SHALL NOT change

#### Scenario: Full screen stays reachable from every surface

- **GIVEN** an authenticated user
- **WHEN** the user activates `Avisos y mensajes` from desktop navigation, from the Capacitor bottom bar, or `Ver todas las notificaciones` from the notification panel
- **THEN** the same communications screen SHALL open with its announcements and messages tabs
- **AND** the unread status SHALL agree with the header badge in all three cases
