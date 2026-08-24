## 1. Contract and RED

- [x] 1.1 Specify REQ-TCM-01 through REQ-TCM-09 in EARS with BDD acceptance scenarios. Verify: `openspec validate add-teacher-course-management --strict`.
- [x] 1.2 Add `tests/teacher-course-management.test.ts` and register it in every test command. Verify: focal test must fail for missing implementation.
- [x] 1.3 Generate the SHA-256 snapshot after the RED contract is complete. Verify: `node scripts/verify-test-hashes.mjs --generate`.

## 2. Data and Domain

- [x] 2.1 Add `section_profiles` and `assistant_assignments`, indexes, foreign keys and idempotent pilot catalog seed. Verify: focal schema assertions.
- [x] 2.2 Add strict create/update/assistant parsers and stable section identity. Verify: focal validation assertions.
- [x] 2.3 Add bounded DTO queries, ownership checks, transactional creation and compensating projections. Verify: focal in-memory service assertions.

## 3. API Routes

- [x] 3.1 Add `GET /api/courses/me` with active-enrollment DTO and fail-closed errors. Verify: focal route contract assertions.
- [x] 3.2 Add authenticated teacher list/create/update routes with 400/401/403/404/409/503 taxonomy. Verify: focal route contract assertions.
- [x] 3.3 Add bounded assistant list/designate/remove routes with ownership re-checks. Verify: focal route contract assertions.

## 4. Gradebook and Interface

- [x] 4.1 Add one exact-document gradebook listener and extract the reusable settings editor with 100% validation. Verify: focal Firebase/UI assertions.
- [x] 4.2 Add the academic-dossier teacher workspace with creation, data, evaluations and team panels. Verify: `pnpm run typecheck` and browser at desktop/mobile widths.
- [x] 4.3 Add role-aware navigation, dynamic course DTO state and course reload after mutations. Verify: focal portal assertions and browser flow.

## 5. Verification and Archive

- [x] 5.1 Run `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, `pnpm run format:check` and `pnpm test`.
- [x] 5.2 Run changed-scope React Doctor and visual browser verification without console errors or horizontal overflow.
- [x] 5.3 Mark the P17 spec verified, update `PLAN.md`, archive the OpenSpec change and re-run validation.
