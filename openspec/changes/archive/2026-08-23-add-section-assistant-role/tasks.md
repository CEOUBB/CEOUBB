Requirement traceability markers used in this change:

| Marker        | Requirement                           |
| :------------ | :------------------------------------ |
| `REQ-ASST-01` | Section-Scoped Assistant Identity     |
| `REQ-ASST-02` | Bounded Section Membership Transport  |
| `REQ-ASST-03` | Assistant Content Authoring           |
| `REQ-ASST-04` | Assistant Least Privilege             |
| `REQ-ASST-05` | Owner and Teaching-Team Compatibility |

## 1. Contract and RED

- [x] 1.1 Define the EARS/BDD delta, permission matrix, bounded-query budget and explicit non-goals for REQ-ASST-01 through REQ-ASST-05. Verify: `pnpm exec openspec validate add-section-assistant-role --strict`.
- [x] 1.2 Add `tests/assistant-role.test.ts` covering pure capabilities, closed membership parsing, API transport, Firestore/Storage parity and UI separation. Verify: focused Node test fails only because the contract is not implemented.
- [x] 1.3 Register the suite and generate its initial SHA-256 lock. Verify: `node scripts/verify-test-hashes.mjs --check`.

## 2. Domain and Bounded Membership Data

- [x] 2.1 Add the pure section-role contract, parser, label and capability matrix. Verify: focused assistant-role test.
- [x] 2.2 Add the indexed, bounded `listUserSectionMemberships` query and derive legacy section IDs from it. Verify: `pnpm run typecheck`.
- [x] 2.3 Return memberships from both session endpoints and parse them fail-closed in the portal utilities. Verify: focused assistant-role test.

## 3. Client Authorization

- [x] 3.1 Store one membership list in `Portal`, derive section IDs and pass the opened section role to `Classroom`. Verify: `pnpm run typecheck`.
- [x] 3.2 Split `canManageContent` from `canTeach` in classroom state and use the contextual role for listeners and controls. Verify: focused assistant-role test.
- [x] 3.3 Show content authoring to assistants, keep assessment/live-class controls hidden and render «Ayudante» contextually. Verify: `pnpm run lint`.

## 4. Firebase Authorization

- [x] 4.1 Add section-role helpers and content-team authorization to Firestore without broadening teacher-only `meta`, `grades`, progress or submission paths. Verify: `pnpm run verify:invariants`.
- [x] 4.2 Apply the same content-team rule to Storage course materials while retaining UID ownership and the 50 MiB ceiling. Verify: focused assistant-role test.

## 5. Verification and Archive

- [x] 5.1 Run `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, `pnpm run format:check` and `pnpm test`.
- [x] 5.2 Run changed-scope React Doctor because multiple TSX files changed.
- [x] 5.3 Archive the OpenSpec change into the living academic spec and validate all specs.
- [x] 5.4 Update `PLAN.md` with the completed handoff, checks, deployment status and residual risk.
