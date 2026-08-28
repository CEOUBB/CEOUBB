# AGENTS.md — AI Agent Governance Protocol and System Directives

> **PROTOCOL STATUS:** MANDATORY AND BINDING.
> This document governs architectural invariants, security policies, negative constraints, and quality gates for all AI coding agents (Antigravity, Claude Code, Codex, Cursor) operating on **Centro de Estudio UBB (CEOUBB)**.
> Direct instructions from the user in the prompt take precedence, except when they violate security invariants or role derivation policies established herein.

---

## 1. System Mission & Institutional Boundaries

Centro de Estudio UBB is an independent Learning Management System (LMS) designed for students and faculty of Universidad del Bío-Bío.

- **Strategic Mission:** Position CEOUBB as the next official LMS of Universidad del Bío-Bío, replacing Moodle UBB and Adecca UBB at institutional scale (>5,000 students, thousands of course sections, multiple faculties).
- **Scale-First Architecture:** Every data and interface decision must be evaluated against the complete institutional scale, not against a single-cohort pilot.
- **Independence Disclaimer Guardrail:** Preserve independent platform disclaimers across the UI; app store badges remain non-clickable placeholders until a formal institutional agreement exists.
- **Strict Language Policy for Commits & PRs:** All commit messages, Pull Request titles, and PR descriptions MUST BE WRITTEN STRICTLY IN SPANISH following Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

---

## 2. Non-Negotiable Architectural Invariants (SSOT)

### 2.1 Role Policy & Authentication

Role derivation is strictly deterministic and governed exclusively by institutional email domain:

- `@alumnos.ubiobio.cl` $\rightarrow$ **Student**
- `@ubiobio.cl` $\rightarrow$ **Teacher**
- _Any other domain MUST be immediately rejected with HTTP 403 / Domain Error._

**No hardcoded personal accounts (SPEC-010 / REQ-SEC-01):** the **Owner / Superuser** rank is NOT derived from an email address. It is an administrative state stored in Turso (`users.role = 'owner'`) and projected to Firestore (`users/{uid}.role`); both rule files read it through `role()`. Introducing a personal address into source code or security rules is a governance violation, not a shortcut.

**Single Source of Truth (SSOT):** `lib/access-policy.ts` -> `roleForEmail()`. Reimplementing regex parsing or domain checks in UI components, API routes, or native code is strictly prohibited. This policy is synchronized across four mirrors:

1. `lib/access-policy.ts`
2. `firebase/firestore.rules`
3. `firebase/storage.rules`
4. `android/app/src/main/res/values/firebase.xml` (institutional Firebase identifiers only)

### 2.1.1 Section Isolation (SPEC-010 / REQ-SEC-02)

Access to course data is granted **if and only if** an active enrollment projection exists at `enrollments/{uid}/sections/{seccionId}`. Firestore and Storage rules enforce it with `exists()`; the projection is written server-side by `lib/services/enrollment-projection.ts` and is read-only for every client. Collection-group wildcard reads (`match /{path=**}/...`) are prohibited: they reopen every section of the university.

### 2.2 Data Partitioning & Persistence

- **System of Record (SoR):** Turso/libSQL with Drizzle ORM stores the relational academic structure (`facultades`, `carreras`, `secciones`, `inscripciones`, `usuarios`).
- **Operational Projection:** Firestore holds real-time posts, notifications, files, and the one-way membership projection used by `exists()` in security rules.
- **Course Identity:** A course is always a **Section** (_subject $\times$ academic period $\times$ section_), never a plain unstructured string.
- **Grade Arithmetic:** `lib/grades.ts` is the single source of truth for the Chilean 1.0–7.0 scale and weighted average calculations.

### 2.3 Mobile Seam & Study Library

- **Capacitor 7 Runtime (`cl.ubb.centroestudio`):** Remote-first. The WebView loads `https://ceoubb.com`; `capacitor/www/` hosts only the offline fallback document.
- **Single Library Copy:** `public/biblioteca/` is the only valid copy of the study library. Do not regenerate duplicated asset trees under `android/`.

---

## 3. Canonical Infrastructure Identifiers

| Resource                   | Identifier / Value                                      |
| :------------------------- | :------------------------------------------------------ |
| **Firebase Project ID**    | `centro-de-estudio-ubb`                                 |
| **Messaging Sender ID**    | `411177916202`                                          |
| **Firebase Region**        | `southamerica-west1`                                    |
| **Default Storage Bucket** | `centro-de-estudio-ubb.firebasestorage.app`             |
| **Android Application ID** | `cl.ubb.centroestudio` (minSdk 26)                      |
| **Web Hosting**            | Vercel (`https://ceoubb.com`)                           |
| **Web Database**           | Turso/libSQL (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) |
| **Canonical Repository**   | `https://github.com/CEOUBB/CEOUBB.git` (branch `main`)  |

---

## 4. Modular Context Rules (.agents/rules/*.mdc)

To optimize semantic density and prevent context contamination, the following glob-scoped modular rules apply:

- `.agents/rules/001-database-turso.mdc`: Drizzle transactions, mandatory `.limit()` clauses, and database pagination.
- `.agents/rules/002-access-security.mdc`: Four-mirror security synchronization and dual-store mutations (Turso + Firestore) in user administration.
- `.agents/rules/003-ui-components.mdc`: OKLCH tokens from `DESIGN.md`, typography pairings (`Merriweather` vs `Manrope`), spring physics, and zero inline SVG icons.
- `.agents/rules/004-mobile-capacitor.mdc`: Capacitor bridge, dynamic safe areas, and silent no-op degradation on the web.
- `.agents/rules/005-api-webhooks.mdc`: Next.js API route handlers, Zod schema validation, and structured JSON error responses.

---

## 5. Strict Negative Constraints ("Do NOTs")

1. **NO PLACEHOLDERS OR TRUNCATED CODE:** Generating code blocks with `// TODO`, `/* rest of code */`, or partial diffs is strictly prohibited. Every emitted block must be fully functional and compilable.
2. **NO TEST WEAKENING (TEST-LOCKING):** Agents are strictly forbidden from weakening assertions, deleting tests, adding `.skip()`, or widening thresholds in `tests/` to force builds to pass.
3. **NO ANY OR TYPE BYPASS:** Prohibited use of `any`, `@ts-ignore`, or unsafe type assertions (`as unknown as T`) without a deterministic validation parser (Zod).
4. **NO UNBOUNDED QUERIES:** All database queries must include explicit `.limit()` clauses and indexed pagination cursors.
5. **NO DEPENDENCY DRIFT:** Use `pnpm` exclusively. Running `npm`, `yarn`, or `bun` is prohibited. Installing new packages without explicit authorization is forbidden.
6. **NO FRONTEND AI SLOP (HIGH-CRAFT DESIGN GOVERNANCE):**
   - **Color & Surfaces:** Prohibited use of `#000000`, `bg-black`, `bg-zinc-950` with generic neon accents (`violet-*`, `indigo-*`). Use OKLCH surface tokens (`bg-surface-base`, `bg-surface-raised`) with warm neutrals and calibrated luminance.
   - **Glows & Text Gradients:** Prohibited use of saturated box-shadow glows (`blur-3xl`), glowing borders, and continuous gradient text (`bg-clip-text text-transparent`). Elevate via micro-borders (`border border-surface-border`) and layered micro-shadows.
   - **Badges & Emojis:** Prohibited use of pulsating pill badges with `animate-ping` and decorative emojis (✨, 🚀, ⚡) as icons.
   - **Motion & Physics:** Prohibited use of `transition: all` or `transition-all duration-300 ease-in-out`. Specify exact properties (`transform`, `opacity`) with critically damped spring physics (`stiffness: 340, damping: 28`) or micro-times (`<= 150ms`). Keyboard actions must be instantaneous (`0ms`).
   - **Accessibility (WCAG 2.2):** Mandatory wrapping of animated React components in `useReducedMotion()`. Prohibited modal entrance scaling from `scale(0)` (start from `scale(0.96)` or subtle y-axis translation).
   - **Data & Numerals:** Mandatory application of `font-variant-numeric: tabular-nums lining-nums` (`.num`) on all tables, grades, counters, and dates.
   - **Iconography:** Mandatory exclusive use of `@phosphor-icons/react`. Do not hand-roll raw inline SVG icons.

---

## 6. Gold Standard References (GSR)

When implementing or refactoring entities, clone the architectural patterns of these canonical files:

- **Server Action / Secure Mutation:** `app/api/admin/users/route.ts` (Zod schema validation, server-side session, transactional mutation).
- **Pure Domain Logic:** `lib/grades.ts` (pure mathematical functions, Chilean rounding, test suite in `tests/grades.test.ts`).
- **Dashboard Component (React 19):** `app/views/CoursesDashboard.tsx` (semantic tokens consumption, dynamic code-splitting, accessibility).

---

## 7. Fast-Verification Harness & Definition of Done (DoD)

### 7.1 Local Verification Pipeline

```bash
pnpm run verify:fast         # 1. Typecheck + Unit Tests + SHA-256 Test-Locking Check (<3.0s)
pnpm run verify:invariants   # 2. Security Invariants + Firebase Rules Validation (<500ms)
pnpm test                    # 3. Full Production Build + 15 Integration Suites (Pre-flight)
```

### 7.2 Contractual Definition of Done (DoD)

A task is considered complete ONLY when:

1. Every requirement `REQ-XX` from the specification carries its code-level traceability marker `// Implements: REQ-XX`.
2. `pnpm run typecheck` and `pnpm run lint` terminate with exit code `0` (zero errors, zero warnings).
3. All unit and integration tests pass with zero test assertions modified or weakened in `tests/`.
4. Security policies and trans-store synchronization remain fully intact.
5. Database queries implement strict limits and bounded pagination.
6. `PLAN.md` is updated with structured handoff notes.
7. Commit messages and Pull Request titles are written **strictly in Spanish** with Conventional Commits.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
