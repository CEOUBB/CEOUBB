# Master Architecture Remediation Index & Risk/Performance Matrix

> **AUDIT FRAMEWORK:** Tree 3 Depth Analysis (Cybersecurity & High-Performance Engineering)  
> **DISCIPLINE:** `/improve` (Self-contained, production-grade remediation specifications)  
> **APPLICATION:** Centro de Estudio UBB (`CEOUBB`) — Institutional LMS  
> **TARGET BASELINE:** Cloudflare Workers, Turso libSQL, Firebase Auth/Firestore/Storage/Functions, Capacitor 7 Mobile

---

## 1. Executive Summary & Overall Health

This repository index houses the definitive remediation plans derived from the dual Tree 3 institutional audits:
1. **Cybersecurity & Multi-Store Invariants Audit:** Plans 050–059 (Mitigated & Superada).
2. **Performance, Algorithmic Complexity & Core Web Vitals Audit:** Plans 060–065 (Compiled & Gated).

All plans are self-contained, fully specified with complete compilable code blocks (zero placeholders, zero `// TODO`), and accompanied by measurable verification protocols.

---

## 2. Performance & Algorithmic Optimization Matrix (Plans 060–065)

| # | Plan | Surface / Domain | Severity / Impact | Complexity / Current Bottleneck | Proposed Optimization | Predicted Gain | Effort | Evidence (`file:line`) |
|---|---|---|---|---|---|---|---|---|
| **060** | [Plan 060](060-perf-bundle-decoupling-academic-sanitizer.md) | Web Bundle Splitting | **HIGH (P1)** | Chunk `2jee60yzhn7je.js` (821.9 KB raw) arrastra KaTeX + Unified + Highlight.js a través de `AcademicProse` | Segregar `sanitizeAcademicHtml` a `lib/academic-sanitizer.ts` | **-520 KB raw JS** en bundle cliente | S | [`lib/academic-content.ts#L1-L279`](../lib/academic-content.ts#L1-L279), [`app/components/AcademicProse.tsx#L1`](../app/components/AcademicProse.tsx#L1) |
| **061** | [Plan 061](061-perf-cwv-mobile-lcp-tbt-optimization.md) | Web Runtime & Mobile IPC | **HIGH (P1)** | LCP móvil de 9.6s (escudo sin `sizes`); TBT 430ms (reCAPTCHA upfront por import estático en `app/portal-ui.tsx`); 3 llamadas IPC secuenciales en StatusBar | Descriptor `sizes` responsivo; lazy App Check on-intent; paralelizar bridge con `Promise.all` | **LCP Móvil: 9.6s $\to$ <2.0s**, **TBT: 430ms $\to$ <80ms**, **60 FPS estables** | S | [`app/Portal.tsx#L153-L159`](../app/Portal.tsx#L153-L159), [`app/portal-ui.tsx#L7`](../app/portal-ui.tsx#L7), [`lib/mobile-bridge.ts#L68-L72`](../lib/mobile-bridge.ts#L68-L72) |
| **062** | [Plan 062](062-perf-turso-sessions-index-smart-placement.md) | Persistence & Edge Network | **HIGH (P1)** | `SCAN sessions` en `DELETE FROM sessions WHERE expires_at <= ?`; latencia WAN transcontinental ~150ms TTFB hacia Turso Virginia | Índice B-Tree `idx_sessions_expires_at`; Cloudflare Smart Placement en `wrangler.jsonc` | **$O(N) \to O(\log N)$ en poda de sesiones**, **-60% TTFB en rutas dinámicas** | S | [`db/schema.ts#L33-L44`](../db/schema.ts#L33-L44), [`lib/auth.ts#L26`](../lib/auth.ts#L26), [`wrangler.jsonc#L45-L46`](../wrangler.jsonc#L45-L46) |
| **063** | [Plan 063](063-perf-bulk-enrollment-csv-parser-memory.md) | Algorithmic Complexity & GC | **MEDIUM (P2)** | Asignación de 5 MB Uint8Array para byteLength; concatenación carácter por carácter $O(N^2)$; `localeCompare` en cadenas ISO | Parser por slices e índices $O(N)$; `Buffer.byteLength` $O(1)$; comparador ASCII directo | **-85% tiempo CPU en imports masivos**, **-95% memory allocations**, **15x más rápido en ordenamientos** | M | [`lib/bulk-enrollment.ts#L98, L345-L385`](../lib/bulk-enrollment.ts#L98), [`lib/portal-utils.ts#L106`](../lib/portal-utils.ts#L106) |
| **064** | [Plan 064](064-perf-react-portal-state-decomposition.md) | React Rendering Engine | **MEDIUM (P2)** | Objeto monolítico de 46 props no memoizado en `usePortalCore`; re-renderizado total de tarjetas y animaciones motion en dashboard | Extraer `CourseCard` en `React.memo` con handlers estables; desacoplar estado efímero UI | **-70% ciclos de renderizado React**, **cero layout thrashing** | M | [`app/usePortalCore.tsx#L47-L150`](../app/usePortalCore.tsx#L47-L150), [`app/views/CoursesDashboard.tsx#L172-L218`](../app/views/CoursesDashboard.tsx#L172-L218) |
| **065** | [Plan 065](065-perf-firebase-lazy-listeners.md) | Real-Time Cloud Data | **MEDIUM (P2)** | 18–24 listeners WebSockets concurrentes en montaje de portal; sockets activos en pestañas ocultas y background móvil | Lazy listeners según vista activa (`grades`); desconexión ante eventos de visibilidad (`visibilitychange` / `appStateChange`) | **-65% lecturas Firestore concurrentes**, **ahorro significativo de batería y datos móviles** | M | [`app/usePortalCore.tsx#L233-L293`](../app/usePortalCore.tsx#L233-L293), [`lib/mobile-bridge.ts`](../lib/mobile-bridge.ts) |

---

## 3. Top 3 High-ROI Quick Wins

Para obtener el máximo impacto inmediato con el menor esfuerzo de ingeniería:

1. **Quick Win 1 — Plan 060 (Aislamiento de Sanitizador Académico):**
   Mover `sanitizeAcademicHtml` a `lib/academic-sanitizer.ts`. Reduce de golpe **>520 KB raw de JavaScript** del bundle cliente de hidratación.
2. **Quick Win 2 — Plan 061 (LCP Móvil & reCAPTCHA On-Intent):**
   Agregar descriptor `sizes` en el escudo UBB y diferir la inicialización de App Check en `lib/firebase-client.ts`. Dispara el score móvil de Lighthouse de **64 a >90**.
3. **Quick Win 3 — Plan 062 (Índice B-Tree en Sesiones & Smart Placement):**
   Añadir `idx_sessions_expires_at` en `db/schema.ts` y `"placement": { "mode": "smart" }` en `wrangler.jsonc`. Elimina Table Scans en la base de datos libSQL y reduce el TTFB intercontinental en ~60%.

---

## 4. Execution Order & Architectural Dependencies

```
[Wave 1: High-ROI Quick Wins (Immediate - Low Effort / High Gain)]
       ├── [X] Plan 060: Segregación de Sanitizador Académico (lib/academic-sanitizer.ts) - COMPLETED
       ├── [X] Plan 061: Optimización de LCP móvil y reCAPTCHA On-Intent (app/Portal.tsx, lib/firebase-client.ts) - COMPLETED
       └── [X] Plan 062: Índice de Expiración de Sesiones y Smart Placement (db/schema.ts, wrangler.jsonc) - COMPLETED

[Wave 2: Algorithmic & Memory Remediation]
       └── [X] Plan 063: Parser CSV Zero-Copy y Eliminación de Collation Overhead (lib/bulk-enrollment.ts) - COMPLETED

[Wave 3: Client Rendering & Real-Time Sync]
       ├── [X] Plan 064: Descomposición de Estado en Portal y Memoización de Tarjetas (app/views/CourseCard.tsx) - COMPLETED
       └── [X] Plan 065: Lazy Listeners de Firestore y Pausa en Background (app/usePortalCore.tsx) - COMPLETED
```

---

## 5. Master Cybersecurity Findings Table (Plans 050–059, Prior Sprint)

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
