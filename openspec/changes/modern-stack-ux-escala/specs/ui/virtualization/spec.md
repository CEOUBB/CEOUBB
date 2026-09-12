## Purpose

Garantiza un desplazamiento fluido a 60 FPS y un uso eficiente de memoria en interfaces con nóminas masivas de estudiantes, actas de notas y registros administrativos institucionales mediante virtualización del DOM.

## ADDED Requirements

### Requirement: Windowed Virtual DOM Rendering for High-Density Lists (REQ-VIRT-01)

WHEN rendering datasets containing more than 30 items in a scrollable container (such as teacher grade sheets, student rosters in `GradesSection`, submission review queues or administrative user tables), the system SHALL mount in the DOM only the visible rows plus an overscan buffer of adjacent items.

#### Scenario: Smooth scrolling in massive course section

- **GIVEN** a course section with 150 enrolled students and 8 evaluation columns
- **WHEN** the teacher scrolls vertically through the grade matrix
- **THEN** the system SHALL maintain scrolling performance at 60 FPS on modest hardware
- **AND** the number of rendered DOM row nodes SHALL remain bounded to the viewport height plus buffer

#### Scenario: Memory footprint containment

- **GIVEN** a list of 500+ student records in an administrative lookup
- **WHEN** the table is mounted and inspected
- **THEN** the total mounted DOM nodes for rows SHALL NOT exceed 50 nodes at any single point in time

### Requirement: Scroll Stability During Row Interaction and Expansion (REQ-VIRT-02)

WHILE a user interacts with, expands or modifies fields within a virtualized row (such as typing a grade or opening a feedback drawer), the system SHALL maintain scroll anchoring without jumping or shifting the view position.

#### Scenario: Entering grade in virtualized row

- **GIVEN** a teacher focused on an input field at row index 45 of a virtualized gradebook
- **WHEN** the teacher types a grade or triggers an inline save
- **THEN** the scroll container SHALL preserve its exact pixel offset
- **AND** the active input SHALL remain stably in view

### Requirement: Accessible Row Navigation in Virtual Containers (REQ-VIRT-03)

WHEN a keyboard user or assistive technology navigates through virtualized list elements, the system SHALL scroll the active item into view automatically and provide standard ARIA listbox or grid attributes indicating total row count and current index.

#### Scenario: Keyboard focus scrolling into view

- **GIVEN** focus is on row $N$ within a virtualized table
- **WHEN** the user presses `Tab` or `ArrowDown` to navigate to row $N+1$ outside the currently visible window
- **THEN** the system SHALL scroll the virtual viewport smoothly to bring row $N+1$ into the visible window
- **AND** correct `aria-rowindex` and `aria-rowcount` attributes SHALL be announced to screen readers
