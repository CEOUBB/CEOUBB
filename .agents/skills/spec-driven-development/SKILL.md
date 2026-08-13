---
name: spec-driven-development
description: Master skill for Spec-Driven Development (SDD). Use when designing, refactoring, or building non-trivial features, APIs, data models, or quality remediations. Enforces the 5-phase contract pipeline (Constitution -> Specify -> Design -> Tasks -> Execute & Verify) with formal EARS syntax, BDD Given-When-Then criteria, and dependency DAG task decomposition.
version: "2.0.0"
---

# Spec-Driven Development (SDD) for AI Coding Agents

Spec-Driven Development elevates structured, machine-readable specifications to the primary source of truth in the software lifecycle. **The formal specification precedes, constrains, guides, and validates all implementation.**

In SDD, software engineering means evolving specifications. Code is the transient, generated artifact of the last mile.

---

## 1. Core Principles & Guardrails

1. **Spec First, Code Second**: No code changes for non-trivial features, migrations, or refactors without an approved specification in `docs/specs/` (or active spec directory).
2. **Single Source of Truth (SSOT)**: Specifications live in version control and serve as the binding contract for both humans and autonomous agents.
3. **Formal EARS Syntax**: Functional requirements MUST be expressed using Easy Approach to Requirements Syntax.
4. **Deterministic BDD Acceptance Criteria**: Every feature requirement MUST define testable `Given-When-Then` Gherkin scenarios.
5. **Self-Correction & Test Protection**: If tests fail during implementation, compare the error against the specification before attempting a fix. **Never weaken or delete test assertions to force a pass** unless the specification itself is explicitly amended with human approval.
6. **Living Specifications**: When requirements change during execution, update the spec and architecture documents in the same commit/PR.

---

## 2. The 5-Phase SDD Pipeline & Stage Gates

```
Phase 0: Project Constitution & Invariants (CONSTITUTION.md / AGENTS.md)
   │
   ▼
Phase 1: Requirements & Intent Capture (docs/specs/<track>-<feature>.md -> EARS + BDD)
   │  [STAGE GATE 1: Requirements Review & Sign-Off]
   ▼
Phase 2: Technical & Architectural Design (Mermaid Topology, Schemas, Error Taxonomy)
   │  [STAGE GATE 2: Architecture Review & Sign-Off]
   ▼
Phase 3: Task Decomposition & DAG Generation (Atomic, Dependency-Ordered Units)
   │  [STAGE GATE 3: Task Order & Scope Review]
   ▼
Phase 4: Incremental Execution & Self-Correction (1 Task at a time -> Test -> Checkbox [x])
   │
   ▼
Phase 5: Automated Verification & Quality Gate Sign-Off (Full Test Suite + Linters + Health Check)
```

---

## 3. Requirement Engineering (EARS & RFC 2119)

All functional requirements in Phase 1 MUST use one of the 5 EARS patterns combined with RFC 2119 keywords (`MUST`, `SHALL`, `SHOULD`, `MAY`):

| EARS Pattern | Formal Syntax | Example |
| :--- | :--- | :--- |
| **Ubiquitous** | The system SHALL [action]. | `REQ-01: The system SHALL persist course records in Turso/libSQL.` |
| **Event-Driven** | WHEN [trigger], the system SHALL [response]. | `REQ-02: WHEN a teacher publishes an evaluation, the system SHALL record an audit-logged gradebook entry.` |
| **State-Driven** | WHILE [in state], the system SHALL [response]. | `REQ-03: WHILE a section is in state 'archivado', the system SHALL enforce read-only access.` |
| **Unwanted Behavior** | IF [invalid condition], THEN the system SHALL [mitigation]. | `REQ-04: IF an unauthorized email domain attempts sign-in, THEN the system SHALL return HTTP 403.` |
| **Optional Feature** | WHERE [feature enabled], the system SHALL [behavior]. | `REQ-05: WHERE push notifications are enabled, the system SHALL dispatch an FCM payload.` |

---

## 4. BDD Acceptance Criteria (Gherkin Scenarios)

Every requirement MUST have matching Gherkin scenarios:

```gherkin
Scenario: Authorized teacher publishes new course assignment
  Given an authenticated user with role "Teacher"
  And the user is enrolled as instructor in section "estatica-2026-2-1"
  When they submit a POST request to "/api/classroom/posts" with a valid PDF payload
  Then the response status code must be 201
  And a new document must exist in Firestore under "courses/estatica-2026-2-1/posts"
  And an FCM notification topic must be triggered for enrolled students
```

---

## 5. Technical Design Standards (Phase 2)

Technical design documents MUST define:
1. **Component Topology & Sequence**: Visualized via Mermaid diagrams.
2. **Data Schemas & Contracts**: Exact TypeScript / Zod interfaces, SQL schemas (Drizzle), or API DTOs.
3. **Error Taxonomy**: Table mapping error types, HTTP status codes, error codes, and retry strategies.
4. **Security & Performance Budgets**: Enforcing auth boundaries, rate limits, and latency/memory targets.

---

## 6. Task Decomposition Rules & Execution DAG (Phase 3 & 4)

When breaking down designs into execution checklists:
1. **Strict Dependency Order**: Database models & schemas $\rightarrow$ Core business logic/services $\rightarrow$ API endpoints $\rightarrow$ UI components $\rightarrow$ E2E integration tests.
2. **Traceability**: Every task MUST cite its requirement ID (`REQ-XX`).
3. **Atomic Scope**: Each task MUST be small (10–50 lines of code changes) to maintain focus and context hygiene.
4. **Explicit Verification Command**: Every task MUST state its exact verification command (`pnpm run test:unit`, `npx vitest run ...`, `npx react-doctor@latest --verbose`).
5. **Sequential Execution**: Execute tasks one by one. Run the verification command. Mark the checkbox `[x]` upon verification.

---

## 7. When to Use SDD (Decision Heuristic Matrix)

- **Mandatory SDD (`docs/specs/`)**:
  - New features, subsystems, or modules
  - Database schema changes & migrations
  - Authentication, authorization, or security rules
  - API endpoint contracts & refactors
  - Quality, performance, or diagnostic remediations
- **Lightweight / Direct Prompting**:
  - Isolated 1-2 line CSS styling or typo fixes
  - Updating existing documentation comments
  - Throwaway one-off scratch exploration scripts
