## ADDED Requirements

### Requirement: Present Enrolled-Section Announcements (REQ-COMM-01)

WHILE an authenticated user has active section memberships, the system SHALL present the recent publications already loaded from those sections in descending time order and SHALL NOT create a per-user copy of each announcement.

#### Scenario: Student returns to the portal

- **GIVEN** an authenticated student enrolled in two sections with recent publications
- **WHEN** the student opens `Avisos y mensajes`
- **THEN** the announcements tab SHALL show publications from only those sections with the newest first
- **AND** no collection-group or university-wide query SHALL execute

### Requirement: Persist Read State Across Clients (REQ-COMM-02)

WHEN a user opens an announcement, opens a conversation or invokes `Marcar todo como leído`, the system SHALL persist server-timestamped private cursors under `users/{uid}/notificationReads` and SHALL derive the unread badge from items newer than those cursors.

#### Scenario: Announcement is read on web and revisited on Android

- **GIVEN** an unread announcement in section `estatica`
- **WHEN** the user marks the announcement as read in the browser
- **THEN** a cursor `course:estatica` SHALL be stored with the server clock
- **AND** the same remote portal opened in Capacitor SHALL not count that announcement as unread

### Requirement: Provide One Private Student Thread per Section (REQ-COMM-03)

WHEN an enrolled student sends a valid message to the teaching team, the system SHALL create or reuse `courses/{courseId}/messageThreads/{studentUid}` and SHALL append the message without exposing other student threads.

#### Scenario: Student writes to the professor for the first time

- **GIVEN** an authenticated student enrolled in `estatica` with no existing thread
- **WHEN** the student sends `¿Podría revisar mi consulta?`
- **THEN** one thread whose ID equals the student UID SHALL be created
- **AND** one immutable message SHALL be appended to its `messages` subcollection

### Requirement: Allow Section Teaching Team Replies (REQ-COMM-04)

WHILE a user has teaching authority for a section, the system SHALL expose a bounded list of that section's recent student threads and SHALL allow replies inside a selected existing thread.

#### Scenario: Teacher replies to a student

- **GIVEN** a teacher assigned to `estatica` and an existing student thread
- **WHEN** the teacher opens the thread and sends a reply
- **THEN** the reply SHALL appear in the same real-time conversation
- **AND** the student SHALL see the thread as unread until opening it

### Requirement: Enforce Conversation Isolation (REQ-COMM-05)

IF a client is unauthenticated, not enrolled in the section, or is a student requesting a thread whose ID differs from its UID, THEN Firestore SHALL deny the read or write; message updates and deletes SHALL always be denied.

#### Scenario: Student attempts an IDOR read

- **GIVEN** two students enrolled in the same section
- **WHEN** the first student requests the second student's thread document
- **THEN** Firestore SHALL deny access

### Requirement: Validate Immutable Message Writes (REQ-COMM-06)

WHEN a participant sends a message, the system SHALL trim its body, require 1 through 2,000 characters, use the authenticated author and server clock, and atomically synchronize the thread preview with the immutable message.

#### Scenario: Oversized message is rejected

- **GIVEN** an enrolled participant composing a message
- **WHEN** the body exceeds 2,000 characters after trimming
- **THEN** the UI SHALL present a Chilean-Spanish validation message
- **AND** no Firestore write SHALL execute

### Requirement: Bound Communication Reads (REQ-COMM-07)

The system SHALL observe at most 40 enrolled sections, 25 thread summaries per teaching section, 100 messages in an open conversation, 200 read cursors and 120 merged feed or thread items; it SHALL NOT use `collectionGroup` or unbounded queries for communications.

#### Scenario: Teacher has many historical conversations

- **GIVEN** a teacher assigned to a section with more than 25 threads
- **WHEN** the communication center loads
- **THEN** only the 25 most recently updated thread summaries SHALL be subscribed
- **AND** older history SHALL not be fetched automatically

### Requirement: Provide Accessible Web and Capacitor Navigation (REQ-COMM-08)

The system SHALL expose `Avisos y mensajes` from desktop navigation, a labelled header control and the Capacitor bottom bar, with semantic tabs, live unread status, associated form feedback, visible keyboard focus, 44 px touch targets, reduced-motion support and reflow without horizontal page scrolling at 320 CSS pixels.

#### Scenario: Mobile student starts a conversation with keyboard assistance

- **GIVEN** a student using the mobile-width portal with reduced motion enabled
- **WHEN** the student opens Messages, selects a section and submits an empty body
- **THEN** focus SHALL remain in the associated composer with an announced validation message
- **AND** no motion-dependent or horizontally clipped control SHALL block correction
