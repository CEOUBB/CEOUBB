---
name: spec-driven-development
description: Master skill for Spec-Driven Development (SDD). Use when designing, refactoring, or building non-trivial features, APIs, data models, or quality remediations. Enforces the 5-phase contract pipeline (Constitution -> Specify -> Design -> Tasks -> Execute & Verify) with formal EARS syntax, BDD Given-When-Then criteria, and dependency DAG task decomposition.
version: "3.0.0"
---

# Spec-Driven Development (SDD) for AI Coding Agents

Spec-Driven Development elevates structured, machine-readable specifications to the primary source of truth in the software lifecycle. **The formal specification precedes, constrains, guides, and validates all implementation.**

In SDD, software engineering means evolving specifications. Code is the transient, generated artifact of the last mile.

---

## 1. Core Principles & Guardrails

1. **Spec First, Code Second**: No code changes for non-trivial features, migrations, or refactors without an approved specification in `docs/specs/`. See §7 for the tier that applies.
2. **Single Source of Truth (SSOT)**: Specifications live in version control and serve as the binding contract for both humans and autonomous agents.
3. **Formal EARS Syntax**: Functional requirements MUST be expressed using Easy Approach to Requirements Syntax.
4. **Deterministic BDD Acceptance Criteria**: Every feature requirement MUST define testable `Given-When-Then` Gherkin scenarios.
5. **Self-Correction & Test Protection**: If tests fail during implementation, follow the recovery algorithm in §8. **Never weaken or delete test assertions to force a pass.**
6. **Living Specifications**: If a pull request changes code that implements `REQ-XX`, that pull request MUST also contain the updated specification. Phase 5 verifies this.
7. **Bidirectional Traceability**: Tasks cite their requirement IDs, and implementation code carries an `Implements:` marker (§6.2). Code with no marker and requirements with no marker are both defects.
8. **Density Over Volume**: A specification is a contract, not an essay. Target 200 lines or fewer of **narrative prose** per feature; Gherkin scenario blocks and the task DAG do not count against that budget, since one assertion or one task per line is already the dense form this rule asks for. Prefer tables and code blocks over paragraphs. A spec nobody reads in full reproduces the exact problem SDD exists to solve.

---

## 2. The 5-Phase SDD Pipeline & Stage Gates

```
Phase 0: Project Constitution & Invariants (AGENTS.md — read, do not re-author)
   │
   ▼
Phase 1: Requirements & Intent Capture (docs/specs/p<N>-<slug>.md -> EARS + BDD)
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
Phase 5: Automated Verification & Quality Gate Sign-Off (Full Test Suite + Linters + Spec Sync)
```

### 2.1 Gate Ownership (a gate with no owner is theater)

An agent MUST NOT approve its own gate. A gate is passed only when a human maintainer states approval in the conversation, and the agent records it by advancing the `Status` field in the spec header:

| Status | Meaning | Who sets it |
| :--- | :--- | :--- |
| `BORRADOR` | Draft under construction. No code may be written. | Agent |
| `APROBADA` | Human signed off on requirements and design. Execution may begin. | Human approval, agent records |
| `EN EJECUCION` | Phase 4 in progress; task checkboxes advancing. | Agent |
| `VERIFICADA` | Phase 5 passed: full suite green, spec synchronized. | Agent, after evidence |

`APROBADA CON CONDICIONES` is permitted when the human approves with recorded caveats; the caveats MUST appear as formal requirements in the spec, not as loose prose.

### 2.2 Specification File Convention

One feature, one file: `docs/specs/p<N>-<slug>.md` (for example `docs/specs/p5-capacitor-mobile-migration.md`). Requirements, design, and the task DAG all live in that single document. Do not scatter a feature across separate spec/design/task files; the reviewer reads one artifact or reads none.

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

Every requirement MUST be verifiable. If you cannot name the command or assertion that proves it, the requirement is prose and must be rewritten or dropped.

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

Technical design sections MUST define:
1. **Component Topology & Sequence**: Visualized via Mermaid diagrams.
2. **Data Schemas & Contracts**: Exact TypeScript / Zod interfaces, SQL schemas (Drizzle), or API DTOs.
3. **Error Taxonomy**: Table mapping error types, HTTP status codes, error codes, and retry strategies.
4. **Security & Performance Budgets**: Enforcing auth boundaries, rate limits, and latency/memory targets.
5. **Affected Invariants**: Name the `AGENTS.md` invariants the change touches (role policy, the 5-file access-policy synchronization, grade math seam, library duplication) and state how each is preserved. Specify against this project's invariants, not against a generic security checklist.

---

## 6. Task Decomposition Rules & Execution DAG (Phase 3 & 4)

### 6.1 Task Rules
1. **Strict Dependency Order**: Database models & schemas -> Core business logic/services -> API endpoints -> UI components -> E2E integration tests.
2. **Traceability**: Every task MUST cite its requirement ID (`REQ-XX`).
3. **Atomic Scope**: Each task MUST be small (10–50 lines of code changes) to maintain focus and context hygiene.
4. **Explicit Verification Command**: Every task MUST state its exact verification command (`pnpm run test:unit`, `npx vitest run ...`, `npx react-doctor@latest --verbose`).
5. **Sequential Execution**: Execute tasks one by one. Run the verification command. Mark the checkbox `[x]` upon verification.

### 6.2 Code-Level Traceability Markers

Implementation code MUST cite the requirement it satisfies, using a comment on the function, route handler, rule block, or schema it introduces:

```typescript
// Implements: REQ-CAP-12
export async function signInWithNativeCredential() { /* ... */ }
```

This makes two failure modes greppable instead of invisible:
- **Orphan code**: a new exported unit with no `Implements:` marker was not specified. Either it is scope creep, or the spec is missing a requirement.
- **Orphan requirement**: a `REQ-XX` with no marker anywhere in the tree was never implemented, even if all task checkboxes are ticked.

Markers are required in the files a task's `Files:` list creates or substantially rewrites. Do not retrofit them across untouched legacy code.

---

## 7. When to Use SDD (Decision Heuristic Matrix)

SDD earns its cost on high-entropy, multi-file work and loses it on small edits. Producing a specification for a 20-line change costs several times the change itself in tokens and latency, delays the fix, and buries the real diff. Pick the tier honestly.

| Tier | Applies To | Artifact |
| :--- | :--- | :--- |
| **Full SDD** | New features, subsystems, or modules; database schema changes & migrations; authentication, authorization, or security rules; API endpoint contracts; cross-cutting refactors; quality/performance remediations. | `docs/specs/p<N>-<slug>.md`, all 5 phases, all 3 gates. |
| **Lightweight Plan** | Bounded bug fixes, single-file refactors, isolated component changes with no contract or schema impact. | In-conversation plan: root cause, files touched, verification command. No file in `docs/specs/`. A regression test is still mandatory when behavior changed. |
| **Direct Edit** | Isolated 1–2 line CSS or copy fixes, typos, comment and documentation updates, throwaway scratch scripts. | None. Edit, lint, done. |

When a Lightweight Plan reveals contract, schema, or auth impact mid-task, stop and escalate to Full SDD rather than continuing.

---

## 8. Test Failure Recovery Algorithm (Phase 4)

When a verification command fails, diagnose before editing. The branch determines what may be modified:

| Diagnosis | Action |
| :--- | :--- |
| The implementation does not satisfy the approved specification. | Fix the implementation code. Re-run the verification command. |
| The test does not faithfully encode the specification's BDD scenario. | Fix the test so it asserts exactly the specified criterion. Record why in the task notes. |
| The test correctly encodes the specification, and the specification itself is wrong or contradictory. | **STOP.** Do not weaken, skip, or delete the assertion. Report the contradiction and request a formal spec amendment with human approval. |

Deleting an assertion, adding `.skip`, loosening a matcher, or widening a tolerance to obtain a green run is a specification violation regardless of the diagnosis.

---

## 9. Phase 5 Verification Gate

The task is complete only when all of the following hold:
1. `pnpm run lint`, `pnpm run typecheck`, and `pnpm test` pass, with output cited.
2. Every BDD scenario in the spec maps to a passing automated assertion.
3. Every `REQ-XX` in the spec has at least one `Implements:` marker in the tree (§6.2).
4. **Spec sync check**: the diff contains the specification file whenever it contains code implementing that spec's requirements.
5. The spec `Status` is advanced to `VERIFICADA`, and `PLAN.md` is updated with the handoff notes required by `AGENTS.md`.
