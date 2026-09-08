## MODIFIED Requirements

### Requirement: WCAG 2.2 AA Conformance of the Published Help Pages (REQ-HELP-10)

`/contacto` and `/faq` SHALL satisfy WCAG 2.2 Level AA, and SHALL be added to the enumerated page list in the published accessibility statement in the same change that publishes them.

Both pages SHALL be fully operable by keyboard with a visible focus indicator on every interactive element, SHALL meet AA contrast in every state, and SHALL respect `prefers-reduced-motion` by removing every transition when it is set.

Furthermore, all navigation landmarks rendered on the page, including the shared document footer (`app/site-footer.tsx`), SHALL provide distinct and unambiguous accessible labels (`aria-label="Documentos institucionales y legales"` in the footer) to prevent duplicate landmark announcements for screen reader users.

#### Scenario: A keyboard-only visitor completes the support form

- **GIVEN** a visitor using only a keyboard
- **WHEN** they traverse `/contacto`
- **THEN** every control SHALL be reachable in a logical order
- **AND** the focused element SHALL be visibly indicated at every step

#### Scenario: A visitor requests reduced motion

- **GIVEN** a visitor whose system requests reduced motion
- **WHEN** they expand a question on `/faq`
- **THEN** the disclosure SHALL open without animation

#### Scenario: The conformance claim is published

- **WHEN** the accessibility statement is read after this change
- **THEN** its enumerated page list SHALL include `/contacto` and `/faq`

#### Scenario: Landmark uniqueness verification

- **GIVEN** an automated accessibility scanner or screen reader traversing `/contacto` or `/faq`
- **WHEN** inspecting the landmarks `<nav>` on the document
- **THEN** each `<nav>` landmark SHALL have a unique `aria-label`
- **AND** the footer landmark SHALL identify itself as `"Documentos institucionales y legales"`
