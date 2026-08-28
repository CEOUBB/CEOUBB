# Centro de Estudio UBB: Project Plan & Agent Handoff

Last verified 2026-08-28 · baseline `e9e85c4` · repo `https://github.com/CEOUBB/CEOUBB.git` · production `https://ceoubb.com`

**Objective: present CEOUBB to Universidad del Bío-Bío as the next official LMS.** Every priority is ordered against that. Rationale: `docs/institutional/moodle-adecca-comparison.md` (scope and adoption dossier); this file is authoritative for status, deployment, and verification.

## How to use

Read `AGENTS.md` first: invariants, setup, commands, and identifiers live there and are not repeated here. Update this file after any material feature, infrastructure change, deployment, store submission, security update, or architectural decision.

Status labels: `DONE` (implemented and verified at the stated level) · `ACTIVE` (owner working on it) · `NEXT` (ready and prioritized) · `BLOCKED` (requires an external decision, account, approval, or credential) · `BACKLOG` (valuable, not release-critical).

Before starting: add a row to Active work with task, branch, owner, and files. Remove it when merged (completed rows are archived in `docs/archive/PLAN_ARCHIVE.md`).

Companion files:

- [`DESIGN.md`](DESIGN.md): Canonical institutional design system, color tokens, and typography.
- [`docs/archive/PLAN_ARCHIVE.md`](docs/archive/PLAN_ARCHIVE.md): Completed work, implemented milestones, and full handoff history.
- [`docs/institutional/moodle-adecca-comparison.md`](docs/institutional/moodle-adecca-comparison.md): Moodle & Adecca institutional comparison and adoption dossier.
- [`docs/legal/README.md`](docs/legal/README.md): Legal draft folder for UBB/CEOUBB data processing agreement, retention, data subject rights, residency/subprocessors, and service termination.
- [`docs/operations/capacity-cost-baseline.md`](docs/operations/capacity-cost-baseline.md): Capacity envelope for 12,000 students, 3,000 sections, 3,000 concurrent sessions; CLP 450 base / CLP 1,000 ceiling per student-year; SLOs, RPO/RTO, and evidence protocol.
- [`docs/specs/p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md): P0.1-P0.11 detail and acceptance criteria.
- [`docs/specs/p0b-adoption.md`](docs/specs/p0b-adoption.md): P0B.1-P0B.7 institutional adoption dossier.
- [`docs/specs/p0-react-doctor-remediation.md`](docs/specs/p0-react-doctor-remediation.md): React Doctor quality & frontend reliability remediation spec (SDD).
- [`docs/specs/p1-academic-model.md`](docs/specs/p1-academic-model.md): Canonical academic data model and enrollment migration spec.
- [`docs/specs/p2-academic-time-blocking-planner.md`](docs/specs/p2-academic-time-blocking-planner.md): Academic Time-Blocking Planner & deadline sync spec (SDD).
- [`docs/specs/p3-study-resources-hub.md`](docs/specs/p3-study-resources-hub.md): Study Resources Hub, AI Models & UBB Perks spec (SDD).
- [`docs/specs/p4-portal-views-modularization.md`](docs/specs/p4-portal-views-modularization.md): Portal views modularization spec (SDD).
- [`docs/specs/p5-capacitor-mobile-migration.md`](docs/specs/p5-capacitor-mobile-migration.md): Capacitor mobile architecture migration & mobile-first UX spec (SDD).
- [`docs/specs/p6-ci-cd-automation-enhancements.md`](docs/specs/p6-ci-cd-automation-enhancements.md): CI/CD Automations & Integration Quality Enhancement spec (SDD).
- [`docs/specs/p7-enterprise-repository-standards.md`](docs/specs/p7-enterprise-repository-standards.md): Enterprise Repository Standards, Document Architecture & Governance spec (SDD).
- [`docs/specs/p7-teacher-workspace-preview.md`](docs/specs/p7-teacher-workspace-preview.md): Navigable teacher-exclusive preview inspired by Canvas UdeC, ADECCA, and Moodle, with synthetic data and total isolation from productive backend.
- [`docs/specs/p8-live-class-banner.md`](docs/specs/p8-live-class-banner.md): Verified contract for per-section Zoom/Teams link and classroom banner.
- [`docs/specs/p8-performance-and-scalability-remediations.md`](docs/specs/p8-performance-and-scalability-remediations.md): Performance, Scalability & Load Decoupling Optimizations (SDD).
- [`docs/specs/p9-enterprise-harness-evolution.md`](docs/specs/p9-enterprise-harness-evolution.md): Enterprise AI Agent Harness Evolution, Test-Locking & Deterministic Governance (SDD).
- [`docs/specs/p10-institutional-lms-evolution.md`](docs/specs/p10-institutional-lms-evolution.md): Institutional LMS core, enrollment isolation, and bounded real-time architecture spec (SDD).
- [`openspec/specs/academic/spec.md`](openspec/specs/academic/spec.md): Living specification contract for academic data model and section identity.
- [`docs/specs/p11-ui-ux-deliberate-remediation.md`](docs/specs/p11-ui-ux-deliberate-remediation.md): UI/UX Deliberate Quality Remediation, Manrope/Merriweather Typography SSOT & Layout Performance spec (SDD).
- [`docs/specs/p16-classroom-retrocompatibility-mobile-parity.md`](docs/specs/p16-classroom-retrocompatibility-mobile-parity.md): Verified retrocompatibility contract for legacy posts, secure Markdown tables, and local technical overflow in Web/Capacitor.
- [`docs/specs/p17-wcag-22-aa-conformance.md`](docs/specs/p17-wcag-22-aa-conformance.md): Verified audit contract for portal, library, and public documents; keyboard navigation, screen reader, contrast, reflow, reduced motion, forms, and WCAG 2.2 AA statement.
- [`docs/specs/p17-immutable-grade-audit-trail.md`](docs/specs/p17-immutable-grade-audit-trail.md): Transactional and immutable audit history for grades and gradebook configuration.
- [`docs/specs/p18-firebase-app-check-rollout.md`](docs/specs/p18-firebase-app-check-rollout.md): Web and Android attestation, pre-enforcement observation, and phased rollout for Firebase App Check.
- [`docs/specs/p17-bulk-enrollment-import.md`](docs/specs/p17-bulk-enrollment-import.md): CSV enrollment import per section with preview, claimable pending enrollments on first login, and strict idempotency.
- [`docs/specs/p17-moodle-course-import.md`](docs/specs/p17-moodle-course-import.md): Secure and idempotent import of Moodle TGZ/ZIP backups and CSV rosters, with compatible materials, pending enrollments, and audit trails.
- [`openspec/specs/classroom/rich-posts/spec.md`](openspec/specs/classroom/rich-posts/spec.md): Living specification of secure technical posts with Markdown, code highlighting, KaTeX math, and shared Web/Android previews.
- [`openspec/specs/operations/capacity-cost/spec.md`](openspec/specs/operations/capacity-cost/spec.md): Operational contract for capacity, unit cost, and business continuity.
- [`openspec/specs/editor/multimodal-authoring/spec.md`](openspec/specs/editor/multimodal-authoring/spec.md): Living contract for synchronized academic editor across Visual, Markdown + LaTeX, and Raw HTML modes.
- [`docs/specs/p15-publication-wizard.md`](docs/specs/p15-publication-wizard.md): Verified contract for teacher 3-step publishing wizard, split-button, local preference, and silent alerts.
- **Discord AI Bridges & Automation Suite**: Historical channel context injection in local bridges, disk session persistence (`.cache/`), `/doctor` and `/review-pr` command execution, and CI/CD webhook in `app/api/webhooks/github/route.ts`. **24/7 Cloud Assistant on Vercel Serverless** implemented in `app/api/discord/interactions/route.ts`.

## Active work

- [NEXT] **P6: declared debt: Android bottom inset is a constant, not a measurement.** `--safe-bottom` uses `max(env(...), 24px)` below 768px because the WebView does not expose the true gesture bar height. On a three-button device or gesture-less phone, 24px is unrequested padding. The correct solution is reading the inset from the native container and publishing it as a CSS variable on boot. `app/globals.css`, `lib/mobile-bridge.ts`
- [NEXT] **Declared debt from P5 §0.3: no kill switch.** With `server.url` remote the installed app always renders deployed `main`: a broken deploy breaks the app with no store rollback. Acceptable in a pilot; at university scale this requires a minimum-version / kill-switch endpoint checked by the shell on launch. `app/api/`, `capacitor.config.ts`
- [NEXT] **P5 conditional debt: DOM virtualization stays out until measured.** REQ-CAP-08 sets the budget (under 1,500 active nodes, p95 interaction under 200ms, long tasks under 50ms during scroll) and `content-visibility: auto` is the current solution. `@tanstack/react-virtual` may only be introduced against physical measurements on low-end hardware exceeding those thresholds. `app/globals.css`, `app/Classroom.tsx`
- [NEXT] **P5: iOS is a scaffold, not a target.** `ios/` is versioned and consistent but unbuilt: no macOS/Xcode build runner, no `GoogleService-Info.plist`, no Apple Developer enrollment, and no APNs key. Apple guideline 4.2 (minimum functionality) requires push, haptics, downloads, and offline library to land first. `ios/`
- [NEXT] Run classroom, gradebook, and calendar manual test matrix across owner, teacher, and student accounts. Security rules deployed 2026-08-14; verification pending. Firebase
- [NEXT] Institutional SSO (SAML 2.0 / OIDC / CAS) integration with the UBB directory, replacing consumer Google Sign-In; roles derived from directory membership rather than email suffix (P0B.1). `lib/access-policy.ts`, `lib/auth.ts`, `app/api/`, Firebase Auth
- [NEXT] Deploy and conclude operational milestone P0.9 after merging CEO-7: Functions first, portal, index, and rules last; run multi-role matrix and surface read-only grade history UI. `firebase/functions/`, `firebase/firestore.*`, `app/views/classroom/`
- [NEXT] Backups and a **drilled** restore: scheduled Firestore exports, Turso backups, stated RPO/RTO (P0.8). Critical repository priority. Firebase, Turso, `firebase/functions/`
- [NEXT] Firebase Emulator Suite rule tests for Firestore and Storage as a mandatory merge gate (P0.10). `tests/`, `firebase/`
- [NEXT] Demonstrate P0.7 in staging: 3,000 concurrent sessions for 30 minutes, initial launch <= 200 Firestore reads, p95 <= 2s, 5xx < 0.1%, annualized cost <= CLP 1,000 per student, and simulated RPO 1h / RTO 4h drill. Objectives defined by CEO-9. `docs/operations/capacity-cost-baseline.md`, staging, billing export
- [NEXT] Execute production authentication, Storage, and push notification verification matrix (P0.1-P0.3). Web, Android, Firebase
- [NEXT] Deploy App Check observation phase (CEO-47), validate Web/physical Android matrix for 24 hours with >= 99% valid tokens, and enable enforcement per product surface only after passing gate. Firebase, Vercel, Android
- [BLOCKED] Project owner: **written authorization for an institutional pilot** with one department or degree program: named academic sponsor, single semester, real students, signed data-processing agreement. External institutional dependency. UBB (DTI, VRA, legal counsel)
- [BLOCKED] Project owner: Google Play developer verification and official listing URL. Play Console
- [BLOCKED] Project owner: choose and fund native iOS strategy and Apple Developer enrollment. App Store Connect
- [BACKLOG] "Mi Bodega" personal file locker. Deferred by decision; requires per-student quota and Storage cost estimation first. Firebase Storage, `firebase/storage.rules`
- [BACKLOG] Calendar month view, recurring weekly class schedules, and drag-to-create/move in planner grid. Weekly view shipped with P2. `app/views/calendar/`, `lib/courses.ts`
- [BACKLOG] Load real learning outcomes and evaluation schedules for five non-Estatica courses. `lib/courses.ts`
- [BACKLOG] Interoperability: LTI 1.3, SCORM/xAPI runtime, IMS Common Cartridge, QTI (P0B.3; Moodle `.mbz` importer completed in CEO-39). Required for institutional adoption. New surface
- [BACKLOG] Project owner: tenancy, licensing, and continuity dossier: transfer procedure for Firebase/Vercel/Turso, declared license or escrow, maintenance commitment, external penetration test (P0B.6). Governance

## Production inventory: what is NOT done

Everything not listed here is implemented and verified; the full historical inventory lives in `docs/archive/PLAN_ARCHIVE.md`. Deployed and operational: `ceoubb.com` on Vercel with Turso libSQL, Firebase Auth with institutional domain policy, Firestore + Storage rules published, `notifyStudentsOnCoursePost` and `deleteMyAccount` Cloud Functions on Node.js 22 in `southamerica-west1`, FCM HTTP v1, PWA, `/biblioteca/`, `/privacidad`, Android source at `versionCode 13` / `versionName 1.0.6`.

- Web: app store badges remain non-clickable placeholders; no public account-deletion entry page; local portal/library redesign uncommitted/undeployed.
- Android: release AAB installation, Google Sign-In, upload/download, role behavior, account deletion, and FCM delivery **not verified** on a clean physical device. Bundled offline library remains on legacy maroon theme.
- iOS: unbuilt scaffold: no Xcode project configuration, bundle ID, APNs certificates, or iOS Firebase app. Badge remains non-clickable.
- Firebase/GCP: App Check Web/Android registered with Firestore, Storage, and Auth remaining in observation (`UNENFORCED`); pending client deployment, 24-hour representative traffic, physical Android validation, and gradual enforcement. No web push VAPID key configured; no rules emulator suite tests. Cloud Billing alerts configured, but account remains in Free Trial and must be converted to paid prior to expiration.
- GitHub: branch protection rules and required review status not documented as active.

## Architectural risks and technical debt

Detailed context and specifications reside in `docs/specs/`.

- **Static catalogue, no enrollment model**: blocking architectural debt. `courseId` lacks section and period dimensions, causing successive semesters and sections to collide; roles are global and email-derived; no automated bulk enrollment. -> [`p1-academic-model.md`](docs/specs/p1-academic-model.md)
- **Grade audit trail deployment**: PR #70 implements transactional, immutable logging, but production continues overwriting `grades/{uid}` until Functions/portal/index/rules are fully deployed; read-only history UI remains pending. -> P0.9
- **No automated backups, unverified restore**: no scheduled Firestore exports, no automated Turso database backups, no restore drill executed. -> P0.8
- **Institutional SSO directory transition**: Google Workspace OAuth federates access by email domain (@ubiobio.cl / @alumnos.ubiobio.cl), with superuser/owner administrative state persisted in Turso/Firestore (REQ-SEC-01 / SPEC-010). Direct integration with UBB Active Directory via SAML 2.0 / OIDC is required for official institutional adoption. -> P0B.1
- **Rules lack emulator test coverage**: staging deploys and seeds prior to production, but Firestore and Storage rules lack automated Emulator Suite tests in CI. -> P0.10
- **Capacity targets unverified under load**: CEO-9 specifies 12,000 students, 3,000 sections, 3,000 concurrent sessions, CLP 450 base / CLP 1,000 ceiling, and RPO 1h / RTO 4h. Load test, measured paid costs, and staging restore drill remain to be demonstrated. -> P0.7, P0.8
- **Governance and continuity**: personal accounts for Firebase/Vercel/Turso hosting; data-processing agreement in draft stage without legal sign-off; missing public accessibility statement; no external pentest; bus factor of two. MIT license active, but tenancy transfer and exit procedures require formalization. -> P0B.4, P0B.6
- **Account deletion compliance**: backend Cloud Function and Android invocation exist; public `/eliminar-cuenta` route was removed from web navigation. -> P0.6
- **Web/Android library divergence**: `assets/data.js` matches; HTML, JS, styles, and native bridge differ. Academic corrections risk reaching only one platform without a bidirectional content synchronization script.
- **Test coverage gaps**: no Firebase rule emulator tests, no Android unit/instrumentation tests, no multi-role end-to-end integration tests.
- **Store distribution**: Play Console review, internal/closed testing tracks, listing assets, policy declarations, and final AAB verification remain; no iOS application.
- **D1 legacy leftovers**: `posts`, `files`, `progress` tables remain in imported Turso database copy, unreferenced. Drop only after verifying data is obsolete.

## Remaining work: two parallel tracks

- **P0 pilot safety**: protects active students; blocks deployment and correctness. -> [`p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md)
- **P0B institutional adoption**: requirements from DTI, Academic Directorate (VRA), and legal counsel prior to formal proposal. -> [`p0b-adoption.md`](docs/specs/p0b-adoption.md)

### Track A: pilot safety, in order

1. Deploy wildcard course security rules; execute P0.1-P0.3 on physical devices with real accounts; resolve defects.
2. Add rules emulator tests (P0.10); ensure staging (P0.11) deploys and seeds prior to production.
3. Establish automated backups and execute a drilled restoration (P0.8) before instructors input authentic grade records.
4. Complete P0.5 prior to expanding beta cohort; P0.4 billing alerts are active.
5. Restore P0.6 public account deletion and `/privacidad` grade policy update prior to store submission or real grades.
6. Deploy grade audit trail (CEO-7); execute multi-role matrix; expose read-only grade history UI (P0.9).
7. Execute P0.7 load test against CEO-9 targets; complete P0.8 restoration drill.
8. Complete Google Play testing and store submission pipeline.
9. Formalize iOS architecture decisions and initiate native build track.

### Track B: adoption, in order

1. Project owner obtains written pilot authorization (`BLOCKED`). Items 2-4 proceed in parallel.
2. Legal annex and data protection compliance (P0B.4); tenancy, ownership, and continuity dossier (P0B.6).
3. Institutional identity architecture (P0B.1): constraints academic data model, required prior to P1 item 2.
4. Full WCAG 2.2 AA accessibility audit (P0B.5).
5. Interoperability and Moodle course package importer (P0B.3): core institutional requirement.
6. Academic records integration and official grade certification (P0B.2).
7. Compile empirical pilot evidence, then present formal institutional proposal (P0B.7).

## P1: Google Play release

1. Complete Play Console developer identity and phone verification.
2. Confirm app name, developer identity, support mailbox, and Chilean legal disclosures.
3. Create Play app listing for `cl.ubb.centroestudio`.
4. Upload app icons, feature graphics, screenshots, descriptions, category, and privacy policy URL.
5. Complete Data Safety, Content Rating, Target Audience, Ads, and Account Deletion questionnaires.
6. Secure release keystore and enable Play App Signing.
7. Increment `versionCode`, verify `versionName`, compile signed release AAB, test on physical hardware.
8. Follow current Play Console testing track policies.
9. Resolve pre-launch report issues.
10. Submit for production review.
11. Update Play Store badge placeholder with active listing URL upon public approval.

## P1: iOS implementation and App Store release

1. Determine architecture (native SwiftUI vs. Capacitor remote shell); document before implementation.
2. Enroll in Apple Developer Program and configure App Store Connect.
3. Reserve bundle identifier matching institutional naming.
4. Register iOS Firebase app: configure Google Sign-In, Firestore, Storage, Functions, FCM/APNs, App Check.
5. Implement institutional domain role enforcement, offline library, classroom, file uploads, notifications, and account deletion.
6. Verify on physical iPhone and iPad devices.
7. Complete App Privacy disclosures, screenshots, metadata, and TestFlight build.
8. Submit for App Review.
9. Activate App Store badge upon public listing.

## P2: Quality, automation, operations

- Android debug build automation in CI (promoted to P0.10).
- Android unit/instrumentation tests and release smoke-test checklist.
- Crash and error monitoring with privacy-preserving logging policies.
- Academic content synchronization tool across Web and Android assets.
- Accessibility review: keyboard navigation, screen readers, contrast ratios, text scaling, reduced motion.
- Caching performance, PWA updates, and graceful offline fallback handling.
- Academic content verification: accuracy, citations, copyright, mathematical notation, character encoding.
- Replace direct APK links in portal with official Play Store listing upon launch.
- Evaluate browser push requirements; configure VAPID keys only if warranted.

## Settled decisions: do not relitigate

1. **Catalogue storage**: Turso libSQL is the system of record; Firestore maintains a single-writer enrollment projection for O(1) `exists()` security checks.
2. **Course identity is a section**: course = subject x academic period x section; foundational for multi-cohort isolation.
3. **Domain-to-role invariant governs authentication only.** Authorization is enforced per section enrollment.
4. **Do not propose adoption prematurely.** Secure written pilot authorization with a single academic department, retain independent disclaimers in the UI, and allow empirical pilot data to demonstrate superiority.

## Handoff template

Append completed handoffs to `docs/archive/PLAN_ARCHIVE.md`, not here.

```text
Date:
Human maintainer:
AI assistant:
Branch / commit:
Goal:
Files changed:
External services changed:
Checks passed:
Checks not run:
Production deployed: yes/no; target:
Known risks:
Next recommended action:
```

## Next recommended step

Deploy the Firestore and Storage rule sets to `centro-de-estudio-ubb` (using the selective deployment process defined in `AGENTS.md`), then execute the manual verification matrix across owner, teacher, and student roles prior to Vercel production deployment.

In parallel, the owner starts P0B.7 item 1 (pilot authorization), provisions staging, and schedules the P0.7 load test plus the P0.8 restoration drill against published targets.
