## 1. Contract and RED

- [x] 1.1 Define EARS/BDD requirements REQ-COMM-01 through REQ-COMM-08 and validate the OpenSpec delta. Verify: `pnpm exec openspec validate 2026-08-23-add-communications-center --strict`.
- [x] 1.2 Add `tests/communications.test.ts` for normalization, ordering, unread cursors, bounded listeners, rules isolation and portal composition. Verify: focused test failed with `ERR_MODULE_NOT_FOUND` for the intentionally absent domain module.
- [x] 1.3 Register the suite in `test`, `test:unit` and `verify:fast`, then generate its SHA-256 lock. Verify: `node scripts/verify-test-hashes.mjs --generate` registered 32 files.

## 2. Domain and Persistence

- [x] 2.1 Add pure contracts and functions for body normalization, cursor keys, bounded merging and unread counting. Verify: focused suite 9/9.
- [x] 2.2 Add bounded Firestore listeners for read cursors and section message-thread summaries. Verify: focused suite and typecheck clean.
- [x] 2.3 Add bounded conversation listener, transactional send and batch cursor writes. Verify: focused suite and typecheck clean.
- [x] 2.4 Re-export the communication client through the Firebase barrel. Verify: typecheck clean.

## 3. Authorization

- [x] 3.1 Add exact field, timestamp and message validation helpers to Firestore rules. Verify: focused suite 9/9.
- [x] 3.2 Gate thread/message reads and writes by active enrollment, section teaching authority and thread ownership. Verify: invariants 31/31.
- [x] 3.3 Add private `notificationReads` rules without weakening the parent profile contract. Verify: focused suite and rules check clean.

## 4. Interface

- [x] 4.1 Add `notifications` to portal navigation, header counter and mobile bottom bar. Verify: focused composition assertions.
- [x] 4.2 Build the avisos tab with unread state, per-row open and `Marcar todo como leído`. Verify: keyboard and empty/error states in browser.
- [x] 4.3 Build student and teacher message lists, conversation history and validated composer. Verify: responsive browser walkthrough at 1280 px and 390 px.
- [x] 4.4 Add institutional responsive styles, 44 px targets, focus states and reduced-motion behavior. Verify: no horizontal overflow at 320 px.

## 5. Verification and Archive

- [x] 5.1 Run focused RED/GREEN/REFACTOR suite and regenerate the test lock only for the final approved assertions.
- [x] 5.2 Run `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, `pnpm run format:check` and `pnpm test`.
- [x] 5.3 Run changed-scope React Doctor and browser QA for desktop/mobile, keyboard, empty and failure states.
- [ ] 5.4 Update `PLAN.md`, append the structured handoff, archive OpenSpec and validate living specs.
- [ ] 5.5 Commit in Spanish, push the requested branch and open a Spanish GitHub PR linked to CEO-26.
