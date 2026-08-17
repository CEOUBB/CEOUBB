# ADR 0003: Deterministic Institutional Email Domain Role Derivation

- **Status:** Accepted
- **Date:** 2026-08-14
- **Decision Makers:** CEOUBB Architecture & Engineering Team
- **Related Specs:** `docs/specs/p0-pilot-safety.md`, `lib/access-policy.ts`, `AGENTS.md`

---

## Context & Problem Statement

In an institutional educational platform, user role assignment must be strictly deterministic, tamper-proof, and synchronized across web, mobile, database, and infrastructure security rules. Manually assigning roles in an administrative panel introduces human error and onboarding friction.

---

## Decision

Derive user roles deterministically from the authenticated Google Workspace email domain:

- `@alumnos.ubiobio.cl` $\rightarrow$ `student`
- `@ubiobio.cl` $\rightarrow$ `teacher`
- `elpapijuaco325@gmail.com`, `felipearce.2004@gmail.com` $\rightarrow$ `owner` / `superuser`
- Any other domain is rejected with HTTP 403.

**Single Source of Truth:** `lib/access-policy.ts` -> `roleForEmail()`. Reimplementing regex checks in other components is prohibited. Synchronized across four mirrors:

1. `lib/access-policy.ts`
2. `firebase/firestore.rules`
3. `firebase/storage.rules`
4. `android/app/src/main/res/values/firebase.xml`

---

## Consequences

### Positive:

- Zero-touch automated role assignment upon institutional Google authentication.
- Consistent security boundaries across backend, database, and storage rules.

### Negative / Mitigations:

- Dual-role users (e.g., a teacher who is also a postgraduate student) must use their corresponding institutional account.
