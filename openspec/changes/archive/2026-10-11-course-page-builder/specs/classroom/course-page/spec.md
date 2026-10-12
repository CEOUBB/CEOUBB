# classroom/course-page Specification

## Purpose

Governs the course page that the teaching team builds for each section: named sections, ordered items, an in-place edit mode with undo and redo, hidden and scheduled content that students cannot read, a 30-day trash, and a separate avisos panel that remains the only content that notifies students.

## Requirements

### Requirement: Teacher-Named Sections (REQ-PAGE-01)

The course cover SHALL render the course page as ordered sections whose titles are chosen by the teaching team, and SHALL NOT impose predefined content types, templates or type labels on page content.

#### Scenario: A teacher names the first section

- **GIVEN** an empty course page and a teacher in edit mode
- **WHEN** the teacher creates a section named "Descripción del curso"
- **THEN** the page SHALL show a section with exactly that title
- **AND** no predefined label such as "Aviso" or "Guía" SHALL be added to it

### Requirement: Page Items (REQ-PAGE-02)

Each section SHALL contain ordered items of type text, file, link or image; WHEN an item is a link, its destination SHALL use `http` or `https`; WHEN a file or image is opened, the download SHALL be authorized by the existing Storage rules.

#### Scenario: A link with an executable scheme is rejected

- **GIVEN** the link form of a section
- **WHEN** the teacher saves `javascript:alert(1)`
- **THEN** the item SHALL NOT be created and an error SHALL name the accepted schemes

### Requirement: In-Place Edit Mode (REQ-PAGE-03)

WHERE the viewer manages the section's content and the period is open, the course header SHALL offer "Editar página"; the edit mode SHALL be loaded on demand and SHALL offer a student preview that hides hidden and scheduled content.

#### Scenario: A student never sees the edit control

- **GIVEN** an enrolled student
- **WHEN** the course cover renders
- **THEN** neither "Editar página" nor "Nuevo aviso" SHALL be rendered

### Requirement: Reorder and Move (REQ-PAGE-04)

The team SHALL reorder sections and items by pointer or touch drag, by arrow keys on the drag handle, and by moving an item to another section; a reorder SHALL rewrite only the moved document unless fractional precision is exhausted.

#### Scenario: Keyboard reordering

- **GIVEN** focus on an item's drag handle
- **WHEN** the teacher presses ArrowUp
- **THEN** the item SHALL move one position up and the new order SHALL persist

### Requirement: Hidden and Scheduled Content (REQ-PAGE-05)

Hidden items, scheduled items and every item of a hidden section SHALL be stored in `courses/{sectionId}/hiddenItems`, readable only by the teaching team; hidden sections SHALL NOT be readable by students; WHEN a scheduled date passes, `publishScheduledCourseContent` SHALL publish the content within its five-minute cadence without sending notifications.

#### Scenario: A student cannot read a hidden marking guide

- **GIVEN** a hidden section containing "Pauta reservada"
- **WHEN** an enrolled student reads the section or the item directly through the SDK
- **THEN** the security rules SHALL deny both reads

### Requirement: Trash (REQ-PAGE-06)

Deleting a section, an item or an aviso SHALL move it to `courses/{sectionId}/trash`; the team SHALL be able to restore or permanently delete each entry; entries older than 30 days SHALL be purged by the scheduler; file objects SHALL be deleted only when no remaining document references them.

#### Scenario: A deleted section comes back with its items

- **GIVEN** a section with three items moved to the trash
- **WHEN** the teacher restores the section
- **THEN** the section and its three items SHALL return in their previous order and visibility

### Requirement: Undo and Redo (REQ-PAGE-07)

The edit mode SHALL keep a bounded history of at most 50 operations; Ctrl+Z SHALL undo and Ctrl+Shift+Z or Ctrl+Y SHALL redo outside text fields; deletions SHALL offer an immediate "Deshacer".

#### Scenario: Undoing an added text

- **GIVEN** a text item just added
- **WHEN** the teacher activates "Deshacer"
- **THEN** the item SHALL disappear from the page and "Rehacer" SHALL bring it back

### Requirement: Co-Editing by the Teaching Team (REQ-PAGE-08)

Any content manager of the section SHALL edit any page item or aviso; every client write SHALL carry `updatedBy` equal to the writer, and the original `authorId` SHALL NOT change.

#### Scenario: A co-teacher corrects another teacher's guide

- **GIVEN** a guide authored by teacher A
- **WHEN** co-teacher B updates its title with `updatedBy` set to B
- **THEN** the write SHALL succeed
- **AND** the same update without `updatedBy` SHALL be denied

### Requirement: Avisos Panel (REQ-PAGE-09)

Avisos SHALL be listed chronologically in the course rail, and in a compact bar on narrow screens, with a full reader that supports search, pagination, editing and deletion with undo.

#### Scenario: Deleting an aviso from the reader

- **GIVEN** the avisos reader is open
- **WHEN** the teacher deletes an aviso
- **THEN** the reader SHALL offer "Deshacer" inside the dialog

### Requirement: Silent Page, Explicit Avisos (REQ-PAGE-10)

Page items SHALL be written with `notifyStudents: false`; WHEN the team finishes an edit session after adding visible items, the system SHALL offer a prefilled aviso listing them, which the teacher reviews before choosing an alert mode.

#### Scenario: Offer to notify after adding material

- **GIVEN** two visible items added in "Unidad 1"
- **WHEN** the teacher activates "Listo"
- **THEN** a dialog SHALL offer "Redactar aviso" with the title "Nuevo material en Unidad 1"

### Requirement: Historical Compatibility (REQ-PAGE-11)

Posts without `placement` SHALL be classified on read: a notice without a stored file SHALL be an aviso and every other post SHALL be page content grouped by its folder; WHEN the team opens the edit mode, folder groups SHALL become real sections preserving their visible order.

#### Scenario: A historical guide keeps its folder

- **GIVEN** a historical guide with folder "Unidad 1" and no section
- **WHEN** a student opens the course
- **THEN** the guide SHALL appear under a section titled "Unidad 1"

### Requirement: Bounded Reads (REQ-PAGE-12)

The page SHALL read at most 300 posts, 100 sections, 300 hidden items and 100 trash entries; WHEN the posts limit is reached, the team SHALL see an explicit overflow notice.

#### Scenario: Overflow is never silent

- **GIVEN** a course with 300 visible posts
- **WHEN** a teacher opens the cover
- **THEN** a notice SHALL state that older content is not shown

### Requirement: Validated Content Documents (REQ-PAGE-13)

The rules SHALL accept only known fields on post, hidden and trash documents, SHALL validate their types and sizes, and SHALL validate page section documents completely.

#### Scenario: An unknown field is rejected

- **GIVEN** a teacher of the section
- **WHEN** the teacher writes a post with an unlisted field
- **THEN** the rules SHALL deny the write

### Requirement: Imports Land in the Page (REQ-PAGE-14)

Moodle and ADECCA imports SHALL write `placement`: imported material SHALL appear as page content grouped by its source section, and ADECCA avisos without a file SHALL appear in the avisos panel.

#### Scenario: A Moodle file is imported

- **WHEN** a Moodle file is imported into a section
- **THEN** its post SHALL carry `placement: "page"`

### Requirement: Duplicate Items and Sections (REQ-PAGE-15)

The team SHALL duplicate an item or a whole section; a duplicate SHALL share the original files and both documents SHALL record those files in `attachmentPaths`.

#### Scenario: Purging a duplicate keeps the original file

- **GIVEN** a duplicated file item
- **WHEN** the duplicate is purged from the trash
- **THEN** the shared Storage object SHALL remain because the original still references it
