## 1. Runtime and data contracts

- [x] 1.1 Add guarded Firebase client/server emulator configuration and local CSP behavior; verify remote-target rejection and unchanged default behavior with a runnable regression check and `pnpm run typecheck`.
- [x] 1.2 Seed disposable relational, Auth, Firestore, Storage, and Functions fixtures for all account/section roles and active/archived/empty/populated states; verify ordinary session exchange and membership isolation in the local runtime.
- [x] 1.3 Add the launcher lifecycle with prerequisite checks, isolated ports/directories, safe cleanup, and failure summaries; verify startup, cancellation, and two independent runs with `pnpm qa`.

## 2. Scenario catalog and verification

- [x] 2.1 Register every shipped surface and applicable state with stable IDs, source mappings, roles, and executable checkpoints; verify catalog integrity and uncovered-state reporting with `pnpm qa --list` and catalog checks.
- [x] 2.2 Implement shared browser preparation, role login, real backend assertions, controlled failure states, and interactive exploration; verify selected scenarios and `pnpm qa --explore`.
- [x] 2.3 Implement all registered web scenarios, API checks, and critical cross-role journeys; verify `pnpm qa --all` and retain genuine existing application failures as evidence.
- [x] 2.4 Add screenshot checkpoints, compatible-reference comparisons, axe checks, HTML/JSON reporting, and traces; verify `pnpm qa --all --screenshots` at 320/390/768/1440 and critical Firefox/WebKit journeys.

## 3. Agent and CI integration

- [x] 3.1 Add conservative changed-area selection including shared/unknown-path fallback and selected-area aliases; verify selection regression checks and `pnpm qa --area cuestionarios --list`.
- [x] 3.2 Add PR affected/critical and nightly/manual full workflows plus explicit on-demand staging verification; verify workflow definitions and missing-external-configuration reporting.
- [x] 3.3 Add English AGENTS.md instructions, operational examples, state-registration guidance, and evidence interpretation; verify every documented command against the CLI.

## 4. End-to-end validation and handoff

- [x] 4.1 Run `pnpm run format`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run verify:fast`, `pnpm run verify:invariants`, and `pnpm test`; preserve all locked assertions and distinguish environment failures.
- [x] 4.2 Inspect representative desktop/mobile/320px screenshots and failure artifacts, execute the full QA inventory, and record exact coverage and defects in the English handoff.
- [x] 4.3 Validate the OpenSpec change with `openspec validate agent-qa-pipeline --strict` and update PLAN.md with commands, evidence, limitations, and remaining application remediation.
