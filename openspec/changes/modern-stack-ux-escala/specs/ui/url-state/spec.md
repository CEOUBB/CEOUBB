## Purpose

Sincroniza de forma bidireccional y tipo-segura el estado de la interfaz de usuario (filtros de cursos, pestañas activas, términos de búsqueda y paginación) con los parámetros de búsqueda de la URL (`searchParams`) en Next.js App Router.

## ADDED Requirements

### Requirement: Type-Safe URL Query State Synchronization (REQ-URL-01)

WHEN an authenticated user updates an interface filter, selects a management tab, enters a search query or changes pagination, the system SHALL update the browser URL search parameters without triggering a full page reload or unmounting parent layouts.

#### Scenario: Updating table page and search query in URL

- **GIVEN** an administrator viewing the user directory on `AdminView`
- **WHEN** the administrator enters `gonzalez` in the search input and navigates to page 2
- **THEN** the browser URL SHALL reflect `?q=gonzalez&page=2`
- **AND** the state change SHALL be recorded in the browser history stack

#### Scenario: Switching tabs in teacher workspace

- **GIVEN** a teacher managing course sections on `TeacherCoursesView`
- **WHEN** the teacher switches from the `data` tab to the `evaluations` tab
- **THEN** the URL SHALL synchronize with `?tab=evaluations`
- **AND** the active panel SHALL update instantly without layout shift

### Requirement: Deep Linking and Schema Validation on Entry (REQ-URL-02)

WHEN a user accesses a URL containing search parameters, the system SHALL validate and parse the parameters against predefined schemas and SHALL initialize the view with the specified filter and navigation state.

#### Scenario: Hydrating filters from shared URL

- **GIVEN** a student opening a shared link with `?periodo=2026-1&estado=activo`
- **WHEN** the application loads the courses dashboard
- **THEN** the dashboard SHALL initialize directly with the period and status filters applied
- **AND** invalid or unrecognized parameter values SHALL gracefully fall back to default values

### Requirement: Native Browser History Traversal (REQ-URL-03)

WHEN a user triggers browser back or forward navigation buttons, the system SHALL synchronize the component state with the corresponding URL search parameters and update the visible data accordingly.

#### Scenario: Navigating back through filtered states

- **GIVEN** a user who navigated from an unfiltered view to a filtered query
- **WHEN** the user clicks the browser Back button
- **THEN** the search parameters in the URL SHALL revert to the prior state
- **AND** the UI components SHALL reactively re-render to reflect the restored parameters
