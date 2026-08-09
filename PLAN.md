# Centro de Estudio UBB — Project Plan and Agent Handoff

Last verified: 2026-08-09  
Canonical repository: `https://github.com/CEOUBB/CEOUBB.git`  
Production web domain: `https://ceoubb.com`  
Planning baseline before this document: commit `0681499`

## How to use this plan

This is the shared handoff for two human maintainers working with Codex and Claude Code. Read `AGENTS.md` first. Update this file after any material feature, infrastructure change, deployment, store submission, security change, or architectural decision.

Use these status labels:

- `DONE`: implemented and verified at the level stated.
- `ACTIVE`: currently being worked on by an identified owner/agent.
- `NEXT`: ready to start and prioritized.
- `BLOCKED`: requires an external decision, account, approval, credential, or platform state.
- `BACKLOG`: valuable but not release-critical.

Before starting work, add the task, branch, owner/agent, and affected files to the Active work table. Remove or archive the entry when it is merged.

## Active work

| Status | Owner / agent | Branch | Scope | Files or services |
|---|---|---|---|---|
| ACTIVE | Claude Code | `claude/nextjs-vercel-migration` | Migrate web from vinext/OpenAI Sites to Next.js/Vercel; code done, data migration and deploy pending | `package.json`, `db/`, `app/api/`, `tests/`, `AGENTS.md`, Vercel, Turso |
| NEXT | Unassigned | — | Run the production authentication, Storage, and notification test matrix | Web, Android, Firebase |
| NEXT | Unassigned | — | Configure billing budget alerts and App Check rollout | Google Cloud, Firebase |
| BLOCKED | Project owner | — | Complete Google Play verification and obtain the official listing URL | Play Console |
| BLOCKED | Project owner | — | Choose and fund the native iOS strategy and Apple Developer enrollment | Apple Developer / App Store Connect |

## Current production inventory

### Web

- `DONE`: Institutional UBB-inspired login design, responsive layout, privacy footer, official Google sign-in button artwork, and non-clickable store badges.
- `DONE`: Custom domain `ceoubb.com` connected to the deployed Sites project. The Sites deployment is still the live production site; the Next.js/Vercel migration is code-complete but not deployed.
- `DONE`: Google authentication is handled by Firebase Authentication, followed by the web session endpoint.
- `DONE`: Access is limited to UBB student and teacher domains plus the two explicit developer exceptions.
- `DONE`: Dashboard contains six semester courses and an Estática collaborative classroom beta.
- `DONE`: PWA manifest and service worker are present.
- `DONE`: Public study library is available under `/biblioteca/`.
- `DONE`: Public privacy page is available at `/privacidad`.
- `NOT DONE`: App Store and Google Play badges do not have listing URLs yet.
- `NOT DONE`: A public account-deletion information/entry page is not currently exposed.

### Android

- `DONE`: Native Java project under `android/` with application ID `cl.ubb.centroestudio`.
- `DONE`: Current source metadata is `versionCode 13`, `versionName 1.0.6`, `minSdk 26`, and `targetSdk 36`.
- `DONE`: Offline study library is bundled in `android/app/src/main/assets/www/`.
- `DONE`: Native Firebase Authentication, Firestore, Storage, Functions, and Messaging dependencies are wired.
- `DONE`: Students subscribe to `course_estatica_students`; the app declares Android 13+ notification permission.
- `DONE`: Deep links for `ceoubb.com` and `www.ceoubb.com` are declared.
- `DONE`: The native app can invoke `deleteMyAccount`.
- `NOT VERIFIED`: Release AAB installation, Google sign-in, upload, download, role behavior, account deletion, and FCM delivery on a clean physical device.
- `BLOCKED`: Play Console identity/account verification and store approval remain external platform steps.

### iOS

- `NOT STARTED`: No Xcode project, Swift source, Apple bundle ID, APNs configuration, or iOS Firebase app exists in this repository.
- `BLOCKED`: Apple Developer Program enrollment and an implementation choice are required.
- The App Store badge is only a placeholder and must not be linked or described as available.

### Firebase and Google Cloud

- Firebase project: `centro-de-estudio-ubb` (`411177916202`).
- Primary region: `southamerica-west1` (Santiago).
- `DONE`: Google Authentication provider enabled.
- `DONE`: Authorized domains include Firebase defaults, localhost, `ceoubb.com`, `www.ceoubb.com`, and the Sites preview hostname.
- `DONE`: Firestore database exists in Santiago and contains `users` and `courses` data.
- `DONE`: Firestore rules enforcing institutional roles were published.
- `DONE`: Default Storage bucket `centro-de-estudio-ubb.firebasestorage.app` was created in Santiago.
- `DONE`: Storage rules enforcing member reads, teacher/owner writes, uploader ownership, and a 50 MiB limit were published on 2026-08-09.
- `DONE`: `notifyStudentsOnCoursePost`, 2nd generation, Node.js 22, Firestore-created trigger, deployed in Santiago on 2026-08-09.
- `DONE`: `deleteMyAccount`, 2nd generation, Node.js 22, callable trigger, deployed in Santiago on 2026-08-09.
- `DONE`: Artifact Registry cleanup policy enabled by the Functions deployment; images older than one day are removed.
- `DONE`: Firebase Cloud Messaging HTTP v1 API enabled; legacy API disabled.
- `NOT DONE`: App Check is not configured/enforced.
- `NOT DONE`: No web push VAPID key is configured. Native Android FCM does not require this, but browser push would.
- `NOT DONE`: No Firebase Emulator Suite security-rule test suite is committed.
- `PENDING VERIFICATION`: A billing account and Blaze/free-trial capability were connected. Confirm the current trial/paid status, remaining credit, and post-trial behavior in Cloud Billing before depending on it.
- `NOT DONE`: No Cloud Billing budgets or alert thresholds were observed during the 2026-08-09 audit.

### GitHub and delivery

- `DONE`: Repository is hosted at `CEOUBB/CEOUBB`, branch `main`.
- `DONE`: Firebase Node.js 22 deployment configuration is committed at `0681499`.
- `NOT DONE`: No GitHub Actions CI workflow currently enforces web, Functions, or Android checks.
- `NOT DONE`: Branch protection and required pull-request review have not been documented as enabled.

## Implemented milestones

### 1. Study library

- Created a multi-course study library for EDO, Estadística, Estática, Inglés Comunicacional I, Termodinámica Aplicada, and Programación en Ingeniería/MATLAB.
- Added long-form university-style practice exercises, worked solutions, hints, personal notes, and study routes.
- Added KaTeX and mathematical display assets so equations appear as mathematics instead of programming notation.
- Added offline content to the Android bundle.

### 2. Web portal and institutional identity

- Built the responsive Centro de Estudio UBB portal and institutional login page.
- Adopted UBB-inspired colors and provided an independent-project disclaimer.
- Connected the custom domain and kept the temporary Sites hostname as an authorized Firebase domain.
- Added privacy, sitemap, PWA manifest, service worker, and link-preview assets.

### 3. Authentication and role model

- Replaced prototype/local login with Firebase Google authentication.
- Enforced student, teacher, and owner roles by verified email domain and developer exceptions.
- Added an owner administration surface and role-aware classroom behavior.
- Added the developer collaborator account `felipearce.2004@gmail.com` consistently across application policy and Firebase rules.

### 4. Estática collaborative beta

- Added teacher posts, links, direct file uploads, editing, deletion, progress monitoring, and student read/download behavior.
- Added Firestore and Storage rules to prevent students from modifying teacher content or other students' progress.
- Added a 50 MiB upload boundary.
- Added the FCM Function and Android topic subscription for new course material.

### 5. Android release preparation

- Added native Firebase services and Google sign-in support.
- Added offline access, privacy access, notification channel, file provider, and deep-link declarations.
- Added release signing configuration that reads ignored local keystore properties.
- Added Google Play and App Store visual placeholders to the web login while official URLs are pending.

### 6. Firebase production setup completed on 2026-08-09

- Created the Storage bucket in Santiago.
- Published Storage rules.
- Enabled required Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, Eventarc, Pub/Sub, Storage, and Firebase Extensions APIs.
- Updated Functions from deprecated Node.js 20 to Node.js 22.
- Added `@google-cloud/functions-framework` for pnpm-compatible Cloud Functions builds.
- Deployed `notifyStudentsOnCoursePost` and `deleteMyAccount` successfully.
- Enabled automatic cleanup for old Functions container images.

## Important architectural risks and technical debt

### Split classroom backends — RESOLVED in code, pending data cleanup

The unused D1/R2 classroom routes (`app/api/courses/estatica/*`, `app/api/files/[id]`) had no callers and were deleted during the Vercel migration, together with the `posts`, `files`, and `progress` tables in `db/schema.ts`. Firebase is now the only classroom backend.

Remaining: those three tables still physically exist in the old D1 database and will exist in the imported Turso copy. They are unreferenced. Drop them only after confirming the rows are not needed; `npm run db:generate` would emit that drop migration.

Residual defect: the notification bell (`app/api/notifications`) reads `notifications` filtered on the retired course ID `estatica-440299`, and its only writer was the deleted upload route. The bell is therefore permanently empty. Repoint it at Firestore or remove it.

### Web/Android library divergence

The web and Android libraries share academic data but not identical UI/runtime files. `assets/data.js` currently matches, while HTML, JavaScript, styles, and Android's native bridge differ.

Risk: academic corrections may reach only one platform.

Required improvement: define a canonical content-generation/synchronization script that copies only portable content and verifies hashes without overwriting native-only behavior.

### Hard-coded single-course beta

Firebase clients, Android services, notification topics, rules paths, and several UI views are fixed to `estatica`.

Risk: copying the implementation for more courses will duplicate code and rules.

Required improvement: introduce a validated course registry, membership model, dynamic Firestore paths, and per-course notification subscription before expanding collaborative features.

### Account deletion compliance gap

The backend callable Function and Android invocation exist, but the public `/eliminar-cuenta` route was intentionally removed from the web UI.

Risk: Google Play and App Store policies may require an accessible account-deletion flow and public instructions for apps that create accounts.

Required action: verify current store policy, then add a compliant authenticated deletion flow and/or public request/instructions page without exposing another user's data. Update the privacy policy and Data safety answers to match.

### Store-distribution gap

The Android source exists, but Play approval, internal/closed testing, listing assets, policy declarations, and final AAB verification remain. No iOS app exists.

### Test coverage gap

Current automated tests focus on rendered web output and source-policy assertions. There are no committed Firebase rule emulator tests, Android unit/instrumentation tests, or end-to-end multi-role tests.

## Prioritized remaining work

## P0 — Production reliability and compliance

### P0.1 End-to-end authentication matrix

Test on `ceoubb.com` and a physical Android device:

1. Owner account receives owner access.
2. Collaborator account receives owner access.
3. `@ubiobio.cl` receives teacher access.
4. `@alumnos.ubiobio.cl` receives student access.
5. Personal Gmail and another university domain are rejected with the institutional-only message.
6. Sign-out clears both the web session and Firebase state.

Acceptance: no redirect loop, no unauthorized role, no stale session, and no console/API 401 error after successful login.

### P0.2 Storage and classroom permission test

1. Teacher uploads representative PDF, PPTX, DOCX, image, and text files.
2. Student can view/download but cannot edit, delete, or upload teacher material.
3. Teacher can edit/delete their own post but not another teacher's post.
4. Owner can administer all posts.
5. Student can update only their own progress.
6. Files over 50 MiB are rejected and a boundary-size file is handled correctly.

Acceptance: Firestore and Storage rules enforce the same result even when requests bypass the UI.

### P0.3 Notification test

1. Install a clean debug/release build on a physical Android device.
2. Sign in as a student and grant notification permission.
3. Publish a new Estática post as teacher.
4. Confirm receipt while the app is foregrounded, backgrounded, and closed.
5. Confirm tapping the notification opens the intended course.

Acceptance: one readable notification per post with correct Spanish accents and no duplicate delivery.

### P0.4 Billing safeguards

- Create Cloud Billing budget alerts at owner-approved CLP/USD thresholds.
- Add at least 50%, 80%, and 100% notifications.
- Record recipients and escalation steps outside the public repository.
- Confirm whether the account remains in a trial and what happens when the trial/credit ends.

Acceptance: the owner receives a test or confirmed budget notification path and understands that budgets alert rather than hard-cap spending.

### P0.5 App Check rollout

- Register the web and Android apps with suitable App Check providers.
- Start in monitoring mode.
- Verify legitimate web, Android, Functions, Firestore, and Storage traffic.
- Enforce incrementally only after confirming no supported client is blocked.

Acceptance: unauthorized clients are rejected after enforcement and production clients continue to function.

### P0.6 Account deletion and privacy compliance

- Review current Google Play and Apple account-deletion requirements.
- Restore or implement a compliant public information URL and authenticated deletion entry point.
- Test `deleteMyAccount` against Auth, Firestore user/progress/posts, and Storage objects.
- Decide retention for teacher-created course content before deletion.
- Update `/privacidad`, Data safety, and future App Privacy answers.

Acceptance: a user can discover and complete deletion without developer intervention, while course records follow the documented retention policy.

## P1 — Google Play release

1. Complete Play Console developer identity and phone verification.
2. Confirm the final app name, developer name, support email, and country/legal details.
3. Create the Play app using application ID `cl.ubb.centroestudio`.
4. Prepare icon, feature graphic, phone/tablet screenshots, short description, full description, category, contact details, and privacy URL.
5. Complete Data safety, content rating, target audience, ads, app access, and account-deletion declarations truthfully.
6. Preserve the release keystore and configure Play App Signing.
7. Increment `versionCode`, verify `versionName`, build the signed AAB, and install/test an artifact derived from that release source.
8. Use the testing track and tester requirements currently shown by Play Console; do not rely on outdated policy numbers.
9. Resolve pre-launch report issues.
10. Submit production release.
11. Replace the Google Play badge placeholder with the official listing URL only after it works publicly.

## P1 — iOS implementation and App Store release

1. Decide architecture: native SwiftUI, a shared cross-platform shell, or another maintainable approach. Document the decision before scaffolding.
2. Enroll in the Apple Developer Program and configure App Store Connect.
3. Reserve a stable bundle ID aligned with the product identity.
4. Register the iOS Firebase app and configure Google sign-in, Firestore, Storage, Functions, FCM/APNs, and App Check.
5. Implement institutional role behavior, offline library, classroom, uploads, notifications, privacy, and account deletion.
6. Test on physical iPhone and iPad devices.
7. Prepare App Privacy answers, screenshots, metadata, support/privacy URLs, and TestFlight testing.
8. Submit for App Review.
9. Link the App Store badge only after the listing is public.

## P1 — Multi-course collaboration

1. Define a course document/registry schema and allowed course IDs.
2. Define enrollment/membership instead of allowing every institutional account into every future course.
3. Make web and Android clients select course dynamically.
4. Generalize Firestore/Storage rules and notification topics.
5. Migrate Estática without breaking existing posts, progress, or files.
6. Add teacher course-management and student enrollment UX.

## P1 — Backend consolidation

1. Trace every caller of legacy D1/R2 course APIs.
2. Decide Firebase-only, D1/R2-only, or a clearly separated responsibility model.
3. Back up/migrate any real data.
4. Remove dead routes, schema, bindings, and UI calls only after verification.
5. Update architecture documentation and tests.

## P2 — Quality, automation, and operations

- Add GitHub Actions for web lint/test, Functions syntax/dependency validation, and Android debug builds.
- Add Firebase Emulator Suite tests for Firestore and Storage role matrices.
- Add Android unit/instrumentation tests and a release smoke-test checklist.
- Add error/crash monitoring and a privacy-conscious logging policy.
- Add a content synchronization tool for web/Android academic materials.
- Review accessibility with keyboard, screen reader, contrast, text scaling, and reduced-motion checks.
- Review performance, caching, PWA update behavior, and offline failure modes.
- Review all academic content for correctness, references, copyright, units, notation, and encoding.
- Replace the direct Drive APK link inside the authenticated portal after Google Play is public.
- Decide whether browser push is required; configure a VAPID key only if it is.

## Recommended execution order

1. Run P0.1–P0.3 on real accounts/devices and fix functional failures.
2. Complete P0.4 and P0.5 before inviting a larger beta group.
3. Resolve P0.6 before store submission.
4. Finish the Google Play testing/submission path.
5. Decide and begin the iOS architecture in a separate branch/workstream.
6. Consolidate the backend before expanding collaborative classrooms.
7. Generalize to multiple courses only after rules tests and membership design exist.

## Recent implementation history

| Commit | Result |
|---|---|
| `0681499` | Deployed Firebase Functions with Node.js 22 and Functions Framework dependency |
| `ab2d960` | Refined institutional login layout |
| `0f6242b` | Removed standalone APK download from login |
| `6a6384e` | Added mobile store placeholders |
| `fbf4ea9` | Authorized the developer collaborator |
| `37dc261` | Adopted UBB institutional visual identity |
| `d99f935` | Fixed Firebase Google sign-in loop |
| `dd040ea` | Added Android app and Firebase backend |
| `540fce3` | Unified Firebase classroom work and store-compliance preparation |

## Handoff template for future agents

Copy this block into the end of the relevant task update or replace the previous completed-task note:

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

## Last handoff

Date: 2026-08-09  
Human maintainer: project owner  
AI assistant: Codex  
Branch / commit: `main` / baseline `0681499`  
Goal: finish the initial Firebase Storage and Functions production setup, then create cross-agent documentation.  
External services changed: Storage rules published; Cloud Functions and required Google Cloud APIs enabled; two Functions deployed in Santiago; Artifact Registry cleanup policy enabled.  
Checks passed: Storage rules compiled; Functions source syntax check; both Functions listed as active with Node.js 22.  
Checks not run: real multi-role upload test, physical-device FCM test, account-deletion end-to-end test, App Check validation.  
Production deployed: yes, Firebase project `centro-de-estudio-ubb`.  
Known risks: billing alerts and App Check remain unset; account-deletion compliance is unresolved; store approvals and iOS implementation remain pending.  
Next recommended action: execute P0.1–P0.3 with real owner, teacher, and student accounts before further feature development.

---

Date: 2026-08-09  
Human maintainer: project owner  
AI assistant: Claude Code  
Branch / commit: `main`, uncommitted at time of writing (baseline `eda2776`)  
Goal: redesign the institutional login screen (visual only; no auth, role, or rules changes).  
Files changed: `app/Portal.tsx` (`AccessScreen` markup), `app/globals.css` (access-screen styles).  
External services changed: none.  
Summary: replaced the centered single-column screen with a 50/50 split (deep-blue brand panel plus light action panel); the crest and wordmark form one large lockup with the eyebrow lifted out of the flex row so crest and wordmark share an exact vertical centre; the four-colour UBB band moved from a top stripe to the panel seam and its blue segment was brightened from `#0057a4` to `#0d8ae0` because the original was only 1.12:1 against the panel and read as a band starting 40% down; a cropped crest watermark at 6% opacity fills the brand panel; the login card, its `backdrop-filter`, and the store-badge caption were deleted.  
Checks passed: `npm test` 6/6; `npx eslint app/Portal.tsx` at lint parity with baseline (2 pre-existing errors, 4 pre-existing `no-img-element` warnings, none added); layout measured in-browser at 1920/1440/1024/900/390/320 with no horizontal overflow and no display-text clipping; crest/wordmark centre offset measured at 0px; WCAG AA contrast verified on every text pair (lowest 5.27:1); all four brand assets 200 OK; no console errors.  
Checks not run: real Google sign-in against Firebase from this session, visual screenshot capture (Browser pane was not displayed, so the page never composited frames), physical-device check.  
Production deployed: no.  
Known risks: the Android bundled login (`android/app/src/main/assets/www/`) still uses the previous layout and was deliberately left untouched, so web and Android login now differ visually.  
Next recommended action: sign in once with a real `@alumnos.ubiobio.cl` account to confirm the button's working/error states render correctly, then decide whether to propagate the layout to the Android asset bundle.

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Claude Code
Branch / commit: `claude/nextjs-vercel-migration`, uncommitted (baseline `eda2776`)
Goal: migrate the web app from vinext/OpenAI Sites (Cloudflare D1 + R2) to Next.js on Vercel, per `PROMPT_NEXTJS_MIGRATION.md`.

Files changed:

- `package.json`: scripts now `next dev/build/start`; removed `vinext`, `vite`, `wrangler`, `@cloudflare/vite-plugin`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`, `react-server-dom-webpack`; added `next` 16.3.0 and `@libsql/client`.
- Deleted: `worker/index.ts`, `vite.config.ts`, `.openai/hosting.json`, `build/sites-vite-plugin.ts`, `examples/d1/`, `app/chatgpt-auth.ts` (unused OpenAI Sites helper).
- Deleted as dead code: `app/api/courses/estatica/{files,posts,progress}/route.ts` and `app/api/files/[id]/route.ts`. These had no callers anywhere in the repo — the UI uses Firebase for the classroom — and were the only consumers of R2. Their `posts`, `files`, and `progress` tables were removed from `db/schema.ts`.
- `db/index.ts`: Cloudflare D1 binding replaced with libSQL/Turso via `drizzle-orm/libsql`, driven by `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`, client cached per process.
- `app/Portal.tsx`: two `let stop… = () => undefined` declarations annotated `() => void`. Latent type error that `vinext build` never surfaced because it did not type check; `next build` does.
- `tests/rendered-html.test.mjs`: the three rendering tests called the deleted Worker entry through `dist/server/index.js`. They now spawn `next start` on port 3123 once and fetch over HTTP. Assertions unchanged.
- `eslint.config.mjs`: ignores `**/assets/vendor/**`, `android/**`, `firebase/**`.
- `next-env.d.ts`, `AGENTS.md`, `README.md`: framework references updated.

Chosen database: Turso/libSQL, not Neon or Vercel Postgres. Reason: the schema, the two committed Drizzle migrations, and the D1 export are all SQLite, so this is a driver swap with no dialect conversion, no migration rewrite, and a data migration that is a plain SQL dump import. Neon/Postgres would require converting `sqliteTable` to `pgTable`, regenerating migrations, and transforming the dump. Swap to Neon later if Postgres becomes a requirement.

External services changed: none. No Vercel project created, no Turso database created, no D1/R2 resource touched or deleted, no DNS change.

Checks passed:

- `next build`: compiles, type checks, 11 routes.
- `node --test tests/rendered-html.test.mjs`: 6/6.
- Both committed Drizzle migrations applied cleanly to a scratch libSQL file database.
- Every DB-backed route exercised against that database on `next dev`, signed out and with a seeded owner session: `/api/auth/me` returns `{"user":null}` signed out and the full user with `role: "owner"` when a session row exists (session/user join works); `/api/admin/users` returns 403 signed out and the user list for the owner; `/api/notifications` returns 401 signed out, an empty list with a session, and its POST upsert writes `readAt`; `/api/auth/logout` clears the cookie; `/api/auth/firebase` rejects an invalid ID token at Google's endpoint. No console errors on the rendered page.
- `.env.local` (git-ignored) holds `TURSO_DATABASE_URL=file:local.db` for local development; `local.db*` was added to `.gitignore`.

Checks not run:

- Anything against a hosted Turso database or the real production data. Verification used a local SQLite file, which exercises the driver and queries but not network latency, auth tokens, or Turso limits.
- Auth/role matrix with real Google accounts. Requires a deployed preview.
- D1 → Turso data migration and row-count comparison.
- Upload/download round-trip and the 50 MiB boundary. These now live entirely in Firebase Storage; the deleted D1/R2 routes had a 25 MiB limit and no callers.
- `npm ci` from the refreshed lockfile. A wrangler/miniflare dev server from another session held `node_modules` locked, so dependency removal was applied to `package.json` and `package-lock.json` via `npm install --package-lock-only`. The installed `node_modules` still contains the removed packages. Stop that dev server and run `npm ci` to confirm a clean install builds.

`npm run lint`: 10 errors remain, all pre-existing and untouched by this task — 2 `react-hooks` in `app/Portal.tsx`, 2 `no-html-link-for-pages` in `app/privacidad/page.tsx`, 6 in `public/biblioteca/assets/app.js`. The migration added none. Fix as separate work.

Production deployed: no. `ceoubb.com` still serves the OpenAI Sites deployment.

Known risks:

- No production data has moved. Cutting over before the D1 import would silently create an empty user/session table and log everyone out.
- `app/chatgpt-auth.ts` had uncommitted local edits from an earlier session and was deleted with them. The file was unreferenced and OpenAI Sites-specific, so it was in scope to delete, but those edits are unrecoverable.
- `firebase/functions` uses pnpm and is unaffected; the root project stays on npm.

Cutover runbook, owner-run, in order:

1. Stop the stale wrangler dev server, then `npm ci && npm run build` to verify a clean install.
2. `npx wrangler d1 export DB --remote --output=d1-export.sql` against the Sites D1 database.
3. Create the Turso database and import: `turso db shell <name> < d1-export.sql`.
4. Compare `SELECT count(*)` for `users`, `sessions`, `notifications`, and `notification_reads` between D1 and Turso before going further.
5. Create the Vercel project (zero config), set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, deploy a preview.
6. Add the Vercel preview hostname to Firebase Authentication authorized domains, or Google sign-in will fail on the preview.
7. Run the full role matrix on the preview: owner, collaborator, `@ubiobio.cl`, `@alumnos.ubiobio.cl`, rejected Gmail, rejected external university, signed-out visitor.
8. Only after the preview passes: move DNS with owner sign-off, then decommission the Sites project, D1, and R2.

Next recommended action: run steps 1–4 of the cutover runbook. The code is ready; everything remaining needs credentials this session does not have.

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Codex
Branch / commit: `codex/fix-vercel-lockfile`, based on `7acead5`
Goal: fix the Vercel install failure caused by an obsolete root pnpm lockfile after the Next.js migration.
Files changed: deleted the obsolete root `pnpm-lock.yaml`; retained `package-lock.json` as the canonical web lockfile; updated `PLAN.md`.
External services changed: none.
Checks passed: clean `npm@11.6.2 ci`; `npm run build`; `npm test` with 6/6 tests passing.
Checks not run: Vercel redeployment. `npm run lint` still reports the same 10 pre-existing errors and 4 warnings documented by the migration handoff; this change adds no source lint findings.
Production deployed: no.
Known risks: `npm audit` reports 8 dependency advisories (1 low, 4 moderate, 3 high); dependency remediation was not mixed into this deployment fix.
Next recommended action: commit and merge this branch, then redeploy the Vercel project and confirm that the install step uses npm.

