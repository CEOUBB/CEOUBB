## 1. Contract and RED

- [x] 1.1 Record the pre-approved CEO-39 scope, EARS requirements, BDD scenarios, limits, error taxonomy and affected invariants.
- [x] 1.2 Add `tests/moodle-import.test.ts` covering TGZ, ZIP, CSV, hostile archives/XML, normalized content, roster, idempotency, schema, API and UI composition.
- [x] 1.3 Register the suite and generate its SHA-256 test-lock snapshot after observing the expected RED trace.
- [x] 1.4 Amend only the fixture BlobPart conversion for Node 24/DOM type compatibility, preserving every approved assertion, then regenerate the test-lock snapshot.

## 2. Archive and Moodle Domain

- [x] 2.1 Implement bounded TGZ/TAR and ZIP readers with path, CRC, expansion and entry-count validation (REQ-MOODLE-01, REQ-MOODLE-09).
- [x] 2.2 Implement the DTD-free bounded XML reader and Moodle manifest/course/section/activity/file normalization (REQ-MOODLE-01, REQ-MOODLE-03, REQ-MOODLE-04).
- [x] 2.3 Implement CSV roster normalization, institutional filtering and stable source/fingerprint/document identities (REQ-MOODLE-05, REQ-MOODLE-06).

## 3. Relational Persistence and Authorization

- [x] 3.1 Add `moodle_imports` and `pending_matriculas` with foreign keys, unique indexes, retention columns and generated migration (REQ-MOODLE-06, REQ-MOODLE-08, REQ-MOODLE-10).
- [x] 3.2 Add bounded section authorization, job lifecycle, roster reconciliation and pending-claim services with ACID transactions (REQ-MOODLE-06, REQ-MOODLE-07, REQ-MOODLE-08).
- [x] 3.3 Reuse the Firestore service-account commit path for deterministic imported post batches and enrollment projections (REQ-MOODLE-05, REQ-MOODLE-07).
- [x] 3.4 Claim pending enrollments after institutional authentication without making login depend on projection availability (REQ-MOODLE-06, REQ-MOODLE-10).

## 4. API and Firebase Client

- [x] 4.1 Add the protected GET/POST route with start, content, roster and complete actions, strict payload checks and batches of 100 (REQ-MOODLE-05, REQ-MOODLE-06, REQ-MOODLE-07, REQ-MOODLE-08).
- [x] 4.2 Upload compatible files directly to Storage, verify SHA-1, use deterministic names, skip existing objects and report partial failures (REQ-MOODLE-04, REQ-MOODLE-05, REQ-MOODLE-09).
- [x] 4.3 Orchestrate start/content/roster/complete with sequential binary work, no notifications and a downloadable detailed report (REQ-MOODLE-02, REQ-MOODLE-08, REQ-MOODLE-09).

## 5. Teacher Interface

- [x] 5.1 Add the teacher-only launcher and select/review/import/result dialog in Materiales (REQ-MOODLE-02, REQ-MOODLE-07, REQ-MOODLE-11).
- [x] 5.2 Render compatibility categories, explicit participant opt-in, partial results and report download without rendering source HTML (REQ-MOODLE-03, REQ-MOODLE-08, REQ-MOODLE-10).
- [x] 5.3 Add responsive styles, 44 px targets, focus management, `aria-live`, native progress and reduced-motion-safe behavior (REQ-MOODLE-11).

## 6. Verification and Archive

- [x] 6.1 Run focal tests, `pnpm run verify:fast`, `pnpm run verify:invariants`, typecheck, lint, format check and Functions check.
- [x] 6.2 Run `pnpm test`, strict OpenSpec validation and changed-scope React Doctor; fix implementation only if a locked assertion fails.
- [x] 6.3 Verify the parser with TGZ, ZIP, CSV and unsupported content; verify the dialogue at 1440×900 and 390×844 with no console errors or horizontal overflow.
- [ ] 6.4 Archive the OpenSpec change, update `PLAN.md`/handoff, commit in Spanish, push the branch and open the Spanish PR.
