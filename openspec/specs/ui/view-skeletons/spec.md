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
- **THEN** the system SHALL render a geometric skeleton containing the lead page header, mobile application strip, category index, and resource rows in the same groups as the loaded view

##### Scenario: Admin view loading state

- **WHEN** an authorized administrator navigates to the Accounts screen while its dynamic chunk is loading
- **THEN** the system SHALL render a geometric skeleton containing the admin header metrics, search box, table rows with role labels, and pagination footer

##### Scenario: Classroom view loading state

- **WHEN** the user opens an enrolled course while the classroom module is loading
- **THEN** the system SHALL render a geometric skeleton containing the course breadcrumb, title, divider tab with the course code, 5 navigation tabs, notice post cards, and the side rail info card

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

#### Requirement: Content Faithful Skeleton Resolution

The system SHALL render every value already known at load time (static copy, course name, code, tone, teacher, account identity, stored calendar view) and SHALL draw placeholders only for data that has not arrived. Text placeholders SHALL occupy the exact line box of the text they represent, and placeholders SHALL appear only after a short delay so fast loads never flash them.

##### Scenario: Deferred view resolves

- **WHEN** a deferred portal view finishes loading after its skeleton was shown
- **THEN** the skeleton SHALL crossfade into the loaded view through a view transition, keeping persistent headings and controls visually stable

##### Scenario: Data placeholder resolves inside a view

- **WHEN** a list placeholder inside a loaded view (posts, announcements, conversations, sessions, periods, accounts, gradebook, interoperability resources) is replaced by its data
- **THEN** the arriving rows SHALL fade in with a capped stagger and SHALL never show an empty state while the first response is pending

#### Requirement: Input Aware View Transitions

The system SHALL animate screen and classroom tab changes started by pointer or touch with a short fade through, and SHALL apply changes started from the keyboard or under reduced motion immediately.

##### Scenario: Pointer navigation

- **WHEN** the user changes portal screen or classroom tab with a pointer or touch
- **THEN** the outgoing view SHALL fade out within 100 ms and the incoming view SHALL arrive within 400 ms, with tab panels entering from the side of the selected tab

##### Scenario: Keyboard or reduced motion

- **WHEN** the user changes screen or tab from the keyboard, or reduced motion is preferred by the system or the account
- **THEN** the change SHALL be applied without a view transition

#### Requirement: Divider Tab Continuity

The system SHALL keep the section divider tab visually continuous between a course card and its classroom.

##### Scenario: Opening and leaving a course

- **WHEN** the user opens a course from its dashboard card with a pointer, or returns to the dashboard from that classroom
- **THEN** the divider tab carrying the course code SHALL travel between the card and the classroom header while the surrounding screens fade through
