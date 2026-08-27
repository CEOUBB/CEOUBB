# legal/privacy-and-terms Specification

## Purpose

Governs the published privacy policy and terms of use of Centro de Estudio UBB, the inventory and retention limits they promise over academic personal data, the data-subject rights procedure under Ley 21.719, the disclosed recipients of grades, and the telemetry and retention controls in code that keep those published promises enforceable rather than declarative.

## Requirements

### Requirement: Academic Personal Data Inventory Disclosure (REQ-PRIV-01)

The published privacy policy SHALL enumerate every category of personal data the platform stores about an identified student or teacher, including academic data that did not previously appear in the document.

The inventory MUST cover, at minimum: identity and authentication data (name, institutional email, Firebase UID, derived role, session records); academic structure data (enrollments, sections, subject, academic period, section role and enrollment state); academic performance data (grades on the Chilean 1.0–7.0 scale, evaluations, weighted averages, course progress); content data (teacher posts, student submissions, uploaded files); and operational data (push notification tokens, the grade audit trail with its actor, previous score, new score, timestamp and client IP address, and error and session telemetry).

#### Scenario: Grades are named as stored personal data

- **WHEN** a student or teacher reads the published privacy policy
- **THEN** the document SHALL state that official grades, evaluations and weighted averages on the 1.0–7.0 scale are stored by the platform

#### Scenario: The grade audit trail and its IP address are declared

- **WHEN** a reader reaches the data inventory section of the policy
- **THEN** the document SHALL state that every grade modification is recorded with the acting teacher, the previous and new score, the timestamp, and the client IP address of the actor

#### Scenario: Telemetry is declared

- **WHEN** a reader reaches the data inventory section of the policy
- **THEN** the document SHALL state that error reports and sampled session recordings are collected, and that those recordings mask text content

### Requirement: Recipient and Access Disclosure for Academic Data (REQ-PRIV-02)

The published privacy policy SHALL state, for each category of academic data, exactly which roles can read it, and MUST NOT omit an access path that the deployed authorization rules grant.

The disclosure MUST state that the platform owner holds read access to the grades of every section for institutional auditing purposes, that a teacher reads only the sections they teach, and that a student reads only their own record within a section where an active enrollment exists.

#### Scenario: Owner audit access is disclosed

- **WHEN** a student reads the recipients section of the policy
- **THEN** the document SHALL state that the platform administrator can read the grades of any section, and SHALL state that this access exists for auditing

#### Scenario: Teacher access is bounded to their sections

- **WHEN** a reader consults who can see their grades
- **THEN** the document SHALL state that a teacher reads grades only for the sections they teach

#### Scenario: No undisclosed reader exists

- **WHEN** the deployed authorization rules grant a role read access to a category of academic data
- **THEN** that role MUST appear in the recipients section of the published policy

### Requirement: Legal Basis and Institutional Independence Statement (REQ-PRIV-03)

The published privacy policy SHALL state the legal framework it operates under and the platform's independent, non-official standing relative to Universidad del Bío-Bío.

The document MUST reference Ley 21.719 sobre Protección de Datos Personales, MUST state that Centro de Estudio UBB is an independent student platform that neither represents nor replaces the university's official systems, and MUST state that grades recorded in the platform do not constitute the university's official academic record.

#### Scenario: Legal framework is named

- **WHEN** a reader reaches the legal basis section
- **THEN** the document SHALL name Ley 21.719 as the framework governing the processing of their personal data

#### Scenario: Platform grades are not the official record

- **WHEN** a student reads about grades in the policy
- **THEN** the document SHALL state that these grades are not the official academic record of Universidad del Bío-Bío

### Requirement: Per-Category Retention Disclosure (REQ-PRIV-04)

The published privacy policy SHALL state a retention period for each category of personal data, expressed as a bounded duration or as an explicit condition that ends the retention. A category MUST NOT be described only as retained "while the account is active" when a narrower bound is enforced in code.

The disclosure MUST state that the client IP address inside the grade audit trail is retained for at most 12 months, after which it is erased while the score history it accompanies is preserved.

#### Scenario: Audit IP retention bound is published

- **WHEN** a reader consults the retention section
- **THEN** the document SHALL state that the client IP address of a grade modification is erased 12 months after the modification

#### Scenario: Score history survives IP erasure

- **WHEN** the client IP address of an audit entry is erased
- **THEN** the previous score, new score, actor, student, section and timestamp of that entry MUST remain intact

### Requirement: Data Subject Rights Procedure (REQ-PRIV-05)

The published privacy policy SHALL describe how a data subject exercises the rights recognised by Ley 21.719 — access, rectification, deletion, opposition, portability, and blocking — and MUST publish a single contact channel and a maximum response deadline.

The contact channel MUST be `contacto@ceoubb.com`. No personal or non-institutional email address may appear as a contact point on a user-facing legal page.

#### Scenario: Every right is listed with its procedure

- **WHEN** a student wants to request deletion of their data
- **THEN** the policy SHALL state the channel to write to, what the request must contain to identify the requester, and the maximum number of days within which the platform responds

#### Scenario: The published contact is institutional

- **WHEN** any user-facing legal page renders its contact section
- **THEN** the address shown MUST be `contacto@ceoubb.com` and MUST NOT be a personal address outside the `ceoubb.com` domain

#### Scenario: Grade rectification is routed to the teacher

- **WHEN** a student asks to rectify a grade they believe is wrong
- **THEN** the policy SHALL state that the grade is corrected by the teacher of the section, and that the platform records the correction in the audit trail

### Requirement: Published Terms of Use (REQ-PRIV-06)

The platform SHALL publish a terms of use document at a stable public route, reachable from the portal footer and listed in the sitemap alongside the privacy policy.

The terms MUST state: that the platform is independent of Universidad del Bío-Bío and does not replace Moodle UBB or Adecca UBB; that access is limited to holders of `@alumnos.ubiobio.cl` and `@ubiobio.cl` addresses; that the teacher who publishes a grade is responsible for its accuracy; acceptable-use limits; the absence of an availability guarantee; and the grounds on which an account may be suspended.

#### Scenario: Terms are reachable from the portal

- **WHEN** a visitor reads the portal footer
- **THEN** links to both the privacy policy and the terms of use SHALL be present

#### Scenario: Terms are discoverable by crawlers

- **WHEN** the sitemap is requested
- **THEN** it SHALL list the terms of use route alongside the privacy policy route

#### Scenario: Eligibility is stated

- **WHEN** a reader consults who may use the platform
- **THEN** the terms SHALL state that only institutional `@alumnos.ubiobio.cl` and `@ubiobio.cl` addresses are admitted and that any other domain is rejected

### Requirement: Session Recording Must Not Capture Academic Content (REQ-PRIV-07)

Session recording telemetry SHALL be configured so that recorded sessions cannot carry the textual content of grades, student names, or any other academic personal data.

All text nodes and all input values MUST be masked in recordings, and media MUST be blocked, so that a recording preserves layout and interaction sequence without academic content. These guarantees MUST be stated explicitly in the telemetry configuration rather than inherited from library defaults, so that a dependency upgrade cannot silently withdraw a guarantee the published policy makes.

#### Scenario: A recorded grade screen carries no scores

- **WHEN** a session recording is captured on a screen displaying student grades
- **THEN** the recording MUST contain masked placeholders in place of the score values and student names

#### Scenario: Input values are never recorded

- **WHEN** a teacher types a score into a grade input while a session is being recorded
- **THEN** the typed value MUST NOT appear in the recording

#### Scenario: Masking survives a dependency upgrade

- **WHEN** the telemetry configuration is inspected
- **THEN** text masking, input masking and media blocking MUST each be declared explicitly, and MUST NOT depend on the default value of the recording library

### Requirement: Enforced Erasure of Aged Audit IP Addresses (REQ-PRIV-08)

The system SHALL erase the client IP address of grade audit entries once they exceed the retention period published in the privacy policy, without deleting the audit entries themselves.

The erasure routine MUST operate on a bounded batch per execution, MUST run on a schedule without manual intervention, and MUST reject unauthenticated invocation.

#### Scenario: Aged IP addresses are erased

- **WHEN** the retention routine runs and a grade audit entry is older than 12 months and still carries an IP address
- **THEN** that entry's IP address MUST become empty and the rest of the entry MUST be unchanged

#### Scenario: Recent entries are preserved

- **WHEN** the retention routine runs and a grade audit entry is within the last 12 months
- **THEN** that entry's IP address MUST be left untouched

#### Scenario: The routine is bounded

- **WHEN** the retention routine executes against any number of eligible entries
- **THEN** it MUST process at most a fixed maximum number of entries in that execution and report how many it processed

#### Scenario: Unauthenticated invocation is rejected

- **WHEN** the scheduled retention endpoint is called without the configured scheduler credential
- **THEN** the system MUST respond with HTTP 401 and MUST NOT modify any audit entry
