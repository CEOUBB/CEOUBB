# TASK EXECUTION DAG: [Feature / Module Name]

**Design Reference:** `DESIGN.md` | **Spec Reference:** `SPEC.md`

- [ ] **Task 1: [Data Schema / Contract Definition]**
  - **Requirement:** `REQ-01`
  - **Files:** `[NEW] src/...`, `[MODIFY] ...`
  - **Verification:** `pnpm run test:unit`
  - **Dependencies:** None

- [ ] **Task 2: [Core Service / Business Logic]**
  - **Requirement:** `REQ-02`
  - **Files:** `[NEW] src/...`
  - **Verification:** `pnpm run test:unit`
  - **Dependencies:** Task 1

- [ ] **Task 3: [API Route / Endpoint Wiring]**
  - **Requirement:** `REQ-03`
  - **Files:** `[MODIFY] app/api/...`
  - **Verification:** `pnpm test`
  - **Dependencies:** Task 2

- [ ] **Task 4: [UI Component / View Integration]**
  - **Requirement:** `REQ-04`
  - **Files:** `[MODIFY] app/...`
  - **Verification:** `pnpm run lint && pnpm run typecheck`
  - **Dependencies:** Task 3

- [ ] **Task 5: [Automated Acceptance Suite & Verification Gate]**
  - **Requirement:** All BDD Scenarios
  - **Files:** `[NEW] tests/...`
  - **Verification:** `pnpm test && npx react-doctor@latest --verbose`
  - **Dependencies:** Tasks 1–4
