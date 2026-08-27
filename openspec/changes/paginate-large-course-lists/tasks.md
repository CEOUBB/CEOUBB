## 1. Utilities and Batch Chunking Verification

- [x] 1.1 Implement and test client-side pagination and accent-insensitive search helpers (`paginateList`, `filterRoster`, `searchMaterials`) in `app/views/classroom/classroom-utils.ts` and verify with new unit suite `tests/classroom-pagination.test.ts`.
- [x] 1.2 Verify `saveSectionScores` chunking invariants ($\le 400$ ops) and batch wave execution with a 350-row test suite in `tests/grades-batch.test.ts`.

## 2. Teacher Gradebook Matrix Pagination and Search

- [x] 2.1 Add accessible search input, page size selector (25/50/100, default 25), and pagination navigation buttons to `TeacherGrades` in `app/views/classroom/GradesSection.tsx` (REQ-PAG-01, REQ-PAG-02).
- [x] 2.2 Verify score mutation persistence and single-dialog feedback editing across page navigation in `TeacherGrades` (REQ-PAG-03).

## 3. Progress and Materials List Optimization

- [x] 3.1 Add search filter and pagination controls to the teacher view in `app/views/classroom/ProgressSection.tsx` (REQ-PAG-04).
- [x] 3.2 Add global file search and folder filtering in `app/views/classroom/MaterialsSection.tsx` (REQ-PAG-05).

## 4. Integration Verification and Quality Gates

- [x] 4.1 Run typecheck, lint, and unit tests via `pnpm run verify:fast` and `pnpm run verify:invariants`.
- [x] 4.2 Execute the full pre-flight test harness `pnpm test` and validate OpenSpec conformity via `openspec validate paginate-large-course-lists --strict`.
