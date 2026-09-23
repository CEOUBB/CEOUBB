## Why

Agents cannot currently reproduce arbitrary portal states or verify a complete change with one command. Existing browser tests mix previews and isolated component transports, while application Firebase clients and server REST calls do not connect to the local emulators together.

## What Changes

- Add an on-demand `pnpm qa` entry point for affected areas, selected scenarios, interactive exploration, and the complete screenshot catalog.
- Run the real application against disposable libSQL and Firebase Auth, Firestore, Storage, and Functions emulators with synthetic institutional identities and section memberships.
- Inventory and exercise every shipped web surface and applicable semantic state, including public, student, teacher, owner, assistant, and coordinator experiences. Missing coverage remains explicit and fails catalog completion.
- Share scenario preparation between interactive investigation and automated UI, accessibility, API, and persistence checks.
- Produce machine-readable results, browser reports, screenshots, traces, and reproduction commands. Visual comparisons inform review; functional and automated accessibility failures block.
- Test affected areas and critical journeys in PRs; execute the full catalog nightly and on demand. Use Chromium at 320/390/768/1440 pixels and Firefox/WebKit for critical journeys.
- Keep real external-provider verification in staging on demand, using dedicated synthetic accounts and destinations. Local contract tests do not count as provider-delivery evidence.
- Document the workflow in English in `AGENTS.md`, agent-facing instructions, and the implementation handoff.

## Capabilities

### New Capabilities

- `operations/agent-qa`: Isolated, reproducible, agent-accessible web verification and evidence collection.

### Modified Capabilities

None. Production authentication, authorization, enrollment projections, domain arithmetic, and provider contracts remain authoritative.

## Impact

Playwright configuration and scenarios; QA launch/seed/report scripts; guarded Firebase client/server environment selection; local-only CSP/App Check handling; CI workflows; agent documentation. Reuse installed dependencies and native Node utilities. No new application database tables or public QA endpoints.

## Non-goals

- Repairing unrelated application defects discovered by the new scenarios: report reproducible failures for separate tasks.
- Claiming local simulations prove Google OAuth, CAPTCHA attestation, email delivery, push delivery, or third-party LTI interoperability.
- Native Android instrumentation, production writes, autonomous baseline approval, or weakening existing protected tests.

## Authorization

The user chose these requirements in the interview and explicitly requested implementation and validation in this same task on 2026-09-22. Subagent implementation is authorized. The first delivery covers the complete web rather than a pilot module.
