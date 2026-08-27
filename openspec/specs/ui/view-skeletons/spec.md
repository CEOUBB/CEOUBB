# ui/view-skeletons Specification

### Purpose

Garantiza la fidelidad geométrica 1:1, supresión de cambios de diseño acumulados (CLS), accesibilidad WCAG 2.2 y degradación con movimiento reducido para los estados de carga de las vistas diferidas del portal CEOUBB.

### Requirements

#### Requirement: 1:1 Geometric Layout Fidelity for Dynamic View Skeletons

The system SHALL provide dedicated, layout-faithful skeleton placeholders for each dynamically imported portal view (`CalendarView`, `ResourcesView`, `AdminView`, and `ClassroomView`) matching their real spatial grid and responsive layout.

##### Scenario: Calendar view loading state

- **WHEN** the user navigates to the Calendar screen while its dynamic chunk is loading
- **THEN** the system SHALL render a geometric skeleton matching the 7-day planner frame, header controls, filter chips, and hourly grid slots

##### Scenario: Resources view loading state

- **WHEN** the user navigates to the Resources screen while its dynamic chunk is loading
- **THEN** the system SHALL render a geometric skeleton containing the lead page header, two-column ecosystem cards, AI assistant chip grids, and institutional benefit tiles

##### Scenario: Admin view loading state

- **WHEN** an authorized administrator navigates to the Accounts screen while its dynamic chunk is loading
- **THEN** the system SHALL render a geometric skeleton containing the admin header metrics, search box, table rows with role pills, and pagination footer

##### Scenario: Classroom view loading state

- **WHEN** the user opens an enrolled course while the classroom module is loading
- **THEN** the system SHALL render a geometric skeleton containing the course breadcrumb, title, code pill, 5 navigation tabs, notice post cards, and the side rail info card

#### Requirement: Accessible Loading State Announcement

The system SHALL announce loading states accessibly to assistive technologies without visual clutter.

##### Scenario: Screen reader accessibility

- **WHEN** any view skeleton is displayed in the viewport
- **THEN** its container element MUST include `role="status"`, `aria-busy="true"`, and a descriptive `aria-label` identifying the view being loaded

#### Requirement: Staggered Shimmer Motion and Reduced-Motion Degradation

The system SHALL render subtle, staggered shimmer wave animations that gracefully degrade when reduced motion is preferred.

##### Scenario: Shimmer animation sequence

- **WHEN** animated skeletons render under standard user preferences
- **THEN** elements SHALL animate with staggered `--sk-delay` values and a diagonal sweep gradient

##### Scenario: Reduced-motion user preference

- **WHEN** the user's operating system has `prefers-reduced-motion: reduce` enabled
- **THEN** the system MUST display static geometric placeholders without moving gradient sweeps

#### Requirement: Elimination of Unauthenticated Boot Waterfall Skeleton

The system SHALL eliminate the client-side boot loading skeleton for unauthenticated visitors by serving the access interface directly in the initial server-rendered document.

##### Scenario: Direct access screen presentation

- **WHEN** an unauthenticated visitor requests the root URL
- **THEN** the initial server response SHALL contain the complete institutional login UI structure and brand assets
- **AND** the viewport SHALL display the login form without flashing intermediate skeleton loaders (`LoadingScreen`)
