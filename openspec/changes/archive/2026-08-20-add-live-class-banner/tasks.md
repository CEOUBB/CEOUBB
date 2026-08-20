## 1. Contract and RED

- [x] 1.1 Define the EARS/BDD delta for REQ-LIVE-01 through REQ-LIVE-08 and preserve the approved P8 scope.
- [x] 1.2 Add `tests/live-class.test.ts` for Zoom, both Teams hosts, empty removal, invalid protocols/domains, maximum length, rules parity and UI composition.
- [x] 1.3 Register the suite in `test`, `test:unit` and `verify:fast`.

## 2. Domain and Persistence

- [x] 2.1 Add the pure URL normalizer and provider contract in `lib/live-class.ts` with SDD markers.
- [x] 2.2 Extend `ClassroomState` and `watchClassroom` with one exact-document listener per open section.
- [x] 2.3 Add `saveLiveClassLink` with validation before Firebase, `setDoc` for a link and `deleteDoc` for an empty value.

## 3. Authorization

- [x] 3.1 Add exact-key, URL/provider, author and timestamp validation to Firestore rules.
- [x] 3.2 Discriminate `live-class` inside the canonical meta write, preserving `teachesSection`, `isEnrolled` and the frozen count of 21 `allow` statements.

## 4. Interface

- [x] 4.1 Add the conditional live-class banner before posts and return `null` for students without a link.
- [x] 4.2 Add the teacher editor, inline status/error feedback, focus recovery and removal action.
- [x] 4.3 Add responsive styles, 44 px targets and a visible keyboard focus treatment.

## 5. Verification and Archive

- [x] 5.1 Generate the SHA-256 test-lock snapshot and run `pnpm run verify:fast`.
- [x] 5.2 Run `pnpm run verify:invariants`, `pnpm run lint`, `pnpm test` and changed-scope React Doctor.
- [x] 5.3 Verify the banner at desktop/mobile widths and the no-link student state.
- [x] 5.4 Update `PLAN.md` and prepare the verified delta for OpenSpec archive.
