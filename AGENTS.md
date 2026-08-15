# AGENTS.md — Instructions for AI Coding Assistants

## Purpose and Scope

This file contains repository-wide instructions and guardrails for every coding agent working on **Centro de Estudio UBB (CEOUBB)** (including OpenAI Codex, Claude Code, Antigravity, and peer agents). It follows the open [AGENTS.md format](https://agents.md/).

Read this file and `PLAN.md` completely before editing code. A direct user instruction overrides this file. 

`ceoubb_moodle_adecca_comparison.md` at the repository root compares CEOUBB against Moodle UBB and Adecca UBB, and contains the institutional adoption dossier. Consult it when proposing new product capabilities.

---

## Project Summary & Strategic Mission

Centro de Estudio UBB is an independent Learning Management System (LMS) for Universidad del Bío-Bío students and teachers.

**Mission: Present CEOUBB to Universidad del Bío-Bío as the next official LMS**, replacing Moodle UBB and Adecca UBB at scale (thousands of students, thousands of course sections, multiple faculties).

### Strategic Directives for Agents:
1. **Scale-First Architecture**: Evaluate every architectural and data decision against university scale ($5,000+$ students, thousands of sections), not against a single-cohort pilot. Code that only works for six courses is technical debt and must be explicitly documented as such in `PLAN.md`.
2. **Non-Official Disclaimer Guardrail**: Until a formal institutional agreement exists, the platform remains independent. Preserve the UI disclaimers, keep store badges as non-clickable placeholders, and never present CEOUBB as an officially endorsed university service.

### Product Surfaces:
- **Web Portal**: Next.js 16 (App Router), React 19, TypeScript, Turso/libSQL, deployed on Vercel (`https://ceoubb.com`).
- **Android App**: Native Java (`cl.ubb.centroestudio`) with embedded offline study library and native Firebase integration.
- **Firebase Infrastructure**: Authentication, Firestore, Storage, Cloud Functions, and Messaging in region `southamerica-west1`.

---

## Canonical Infrastructure Identifiers

Treat these identifiers as fixed configuration:

| Resource | Identifier / Value |
| :--- | :--- |
| **Firebase Project ID** | `centro-de-estudio-ubb` |
| **Messaging Sender ID** | `411177916202` |
| **Firebase Region** | `southamerica-west1` |
| **Default Storage Bucket** | `centro-de-estudio-ubb.firebasestorage.app` |
| **Android Application ID** | `cl.ubb.centroestudio` |
| **Web Hosting** | Vercel (zero-config Next.js project) |
| **Web Database** | Turso/libSQL (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) |
| **Canonical Repository** | `https://github.com/CEOUBB/CEOUBB.git` (branch `main`) |

---

## Agent Collaboration & Git Protocol

Maintainers collaborate using different AI assistants with GitHub as the shared source of truth.

### Outcome-Based Git Guidelines:
- **Tree Synchronization**: Always verify local files are in sync with `origin/main` before making code changes.
- **Branching Strategy**: Use feature branches (`codex/<task>` or `claude/<task>`). Do not make direct commits to `main` for non-trivial features.
- **Conflict Prevention**: Do not edit files being actively modified by another maintainer/agent. Keep commits small, logical, and formatted with Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`).
- **Language Policy for Commits & Pull Requests**: All commit messages, PR titles, and PR descriptions **MUST ALWAYS BE WRITTEN IN SPANISH** (e.g., `feat(portal): rediseño de cabecera`, `fix(auth): corregir derivación de rol docente`). Standard Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`) are retained, but all descriptive summary text and PR bodies must strictly be in Spanish.
- **Discord Notifications**: Send Discord notifications **ONLY WHEN EXPLICITLY INSTRUCTED BY THE USER** in their prompt. When requested, post an embed to `#💬-❙-general` (`1536934842741301321`) titled `<Agent Name> | <User>`, cross-tagging Pipe (`<@1150176313974460457>`) or Joaquín (`<@662149246631542816>`). See `.agents/rules/discord_notifications.md`.

---

## Repository Map

- `app/`: Next.js web routes, shell (`Portal.tsx`), views (`portal-views.tsx`), classroom (`Classroom.tsx`), and API endpoints (`app/api/`).
- `lib/`: Shared authentication, access policy (`access-policy.ts`), course scaffolding (`courses.ts`), grade math (`grades.ts`), and Firebase client (`firebase-classroom-client.ts`).
- `public/biblioteca/`: Browser-accessible study library and academic resources.
- `db/`, `drizzle/`: Turso/libSQL schema and migrations for web sessions and user directory.
- `android/`: Native Java Android application (`android/app/src/main/java/cl/ubb/centroestudio/`).
- `firebase/`: Firestore rules (`firestore.rules`), Storage rules (`storage.rules`), indexes, and Cloud Functions (`firebase/functions/`).
- `tests/`: Automated unit and HTTP suite (`access-policy.test.ts`, `grades.test.ts`, `linear-webhook.test.ts`, `rendered-html.test.mjs`).
- `.github/workflows/`: CI merge gate (`ci.yml`), Vercel deployment pipeline with pre-flight gates (`deploy.yml`), and diagnostics (`react-doctor.yml`).
- `design-ceoubb.md`: Root repository design system spec (tokens, typography, components, Do's & Don'ts).
- `PLAN.md`: Active project handoff plan and backlog (`PLAN_ARCHIVE.md` holds completed history).

---

## Architectural Guardrails & Invariants

### 1. Authentication & Role Policy (Non-Negotiable Guardrail)
Role derivation is strictly governed by institutional email domain:
- `@alumnos.ubiobio.cl` $\rightarrow$ **Student**
- `@ubiobio.cl` $\rightarrow$ **Teacher**
- `elpapijuaco325@gmail.com` $\rightarrow$ **Owner / Superuser**
- `felipearce.2004@gmail.com` $\rightarrow$ **Collaborator / Superuser**
- *All other domains must be rejected.*

**Single Source of Truth**: `lib/access-policy.ts` implements `roleForEmail`. No other TypeScript file may re-implement domain parsing. This policy must stay synchronized across:
1. `lib/access-policy.ts`
2. `firebase/firestore.rules`
3. `firebase/storage.rules`
4. `android/app/src/main/res/values/firebase.xml`
5. `android/app/src/main/java/cl/ubb/centroestudio/ClassroomService.java`

`tests/access-policy.test.ts` asserts this synchronization.

### 2. Classroom Data & Database Split
- **System of Record**: Turso/libSQL stores academic structure (`facultades`, `carreras`, `secciones`, `enrollments`).
- **Firestore Projection**: Firestore holds operational classroom posts, progress, files, and a narrow one-way projection of enrollments used by security rules via `exists()`.
- **Course Identity**: Course identity is a **section** (*asignatura $\times$ período $\times$ sección*), not a generic course name.
- **Grade Math Seam**: `lib/grades.ts` is the sole source of truth for Chilean 1.0–7.0 scale calculations and weighted averages. Do not duplicate grade arithmetic elsewhere.

### 3. Study Library Duplication
`public/biblioteca/` (web) and `android/app/src/main/assets/www/` (Android) share study assets. When modifying academic material, update `public/biblioteca/` as the source and intentionally propagate to Android, preserving Android-specific native bridge code.

### 4. Spec-Driven Development (SDD) Guardrail (Non-Negotiable)
- **Spec First, Code Second**: No agent may generate code for non-trivial features, migrations, API changes, or cross-cutting remediations without an approved specification in `docs/specs/`.
- **Formal Requirements**: Use EARS syntax (*Ubiquitous, Event-Driven, State-Driven, Unwanted Behavior, Optional*) and RFC 2119 keywords.
- **BDD & Test Protection**: Define testable Gherkin acceptance criteria. Agents are strictly forbidden from weakening or deleting test assertions to pass builds.
- **Skill Reference**: Read `.agents/skills/spec-driven-development/SKILL.md` before initiating non-trivial tasks.

---

## Development Setup & Commands

Always use `pnpm` (`no npm`, `no bun`). `npx` is permitted only for standalone CLI executions.

### Web Application:
```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm run test:unit      # Fast unit tests (<150ms: access-policy, grades, webhooks)
pnpm test               # Full build + integration tests
```

### Firebase Functions & Rules:
```bash
pnpm run check:functions  # Root syntax check
# or from subfolder:
cd firebase/functions && pnpm install --frozen-lockfile && pnpm run check

# Selective Deploys (run from firebase/ directory with authorization)
pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only firestore
pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only storage
pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only functions --force
```

### Android Application:
```bash
cd android
gradle :app:assembleDebug
```

---

## Web Design System

The visual design system for CEOUBB is light, paper-calm, and academic.

### Sources of Truth:
1. `design-ceoubb.md` at the repository root.
2. `app/globals.css` (portal custom properties and utilities).
3. The CEOUBB Design System on `claude.ai/design` (project `1730f6d2-1697-4fd1-bad0-f4e0b2863cd8`).

### Core Aesthetic Principles:
- **Canvas & Tone**: Paper-soft light canvas `--canvas-soft` (`#f4f6f9`), white card surfaces (`#ffffff`), near-black ink (`#0f172a`). No dark modes on portal views, no heavy gradients, no noise background textures.
- **Primary Structural Accent**: UBB Royal Blue (`#0055b8`) is reserved **strictly** for primary actions, CTAs, active tab indicators, and inline links.
- **Hero Band**: UBB Midnight Navy (`#002b5c`) is reserved for dark institutional hero bands (access panel, classroom cover).
- **Academic Palette**: Accent colors (gold `#f59e0b`, red `#e31b23`, sky `#38bdf8`, emerald `#10b981`, purple `#8b5cf6`) tag courses, grades, and statuses. Never use accent colors to fill primary CTAs.
- **Typography & Motion**: `Inter` font family with tight negative tracking on display headings. Animations (`motion/react`) must be subtle, fast (120–260ms), and respect `prefers-reduced-motion`.
- **Icons**: Use `@phosphor-icons/react` exclusively. Do not hand-roll raw SVG icons.

---

## Security, Privacy & Data Protection

- **Default Deny**: Rules in Firestore and Storage default to deny and grant minimal necessary permissions.
- **Data Protection Compliance**: Student records and grades fall under Ley 19.628 and Ley 21.719. Keep Firebase resources in `southamerica-west1`.
- **Zero Committed Secrets**: Never commit `.env` files, keystores, service account JSONs, or API credentials.
- **Append-Only History Preparedness**: Any new grade write path must assume audit logging/history is required.

---

## Self-Verification & Quality Assurance (Auto-QA)

As an advanced AI agent, **you are responsible for verifying your own output** before presenting a task as completed. Avoid delivering untested prototypes or unverified code.

### Mandatory Self-Verification Steps:
1. **Automated Checks**: Run `pnpm run lint` and `pnpm test` to verify build and unit correctness.
2. **Security Invariant Verification**: If changing authentication or access code, run `tests/access-policy.test.ts` and test across the full role matrix (Student, Teacher, Owner, Collaborator, Rejected Gmail).
3. **Scale & Edge Case Stress-Thinking**:
   - Will this query/component perform cleanly with 5,000 active students and hundreds of course sections?
   - Is pagination enforced?
   - Does file upload respect the 50 MiB boundary?
   - Are errors gracefully caught and presented to the user in clean Chilean Spanish?
4. **Handoff Documentation**: Update `PLAN.md` with what changed, verification results, deployment status, and remaining risks.

---

## Definition of Done

A task is complete ONLY when:
1. Requested functionality is fully implemented and tested.
2. All automated linting and unit test suites pass (`pnpm run lint`, `pnpm test`).
3. Security and domain role invariants remain strictly enforced.
4. Scale implications (pagination, bounded queries) are addressed or documented as pilot debt in `PLAN.md`.
5. Product disclaimers and non-official status remain preserved.
6. Documentation and `PLAN.md` are updated with clear handoff details.
7. Commit messages and pull request descriptions are strictly written in Spanish.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
