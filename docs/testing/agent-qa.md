# Agent QA

Use `pnpm qa` after changing application behavior. Any agent with a terminal can use the same catalog, synthetic accounts, real local backend, and evidence; no agent-specific integration is required.

## Setup and commands

Use the repository's supported Node version (22.13 or newer), pnpm, Java 21 or newer, and the locked dependencies:

```sh
pnpm install --frozen-lockfile
pnpm --dir firebase/functions install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm qa:check
pnpm qa --help
```

Linux CI additionally uses `playwright install --with-deps`. The launcher uses the installed Firebase CLI or the same pinned `firebase-tools` package as `check:rules` through pnpm. First use may download emulator binaries.

| Command                                                                    | Purpose                                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm qa`                                                                  | Affected areas plus critical journeys; shared or unknown application changes select the full catalog.                        |
| `pnpm qa --list --json`                                                    | Discover scenario IDs, roles, states, checkpoints, and source mappings.                                                      |
| `pnpm qa --area quizzes --screenshots`                                     | Verify one area and retain screenshots. Spanish area aliases are accepted.                                                   |
| `pnpm qa --scenario auth.session --browser chromium-390 --screenshots`     | Reproduce one scenario at a specific viewport.                                                                               |
| `pnpm qa --explore --scenario grades.teacher`                              | Open the prepared scenario for interactive inspection. Resume or close Playwright's pause to continue; Ctrl+C stops the run. |
| `pnpm qa --all --screenshots`                                              | Execute the registered catalog with all browser projects.                                                                    |
| `pnpm qa --base origin/main`                                               | Select changed areas against an explicit Git base.                                                                           |
| `pnpm qa --screenshots --reference /absolute/reviewed/reference-directory` | Compare compatible reviewed references.                                                                                      |
| `pnpm qa --staging`                                                        | Run the separate live staging smoke and report remaining external evidence.                                                  |
| `pnpm qa --shard 1/4`                                                      | Run one deterministic shard of the selected scenarios in parallel execution.                                                 |

Chromium runs at widths 320, 390, 768, and 1440. Critical scenarios also run in Firefox and WebKit. Selecting one `--browser` narrows evidence and must be disclosed; it does not establish complete-matrix coverage. The `api` project exercises application endpoints and authorization separately from browser checkpoints.

Exploration uses Chromium and prints a loopback CDP endpoint, also saved in the run's `explore.json`. An agent can attach its browser tool to that endpoint or use the installed Playwright library's [`chromium.connectOverCDP(endpoint)`](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp). Reuse the existing page in `browser.contexts().flatMap(context => context.pages())` to keep the prepared identity and state. Detach the attached client when finished; stop the owning QA command with Ctrl+C to clean up all services. The endpoint is available only while that disposable run is active.

## Isolation and reset

Each invocation creates a unique `.qa/<run>/` containing a local libSQL database, emulator configuration and Functions copy, isolated Next output, and generated local configuration. Auth, Firestore, Storage, Functions, and their auxiliary ports belong to that run. The launcher removes its own temporary runtime and stops its processes on completion or interruption. Starting a new invocation is the reproducible reset; do not reseed a running shared environment or kill unrelated Node/Java processes.

Local QA requires both `CEOUBB_QA=1` and `NEXT_PUBLIC_CEOUBB_QA=1`, a `demo-ceoubb-qa` project, matching loopback emulator endpoints, and an absolute `file:` database. The launcher supplies these values and prevents checkout dotenv credentials from entering the child environment. Preserve these guards. The browser authenticates a real emulator identity and exchanges its token through `/api/auth/firebase`; do not substitute `dev-login`, preview fixtures, fabricated Firebase users, or relaxed rules as evidence of successful persistence or authorization.

Local App Check and external adapters use controlled behavior. The Functions publication hook records `_qa_outbox` with `deliveryVerified: false`; this proves the notification contract, not FCM delivery. Error/loading scenarios may intercept a named request deliberately; their evidence must identify the controlled failure. Successful business mutations must use the actual local backend.

## Inspect the evidence

Every run prints `qa-results/<run>/index.html`. Read it together with `summary.json`, `manifest.json`, Playwright's HTML report, service logs, screenshots, and available failure traces. The manifest records the requested scope and scenario IDs; the summary includes reproduction commands and missing checkpoints. Do not upload `.qa/` or local environment files as artifacts.

Distinguish `failed`, `environment-error`, `incomplete`, and `requires-external-verification` from a pass. A registered scenario without its required executed checkpoint remains uncovered. A complete catalog invocation is a request for coverage; it is not a claim that every required state passed. Report uncovered surfaces and states explicitly, and extend the inventory when a shipped state is missing.

Functional assertions and automated accessibility violations block verification. Screenshot differences are advisory and remain inspectable even when functionality passes. Missing or incompatible references must be reported. Inspect desktop and mobile captures before drawing UX conclusions; automated accessibility does not replace keyboard and assistive-technology review.

References must match platform, browser, and viewport. Linux CI is the stable comparison environment. Obtain an explicitly reviewed reference directory before using `--reference`. `--screenshots --update-snapshots` records new references only after human review; agents must not accept baseline changes automatically, and CI never invokes this option.

Application defects uncovered by this pipeline remain failing and reproducible. Fix application behavior in a separate task unless the user expands scope. Never weaken protected tests, disable assertions, hide failed scenarios, or loosen accessibility checks to produce a green report.

## Maintain coverage after a change

1. Find relevant entries in `qa/catalog.ts` and the browser/API scenarios under `qa/`.
2. For a new feature, register its source mapping, roles, applicable semantic states, stable scenario ID, and checkpoints. Include applicable forms, overlays, loading, empty, populated, error, forbidden, and read-only behavior. Keep non-applicable decisions explicit in the inventory.
3. Reuse `qa/fixtures.ts`, the seed, and browser helpers. Keep identities, enrollment projections, and relational data consistent. Add persistence assertions for successful mutations and ensure a missing assertion fails the scenario.
4. Run the narrow scenario during development, then `pnpm qa` for affected and critical coverage. Open interactive exploration with the same scenario when investigating a result.
5. Inspect evidence, reproduce failures with the recorded command, and report the precise checked scope and remaining gaps.

The existing formatting, lint, typecheck, unit, invariant, test-hash, build, and integration gates remain required. `pnpm qa` currently orchestrates browser and API verification; it does not replace `verify:fast`, `verify:invariants`, `lint`, `format:check`, or `pnpm test`. Preserve protected files under `tests/` and their existing approval/hash policy.

## Staging and external providers

Only `https://staging.ceoubb.com` and Firebase `centro-de-estudio-ubb-staging` are allowed. Supply `QA_STAGING_EMAIL`, `QA_STAGING_PASSWORD`, and `QA_STAGING_API_KEY` through the environment or the GitHub `Staging` environment secrets. Do not put them in commands, tracked files, screenshots, or reports.

Use a dedicated, verified institutional Firebase test account whose email local part and Firebase UID begin with `staging-` or `qa-staging-`. Provision its matching relational user, active synthetic section, enrollment projection, and at least one synthetic course post in staging before this check. The legacy `example.invalid` seed accounts do not satisfy institutional login. This command neither creates fixtures nor changes auth providers.

Before sending credentials, the runner checks the key's project using the [public Identity Toolkit project configuration API](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/TopLevel/getProjects). It then performs password authentication, the ordinary web-session exchange, authenticated relational and Firestore reads, and logout. All reported identifiers and credentials are redacted. Redirects fail closed, and the command never resets staging or production data.

This smoke proves the deployed password/session/data path. Google OAuth, real Turnstile interaction, email receipt, FCM receipt, and external vendor workflows require separate live evidence with dedicated accounts and destinations. They are listed as `requires-external-verification`, not passed. The runner sends no email, push, or vendor message automatically. It exits with code 2 while this external evidence is pending; functional or environment failures exit with code 1. A passing individual smoke check does not make the complete staging verification pass.

## CI

`.github/workflows/agent-qa.yml` runs affected and critical checks for each PR scoped to the reference `chromium-1440` desktop browser for rapid verification, while the full multi-viewport browser matrix runs nightly at 07:00 UTC. Manual dispatch supports full, area, or staging scope. An optional `reference_path` must already contain reviewed references in the checkout. Reports and screenshots are retained for 14 days, including failed runs.

PR jobs use read-only repository permissions, disposable data, and no staging secrets. Staging dispatch runs only from `main`, uses the protected `Staging` environment, and requires configured synthetic credentials. Existing CI quality gates continue independently; neither workflow tolerates functional or accessibility failures.
