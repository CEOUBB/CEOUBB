---
name: spec-driven-development
description: Master skill for Spec-Driven Development (SDD) Enterprise unified with OpenSpec. Use when designing, refactoring, or building non-trivial features, APIs, data models, or quality remediations. Enforces the 5-phase contract pipeline (Explore -> Propose -> Design & Task -> Apply/TDD -> Verify & Archive) with living system specifications in openspec/specs/, formal EARS syntax, BDD Given-When-Then criteria, SHA-256 Test-Locking guards, TDD Triangulation, and automated CLI validation (openspec validate).
version: "5.0.0"
---

# Spec-Driven Development (SDD) Enterprise + OpenSpec

Spec-Driven Development elevates machine-readable specifications to the primary source of truth in the software engineering lifecycle. **The formal specification precedes, constrains, guides, and validates all implementation.**

In SDD Enterprise with OpenSpec, living domain specifications in `openspec/specs/` document the current canonical truth of the system, while atomic delta proposals in `openspec/changes/<change-id>/` encapsulate in-flight features until merged and archived.

---

## 1. Core Principles & Guardrails

1. **Spec First, Code Second:** Generating implementation code for non-trivial features, migrations, or cross-cutting refactors without an approved change proposal in `openspec/changes/` or living spec in `openspec/specs/` is strictly prohibited.
2. **Living Specifications (SSOT):** Domain specifications in `openspec/specs/<domain>/spec.md` constitute the persistent source of truth. When changes are completed, `openspec archive <change-id>` synchronizes the delta into the living specs.
3. **Formal EARS Syntax:** All functional requirements MUST be formulated using one of the 5 canonical EARS patterns with RFC 2119 keywords (`MUST`, `SHALL`, `SHOULD`).
4. **Binding BDD Acceptance Criteria:** Every functional requirement MUST be linked to formal `Given-When-Then` (Gherkin) scenarios, mapped $1:1$ to executable test assertions.
5. **Deterministic Test-Locking (SHA-256 Guard):** During the execution/implementation phase (GREEN), test files in `tests/` are in **read-only mode**. The verification harness verifies file integrity hashes via `scripts/verify-test-hashes.mjs`.
6. **Mandatory TDD Triangulation:** The agent must document the RED phase (expected assertion failure trace), the GREEN phase (minimal business logic to pass the test), and the REFACTOR phase (code optimization maintaining green status).
7. **No Test Weakening:** Agents are strictly forbidden from relaxing assertions, deleting tests, adding `.skip()`, or widening tolerance thresholds to force a build to pass. If a test fails, the defect resides in the implementation code or demands a formal specification amendment.
8. **Bidirectional Code Traceability:** Every introduced function, route handler, or schema MUST include a code-level traceability marker `// Implements: REQ-XX`.
9. **Automated CLI Validation:** Every proposal and living spec must pass `openspec validate --specs` (included in `pnpm run verify:fast`).

---

## 2. The Unified 5-Phase SDD + OpenSpec Pipeline

```
Phase 0: Explore & Constitution (/opsx:explore + AGENTS.md + openspec/specs/)
   │
   ▼
Phase 1: Formal Proposal & Specs (/opsx:propose <name> -> proposal.md + specs/)
   │  [STAGE GATE 1: Requirements Review & Approval (EARS + BDD)]
   ▼
Phase 2: Technical Design & Architecture (design.md -> Schemas, Mermaid, Blast Radius)
   │  [STAGE GATE 2: Architecture Review & Approval]
   ▼
Phase 3: Task Decomposition & DAG (tasks.md -> Ordered Atomic Checkboxes)
   │  [STAGE GATE 3: Task Ordering & Scope Approval]
   ▼
Phase 4: Incremental TDD Execution (/opsx:apply -> RED -> GREEN -> REFACTOR -> [x])
   │
   ▼
Phase 5: Automated Verification & Archive (verify:fast + pnpm test + openspec archive)
```

### 2.1 Specification Lifecycle States

| Status | Meaning | Set By |
| :--- | :--- | :--- |
| `BORRADOR / PROPOSED` | Change proposal under construction in `openspec/changes/`. No business code may be written. | Agent / Architect |
| `APROBADA` | Requirements, technical design, and DAG tasks approved. Ready for TDD setup. | Human approval / Recorded by agent |
| `EN EJECUCION / APPLY` | Phase 4 in progress; DAG tasks executing and passing test-locked verification. | Agent |
| `VERIFICADA & ARCHIVADA` | Phase 5 completed: full test suite green, zero lint warnings, spec archived into `openspec/specs/`. | Agent after `openspec archive` |

---

## 3. Requirements Engineering with EARS Syntax

All functional requirements MUST conform to one of the following formal patterns:

| EARS Pattern | Formal Syntax | Primary Use Case | Example |
| :--- | :--- | :--- | :--- |
| **Ubiquitous** | *The \<system\> SHALL \<response\>.* | Fundamental, continuous invariants. | `REQ-01: The system SHALL persist all enrollment records in Turso within an ACID transaction.` |
| **Event-Driven** | *WHEN \<trigger\>, the \<system\> SHALL \<response\>.* | Direct responses to discrete actions. | `REQ-02: WHEN a teacher updates a grade, the system SHALL emit an append-only audit log entry.` |
| **State-Driven** | *WHILE \<state\>, the \<system\> SHALL \<response\>.* | Behavior active only during a state. | `REQ-03: WHILE a section is archived, the system SHALL enforce read-only access on all endpoints.` |
| **Unwanted Behavior** | *IF \<condition\>, THEN the \<system\> SHALL \<response\>.* | Error handling, edge cases, and limits. | `REQ-04: IF a non-institutional email signs in, THEN the system SHALL reject authentication with HTTP 403.` |
| **Optional Feature** | *WHERE \<feature\>, the \<system\> SHALL \<response\>.* | Platform-specific or flagged features. | `REQ-05: WHERE running on Android Capacitor, the system SHALL invoke native haptic feedback.` |
| **Complex** | *WHILE \<state\>, WHEN \<trigger\>, the \<system\> SHALL \<response\>.* | Compound pre-conditions and events. | `REQ-06: WHILE offline, WHEN a student views cached materials, the client SHALL serve content from cache.` |

---

## 4. BDD Acceptance Criteria (Gherkin Scenarios)

Every EARS requirement is accompanied by executable Gherkin scenarios:

```gherkin
Scenario: Teacher publishes course assignment with PDF attachment
  Given an authenticated user with role "Teacher" derived from "@ubiobio.cl"
  And the user is formally enrolled in course section "ESTATICA-2026-1"
  When they submit a POST request to "/api/classroom/posts" with a valid PDF payload
  Then the response status code must be 201
  And a document must be persisted in Firestore under "courses/ESTATICA-2026-1/posts"
  And a push notification must be dispatched to all enrolled students
```

---

## 5. Test-Locking & TDD Triangulation Safeguards

### 5.1 Test-Locking Protocol
1. During the RED phase, the agent creates test files in `tests/` modeling the BDD criteria.
2. Run `node scripts/verify-test-hashes.mjs --generate` to record cryptographic SHA-256 snapshots in `.agents/.test-hashes.json`.
3. During the GREEN phase, the agent implements business logic in `lib/` or `app/`.
4. The verification gate (`pnpm run verify:fast`) automatically validates that test assertions remain intact.

### 5.2 Test Failure Recovery Algorithm
When a test fails during verification:
- **Case 1: Implementation does not satisfy the specification.** $\rightarrow$ Fix implementation in `app/` or `lib/`.
- **Case 2: Test contains a defect and does not reflect approved BDD.** $\rightarrow$ Correct the test, document rationale, and regenerate hashes.
- **Case 3: Approved specification is contradictory.** $\rightarrow$ **STOP.** Request human review before altering test code.

---

## 6. OpenSpec Agent Commands Quick Reference

| Command | Action |
| :--- | :--- |
| `/opsx:explore` | Interactive brainstorming and technical trade-offs evaluation before writing artifacts. |
| `/opsx:propose <name>` | Generate structured change proposal in `openspec/changes/<name>/` (`proposal.md`, `specs/`, `design.md`, `tasks.md`). |
| `/opsx:apply` | Incrementally execute tasks in `tasks.md` following TDD and SHA-256 test-locking. |
| `openspec validate --specs` | Validate syntax and structure of living specifications. |
| `openspec archive <name>` | Archive completed change and merge delta specifications into canonical `openspec/specs/`. |

---

## 7. Phase 5 Definition of Done (DoD)

A task is complete and marked as `VERIFICADA` only when:
1. `pnpm run verify:fast` and `pnpm test` pass with exit code `0` (zero errors, zero warnings).
2. Every requirement `REQ-XX` is mapped to an `// Implements: REQ-XX` code marker.
3. OpenSpec specifications pass validation (`openspec validate --specs`).
4. The specification status is updated and `PLAN.md` records the structured handoff.
