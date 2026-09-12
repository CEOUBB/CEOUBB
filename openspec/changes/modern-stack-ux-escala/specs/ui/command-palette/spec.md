## Purpose

Permite a estudiantes, docentes y administradores buscar y navegar instantáneamente entre asignaturas, secciones, actas, herramientas y recursos institucionales mediante una paleta de comandos global accesible activada por atajo de teclado (`Ctrl+K` / `⌘K`).

## ADDED Requirements

### Requirement: Global Keyboard Activation and Accessibility Pattern (REQ-CMD-01)

WHEN an authenticated user activates the global command shortcut (`Ctrl+K` on Windows/Linux or `Cmd+K` on macOS) or triggers the header search button, the system SHALL display the modal command menu with focus trapped inside the search input and full ARIA combobox semantics.

#### Scenario: Opening command palette via keyboard shortcut

- **GIVEN** an authenticated user on any portal screen
- **WHEN** the user presses `Ctrl+K` or `Cmd+K`
- **THEN** the command menu dialog SHALL appear immediately
- **AND** focus SHALL be placed inside the search query input
- **AND** the background view SHALL be prevented from scrolling

#### Scenario: Restoring previous focus on dismissal

- **GIVEN** the command menu dialog is open
- **WHEN** the user presses the `Escape` key or clicks outside the menu
- **THEN** the dialog SHALL close
- **AND** keyboard focus SHALL return to the element that held focus before the dialog was opened

### Requirement: Instant Fuzzy Filtering with Categorized Grouping (REQ-CMD-02)

WHILE the user inputs text into the search field, the system SHALL filter navigable destinations and available actions using fuzzy matching across names, codes and keywords, rendering results organized into categorized groups.

#### Scenario: Searching course by code and title

- **GIVEN** a student enrolled in multiple subjects
- **WHEN** the student types `INF-202` or `Cálculo` in the search field
- **THEN** the command menu SHALL update results in real time
- **AND** matching courses SHALL be displayed under their appropriate category header

#### Scenario: Fallback state for unmatched queries

- **GIVEN** an active search query that matches zero registered items
- **WHEN** filtering yields no results
- **THEN** the command menu SHALL render an accessible empty state message guiding the user to refine their query

### Requirement: Rapid Keyboard Execution (REQ-CMD-03)

WHEN the user navigates the command palette using keyboard arrow keys (`ArrowDown`, `ArrowUp`) and selects an item with `Enter`, the system SHALL immediately execute the associated action or navigate to the selected route and close the dialog.

#### Scenario: Navigating to section using Enter key

- **GIVEN** the command menu has filtered a list of items and highlighted the first match
- **WHEN** the user presses the `Enter` key
- **THEN** the system SHALL close the palette and navigate to the selected section immediately
