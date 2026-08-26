## Purpose

Governs the two published help surfaces of Centro de Estudio UBB — `/contacto` and `/faq` — their membership in the `.policy-page` document family shared with `/privacidad`, `/terminos` and `/accesibilidad`, the states and accessible feedback of the support form, the disclosure, filtering and deep-linking behavior of the frequently asked questions, and the WCAG 2.2 AA conformance both pages must hold so the platform's published accessibility statement remains truthful.

## ADDED Requirements

### Requirement: Both Pages Belong to the Published Document Family (REQ-HELP-01)

`/contacto` and `/faq` SHALL render as standalone public documents using the existing `.policy-page` chrome, comprising the skip link, the `.policy-head` with the brand lockup and the return control, and an `article` with the shared main-content identifier and programmatic focus target.

Neither page SHALL require an authenticated session, and neither SHALL be mounted inside the authenticated portal shell.

Any new style introduced for these pages SHALL be a role-named class scoped under `.policy-page` in the global stylesheet, reusable by the sibling documents, and SHALL NOT introduce a design token absent from `DESIGN.md`.

#### Scenario: A signed-out visitor opens the pages

- **GIVEN** a visitor with no session
- **WHEN** they open `/contacto` or `/faq`
- **THEN** the page SHALL render completely
- **AND** SHALL NOT redirect to the sign-in screen

#### Scenario: A locked-out student needs help

- **GIVEN** a student who cannot authenticate
- **WHEN** they reach `/contacto`
- **THEN** they SHALL be able to read every contact channel and submit the support form

#### Scenario: A visitor returns to the portal

- **GIVEN** a visitor on either page
- **WHEN** they activate the return control in the document header
- **THEN** they SHALL be taken to the portal root

### Requirement: Published Contact Channels and Response Commitment (REQ-HELP-02)

`/contacto` SHALL publish the official institutional address `contacto@ceoubb.com` as a directly usable mail link, independent of the form, and SHALL state the response commitment already published in the accessibility statement: acknowledgement within five working days and an answer or accessible alternative within thirty calendar days.

The page SHALL preserve the platform's independence disclaimer and SHALL NOT present itself as an official service of Universidad del Bío-Bío.

#### Scenario: The form cannot be used

- **GIVEN** a visitor whose browser blocks the form submission for any reason
- **WHEN** they read `/contacto`
- **THEN** a directly usable institutional mail address SHALL be present on the page

#### Scenario: A visitor asks how long a reply takes

- **WHEN** a visitor reads `/contacto`
- **THEN** the page SHALL state the acknowledgement and response deadlines
- **AND** those deadlines SHALL match the ones published in the accessibility statement

### Requirement: Support Form States and Persistent Feedback (REQ-HELP-03)

The support form SHALL present four distinguishable states — ready, submitting, accepted, and failed — and SHALL communicate every state change through a persistent status region announced with `aria-live="polite"`.

WHILE a submission is in flight, the submit control SHALL be disabled and SHALL indicate progress.

WHEN a submission is accepted, the form SHALL be replaced in place by a confirmation panel that restates the chosen category, names the destination address, repeats the response commitment, and offers a control to write another message.

The platform SHALL NOT communicate the outcome of a support submission through a notification that dismisses itself.

#### Scenario: A submission is accepted

- **GIVEN** a completed valid support form
- **WHEN** the server accepts the submission
- **THEN** the form SHALL be replaced by a confirmation panel
- **AND** the confirmation SHALL remain visible until the visitor acts
- **AND** re-submitting the same message SHALL NOT be possible without an explicit new action

#### Scenario: A submission fails

- **GIVEN** a completed valid support form
- **WHEN** the server returns an error
- **THEN** the entered values SHALL be preserved
- **AND** the failure SHALL be announced in the status region
- **AND** the direct institutional address SHALL be offered as an alternative

#### Scenario: A screen reader user submits the form

- **GIVEN** a visitor using a screen reader
- **WHEN** the submission state changes
- **THEN** the new state SHALL be announced without moving focus unexpectedly

### Requirement: Accessible Field-Level Validation (REQ-HELP-04)

Every form control SHALL have a persistently visible label associated with it, and SHALL NOT rely on placeholder text as its label.

WHEN a field fails validation, the field SHALL be marked invalid programmatically, its error message SHALL be associated with it programmatically, and the error SHALL be conveyed by text rather than colour alone.

WHEN a submission is rejected for field errors, focus SHALL move to the first invalid field.

#### Scenario: A field is left empty

- **GIVEN** a support form with an empty required field
- **WHEN** the visitor submits
- **THEN** that field SHALL be marked invalid programmatically
- **AND** its error message SHALL be programmatically associated with it
- **AND** focus SHALL move to it

#### Scenario: Colour is unavailable

- **GIVEN** a visitor who cannot distinguish the error colour
- **WHEN** a field fails validation
- **THEN** the failure SHALL still be conveyed by the error text

### Requirement: Non-Institutional Address Notice (REQ-HELP-05)

WHERE the address entered in the support form is not an institutional UBB domain, the form SHALL display a non-blocking notice explaining that the message will still be answered but that enrollment cannot be verified from that address.

That notice SHALL NOT prevent submission and SHALL NOT be presented as an error.

#### Scenario: A visitor enters a personal address

- **GIVEN** a visitor typing `persona@gmail.com` into the email field
- **WHEN** the field loses focus
- **THEN** an informational notice SHALL appear
- **AND** the submit control SHALL remain enabled
- **AND** the field SHALL NOT be marked invalid

### Requirement: Frequently Asked Questions Coverage and Structure (REQ-HELP-06)

`/faq` SHALL group its questions into at least five categories covering institutional accounts and access, courses and sections, grades and the weighted average on the Chilean 1.0–7.0 scale, the study library, and the mobile application with its notifications.

Each category SHALL be reachable from an index at the top of the document, and each question SHALL be a native disclosure element whose summary is the question and whose content is the answer.

Answers SHALL be consistent with the platform's other published documents and SHALL NOT assert an institutional agreement that does not exist.

Question and answer text SHALL NOT contain em dashes. Where a dash would separate clauses, the sentence SHALL be restructured using a full stop, a comma, a colon or parentheses.

#### Scenario: A visitor scans for a topic

- **WHEN** a visitor opens `/faq`
- **THEN** the category index SHALL be visible without expanding any question
- **AND** activating an index entry SHALL move to that category

#### Scenario: Two answers are compared

- **GIVEN** a visitor who has opened one question
- **WHEN** they open a second question
- **THEN** the first SHALL remain open

#### Scenario: An answer describes grade calculation

- **WHEN** a visitor reads the grades category
- **THEN** the described scale and weighting SHALL match the behavior implemented in `lib/grades.ts`

### Requirement: Question Filtering With Announced Results (REQ-HELP-07)

`/faq` SHALL provide a text filter that matches against both question and answer text, SHALL display the number of matching questions out of the total, and SHALL announce changes to that count through a polite live region.

WHILE a filter term is active, matching questions SHALL be expanded so the matched text is visible without a further action.

WHEN no question matches, the page SHALL display an explicit empty state that routes the visitor to `/contacto`.

The filter SHALL be operable by keyboard alone and SHALL NOT be the only way to reach any question.

#### Scenario: A filter term matches several questions

- **GIVEN** a visitor typing a term present in three answers
- **WHEN** the filter applies
- **THEN** only matching questions SHALL remain listed
- **AND** the matching questions SHALL be expanded
- **AND** the result count SHALL be announced

#### Scenario: A filter term matches nothing

- **GIVEN** a visitor typing a term present in no question
- **WHEN** the filter applies
- **THEN** an empty state SHALL be shown
- **AND** it SHALL offer a route to `/contacto`

#### Scenario: Scripting is unavailable

- **GIVEN** a visitor whose browser did not run the page script
- **WHEN** they open `/faq`
- **THEN** every question and answer SHALL still be present and readable

### Requirement: Questions Are Individually Addressable (REQ-HELP-08)

Every question on `/faq` SHALL carry a stable identifier usable as a fragment, and a question addressed by that fragment SHALL be expanded and brought into view when the page loads.

Identifiers SHALL remain stable across content edits that do not change the question's meaning, so links shared in support replies do not break.

#### Scenario: A support reply links to one answer

- **GIVEN** a link of the form `/faq#{identificador}`
- **WHEN** a visitor opens it
- **THEN** that question SHALL be expanded
- **AND** SHALL be scrolled into view

#### Scenario: An answer's wording is corrected

- **GIVEN** an existing question whose answer text is edited without changing its meaning
- **WHEN** the change is published
- **THEN** its identifier SHALL be unchanged

### Requirement: Reciprocal Navigation Across the Published Documents (REQ-HELP-09)

`/faq` SHALL close with a route to `/contacto` for visitors whose question is unanswered, and `/contacto` SHALL route to `/faq` before its form so a self-service answer is offered before a message is written.

Both routes SHALL be listed in the sitemap, in the portal footer alongside the existing legal links, and in the portal shell's secondary navigation.

#### Scenario: A visitor finds no answer

- **WHEN** a visitor reaches the end of `/faq`
- **THEN** a route to `/contacto` SHALL be present

#### Scenario: A visitor is about to write a message

- **WHEN** a visitor reads `/contacto` before the form
- **THEN** a route to `/faq` SHALL be present

#### Scenario: A search engine crawls the site

- **WHEN** the sitemap is requested
- **THEN** it SHALL list `/contacto` and `/faq`

### Requirement: WCAG 2.2 AA Conformance of the Published Help Pages (REQ-HELP-10)

`/contacto` and `/faq` SHALL satisfy WCAG 2.2 Level AA, and SHALL be added to the enumerated page list in the published accessibility statement in the same change that publishes them.

Both pages SHALL be fully operable by keyboard with a visible focus indicator on every interactive element, SHALL meet AA contrast in every state, and SHALL respect `prefers-reduced-motion` by removing every transition when it is set.

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
