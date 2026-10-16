# classroom/publication-studio Specification

## Purpose

Governs how an authorized teacher opens a full-page publication studio from the course header, seeds it from a content preset, writes with the multimodal editor, attaches files to the publication itself, and chooses whether students receive an alert. Replaces `classroom/publication-wizard`, whose modal wizard and split-button are removed.

## Requirements

### Requirement: Open the Studio as a Full Page (REQ-PUB-01)

WHEN an authorized teacher activates `+ Nueva publicación` from the course header, the system SHALL replace the classroom view with a full-page publication studio in the same synchronous interaction, without an intermediate modal dialog, and SHALL open the editor in the mode stored in `ceoubb_default_editor` when that value is `visual`, `markdown`, or `html`.

#### Scenario: A remembered Markdown teacher starts writing immediately

- **GIVEN** `ceoubb_default_editor` contains `markdown`
- **WHEN** the teacher activates `+ Nueva publicación`
- **THEN** the studio SHALL occupy the course screen with its own back control
- **AND** the editor SHALL open in Markdown mode
- **AND** no `<dialog>` SHALL be rendered by the studio

### Requirement: Fall Back Safely When the Preference Is Unusable (REQ-PUB-02)

IF the stored editor preference is missing, invalid, or inaccessible, THEN the studio SHALL open in `visual` mode and SHALL NOT block publication, and no exception SHALL escape to the interface.

#### Scenario: Storage contains an unknown value

- **GIVEN** `ceoubb_default_editor` contains `legacy-editor`
- **WHEN** the teacher opens the studio
- **THEN** the editor SHALL open in `visual` mode
- **AND** the teacher SHALL be able to publish normally

### Requirement: Manage Destination and Metadata in an Inspector (REQ-PUB-03)

WHILE the studio is open, the system SHALL present the writing canvas and a metadata inspector holding destination folder, optional due date, optional external link, attachments, and alert policy, and SHALL keep every one of them reachable without leaving the page.

#### Scenario: A teacher configures an evaluation

- **GIVEN** the studio is open on the `Certamen o evaluación` preset
- **WHEN** the teacher chooses a folder, sets a due date, attaches a marking guide, and selects `Publicar y alertar`
- **THEN** the published document SHALL carry that folder, due date, attachment, and alert policy

### Requirement: Persist the Editor Preference on Explicit Change (REQ-PUB-04)

WHEN the teacher switches the editor mode from inside the studio, the client SHALL store the selected mode under `ceoubb_default_editor` so the next publication opens in the same mode.

#### Scenario: A teacher switches to HTML

- **GIVEN** the studio is open in `visual` mode
- **WHEN** the teacher selects the `HTML` tab of the editor
- **THEN** `ceoubb_default_editor` SHALL contain `html`

### Requirement: Leave the Studio Without Losing Work (REQ-PUB-05)

WHEN the teacher activates the studio's back control or the Android hardware back gesture WHILE a title or body has been written, the system SHALL ask for confirmation before discarding, and SHALL return to the course view without navigating away from the portal.

#### Scenario: The hardware back gesture reaches the studio first

- **GIVEN** the studio is open on a native Android shell
- **WHEN** the teacher presses the hardware back button
- **THEN** the studio's own back control SHALL be activated
- **AND** the portal SHALL NOT leave the course screen in the same press

### Requirement: Honor Destination and Alert Policy (REQ-PUB-06)

WHEN the studio submits a publication, the system SHALL write the selected folder and `notifyStudents` policy in the existing post document; IF `notifyStudents` is exactly `false`, THEN the notification Function SHALL terminate without sending FCM.

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

### Requirement: Keep the Studio Accessible and Bounded (REQ-PUB-08)

The system SHALL provide labelled controls, visible keyboard focus, polite announcement of the autosave state, Phosphor icons, and interactive targets of at least 44 px; the feature SHALL add no query, listener, remote preference read, or per-student write.

#### Scenario: A keyboard teacher writes and publishes

- **GIVEN** a teacher using only the keyboard
- **WHEN** the teacher moves through title, editor, inspector, and the publish action
- **THEN** every stop SHALL expose a visible focus ring and an accessible name

### Requirement: Attach Files to the Publication Document (REQ-PUB-09)

WHEN a teacher attaches files in the inspector, the system SHALL upload each file to Cloud Storage without writing a Firestore document, and SHALL record the resulting descriptors in the `attachments` array of the published post, up to six entries; entries without a storage path SHALL be discarded.

#### Scenario: A certamen ships with its marking guide

- **GIVEN** a teacher attaches `pauta.pdf` and `formulario.pdf`
- **WHEN** the publication is submitted
- **THEN** a single post document SHALL be created carrying both descriptors in `attachments`
- **AND** the course cover SHALL offer both as downloads inside that publication

#### Scenario: A malformed attachment entry is ignored

- **GIVEN** a stored `attachments` value containing an entry without `storagePath`
- **WHEN** the post is mapped for display
- **THEN** that entry SHALL be discarded and the remaining valid entries SHALL be preserved

### Requirement: Seed the Body from a Content Preset (REQ-PUB-10)

WHEN the teacher chooses one of `Aviso o portada del ramo`, `Certamen o evaluación`, or `Guía de estudio`, the system SHALL inject the matching pre-structured Spanish template into the editor body; WHEN the teacher chooses `En blanco`, the body SHALL stay empty.

#### Scenario: The evaluation preset arrives with a marking table

- **GIVEN** the studio is showing the preset choices
- **WHEN** the teacher chooses `Certamen o evaluación`
- **THEN** the editor body SHALL contain headings, an assessment callout, and a marking table
- **AND** the teacher SHALL be able to replace all of it

### Requirement: Autosave a Draft per Section (REQ-PUB-11)

WHILE the studio is open, the system SHALL persist the draft to device-local storage under a key scoped to the section, SHALL restore it when the teacher returns to the same section, SHALL discard it once the publication succeeds or the teacher confirms discarding, and SHALL NOT persist a draft whose title and body are both blank.

#### Scenario: A teacher returns to an unfinished guide

- **GIVEN** a teacher wrote a title and body in section `INF3101-1` and left without publishing
- **WHEN** the teacher opens the studio for `INF3101-1` again
- **THEN** the title, body, folder, due date, link, and alert choice SHALL be restored
- **AND** the studio SHALL state that a draft was recovered

#### Scenario: Another section stays clean

- **GIVEN** a stored draft for `INF3101-1`
- **WHEN** the teacher opens the studio for `MAT2201-2`
- **THEN** no draft SHALL be restored

### Requirement: Report Reading Effort (REQ-PUB-12)

WHILE the teacher writes, the system SHALL report the word count and an estimated reading time at 200 words per minute, and SHALL exclude fenced code blocks and display formulas from that count.

#### Scenario: A guide with a long listing is not inflated

- **GIVEN** a body with two words of prose and a fifty-line code block
- **WHEN** the statistics are computed
- **THEN** the word count SHALL be `2`

### Requirement: Centralise Publications on the Course Cover (REQ-PUB-13)

The course tab bar SHALL NOT offer a `Materiales` tab; the cover SHALL list every teacher publication together with its attachments, and the `+ Nueva publicación` and `Importar Moodle` actions SHALL live in the course header, gated by the same content-management role check that protected them before.

#### Scenario: A student looks for a marking guide

- **GIVEN** a teacher published a certamen with an attached marking guide
- **WHEN** a student opens the course
- **THEN** the cover SHALL show the publication with the guide as a download
- **AND** no `Materiales` tab SHALL be offered

#### Scenario: A student never sees the teacher actions

- **GIVEN** a signed-in student without content-management rights
- **WHEN** the student opens the course header
- **THEN** neither `+ Nueva publicación` nor `Importar Moodle` SHALL be rendered
