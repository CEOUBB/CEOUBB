# classroom/large-lists-pagination Specification

## Purpose

Gobierna la paginación interactiva, la búsqueda reactiva y los contratos de rendimiento para listas extensas de materiales, progreso y matriz de calificaciones en el aula virtual de CEOUBB para secciones de escala institucional (>300 estudiantes).

## Requirements

### Requirement: Teacher Gradebook Matrix Pagination (REQ-PAG-01)

WHEN an authorized teacher or owner views the grade matrix for a section, the interface SHALL render the student roster divided into manageable pages with a configurable page size (25, 50, or 100 students, defaulting to 25) and SHALL provide accessible pagination controls to navigate through pages without rendering all student DOM nodes simultaneously.

#### Scenario: Navigating pages in a 300-student section

- **GIVEN** a section with 300 enrolled students and 4 defined evaluations
- **WHEN** the teacher loads the grades tab with default page size of 25
- **THEN** exactly 25 student rows SHALL be rendered in the DOM
- **AND** the pagination summary SHALL display "Mostrando 1–25 de 300 estudiantes (Página 1 de 12)"
- **AND** navigating to page 2 SHALL render students 26 through 50

### Requirement: Teacher Gradebook Interactive Search and Filter (REQ-PAG-02)

WHEN an authorized teacher enters search text into the gradebook search input, the interface SHALL instantly filter the student roster matching by student name or institutional email, SHALL update the visible page count, and SHALL reset the current page index to 1.

#### Scenario: Filtering students by query in a large cohort

- **GIVEN** a section with 300 students containing 12 students named "González"
- **WHEN** the teacher types "gonzalez" in the gradebook search input
- **THEN** only the 12 matching students SHALL be present in the active roster
- **AND** the pagination summary SHALL state "Mostrando 1–12 de 12 estudiantes encontrados"
- **AND** clearing the search input SHALL restore the full 300-student pagination

### Requirement: Grade Mutation State Integrity Across Pagination (REQ-PAG-03)

WHEN a teacher enters or updates an official score for a student on the current page, the system SHALL persist the mutation via audited services and SHALL preserve the updated score state regardless of subsequent page changes or search filter activations.

#### Scenario: Grade change persisted across pagination changes

- **GIVEN** a teacher enters a grade `6.5` for a student on page 1
- **WHEN** the teacher navigates to page 2 and subsequently returns to page 1
- **THEN** the input for that student and evaluation SHALL display `6.5`
- **AND** the calculated section average SHALL reflect the updated grade

### Requirement: Student Progress Roster Pagination (REQ-PAG-04)

WHEN an authorized teacher views the progress overview in a section with more than 25 students, the interface SHALL paginate the student progress rows and provide a search filter by name or email.

#### Scenario: Teacher views progress of 300 students

- **GIVEN** a section with 300 students and learning units defined
- **WHEN** the teacher views the progress tab
- **THEN** the progress table SHALL render the first page of 25 students
- **AND** provide controls to navigate remaining pages and filter by student name

### Requirement: Classroom Materials Search and Scalable Rendering (REQ-PAG-05)

WHEN a user views the materials tab of a course, the interface SHALL provide a search filter across all folders to locate files by name or author, and SHALL limit or paginate file lists per folder when a folder contains more than 20 files.

#### Scenario: Searching files across multiple folders in a large course

- **GIVEN** a course with 8 folders and 120 uploaded files
- **WHEN** the user types "guia 3" in the materials search filter
- **THEN** only folders containing files matching "guia 3" SHALL remain expanded
- **AND** only matching files SHALL be rendered in the file list
