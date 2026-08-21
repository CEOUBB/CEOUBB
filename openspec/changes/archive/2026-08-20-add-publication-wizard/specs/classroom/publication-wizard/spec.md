## Purpose

Governs how an authorized teacher launches a new classroom publication, configures its initial context, stores a device-local editor preference, and chooses whether students receive an alert.

## ADDED Requirements

### Requirement: Launch the Preferred Editor Immediately (REQ-PUB-01)

WHEN an authorized teacher activates the primary `+ Nueva publicación` action and `ceoubb_default_editor` contains `visual`, `markdown`, or `html`, the client SHALL open the editor with that mode in the same synchronous interaction without an intermediate wizard, asynchronous boundary, or network read.

#### Scenario: A remembered Markdown teacher starts immediately

- **GIVEN** `ceoubb_default_editor` contains `markdown`
- **WHEN** the teacher activates `+ Nueva publicación`
- **THEN** the publication editor SHALL open in Markdown mode
- **AND** the wizard SHALL NOT open first

### Requirement: Fall Back Safely to the Wizard (REQ-PUB-02)

IF the preference is missing, invalid, or inaccessible, THEN the client SHALL open the wizard and SHALL NOT block publication.

#### Scenario: Storage contains an unknown value

- **GIVEN** `ceoubb_default_editor` contains `legacy-editor`
- **WHEN** the teacher activates the primary action
- **THEN** the wizard SHALL open at step 1
- **AND** no exception SHALL escape to the interface

### Requirement: Provide Three Ordered Wizard Steps (REQ-PUB-03)

WHILE the wizard is open, the system SHALL present exactly three ordered steps for content type, authoring mode, and destination with alerts, and SHALL permit backward navigation without losing prior selections.

#### Scenario: A teacher configures an evaluation

- **GIVEN** the wizard is open at step 1
- **WHEN** the teacher selects `Certamen o evaluación`, advances, selects `Markdown + LaTeX`, advances, chooses a folder and `Publicar y alertar`
- **THEN** the editor SHALL open with the selected kind, mode, folder, and alert policy

### Requirement: Persist Only an Explicit Editor Preference (REQ-PUB-04)

WHEN the teacher completes step 2 with `Recordar mi elección y usarla siempre por defecto` selected, the client SHALL store the selected mode under `ceoubb_default_editor`; WHEN the option is cleared, the client SHALL remove the stored preference.

#### Scenario: A teacher remembers HTML

- **GIVEN** the teacher selects `Código HTML libre`
- **AND** the remember option is selected
- **WHEN** the wizard is completed
- **THEN** `ceoubb_default_editor` SHALL contain `html`

### Requirement: Change Modes from the Split Menu (REQ-PUB-05)

WHEN a teacher chooses a mode from the split-button menu, the client SHALL update the local preference and open the editor in that mode; the same menu SHALL provide an action to reopen the complete wizard.

#### Scenario: A visual editor user changes to Markdown

- **GIVEN** the saved preference is `visual`
- **WHEN** the teacher opens the arrow menu and chooses `Markdown + LaTeX`
- **THEN** the editor SHALL open in Markdown mode
- **AND** `ceoubb_default_editor` SHALL be updated to `markdown`

### Requirement: Honor Destination and Alert Policy (REQ-PUB-06)

WHEN the editor submits a publication, the system SHALL write the selected folder and `notifyStudents` policy in the existing post document; IF `notifyStudents` is exactly `false`, THEN the notification Function SHALL terminate without sending FCM.

#### Scenario: A guide is published silently

- **GIVEN** a teacher selected a course folder and `Publicar en silencio`
- **WHEN** the guide is published successfully
- **THEN** the post SHALL be stored in that folder with `notifyStudents: false`
- **AND** no FCM message SHALL be sent for that post

### Requirement: Preserve Historical Notification Behavior (REQ-PUB-07)

IF a historical post does not contain `notifyStudents`, THEN the notification Function SHALL preserve the existing send behavior.

#### Scenario: A legacy post triggers the Function

- **GIVEN** a newly observed post document without `notifyStudents`
- **WHEN** `notifyStudentsOnCoursePost` runs
- **THEN** the Function SHALL send the existing course-topic message

### Requirement: Keep the Flow Accessible and Bounded (REQ-PUB-08)

The system SHALL provide labelled dialogs, visible keyboard focus, Escape cancellation, current-step announcement, menu semantics, Phosphor icons, and interactive targets of at least 44 px; the feature SHALL add no query, listener, remote preference read, or per-student write.

#### Scenario: A keyboard teacher completes the wizard

- **GIVEN** a teacher using only the keyboard
- **WHEN** the teacher opens the split menu and the wizard
- **THEN** focus and expanded state SHALL be exposed throughout the flow
- **AND** the teacher SHALL be able to close either dialog with Escape
