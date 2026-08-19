# SPEC-013: Deep Application Security, Data Isolation, and Invariant Hardening

- **Status:** APROBADA
- **Creation Date:** 2026-08-19
- **Author / Responsible Agent:** Antigravity (Advanced Agentic Coding) & Ponytail
- **Related Specs:** [SPEC-010, SPEC-012]

---

## 1. Executive Summary & Problem Statement

A rigorous application security audit of CEOUBB (Next.js 16, Turso/libSQL, Cloud Firestore/Storage, Capacitor, Discord integration) identified critical and high-priority findings across access control, identity mapping, command execution, and error handling:

1. **Enrollment Projection Identity Desynchronization:** Turso `users.id` carries the prefix `firebase:`, which was written to Firestore enrollment paths (`/enrollments/firebase:12345/sections/...`). Firebase client tokens provide `request.auth.uid = "12345"` (raw UID), causing `isEnrolled()` to evaluate to `false` and denying course access to enrolled students and faculty.
2. **Firestore Submissions IDOR:** Update rules on `/courses/{courseId}/submissions/{submissionId}` only checked `request.resource.data.uid == request.auth.uid` instead of validating `resource.data.uid == request.auth.uid`, permitting cross-student document overwriting.
3. **Command Injection in Discord Bridge Scripts:** `spawnSafeCommand` in `scripts/discord-context-helper.js` invoked `spawn(..., { shell: true })` with unescaped channel context passed via CLI arguments.
4. **Server-Side Dual-Store Role Synchronization:** `PATCH /api/admin/users` mutated Turso but delegated Firestore updating to the browser client, violating `.agents/rules/002-access-security.mdc`.
5. **Public Sentry Test Endpoint & Local Variable Leakage:** `/api/sentry-test` was exposed in production with unauthenticated 2s blocking flushes, and `sentry.server.config.ts` unconditionally logged local variables.
6. **URL Scheme Sanitization (XSS Defense):** `linkUrl` in course posts accepted arbitrary schemes (including `javascript:`).
7. **Owner Account Self-Deletion Guard:** `DELETE /api/auth/me` lacked owner protection against administrative lockout.
8. **Fail-Closed Linear Webhook Signature & Error Sanitization:** `verifyLinearSignature` lacked a check for empty `secret`, and webhook error handlers leaked raw error messages to external callers.

---

## 2. Formal Requirements (EARS Syntax)

- **REQ-SEC-07 (Ubiquitous):** The enrollment projection service SHALL strip any `firebase:` prefix from `userId` before generating Firestore document paths (`/enrollments/{rawUid}/sections/{seccionId}`), ensuring consistency with `request.auth.uid`.
- **REQ-SEC-08 (Unwanted Behavior):** On document update for `/courses/{courseId}/submissions/{submissionId}`, Firestore security rules SHALL reject any mutation where `resource.data.uid != request.auth.uid` or `request.resource.data.uid != request.auth.uid`.
- **REQ-SEC-09 (Ubiquitous):** Process execution helpers in `scripts/discord-context-helper.js` SHALL run child processes with `shell: false` to prevent command injection from untrusted input.
- **REQ-SEC-10 (Ubiquitous):** When an administrator updates a user's role via `PATCH /api/admin/users`, the route handler SHALL update both Turso (`users.role`) and the Firestore document (`users/{uid}`) server-side using authorized service credentials.
- **REQ-SEC-11 (Unwanted Behavior):** IF `process.env.NODE_ENV === "production"`, THEN `GET /api/sentry-test` SHALL return HTTP 404; and `sentry.server.config.ts` SHALL enable `includeLocalVariables` only in development mode.
- **REQ-SEC-12 (Ubiquitous):** Mappers and UI renderers SHALL reject non-HTTP(S) URL protocols (e.g. `javascript:`, `data:`) for post and file links, returning `null` or a sanitized fallback.
- **REQ-SEC-13 (Unwanted Behavior):** IF an authenticated user with `role === "owner"` requests account deletion via `DELETE /api/auth/me`, THEN the system SHALL reject the request with HTTP 400 (`La cuenta propietaria no puede eliminarse`).
- **REQ-SEC-14 (Unwanted Behavior):** IF `secret` or `signature` is empty or missing, THEN `verifyLinearSignature` SHALL return `false` (fail-closed); and webhook handlers SHALL return generic JSON error messages without exposing raw internal error objects.

---

## 3. BDD Acceptance Criteria (Gherkin Scenarios)

```gherkin
Feature: Deep Security, Data Isolation, and Invariant Hardening

  Scenario: Enrollment projection normalizes prefixed UIDs
    Given a user ID "firebase:usr_12345" and section ID "sec_opt_01"
    When enrollmentDocumentPath is called
    Then the resulting path must be "projects/centro-de-estudio-ubb/databases/(default)/documents/enrollments/usr_12345/sections/sec_opt_01"

  Scenario: Firestore submission update denies cross-student overwrite
    Given a submission document owned by "student_A"
    When "student_B" attempts an update with request.resource.data.uid = "student_B"
    Then the update must be denied by Firestore security rules

  Scenario: Sentry test endpoint is disabled in production
    Given NODE_ENV is "production"
    When a GET request is made to "/api/sentry-test"
    Then the response status code must be 404

  Scenario: Owner cannot self-delete account in /api/auth/me
    Given an authenticated user with role "owner"
    When they submit a DELETE request to "/api/auth/me"
    Then the response status code must be 400
    And the response body must be JSON containing error "La cuenta propietaria no puede eliminarse."

  Scenario: Dangerous URL schemes are stripped from post links
    Given a raw post with linkUrl "javascript:alert(1)"
    When toPost is called
    Then the resulting linkUrl must be null
```

---

## 4. Technical Design & File Mapping

```
[Client / External Webhook]
       │
       ▼
[Next.js API Routes]
  ├── /api/sentry-test (REQ-SEC-11: 404 in production)
  ├── /api/auth/me (REQ-SEC-13: Owner self-delete guard)
  ├── /api/admin/users (REQ-SEC-10: Server-side Turso + Firestore Dual-Store update)
  └── /api/webhooks/linear (REQ-SEC-14: Fail-closed signature + sanitized errors)
       │
       ▼
[Services & Shared Libraries]
  ├── lib/services/enrollment-projection.ts (REQ-SEC-07: UID normalization)
  ├── lib/firebase/mappers.ts (REQ-SEC-12: HTTP/HTTPS URL protocol whitelist)
  ├── lib/linear-signature.ts (REQ-SEC-14: !secret check)
  └── sentry.server.config.ts (REQ-SEC-11: dev-only includeLocalVariables)
       │
       ▼
[Firebase Rules & Scripts]
  ├── firebase/firestore.rules (REQ-SEC-08: Submissions IDOR fix)
  └── scripts/discord-context-helper.js (REQ-SEC-09: shell: false)
```

---

## 5. Task Dependency DAG & Execution Units

- [x] **Task 1 (Identity & Isolation):** Fix UID prefix normalization in `lib/services/enrollment-projection.ts` (REQ-SEC-07).
- [x] **Task 2 (Firestore Rules IDOR):** Disentangle `create` vs `update` for submissions in `firebase/firestore.rules` (REQ-SEC-08).
- [x] **Task 3 (Script Security):** Set `shell: false` in `scripts/discord-context-helper.js` (REQ-SEC-09).
- [x] **Task 4 (Dual-Store Admin Sync):** Update `PATCH /api/admin/users` to mutate Firestore server-side (REQ-SEC-10).
- [x] **Task 5 (Sentry & Observability Hardening):** Guard `/api/sentry-test` with production 404 check and restrict Sentry `includeLocalVariables` to development (REQ-SEC-11).
- [x] **Task 6 (URL Protocol Sanitization):** Add scheme whitelisting in `lib/firebase/mappers.ts` (REQ-SEC-12).
- [x] **Task 7 (Account Deletion Governance):** Guard `DELETE /api/auth/me` against owner deletion (REQ-SEC-13).
- [x] **Task 8 (Webhook Hygiene):** Guard `lib/linear-signature.ts` on empty secret and sanitize error responses in webhooks (REQ-SEC-14).
- [x] **Task 9 (Automated Test Suite):** Create `tests/deep-security-remediation.test.ts`, generate test hashes, and run verification harness (DoD).
