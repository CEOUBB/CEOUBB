# Centro de Estudio UBB — plan and agent handoff

Last verified 2026-08-14 · baseline `0d7c97b` · repo `https://github.com/CEOUBB/CEOUBB.git` · production `https://ceoubb.com`

**Objective: present CEOUBB to Universidad del Bío-Bío as the next official LMS.** Every priority is ordered against that. Rationale: `ceoubb_moodle_adecca_comparison.md` (scope and adoption dossier); this file is authoritative for status, deployment and verification.

## How to use

Read `AGENTS.md` first — invariants, setup, commands and identifiers live there and are not repeated here. Update this file after any material feature, infra change, deploy, store submission, security change or architectural decision.

Status labels: `DONE` (implemented and verified at the level stated) · `ACTIVE` (owner working on it) · `NEXT` (ready and prioritized) · `BLOCKED` (needs an external decision, account, approval or credential) · `BACKLOG` (valuable, not release-critical).

Before starting: add a row to Active work with task, branch, owner and files. Remove it when merged (completed rows go to `PLAN_ARCHIVE.md`).

Companion files:

- [`PLAN_ARCHIVE.md`](PLAN_ARCHIVE.md) — completed work, implemented milestones, full handoff history.
- [`docs/specs/p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md) — P0.1–P0.11 detail and acceptance criteria.
- [`docs/specs/p0b-adoption.md`](docs/specs/p0b-adoption.md) — P0B.1–P0B.7 institutional adoption dossier.
- [`docs/specs/p0-react-doctor-remediation.md`](docs/specs/p0-react-doctor-remediation.md) — React Doctor quality & frontend reliability remediation spec (SDD).
- [`docs/specs/p1-academic-model.md`](docs/specs/p1-academic-model.md) — canonical academic data model / enrollment migration spec.
- [`docs/specs/p2-academic-time-blocking-planner.md`](docs/specs/p2-academic-time-blocking-planner.md) — Academic Time-Blocking Planner & deadline sync spec (SDD).
- [`docs/specs/p3-study-resources-hub.md`](docs/specs/p3-study-resources-hub.md) — Study Resources Hub, AI Models & UBB Perks spec (SDD).
- [`docs/specs/p4-portal-views-modularization.md`](docs/specs/p4-portal-views-modularization.md) — portal views modularization spec (SDD). Implemented 2026-08-14: `app/portal-views.tsx` is now a four-line barrel over `app/views/` (`CoursesDashboard.tsx`, `AdminView.tsx`, `calendar/`, `resources/`). Public exports and behaviour unchanged; `pnpm run typecheck`, `pnpm run lint` and `pnpm test` (53/53) pass.
- **Discord AI Bridges & Automation Suite** (Implemented 2026-08-14): Inyección de contexto histórico del canal (últimos 8 mensajes + replies) en bridges locales (`scripts/discord-antigravity-bridge.js`, `scripts/discord-claude-bridge.js`, `scripts/discord-codex-bridge.js`), persistencia de sesiones en disco (`.cache/`), ejecución segura mediante `spawn`, comandos `/doctor` y `/review-pr` con Gemini 3.7 en `daily-standup-bot.js`, y webhook de CI/CD en `app/api/webhooks/github/route.ts` con diagnóstico inteligente de fallos. 37/37 unit tests pasados (`tests/github-webhook.test.ts`).

## Active work

- [NEXT] **Teacher promotion is broken by the deployed rules.** `PATCH /api/admin/users` writes `role` to Turso only, while `isTeacher()` in `firestore.rules` now reads `users/{uid}.role` in Firestore, and `syncProfile` writes that field once at account creation and never again. A promoted account therefore gets teacher affordances in the portal UI and `permission-denied` from Firestore. The rules' own update whitelist excludes `role`, so the account cannot self-heal; only an owner-side write can fix it. No victim today (the Turso directory holds one row, the owner), but this breaks the first real docente onboarding. Fix by making the promotion path write both stores. `app/api/admin/users/route.ts`, `lib/firebase-classroom-client.ts`, `firebase/firestore.rules`
- [NEXT] Run the classroom, gradebook and calendar manual matrix with owner, teacher and student accounts. Rules deployed 2026-08-14; only the verification remains. Firebase
- [NEXT] Academic data model — course identity becomes *asignatura × periodo × sección*; Turso system of record, Firestore one-way enrollment projection. Spec: [`p1-academic-model.md`](docs/specs/p1-academic-model.md). `db/`, `drizzle/`, `lib/courses.ts`, `app/Portal.tsx`, `firebase/firestore.rules`
- [NEXT] Gate course reads on an enrollment check in the rules. Today any signed-in UBB account reads every course. Release-blocking before the platform opens beyond the pilot cohort. `firebase/firestore.rules`
- [NEXT] Replace the two database-wide collection-group sweeps (`watchCourseActivity`, `watchGradebooks`) with enrollment-filtered queries. The badge sweep fails silently past a few dozen courses. `lib/firebase-classroom-client.ts`
- [NEXT] Pagination for posts, files, roster and grade matrix; chunk `saveStudentScores` under the 500-op Firestore batch limit; add the composite indexes enrollment-filtered queries need. `lib/firebase-classroom-client.ts`, `app/Classroom.tsx`, `firebase/firestore.indexes.json`
- [NEXT] Update `/privacidad` to cover official academic grades before any teacher enters real data. `app/privacidad/page.tsx`
- [NEXT] Institutional SSO (SAML 2.0 / OIDC / CAS) against the UBB directory, replacing consumer Google sign-in; role from directory membership, not the email suffix (P0B.1). `lib/access-policy.ts`, `lib/auth.ts`, `app/api/`, Firebase Auth
- [NEXT] Remove the two hardcoded personal Gmail owner exceptions, replaced by directory-backed admin accounts (P0B.1). `lib/access-policy.ts`, `firebase/*.rules`, `android/.../firebase.xml`, `ClassroomService.java`
- [NEXT] Grade audit trail: author, timestamp, previous value on every score change (P0.9). `lib/firebase-classroom-client.ts`, `firebase/firestore.rules`, `firebase/functions/`
- [NEXT] Backups and a **drilled** restore: scheduled Firestore export, Turso backup, stated RPO/RTO (P0.8). Sharpest risk in the repository. Firebase, Turso, `firebase/functions/`
- [NEXT] Firebase Emulator Suite rule tests for Firestore and Storage as merge gate (P0.10). `tests/`, `firebase/`
- [NEXT] Staging Firebase project and seeded emulator dataset (P0.11). Every deploy instruction targets production today. Firebase, `firebase/`
- [NEXT] Define and record the P0.7 capacity and cost targets, then load-check against them. Without numbers, "production-ready" is untestable. `docs/specs/p0-pilot-safety.md`, Google Cloud billing
- [NEXT] Retheme `android/app/src/main/assets/www/` to match the light library, then build and test the APK on a device. `android/app/src/main/assets/www/`
- [NEXT] Run the production authentication, Storage and notification test matrix (P0.1–P0.3). Web, Android, Firebase
- [NEXT] Configure billing budget alerts and App Check rollout (P0.4, P0.5). Google Cloud, Firebase
- [BLOCKED] Project owner — **written authorization for an institutional pilot** with one departamento or carrera: named academic sponsor, one semester, real students, signed data-processing annex. No agent can do this; every adoption item depends on it. UBB (DTI, VRA, jurídica)
- [BLOCKED] Project owner — Google Play verification and official listing URL. Play Console
- [BLOCKED] Project owner — choose and fund the native iOS strategy and Apple Developer enrollment. App Store Connect
- [BACKLOG] Assignment submissions against an evaluation + teacher feedback text per grade. `lib/firebase-classroom-client.ts`, `app/Classroom.tsx`, `firebase/*.rules`
- [BACKLOG] "Mi Bodega" personal file locker. Deferred by decision; needs a per-student quota and a Storage cost estimate first. Firebase Storage, `firebase/storage.rules`
- [BACKLOG] Participants directory: `Ayudantes` role, roster search/filter, contact actions. `app/Classroom.tsx`
- [BACKLOG] Calendar month view, recurring weekly class schedules, and drag-to-create/move in the planner grid. The weekly view shipped with P2. `app/views/calendar/`, `lib/courses.ts`
- [BACKLOG] Load real learning outcomes and evaluation schedules for the five non-Estática ramos. `lib/courses.ts`
- [BACKLOG] Interoperability: LTI 1.3, SCORM/xAPI, IMS Common Cartridge, QTI, Moodle `.mbz` importer (P0B.3). Required for adoption; nothing exists. New surface
- [BACKLOG] WCAG 2.2 AA audit and published conformance statement (P0B.5). Legal obligation for a state body. Web portal, `public/biblioteca/`
- [BACKLOG] Project owner — tenancy, licensing and continuity dossier: transfer procedure for Firebase/Vercel/Turso, declared license or escrow, maintenance commitment, external penetration test (P0B.6). Governance

## Production inventory — what is NOT done

Everything not listed here is done and verified; the full inventory lives in `PLAN_ARCHIVE.md`. Deployed and working today: `ceoubb.com` on Vercel with Turso, Firebase Auth with the institutional domain policy, Firestore + Storage rules published, `notifyStudentsOnCoursePost` and `deleteMyAccount` on Node.js 22 in `southamerica-west1`, FCM HTTP v1, PWA, `/biblioteca/`, `/privacidad`, Android source at `versionCode 13` / `versionName 1.0.6`.

- Web: store badges have no listing URLs (placeholders, non-clickable); no public account-deletion entry page; the local portal/library redesign is uncommitted and undeployed.
- Android: release AAB install, Google sign-in, upload/download, role behaviour, account deletion and FCM delivery **not verified** on a clean physical device. Bundled library still on the old dark maroon theme.
- iOS: nothing exists — no Xcode project, bundle ID, APNs config or iOS Firebase app. Badge is a placeholder and must not be linked.
- Firebase/GCP: App Check not configured; no web push VAPID key; no Emulator Suite rule tests; no Cloud Billing budgets or alerts; billing trial/paid status still **pending verification**.
- GitHub: no CI workflow; branch protection and required review not documented as enabled.

## Architectural risks and technical debt

Detail and remediation live in the spec files; this is the index.

- **Static catalogue, no enrollment model** — the blocking debt. `courseId` carries no section and no period, so paralelos and successive years collide in one collection; roles are global and email-derived; no bulk enrollment path. Cost rises with every day of real pilot data. → [`p1-academic-model.md`](docs/specs/p1-academic-model.md)
- **No grade audit trail** — `grades/{uid}` overwritten in place. Disqualifying for an official gradebook. → P0.9
- **No backups, no proven restore** — no Firestore export, no Turso backup, no restore ever performed. → P0.8
- **Consumer identity and personal-account superusers** — two hardcoded Gmail owners across web, both rules files and the Android service. → P0B.1
- **Single environment, no CI** — one Firebase project, deploys go straight to it, rules have no emulator tests. → P0.10, P0.11
- **No capacity or cost model** — "production-ready" is untestable and cost per student does not exist. → P0.7
- **Governance and continuity** — personal Firebase/Vercel/Turso accounts, no license, no data-processing agreement, no accessibility statement, no external pentest, bus factor of two. → P0B.6
- **Account deletion compliance gap** — backend Function and Android invocation exist; the public `/eliminar-cuenta` route was removed from the web UI. → P0.6
- **Web/Android library divergence** — `assets/data.js` matches; HTML, JS, styles and the native bridge differ. Academic corrections may reach only one platform. Needs a content-sync script that copies portable content and verifies hashes without overwriting native-only behaviour.
- **Test coverage gap** — no Firebase rule emulator tests, no Android unit/instrumentation tests, no end-to-end multi-role tests.
- **Store distribution gap** — Play approval, testing tracks, listing assets, policy declarations and final AAB verification remain; no iOS app.
- **D1 leftovers** — `posts`, `files`, `progress` tables still physically exist in the imported Turso copy, unreferenced. Drop only after confirming the rows are not needed.

## Remaining work — two parallel tracks

- **P0 pilot safety** — protects today's students; deployment- and correctness-blocking. → [`p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md)
- **P0B institutional adoption** — what DTI, Vicerrectoría Académica and jurídica require before CEOUBB can be proposed as official. Cannot be produced in the week before a presentation. → [`p0b-adoption.md`](docs/specs/p0b-adoption.md)

### Track A — pilot safety, in order

1. Deploy the wildcard course rules, run P0.1–P0.3 on real accounts and devices, fix functional failures.
2. CI + rules emulator tests (P0.10) and staging (P0.11). Everything after this is verified before production.
3. Backups and a drilled restore (P0.8) — before teachers enter real grades, not after.
4. P0.4 and P0.5 before inviting a larger beta group.
5. P0.6 and the `/privacidad` grade update, before store submission or real grades, whichever comes first.
6. Grade audit trail (P0.9).
7. Define P0.7 targets, then build the academic data model against them. Course identity lands first; enrollment-gated rules land with it.
8. Finish the Google Play testing/submission path (below).
9. Decide and begin the iOS architecture in a separate workstream (below).

### Track B — adoption, in order

1. Owner obtains the written pilot authorization (`BLOCKED`). Items 2–4 can start immediately without it.
2. Legal and data protection (P0B.4); ownership, tenancy, continuity (P0B.6).
3. Institutional identity design (P0B.1) — it constrains the data model, so specify it before P1 work item 2 is written.
4. Accessibility audit (P0B.5).
5. Interoperability and the Moodle importer (P0B.3) — largest single item, and the first thing an evaluation asks about.
6. Records integration and the actas decision (P0B.2).
7. Pilot evidence, then the proposal (P0B.7).

## P1 — Google Play release

1. Play Console developer identity and phone verification.
2. Confirm final app name, developer name, support email, country/legal details.
3. Create the Play app with application ID `cl.ubb.centroestudio`.
4. Prepare icon, feature graphic, phone/tablet screenshots, descriptions, category, contact details, privacy URL.
5. Complete Data safety, content rating, target audience, ads, app access and account-deletion declarations truthfully.
6. Preserve the release keystore; configure Play App Signing.
7. Increment `versionCode`, verify `versionName`, build the signed AAB, install and test an artifact from that release source.
8. Use the testing track and tester requirements Play Console currently shows; do not rely on outdated policy numbers.
9. Resolve pre-launch report issues.
10. Submit production release.
11. Replace the Play badge placeholder with the official listing URL only after it works publicly.

## P1 — iOS implementation and App Store release

1. Decide architecture (native SwiftUI, shared cross-platform shell, or other maintainable approach); document before scaffolding.
2. Enroll in the Apple Developer Program, configure App Store Connect.
3. Reserve a stable bundle ID aligned with the product identity.
4. Register the iOS Firebase app; configure Google sign-in, Firestore, Storage, Functions, FCM/APNs, App Check.
5. Implement institutional role behaviour, offline library, classroom, uploads, notifications, privacy, account deletion.
6. Test on physical iPhone and iPad.
7. Prepare App Privacy answers, screenshots, metadata, support/privacy URLs, TestFlight.
8. Submit for App Review.
9. Link the App Store badge only after the listing is public.

## P2 — Quality, automation, operations

- Android debug build in CI (the GitHub Actions and rules-emulator items were promoted to P0.10).
- Android unit/instrumentation tests and a release smoke-test checklist.
- Error/crash monitoring and a privacy-conscious logging policy.
- Content synchronization tool for web/Android academic material.
- Accessibility review: keyboard, screen reader, contrast, text scaling, reduced motion.
- Performance, caching, PWA update behaviour, offline failure modes.
- Academic content review: correctness, references, copyright, units, notation, encoding.
- Replace the direct Drive APK link inside the authenticated portal once Play is public.
- Decide whether browser push is required; configure a VAPID key only if it is.

## Settled decisions — do not relitigate

1. **Catalogue storage**: Turso is the system of record; Firestore holds a single-writer enrollment projection so rules can call `exists()`. Reverses the earlier warning against splitting.
2. **Course identity is a section** — asignatura × periodo × sección — and must change before a second cohort exists.
3. **The domain-to-role invariant is authentication only.** Authorization moves to per-enrollment roles. `AGENTS.md` still states it as absolute; amending it is deliberate work in one commit with tests, not drift.
4. **Do not propose adoption first.** Get a written authorization for a pilot with one departamento or carrera, keep the non-official disclaimer in the UI until it exists, let the pilot produce the evidence.

## Handoff template

Append completed handoffs to `PLAN_ARCHIVE.md`, not here.

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

In parallel, the owner starts P0B.7 item 1 (pilot authorization) and fills in the P0.7 capacity and cost targets — both gate work that otherwise stalls.
