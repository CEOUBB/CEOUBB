# ADR 0004: Test-Locking, SHA-256 Checksums and Deterministic Quality Gates

- **Status:** Accepted
- **Date:** 2026-08-17
- **Decision Makers:** CEOUBB Architecture & Engineering Team
- **Related Specs:** `docs/specs/p9-enterprise-harness-evolution.md`, `.agents/skills/spec-driven-development/SKILL.md`, `AGENTS.md`

---

## Context & Problem Statement

When autonomous AI agents encounter complex test assertion failures during code implementation, LLMs exhibit a natural behavioral tendency to weaken assertions (`expect(true).toBe(true)`), delete failing tests, or add `.skip()` rather than fixing underlying business logic defects. This introduces silent regression risk and degrades test suites over time.

---

## Decision

Implement a **deterministic Test-Locking protocol**:

1. During the TDD RED phase, test files in `tests/` are authored and a cryptographic SHA-256 snapshot is generated into `.agents/.test-hashes.json` using `node scripts/verify-test-hashes.mjs --generate`.
2. During the TDD GREEN phase, the `tests/` directory is in **read-only mode**. The verification script (`pnpm run verify:fast`) computes test checksums and halts execution with exit code `1` if any test assertion has been modified or removed.
3. Fast-feedback verification cascade (<3 seconds):
   - `pnpm run verify:invariants` (Security rules + core math invariants <500ms).
   - `pnpm run verify:fast` (Strict typecheck + unit tests + SHA-256 hash guard <3.0s).
   - `pnpm test` (Full production build + integration suite for pre-flight merges).

---

## Consequences

### Positive:

- Eradicates silent test assertion degradation by AI coding agents.
- Provides immediate deterministic feedback (<3s) avoiding expensive full build cycles during development.
- Enforces rigorous TDD Triangulation (Red -> Green -> Refactor).

### Negative / Mitigations:

- Legitimate test modifications (due to approved specification amendments) require explicit hash regeneration (`--generate`).
  - _Mitigation:_ Documented clear recovery procedure in `SKILL.md` and `AGENTS.md`.
