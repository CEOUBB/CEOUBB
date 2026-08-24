## 1. Contract and RED

- [x] 1.1 Define REQ-AUDIT-01 through REQ-AUDIT-06 with EARS and BDD scenarios.
- [x] 1.2 Add `tests/grade-audit.test.ts` and amend the frozen rules count for the new read/write audit block.
- [x] 1.3 Register the RED suite and generate the SHA-256 test-lock snapshot.

## 2. Server Domain and Persistence

- [x] 2.1 Add bounded payload normalization and score-difference helpers.
- [x] 2.2 Add verified role/enrollment authorization for callable mutations.
- [x] 2.3 Add atomic score and gradebook transactions with trusted actor and server timestamp.

## 3. Client and Security Rules

- [x] 3.1 Route grade and gradebook mutations through regional callable Functions.
- [x] 3.2 Deny direct client writes to audited state and all client writes to audit documents.
- [x] 3.3 Add the isolated student-history composite index.

## 4. Verification and Archive

- [x] 4.1 Run RED, GREEN and REFACTOR verification with the test-lock unchanged after GREEN begins.
- [x] 4.2 Run `pnpm run verify:fast`, `verify:invariants`, `lint`, `format:check`, `check:functions` and `pnpm test`.
- [x] 4.3 Archive the OpenSpec delta and update the formal handoff.
- [x] 4.4 Commit, push and open the Spanish GitHub pull request linked to CEO-7.
