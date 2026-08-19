# SPEC-009: Enterprise AI Agent Harness Evolution, Test-Locking & Deterministic Governance

- **Status:** VERIFICADA
- **Creation Date:** 2026-08-17
- **Author / Responsible Agent:** Senior AI Systems & Harness Architect (Antigravity)
- **Reviewer:** Pipe / Joaquín
- **Related ADRs:** ADR-0001, ADR-0002, ADR-0003, ADR-0004
- **Target Files:** `AGENTS.md`, `.agents/rules/*.mdc`, `.agents/skills/spec-driven-development/SKILL.md`, `scripts/verify-test-hashes.mjs`, `package.json`, `.github/workflows/ci.yml`, `docs/architecture/`

---

## 1. Executive Summary & Problem Statement

To scale **Centro de Estudio UBB (CEOUBB)** into the official Learning Management System of Universidad del Bío-Bío, the engineering workflow must evolve from probabilistic AI assistance to an **Enterprise Spec-Driven Development (SDD) Harness**.

Autonomous AI coding agents operating without deterministic guardrails risk:

1. **Silent Test Assertion Weakening:** Relaxing test assertions or skipping tests when faced with complex compiler or domain logic failures.
2. **Context Saturation & Hallucination:** Flooding context windows with monolithic instructions, triggering the _Lost-in-the-Middle_ phenomenon.
3. **Dual-Store Desynchronization:** Mutating relational records in Turso without projecting role permissions into Cloud Firestore.
4. **Slow Feedback Loops:** Relying exclusively on slow production builds (`pnpm test`, ~10-15s) rather than instant deterministic verification gates (<3s).

This specification formalizes the enterprise harness architecture, test-locking SHA-256 safeguards, glob-scoped modular context rules, dual-store synchronization, and contractual Definition of Done (DoD).

---

## 2. Formal Requirements (EARS Syntax)

### A. Test-Locking & Cryptographic Integrity

- **REQ-HARN-01 (Ubiquitous):** The verification harness SHALL compute SHA-256 checksums of all test files in `tests/` and compare them against `.agents/.test-hashes.json`.
- **REQ-HARN-02 (Unwanted Behavior):** IF any test assertion in `tests/` is modified or removed during code execution without regenerating the hash snapshot, THEN the verification script SHALL terminate immediately with exit code 1.
- **REQ-HARN-03 (Event-Driven):** WHEN `pnpm run verify:fast` is invoked, the harness SHALL execute TypeScript typechecking, all fast unit tests, and test-locking checksum verification within 3.0 seconds.

### B. Context Modularization & Anti-Slop Directives

- **REQ-HARN-04 (Ubiquitous):** Governance rules in `.agents/rules/*.mdc` SHALL declare YAML frontmatter with explicit `globs` and `alwaysApply: false` for conditional injection.
- **REQ-HARN-05 (Ubiquitous):** All agent governance documents, rules, skills, and architectural decision records SHALL be written strictly in English to maximize attention bias and prompt density.
- **REQ-HARN-06 (State-Driven):** WHILE generating UI components, agents SHALL strictly consume semantic tokens from `DESIGN.md` (OKLCH color space, `Source Serif 4` display typography, and `motion/react` spring physics).

### C. Trans-Store Synchronization & Security Invariants

- **REQ-HARN-07 (Event-Driven):** WHEN an administrator updates a user's role via `PATCH /api/admin/users`, the system SHALL persist the role update in Turso and concurrently synchronize the projection in Firestore under `users/{uid}`.
- **REQ-HARN-08 (Ubiquitous):** Role derivation SHALL remain deterministic and governed exclusively by `lib/access-policy.ts` -> `roleForEmail()`.

---

## 3. BDD Acceptance Criteria (Gherkin Scenarios)

```gherkin
Feature: Deterministic Test-Locking and Fast Verification Gate

  Scenario: Fast verification succeeds when tests and code are compliant
    Given all test files in "tests/" match their recorded SHA-256 hashes
    And TypeScript typecheck contains zero compilation errors
    When the developer or agent executes "pnpm run verify:fast"
    Then the process exits with code 0 in under 3.0 seconds
    And terminal reports full test pass and hash integrity verification

  Scenario: Fast verification detects tampered test assertions
    Given an agent modifies an assertion in "tests/access-policy.test.ts"
    When "pnpm run verify:fast" is executed
    Then the process terminates with exit code 1
    And terminal outputs "[Test-Locking ERROR] Violacion de inmutabilidad de pruebas detectada"

  Scenario: Admin role change synchronizes to Firestore projection
    Given an authenticated owner session
    When the owner updates user "usr-test" from "student" to "teacher"
    Then the Turso "users" table is updated with role "teacher"
    And "updateRemoteUserRole" is invoked to update "users/usr-test" in Firestore
    And Firestore security rules evaluate "isTeacher()" as true
```

---

## 4. Technical Design & Component Architecture

### 4.1 Modular Context Rules Topology

- `.agents/rules/001-database-turso.mdc`: Drizzle transactions, bounded pagination (`.limit(N)`).
- `.agents/rules/002-access-security.mdc`: Role derivation, four-mirror synchronization.
- `.agents/rules/003-ui-components.mdc`: OKLCH tokens, typography pairing, spring physics, zero raw SVGs.
- `.agents/rules/004-mobile-capacitor.mdc`: Capacitor 7 remote-first bridge, dynamic safe areas.
- `.agents/rules/005-api-webhooks.mdc`: App Router route handlers, Zod schemas, structured errors.

### 4.2 Cascading Verification Pipeline

```
Gate 1: verify:invariants (<500ms) -> Security policies & rules syntax
Gate 2: verify:fast (<3.0s)        -> Typecheck + Unit tests + SHA-256 hash checks
Gate 3: pnpm test                  -> Production build + Complete integration suites
```

---

## 5. Task Decomposition (Dependency DAG)

- [x] **Task 1 (Test-Locking):** Implement `scripts/verify-test-hashes.mjs` and `.agents/.test-hashes.json`.
- [x] **Task 2 (Fast Gates):** Configure `verify:fast` and `verify:invariants` in `package.json` and `.github/workflows/ci.yml`.
- [x] **Task 3 (Modular Rules):** Create `.agents/rules/*.mdc` (001 to 005) in English.
- [x] **Task 4 (Dual-Store Sync):** Add `updateRemoteUserRole` in `lib/firebase/profile.ts`, integrate in `AdminView.tsx`, and test in `tests/admin-api.test.ts`.
- [x] **Task 5 (ADRs & System Docs):** Create `docs/architecture/system-overview.md` and `docs/architecture/adr/` (ADR 0001 to 0004) in English.
- [x] **Task 6 (SDD Skill Update):** Refactor `.agents/skills/spec-driven-development/SKILL.md` to Enterprise v4.0.0.
- [x] **Task 7 (Verification & DoD):** Run verification pipeline and update `PLAN.md`.
