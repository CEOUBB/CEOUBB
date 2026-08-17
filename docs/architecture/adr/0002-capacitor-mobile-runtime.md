# ADR 0002: Remote-First Mobile Architecture with Capacitor 7 Runtime

- **Status:** Accepted
- **Date:** 2026-08-15
- **Decision Makers:** CEOUBB Architecture & Engineering Team
- **Related Specs:** `docs/specs/p5-capacitor-mobile-migration.md`, `AGENTS.md`

---

## Context & Problem Statement

The legacy mobile client utilized a hand-rolled Android WebView bridge (`ClassroomService.java`, ~1,261 lines of Java) with a duplicated static copy of the study library assets (`assets/www/`, ~3.5 MB). This created two major risks:

1. **Asset Drift:** Academic content corrections made on the web portal were omitted on mobile unless a full APK was compiled and distributed.
2. **Maintenance Overhead:** Reimplementing native authentication, push notifications, and download management in Java increased maintenance cost and diverged from the web stack.

---

## Decision

Migrate to **Capacitor 7** with a **remote-first runtime**:

1. The native WebView directly loads the production web app at `https://ceoubb.com`.
2. `capacitor/www/` contains exclusively a lightweight offline fallback shell.
3. The single source of truth for library assets is `public/biblioteca/` backed by a Service Worker (`public/sw.js`).
4. Native device capabilities (Haptics, Status Bar, Hardware Back Button, FCM Push Notifications) are abstracted through `lib/mobile-bridge.ts`, which gracefully degrades to a silent `no-op` in desktop web environments.

---

## Consequences

### Positive:

- Instant web deploys are immediately reflected across all installed mobile clients without store reviews.
- 3.5 MB of duplicated native assets eliminated.
- Unified TypeScript codebase for both web and mobile logic.

### Negative / Mitigations:

- Mobile client depends on network connectivity for initial render when cache is cold.
  - _Mitigation:_ Aggressive caching via Service Worker and native HTTP caching layers.
