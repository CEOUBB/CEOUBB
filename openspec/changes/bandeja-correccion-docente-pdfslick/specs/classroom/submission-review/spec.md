## Purpose

Proporciona a los docentes de una sección un entorno integrado y ágil para visualizar entregas de estudiantes en PDF, calificar en escala chilena 1.0 a 7.0, redactar retroalimentación privada con persistencia reactiva y navegar secuencialmente entre alumnos mediante atajos de teclado.

## ADDED Requirements

### Requirement: Client-Side Dynamic PDF Viewer Integration (REQ-REV-01)

The system SHALL dynamically load the PDF viewer component on the client side (`ssr: false`) and render student submission PDF documents directly in modern browsers and Capacitor WebView without requiring manual file downloads.

#### Scenario: Rendering student PDF submission

- **WHEN** an authorized teacher opens an existing student submission containing a PDF document
- **THEN** the system SHALL stream and render the PDF document pages within the viewer pane with zoom and page controls

#### Scenario: Non-PDF or missing submission fallback

- **WHEN** a student has no submitted file or the uploaded file is not a readable PDF
- **THEN** the system SHALL display a contextual placeholder with the submission state and direct download link if an attachment exists

### Requirement: In-Context Chilean Grading and Private Feedback (REQ-REV-02)

WHEN an authorized teacher inputs a numerical grade or types private feedback for an evaluation, the system SHALL strictly validate that the grade is within the interval $[1.0, 7.0]$ and SHALL persist the grade and feedback reactively using debounce to the audited grade service.

#### Scenario: Valid grade and feedback saved reactively

- **GIVEN** an active student submission in the review tray
- **WHEN** the teacher enters grade `5.8` and types constructive feedback
- **THEN** the system SHALL visually indicate the saving state and commit the change to the audited grades system

#### Scenario: Invalid grade rejected with contextual message

- **WHEN** the teacher enters a grade outside $[1.0, 7.0]$ (e.g. `7.5` or `0.8`)
- **THEN** the system SHALL mark the input as invalid, display a validation error message, and prevent saving until corrected

### Requirement: Rapid Sequential Keyboard Navigation (REQ-REV-03)

WHILE inspecting student submissions in the review tray, the system SHALL support rapid sequential navigation between students using dedicated keyboard shortcuts when the user focus is not inside an active text input or textarea.

#### Scenario: Moving to next submission via keyboard

- **GIVEN** the teacher is viewing submission $N$ of $M$ and focus is outside text inputs
- **WHEN** the teacher presses the next-shortcut key
- **THEN** the system SHALL advance to submission $N+1$ and update the viewer and grading fields immediately

#### Scenario: Keyboard navigation suppressed during text entry

- **GIVEN** the teacher is actively typing inside the feedback textarea
- **WHEN** any navigation key combination is pressed
- **THEN** the system SHALL preserve text cursor position and SHALL NOT navigate to another student

### Requirement: Teacher Submission Queue with Lifecycle Filtering (REQ-REV-04)

The system SHALL provide teachers with a filtered and paginated queue of all enrolled students for the selected evaluation, displaying their submission status (`submitted`, `late`, `missing`, `review_draft`, `graded`), delivery timestamp, and current grade.

#### Scenario: Filtering submissions by delivery status

- **GIVEN** a course section with mixed submission states
- **WHEN** the teacher filters the queue by `submitted` or `missing`
- **THEN** the table SHALL display only students matching the selected filter

### Requirement: Evaluation Rubric and Guide Reference (REQ-REV-05)

The system SHALL provide on-demand access to the evaluation guideline, reference criteria or attached prompt file alongside the student document without displacing or resetting the active grade and feedback inputs.

#### Scenario: Teacher consults evaluation guidelines while grading

- **GIVEN** the teacher is grading an open student submission
- **WHEN** the teacher toggles the evaluation guidelines panel
- **THEN** the reference criteria or prompt SHALL be displayed while keeping the student grade and feedback fields accessible
