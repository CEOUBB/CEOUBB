## Purpose

Defines the ephemeral notification panel anchored to the portal header, the derivation of its items from data the portal already holds in memory, its read-state actions, its adaptation to a bottom sheet on touch widths, and the accessibility and motion guarantees that keep it usable without a pointer.

## ADDED Requirements

### Requirement: Open the Notification Panel Without Leaving the Current Screen (REQ-NOTIF-01)

WHEN an authenticated user activates the header notification control, the system SHALL open a transient notification panel over the current screen and SHALL NOT change the active portal screen or unmount the view underneath.

#### Scenario: Student checks notifications from inside a classroom

- **GIVEN** an authenticated student with the classroom screen of section `estatica` open
- **WHEN** the student activates the header notification control
- **THEN** the notification panel SHALL become visible over the header
- **AND** the classroom screen SHALL remain mounted and visible behind the panel
- **AND** dismissing the panel SHALL leave the student on the same classroom screen with the same scroll position

#### Scenario: Panel toggles closed on a second activation

- **GIVEN** an authenticated user with the notification panel open
- **WHEN** the user activates the header notification control again
- **THEN** the panel SHALL close
- **AND** focus SHALL return to the header notification control

### Requirement: Derive Panel Items From Already Loaded State (REQ-NOTIF-02)

The system SHALL build the notification list from the section activity, message thread summaries and read cursors already subscribed by the portal, and SHALL NOT read or write a per-user notification collection or execute any additional Firestore query to populate the panel.

#### Scenario: Panel opens with no additional reads

- **GIVEN** an authenticated student whose portal has already subscribed section activity and thread summaries
- **WHEN** the student opens the notification panel
- **THEN** the panel SHALL render its items from that in-memory state
- **AND** no additional Firestore document or collection read SHALL be issued by the act of opening the panel

#### Scenario: Items are bounded and ordered

- **GIVEN** an authenticated user with more than the panel limit of eligible items
- **WHEN** the notification panel renders
- **THEN** the panel SHALL show at most the newest 20 items in descending time order
- **AND** it SHALL merge section announcements and message threads into that single ordered list

#### Scenario: Section isolation is preserved

- **GIVEN** an authenticated student enrolled only in section `estatica`
- **WHEN** the notification panel renders
- **THEN** every item SHALL originate from a section with an active enrollment projection for that user
- **AND** no collection-group or university-wide query SHALL execute

### Requirement: Navigate to the Linked Resource and Persist Read State (REQ-NOTIF-03)

WHEN a user activates a notification item, the system SHALL close the panel, navigate to the resource the item references, and persist the corresponding read cursor under `users/{uid}/notificationReads` using the server clock, following the cursor contract of REQ-COMM-02.

#### Scenario: Announcement item opens its section

- **GIVEN** an unread announcement from section `estatica` shown in the panel
- **WHEN** the student activates that item
- **THEN** the panel SHALL close
- **AND** the classroom screen for `estatica` SHALL become the active screen
- **AND** a cursor `course:estatica` SHALL be persisted with the server clock

#### Scenario: Message item opens its conversation

- **GIVEN** an unread message thread shown in the panel
- **WHEN** the user activates that item
- **THEN** the messages tab of `Avisos y mensajes` SHALL open with that conversation selected
- **AND** the thread cursor SHALL be persisted with the server clock

### Requirement: Mark Every Notification as Read From the Panel (REQ-NOTIF-04)

WHEN a user invokes the panel action to mark everything as read, the system SHALL persist a read cursor for every item currently listed and SHALL reduce the header unread badge to zero without navigating away.

#### Scenario: User clears a full panel

- **GIVEN** an authenticated user with 7 unread items in the panel and a header badge showing `7`
- **WHEN** the user invokes `Marcar todas como leídas`
- **THEN** a cursor SHALL be persisted for each of those 7 items
- **AND** the header badge SHALL no longer be rendered
- **AND** the active portal screen SHALL not change

#### Scenario: Action is absent when nothing is unread

- **GIVEN** an authenticated user whose items are all read
- **WHEN** the notification panel renders
- **THEN** the mark-all action SHALL NOT be rendered

### Requirement: Provide a Path to the Full Communications Screen (REQ-NOTIF-05)

The system SHALL render a persistent `Ver todas las notificaciones` action at the end of the panel that navigates to the `Avisos y mensajes` screen and closes the panel.

#### Scenario: User opens the full screen from the panel

- **GIVEN** an authenticated user with the notification panel open
- **WHEN** the user activates `Ver todas las notificaciones`
- **THEN** the panel SHALL close
- **AND** the `Avisos y mensajes` screen SHALL become the active screen

#### Scenario: Action survives an empty panel

- **GIVEN** an authenticated user with no notification items
- **WHEN** the notification panel renders
- **THEN** the empty state SHALL be shown
- **AND** `Ver todas las notificaciones` SHALL still be reachable

### Requirement: Render Loading and Empty States (REQ-NOTIF-06)

WHILE the portal has not yet resolved its activity and thread subscriptions, the system SHALL render a skeleton inside the panel whose row geometry matches the real item rows; IF the resolved list is empty, the system SHALL render a written empty state instead of an empty container.

#### Scenario: Panel opened before subscriptions resolve

- **GIVEN** an authenticated user whose activity subscription has not resolved
- **WHEN** the user opens the notification panel
- **THEN** the panel SHALL render skeleton rows matching the height and spacing of real rows
- **AND** the skeleton container SHALL carry `role="status"` and `aria-busy="true"`

#### Scenario: Resolved list has no items

- **GIVEN** an authenticated user whose subscriptions resolved with no eligible items
- **WHEN** the notification panel renders
- **THEN** the panel SHALL show the empty state `No tienes notificaciones nuevas`

### Requirement: Adapt the Panel to Touch Widths (REQ-NOTIF-07)

WHERE the viewport is at mobile width, the system SHALL present the same notification content as a bottom sheet with safe-area insets applied and touch targets of at least 44 CSS pixels, instead of a panel anchored to the header.

#### Scenario: Panel becomes a bottom sheet on a phone

- **GIVEN** an authenticated user on a 390 CSS pixel wide viewport inside the Capacitor shell
- **WHEN** the user activates the header notification control
- **THEN** the notification content SHALL be presented as a bottom sheet
- **AND** its bottom padding SHALL respect the device safe-area inset
- **AND** every interactive row SHALL measure at least 44 CSS pixels on its shortest side

#### Scenario: Content reflows at 320 CSS pixels

- **GIVEN** a viewport of 320 CSS pixels
- **WHEN** the notification content renders
- **THEN** no horizontal page scrolling SHALL be required to read or activate any item

### Requirement: Keep the Panel Operable Without a Pointer (REQ-NOTIF-08)

The system SHALL expose the header notification control with `aria-haspopup`, an `aria-expanded` state that tracks the panel, and an accessible name that announces the unread count; WHILE the panel is open, `Tab` SHALL cycle within it, `Escape` SHALL close it, and focus SHALL return to the control on close.

#### Scenario: Keyboard user opens, traverses and dismisses the panel

- **GIVEN** an authenticated user with 3 unread items navigating by keyboard
- **WHEN** the user focuses the header notification control and activates it
- **THEN** the control SHALL report `aria-expanded="true"` and an accessible name including the unread count
- **AND** `Tab` SHALL move focus through the panel items without escaping to the page behind
- **AND** `Escape` SHALL close the panel and return focus to the control with `aria-expanded="false"`

#### Scenario: Screen reader announces the unread count

- **GIVEN** an authenticated user with 5 unread items
- **WHEN** assistive technology reads the header notification control
- **THEN** its accessible name SHALL include the count of unread items

### Requirement: Respect Reduced Motion and Numeric Alignment (REQ-NOTIF-09)

The system SHALL animate the panel entrance with a critically damped spring on `transform` and `opacity` only, SHALL replace that animation with an immediate state change WHEN the user prefers reduced motion, and SHALL render the unread badge with `tabular-nums` lining numerals.

#### Scenario: Reduced motion suppresses the entrance animation

- **GIVEN** a user whose environment reports `prefers-reduced-motion: reduce`
- **WHEN** the notification panel opens
- **THEN** the panel SHALL appear without a transition
- **AND** no property other than `transform` or `opacity` SHALL be transitioned in any state

#### Scenario: Badge digits do not shift the header

- **GIVEN** an unread count that changes from `9` to `10`
- **WHEN** the badge re-renders
- **THEN** its digits SHALL use tabular lining numerals
- **AND** counts above 99 SHALL render as `99+`
