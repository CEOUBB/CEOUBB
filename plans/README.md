# Master Security Remediation Index & Architecture Risk Matrix

> **AUDIT FRAMEWORK:** Tree 3 Depth Analysis & Adversarial Pen-Testing  
> **DISCIPLINE:** `/improve` (Self-contained, production-grade remediation specifications)  
> **APPLICATION:** Centro de Estudio UBB (`CEOUBB`) — Institutional LMS  
> **TARGET BASELINE:** Cloudflare Workers, Turso libSQL, Firebase Auth/Firestore/Storage/Functions

---

## 1. Executive Summary & Security Posture

A comprehensive cybersecurity audit was conducted across 100% of the CEOUBB codebase, including all API route handlers, authentication flows, Firestore/Storage declarative rules, Firebase Cloud Functions, database schemas (Turso/libSQL), Cloudflare Workers infrastructure configuration, and external automation bridges.

The audit identified **14 confirmed security vulnerabilities**, categorized by severity:
- **Critical (P0):** 2 findings (Remote Code Execution via Bridge Command Injection; Superuser / Owner Account Deletion Bypass).
- **High (P1):** 5 findings (Stored XSS via Storage Rules MIME gap; Trans-Store Role Desynchronization; Turso Foreign Key Deletion DoS; Production WAF Bypass via `workers_dev`; Dev-Login Authentication Bypass in Staging).
- **Medium (P2):** 5 findings (Firestore Profile Mass Assignment; Avatar Magic Bytes Spoofing; Indirect LLM Prompt Injection; Session Concurrency Exhaustion & Dead Pruning; Calendar Schema Absence).
- **Low (P3):** 2 findings (Unauthenticated Sentry Test Route in Non-Prod; Dependency Drift).

---

## 2. Master Security Findings Table

| # | Vulnerability | Category / Surface | Severity (CVSS) | CWE / OWASP | Effort | Evidence (`file:line`) | Remediation Plan |
|---|---|---|---|---|---|---|---|
| **01** | Owner Account Deletion Bypass | Cloud Functions / Auth | **CRITICAL (9.1)** | CWE-284 / OWASP A01 | S | `firebase/functions/index.js:739-779` | [Plan 050](050-sec-owner-account-deletion.md) |
| **02** | Foreign Key Violation & DoS on Account Deletion | Turso / Relational DB | **HIGH (7.5)** | CWE-359 / OWASP A04 | M | `app/api/auth/me/route.ts:50-68`, `db/schema.ts:129-131, 351` | [Plan 051](051-sec-turso-foreign-keys-cascade.md) |
| **03** | Trans-Store Role Desynchronization & Priv Escalation | Multi-Store Admin Mutation | **HIGH (7.2)** | CWE-662 / OWASP A04 | M | `app/api/admin/users/route.ts:143-151` | [Plan 052](052-sec-trans-store-role-sync.md) |
| **04** | Stored XSS via Storage MIME Validation Gap | Firebase Storage Rules | **HIGH (8.1)** | CWE-79 / CWE-434 / OWASP A03 | S | `firebase/storage.rules:99-116` | [Plan 053](053-sec-storage-mime-stored-xss.md) |
| **05** | Unrestricted Document Schema on Profile Creation | Cloud Firestore Rules | **MEDIUM (6.5)** | CWE-915 / OWASP A08 | S | `firebase/firestore.rules:187-192` | [Plan 054](054-sec-firestore-profile-creation-schema.md) |
| **06** | OS Command Injection (RCE) in Discord Bridge | Automation / Host Scripts | **CRITICAL (9.8)** | CWE-78 / OWASP A03 | S | `scripts/discord-antigravity-bridge.js:223-228` | [Plan 055](055-sec-discord-bridge-command-injection.md) |
| **07** | Production WAF Bypass via `workers_dev: true` | Cloudflare Edge / WAF | **HIGH (7.5)** | CWE-1188 / OWASP A05 | S | `wrangler.jsonc:7, 54, 78` | [Plan 056](056-sec-cloudflare-workers-dev-waf.md) |
| **08** | Avatar Upload Magic Bytes Spoofing | Web API / File Ingestion | **MEDIUM (6.3)** | CWE-434 / CWE-345 / OWASP A08 | M | `app/api/profile/photo/route.ts:43-65` | [Plan 057](057-sec-avatar-magic-bytes-validation.md) |
| **09** | Indirect Prompt Injection in PR Reviewer & Standup | AI Copilot / LLM | **MEDIUM (6.5)** | CWE-1427 / OWASP LLM01 | M | `lib/discord/pr-reviewer.ts:48-70`, `app/api/cron/standup/route.ts:115-120` | [Plan 058](058-sec-discord-pr-prompt-injection.md) |
| **10** | Uncontrolled Session Concurrency & Dead Pruning | Authentication / Session | **MEDIUM (5.3)** | CWE-400 / CWE-613 / OWASP A07 | M | `lib/auth.ts:22-42` | [Plan 059](059-sec-session-concurrency-dependency-audit.md) |
| **11** | Staging Dev-Login Authentication Bypass | Web API / Staging Auth | **HIGH (7.4)** | CWE-306 / OWASP A07 | S | `lib/auth-dev.ts:56-58` | Included in Plan 059 |
| **12** | Firestore Calendar Events Unbounded Schema | Firestore Rules | **MEDIUM (5.3)** | CWE-400 / OWASP A04 | S | `firebase/firestore.rules:196-198` | Included in Plan 054 |
| **13** | Supply Chain Dependency Drift & Config Warnings | Build / CI | **LOW (3.9)** | CWE-1395 / OWASP A06 | S | `package.json:62-115` | Included in Plan 059 |
| **14** | Unauthenticated Sentry Test Route Exposure | Web API / Observability | **LOW (3.7)** | CWE-200 / OWASP A05 | S | `app/api/sentry-test/route.ts:5-21` | Included in Plan 056 |

---

## 3. Risk Matrix

| Impact \ Likelihood | High Likelihood | Medium Likelihood | Low Likelihood |
|---|---|---|---|
| **Catastrophic (Critical)** | — | **06 (RCE Bridge)** | **01 (Owner Deletion)** |
| **Major (High)** | **04 (Stored XSS)**, **11 (Staging Bypass)** | **03 (Trans-Store Sync)**, **07 (WAF Bypass)** | **02 (Turso FK DoS)** |
| **Moderate (Medium)** | **05 (Profile Schema)**, **08 (Avatar Magic Bytes)** | **09 (Prompt Injection)**, **10 (Session Bloat)** | **12 (Calendar Schema)** |
| **Minor (Low)** | — | **13 (Dependency Drift)** | **14 (Sentry Test Route)** |

---

## 4. Execution Order & Dependency Graph

Remediations MUST be executed in topological order to prevent regressions or circular dependencies across the multi-store boundary.

```
[Wave 1: Critical Fixes (Immediate)]
       ├── Plan 055: Discord Bridge RCE (scripts/discord-antigravity-bridge.js)
       ├── Plan 050: Owner Deletion Protection (firebase/functions/index.js)
       └── Plan 056: Cloudflare WAF & workers_dev Lockdown (wrangler.jsonc)

[Wave 2: Data Store & Rules Hardening]
       ├── Plan 053: Storage MIME Whitelist & Stored XSS Mitigation (firebase/storage.rules)
       ├── Plan 054: Firestore Profile & Calendar Schema Restriction (firebase/firestore.rules)
       └── Plan 051: Turso Relational Cascades & Migration (db/schema.ts)

[Wave 3: Application APIs & Ingestion Defense]
       ├── Plan 052: Trans-Store Role Rollback Transaction (app/api/admin/users/route.ts)
       ├── Plan 057: Avatar Binary Magic Bytes Inspection (app/api/profile/photo/route.ts)
       └── Plan 058: LLM Untrusted Input Framing & Guardrails (lib/discord/pr-reviewer.ts)

[Wave 4: Operational Security & Hygiene]
       └── Plan 059: Session Concurrency Cap, Automated Pruning & Staging Hardening (lib/auth.ts)
```

---

## 5. Remediation Plan Specifications Catalog

- [X] [Plan 050: Owner Account Deletion Bypass Prevention](050-sec-owner-account-deletion.md) - COMPLETED
- [X] [Plan 051: Turso Foreign Key Cascades & Account Deletion Integrity](051-sec-turso-foreign-keys-cascade.md) - COMPLETED
- [Plan 052: Trans-Store Role Synchronization & Rollback Safety](052-sec-trans-store-role-sync.md)
- [X] [Plan 053: Firebase Storage MIME Whitelist & Stored XSS Prevention](053-sec-storage-mime-stored-xss.md) - COMPLETED
- [X] [Plan 054: Firestore User Profile & Calendar Schema Hardening](054-sec-firestore-profile-creation-schema.md) - COMPLETED
- [X] [Plan 055: Discord Antigravity Bridge Command Injection (RCE) Neutralization](055-sec-discord-bridge-command-injection.md) - COMPLETED
- [X] [Plan 056: Cloudflare Production WAF Enforcement & workers_dev Elimination](056-sec-cloudflare-workers-dev-waf.md) - COMPLETED
- [Plan 057: Avatar Ingestion Magic Bytes Binary Validation](057-sec-avatar-magic-bytes-validation.md)
- [Plan 058: Indirect Prompt Injection Defense & Data Framing](058-sec-discord-pr-prompt-injection.md)
- [Plan 059: Session Concurrency Limits, Automated Pruning & Staging Hardening](059-sec-session-concurrency-dependency-audit.md)
