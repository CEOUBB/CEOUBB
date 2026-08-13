# PROJECT CONSTITUTION & SYSTEM INVARIANTS

## 1. Core Principles & Philosophy
- Code Quality: Strict typing required. No `any` or untyped escape hatches.
- Architecture: Scale-first, layered architecture with single source of truth.
- Testing: Comprehensive unit & integration testing before merge.

## 2. Technology Stack & Ecosystem Invariants
- Runtime & Framework: Next.js 16 (App Router), React 19, TypeScript
- Database: Turso / libSQL (System of Record via Drizzle)
- Realtime / Storage: Firebase Firestore & Cloud Storage (`southamerica-west1`)
- Package Manager: `pnpm` (strictly no `npm` or `bun`)

## 3. Security & Domain Policy Invariants
- Domain mapping in `lib/access-policy.ts`: `@alumnos.ubiobio.cl` (Student), `@ubiobio.cl` (Teacher).
- Default Deny in Firestore & Storage rules.
- Data Protection compliance with Chilean Ley 19.628 & Ley 21.719.

## 4. Forbidden Anti-Patterns
- FORBIDDEN: Writing code for non-trivial features without an approved spec in `docs/specs/`.
- FORBIDDEN: Deleting or weakening test assertions to force a passing build.
- FORBIDDEN: Bypassing domain authentication in `lib/access-policy.ts`.
