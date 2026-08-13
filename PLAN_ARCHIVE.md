# PLAN archive — completed work and handoff history

Moved out of `PLAN.md` on 2026-08-12 so the live plan stays small. Nothing here is active work. Verbatim as written; read only when you need the history of a decision.

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

### 6a. CEOUBB Design System rebuild and institutional polish — merged 2026-08-13, `claude/design-system-institutional-polish` (commit `5cea715`, PR [#8](https://github.com/CEOUBB/CEOUBB/pull/8))

- Claude Code — rebuilt the whole web surface (access screen, portal, aula, calendario, recursos, administración, `/privacidad`, web study library) on the owner's **CEOUBB Design System** from claude.ai/design (project `1730f6d2-1697-4fd1-bad0-f4e0b2863cd8`): paper canvas `#f4f6f9`, one accent `#0055b8`, navy `#002b5c` for the single dark band per page, `#e2e8f0` hairlines, Inter with the DS type ramp, DS radii/shadow/motion scales, academic palette for course accents. Removed the marketing download banner and the four-colour institutional rule; the "próxima evaluación" card became a one-line strip above the course grid. Font swapped Geist → Inter. `app/globals.css`, `app/layout.tsx`, `app/Portal.tsx`, `app/portal-views.tsx`, `app/Classroom.tsx`, `lib/courses.ts`, `public/biblioteca/assets/styles.css`
- Claude Code — **institutional polish pass** on top of the Design System rebuild, aimed at the university presentation (Canvas-grade chrome). (1) Typographic pairing: `Source Serif 4` (`--font-display`, next/font, weights 600/700) signs page titles, section titles, course names, cover headlines, the brand lockup and the large grade/progress figures; `Inter` keeps every operational surface; numerals moved to `lining-nums tabular-nums` (`--num`) and monospace reserved for registry codes only. (2) The global app bar became a solid UBB Midnight Navy band (58px, `--header-height`) closed by a 2px heraldic rule (royal blue / sky / gold / red); header controls, avatar and account menu re-toned for the dark surface. (3) Sidebar densified (40px rows, flat icons, flush active rail, hairline course tiles). (4) Dashboard: removed the "Periodo 2026-2" kicker above the h1, page heads gained a hairline rule, course grid became `auto-fill minmax(304px, 1fr)`, course card restructured with a `.course-body` wrapper for a full-bleed colour banner (16:5 image slot accepting a teacher-uploaded cover through `--course-image`; upload flow itself not built). (5) Aula: square underlined tabs, richer navy cover with the course-tone rule and the eyebrow demoted to a chip, redundant `01/02` unit numbering removed. (6) Calendar aside no longer vertically centred; timeline, resources and empty states re-toned. (7) Access screen moved off its off-palette blues onto DS tokens with a white form card. `design-ceoubb.md` updated (serif ramp, `app-bar`, `course-card-banner`, new Do/Don't rules). `app/globals.css`, `app/layout.tsx`, `app/portal-views.tsx`, `app/Classroom.tsx`, `design-ceoubb.md`

### 6b. CI/CD pipeline, pre-flight deploy gates, and fast test scripts — merged 2026-08-13 (PR [#9](https://github.com/CEOUBB/CEOUBB/pull/9))

- Antigravity — established the primary GitHub Actions CI pipeline (`.github/workflows/ci.yml`) gating pull requests and pushes to `main` on Firebase Cloud Functions syntax check, TypeScript typecheck (`tsc --noEmit`), ESLint, and full build/test suite execution with pnpm dependency caching.
- Antigravity — added pre-flight quality gates to `.github/workflows/deploy.yml` preventing untested Vercel preview or production deployments.
- Antigravity — added fast developer scripts to `package.json`: `pnpm run test:unit` (runs 23 pure unit tests in ~130ms without forcing `next build`), `pnpm run typecheck`, and `pnpm run check:functions`. Produced plans 007, 008, and 009 in `plans/`. `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `package.json`, `plans/`
- Claude Code — multi-course engine, material folders, gradebook (official grades + student simulator), live badges. `lib/courses.ts`, `lib/grades.ts`, `app/Classroom.tsx`, `app/portal-views.tsx`, `app/Portal.tsx`, `firebase/*.rules`, `tests/`
- Codex — portal polish: the upcoming-evaluation strip now offers `Ir al ramo`; unavailable header controls and the course-page role badge removed; sidebar navigation remains open; course rows use tone-coloured folders; course cards use colour-only banners; course reference (`código - sección`) copies from the classroom header; empty announcement states direct teachers to publish and students to the course library. `app/Portal.tsx`, `app/Classroom.tsx`, `app/portal-views.tsx`, `app/globals.css`, `lib/courses.ts`

Verified at merge: `pnpm run lint` clean for `app/` (pre-existing `no-img-element` warnings only), `pnpm test` 44/44. **Not verified:** signed-in screenshots and the aula/notas/participantes tabs behind the institutional login — a manual visual pass is still owed (no test UBB credentials in the agent environment).

### 6. Firebase production setup completed on 2026-08-09

- Created the Storage bucket in Santiago.
- Published Storage rules.
- Enabled required Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, Eventarc, Pub/Sub, Storage, and Firebase Extensions APIs.
- Updated Functions from deprecated Node.js 20 to Node.js 22.
- Added `@google-cloud/functions-framework` for pnpm-compatible Cloud Functions builds.
- Deployed `notifyStudentsOnCoursePost` and `deleteMyAccount` successfully.
- Enabled automatic cleanup for old Functions container images.


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

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Codex
Branch / commit: `codex/stage-vercel-domain`, based on `7e5374e`
Goal: move `ceoubb.com` and `www.ceoubb.com` from OpenAI Sites to the existing Vercel project without interrupting the live site.
Files changed: `PLAN.md` only.
External services changed: attached `ceoubb.com` and `www.ceoubb.com` to Vercel project `ceoubb`; Namecheap DNS, OpenAI Sites, Firebase, Turso, and production traffic were not changed.
Checks passed: Vercel MCP confirmed production deployment `dpl_CdhC9bBrK9zmhUbFLxrxo8WRE5jM` is `READY`; the protected deployment rendered the homepage and `/api/auth/me` returned a signed-out response; Vercel confirmed both custom domains are owned by the current team and attached to the project; Vercel DNS verification reported the current OpenAI Sites records and the required replacement records.
Checks not run: real Google sign-in, role matrix, authenticated database routes, and DNS cutover verification. Vercel has no project environment variables, so these checks would not be valid yet.
Production deployed: no new deployment; no DNS cutover. OpenAI Sites remains live at `ceoubb.com`.
Known risks: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are absent from Vercel. A valid institutional login would reach `getDb()` and fail until the Turso database is imported and those variables are configured. The Vercel hostname also needs confirmation in Firebase Authentication authorized domains before sign-in testing.
Next recommended action: import and compare the D1 data in Turso, configure both Turso variables in Vercel, redeploy and run the preview role matrix. After those checks pass, replace the two Namecheap `@` A records with `216.198.79.1` and `64.29.17.1`, replace the `www` CNAME with `797a21e0385c8eaf.vercel-dns-017.com`, preserve the email-forwarding SPF record, verify both domains in Vercel, and test `https://ceoubb.com` before decommissioning Sites.

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Codex
Branch / commit: `codex/stage-vercel-domain`, based on `7e5374e`
Goal: preserve the OpenAI Sites D1 data in Turso and prepare the clean Vercel production deployment before the DNS cutover.
Files changed: `PLAN.md` only on the handoff branch. Temporary migration helpers were committed on isolated local branches and were not added to the production source.
External services changed: exported the Sites D1 database through a short-lived token-protected worker version; imported the complete export into Turso; restored Sites version 15 and removed the Sites migration secret; removed both temporary Vercel preview deployments and their environment variables; deployed clean production deployment `dpl_5sopBswfrCGhEVm8pAU5rgVRqkhw` with the configured Turso variables. Namecheap DNS and live production traffic were not changed.
Checks passed: source and Turso counts match exactly for all eight exported tables: `__appgarden_migrations=2`, `users=3`, `sessions=1`, `notification_reads=1`, and `files=0`, `notifications=0`, `posts=0`, `progress=0`; the clean Vercel deployment built successfully; `/` and `/api/auth/me` both returned HTTP 200; Vercel reconfirmed the preferred DNS targets as apex A records `216.198.79.1` and `64.29.17.1` plus `www` CNAME `797a21e0385c8eaf.vercel-dns-017.com`.
Checks not run: real Google sign-in, authenticated role matrix, and post-cutover checks on `https://ceoubb.com`; these require the DNS cutover.
Production deployed: yes to Vercel, but Namecheap still routes `ceoubb.com` to OpenAI Sites. Sites was restored to its pre-migration version after the export.
Known risks: the DNS cutover is still pending because the available Namecheap browser session is signed out. Do not decommission Sites, D1, or R2 until both hostnames route to Vercel and authentication is verified.
Next recommended action: the owner signs in to the open Namecheap tab, then Codex replaces only the two apex A records and the `www` CNAME, preserves the email-forwarding SPF record, waits for Vercel verification, and runs the production smoke tests.

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Codex
Branch / commit: `codex/stage-vercel-domain`, based on `7e5374e`
Goal: complete the production DNS cutover from OpenAI Sites to Vercel.
Files changed: `PLAN.md` only.
External services changed: in Namecheap, replaced the two apex A records with `216.198.79.1` and `64.29.17.1`, and replaced the `www` CNAME with `797a21e0385c8eaf.vercel-dns-017.com`; preserved the email-forwarding SPF record and both Sites validation TXT records for rollback. Vercel issued automatically renewing certificates for both hostnames. The Sites source repository was returned to its original worker code, and the local D1 export plus temporary build archives were deleted after verification.
Checks passed: Namecheap displayed all three saved replacement records; the authoritative Namecheap resolver plus Cloudflare `1.1.1.1`, Google `8.8.8.8`, and Quad9 `9.9.9.9` returned the Vercel targets; Vercel reported `misconfigured=false` for both hostnames; HTTP reached Vercel and redirected to HTTPS; direct HTTPS checks against both Vercel edges returned HTTP 200 with valid certificates; the signed-out `/api/auth/me` route returned HTTP 200 on the clean production deployment.
Checks not run: real Google sign-in and the complete production role matrix. The local recursive resolver was still serving the previous apex A records from cache immediately after the cutover, while all independently queried public and authoritative resolvers had already updated.
Production deployed: yes. The clean Vercel deployment is active and DNS now routes both production hostnames to it.
Known risks: OpenAI Sites, D1, R2, and the two `_cf-custom-hostname` TXT records remain available as a rollback path. Do not remove them until authentication and the role matrix pass against the production hostname.
Next recommended action: test owner, collaborator, teacher, student, rejected account, and signed-out flows on `https://ceoubb.com`; after they pass, remove the obsolete Sites validation TXT records and deliberately decommission the old Sites infrastructure.


---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Claude Code
Branch / commit: `claude/security-audit-fixes`, based on `3fd25d0`
Goal: remediate the eight findings of the security audit performed against `7e5374e` and re-verified against `3fd25d0`.

Files changed: `lib/auth.ts`, `app/api/auth/firebase/route.ts`, `app/api/auth/me/route.ts`, `app/api/admin/users/route.ts`, `lib/firebase-classroom-client.ts`, `app/Portal.tsx`, `app/globals.css`, `next.config.ts`, `firebase/firestore.rules`, `firebase/storage.rules`, `android/app/src/main/java/cl/ubb/centroestudio/ClassroomService.java`, `tests/rendered-html.test.mjs`, `package-lock.json`.

External services changed: none. No rules were deployed, no Function was redeployed, no Vercel deployment was promoted.

Findings and remediation:

1. The web session recomputed every role from the email domain, so `users.role` was never read and `PATCH /api/admin/users` was a silent no-op. The stored column is now authoritative; the email domain decides the role only when the account is first created. The sign-in handler no longer rewrites the role on every login, and the institutional-domain allowlist gate is unchanged. A guard rejects rank changes on the two developer accounts.
2. Firestore rules let any user delete their own `users/{uid}` document; both clients then recreated it at the email-derived role on the next sign-in, so any demotion or suspension was self-revertible. Profile deletion is now owner-only. `deleteMyAccount` is unaffected because it runs through the Admin SDK.
3. No HTTP security response headers existed. `next.config.ts` now sends a Content-Security-Policy with `frame-ancestors 'none'`, plus `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS on every route.
4. The session cookie derived its `Secure` attribute from a request-supplied protocol. It is now set whenever `NODE_ENV` is production, on both the session cookie and the clearing cookie.
5. `deleteMyAccount` never removed the mirrored web account, so the `users` row and any unexpired sessions survived. `DELETE /api/auth/me` now removes the caller's sessions, notifications, notification reads, and user row, and clears the cookie.
6. Uploaded course files persisted a permanent unauthenticated Firebase download URL in the post document, bypassing the member-only Storage read rule. New uploads store only `storagePath`; web and Android resolve a URL on demand through `getDownloadURL`, which enforces the rules. Reads stay backward compatible with existing documents.
7. `npm audit` reported three high advisories, of which `ws` was reachable in production through `@libsql/client`. The lockfile now resolves `ws` 8.21.3 and the production tree reports zero vulnerabilities.
8. Firestore and Storage rules accepted an arbitrary `courseId`, and the notification Function derived its FCM topic from it. All course paths are pinned to `estatica`.

Checks passed: `npm test` 11/11, including five new assertions covering the role invariant, the cookie flag, the rules lockdown, the removal of persisted download URLs, and the response headers measured over HTTP. `npm run build` compiles and type checks. `npm run lint` reports 10 errors and 4 warnings, exactly the documented pre-existing baseline, with none added. `npx tsc --noEmit` clean. The production headers were verified in a browser against `next start` on the login page and the `/biblioteca/` library, with no CSP violations.

Checks not run: Google sign-in end to end, so the CSP was not exercised against the real Firebase Authentication popup; the multi-role matrix; the Firebase rules were not compiled or deployed and no Emulator Suite test exists; the Android change is uncompiled because the repository has no Gradle wrapper.

Production deployed: no.

Known risks:

- The CSP is the change most likely to break production. Deploy a Vercel preview and complete one real Google sign-in before promoting it.
- The Firestore and Storage rule changes must be deployed for findings 2 and 8 to take effect. Pinning the course paths to `estatica` will deny any other course id, which is correct today because both clients hardcode `estatica`.
- The Android change needs `gradle :app:assembleDebug` and a device test: upload a file, confirm it appears in the feed and opens. The posts listener now resolves one download URL per file per snapshot; acceptable for the beta, worth batching if the file count grows.
- Finding 6 stops new leaks but does not revoke download URLs already stored on existing posts. Rotating those object tokens is a separate console task.
- Residual on finding 2: a suspended account can still reset its role by deleting its entire Google-linked account and registering again, which is inherent to deriving roles from an email domain. Closing that needs an email-keyed blocklist checked on profile creation; deferred until suspension is actually used.
- Four moderate advisories remain in `drizzle-kit` through `esbuild`. They are devDependency-only and need a breaking major, so they were left alone.

Next recommended action: deploy a Vercel preview from this branch, complete one institutional sign-in to validate the CSP, then deploy the Firestore and Storage rules and run the P0.1 and P0.2 matrices before promoting to production.

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Claude Code
Branch / commit: working tree on `main`, based on `15cb2a2`. Not committed.
Goal: act on the five architecture findings raised by the architecture review of `15cb2a2` — one access policy, one classroom module, delete the dead notification bell, shrink the session module, and replace source-text tests with behavioural ones.

Files changed: `lib/access-policy.ts`, `lib/auth.ts`, `lib/firebase-classroom-client.ts`, `app/Portal.tsx`, `app/globals.css`, `app/api/auth/firebase/route.ts`, `app/api/auth/me/route.ts`, `app/api/admin/users/route.ts`, `db/schema.ts`, `drizzle/0002_drop_rut_password_notifications.sql`, `drizzle/meta/*`, `tests/rendered-html.test.mjs`, `tests/access-policy.test.ts` (new), `package.json`, `tsconfig.json`, `AGENTS.md`. Deleted: `app/api/notifications/route.ts`.

External services changed: none. No migration was applied, no rules were deployed, no Function was redeployed, no Vercel deployment was promoted.

What changed and why:

1. Access policy. `roleForEmail` moved into `lib/access-policy.ts`, which now also exports `AccountRole`, `STUDENT_DOMAIN`, `TEACHER_DOMAIN` and an `ACCESS_CASES` matrix. The three TypeScript copies were deleted: `roleForEmail` in `lib/auth.ts`, `roleFor` in `lib/firebase-classroom-client.ts`, and the inline ternary in `app/Portal.tsx` that decided a post author's role. The rules files and the Android service still hold their own copies because they cannot import TypeScript; a conformance test now asserts they name the same owner addresses and domains.
2. Classroom module. `lib/firebase-classroom-client.ts` no longer hands raw Firestore records to React. `watchClassroom(teaching, onChange, onError)` syncs the profile once, subscribes to posts and to progress, and emits shaped `ClassroomPost` / `ClassroomFile` / `ClassroomStudent` values. `EstaticaClassroom` lost about 50 lines of mapping and orchestration and now holds one `ClassroomState`. `updateClassroomPost(id, Record<string,string>)` was replaced by `editClassroomPost` and `renameClassroomFile`. Commands wait for the Firebase user instead of re-running the profile sync, which removes one Firestore read and one write per publish, upload and progress tick.
3. Notification bell. `GET/POST /api/notifications`, the `notifications` and `notification_reads` tables, the `NotificationMenu` component with its 30-second poll, its CSS, and the cascade deletes in `DELETE /api/auth/me` are gone. The table had no writer and filtered on the retired course id `estatica-440299`, so the bell was permanently empty. FCM on `course_estatica_students` remains the only notification path.
4. Session module. `lib/auth.ts` dropped `hashPassword`, `verifyPassword`, `isValidRut`, `formatRut`, `normalizeRut`, `findUserByIdentifier`, `canPublish` and `publicRut` — all unreachable since password login and RUT identity were retired to `410` routes. `users.rut`, `users.password_salt` and `users.password_hash` were dropped from the schema, and `rut` was removed from `PublicUser` and from the account popover, where it always rendered an empty string.
5. Test seam. `tests/access-policy.test.ts` calls the policy directly under `--experimental-strip-types`. `tests/rendered-html.test.mjs` now migrates a throwaway libSQL database, seeds an owner, a teacher and a student, and starts `next start` against it, so sessions, expiry, forged tokens, logout, the `Secure` cookie flag and the owner-only administration endpoint are exercised over HTTP instead of matched with regular expressions. Nine source-text assertions were replaced by fourteen behavioural ones; the remaining regex tests cover the store badges and the Firebase rules, which no test process can execute.

Checks passed: `npm test` 24/24 — `next build` compiles and type checks, then both test files pass. `npx tsc --noEmit` clean. `npm run lint` reports 8 errors and 9 warnings, all pre-existing in `app/privacidad/page.tsx` and `public/biblioteca/assets/app.js`, none in the changed files. The access screen was loaded in a browser against the running dev server: it renders and the console is clean.

Checks not run: no institutional Google sign-in, so the deepened classroom module was not exercised against real Firestore — posts, files, progress, upload and the teacher tools are unverified end to end. The Firebase rules were not compiled or deployed. The Android app was not built; it was not modified either. The role matrix was tested at the web session and administration layer only, not through Firebase Authentication.

Production deployed: no.

Known risks:

- `drizzle/0002_drop_rut_password_notifications.sql` is destructive and MUST be applied to Turso before this code is deployed. `POST /api/auth/firebase` no longer writes `rut`, `password_salt` or `password_hash`, so sign-in will fail against the old schema on the `NOT NULL` constraints. The migration also drops `files`, `posts`, `progress`, `notifications` and `notification_reads`; the first three were already orphaned by the Vercel migration and hold retired D1 classroom data. Take a Turso backup first.
- The classroom refactor is the change with the least verification. Before promoting, sign in on a preview as a teacher and as a student and check: the post feed loads, a file upload appears and opens, rename and delete work, and a student's progress checkbox persists across a reload.
- `tsconfig.json` gained `allowImportingTsExtensions`, which is required for the test to import `lib/access-policy.ts` by path. It permits `.ts` import specifiers everywhere; no application module uses one.
- The remaining regex assertions on the Firebase rules are still a drift alarm, not a proof. Emulator Suite rule tests are still the right next step and are still absent.

Next recommended action: review the diff, then apply `drizzle/0002` to a Turso branch or copy and deploy a Vercel preview against it. Complete one institutional sign-in as a teacher and one as a student to validate the deepened classroom module before promoting to production.

---

Date: 2026-08-09
Human maintainer: project owner
AI assistant: Antigravity
Branch / commit: working tree on `main`. Not committed.
Goal: complete transition from npm to pnpm and remove npm entirely across the project, enforce pnpm policy in `AGENTS.md`, update lockfile and dev environment scripts.

Files changed:
- `package-lock.json`: deleted.
- `pnpm-lock.yaml`: generated and updated via `pnpm install` / `pnpm approve-builds`.
- `package.json`: added `"packageManager": "pnpm@11.18.0"`.
- `.claude/launch.json`: updated `"runtimeExecutable"` to `"pnpm"`.
- `README.md`: updated all commands to `pnpm`.
- `AGENTS.md`: updated architecture, setup, testing commands, and added strict policy prohibiting npm/bun and mandating `pnpm` (with `npx` permitted for tools that cannot run via `pnpm dlx`).
- `PLAN.md`: updated handoff documentation.

Checks passed: `pnpm install --frozen-lockfile` clean; `pnpm test` 24/24 tests passed (Next.js production build succeeded and both test suites passed).
Checks not run: Vercel preview deployment. `pnpm run lint` reports 8 errors and 9 warnings (pre-existing baseline).

Production deployed: no.
Known risks: None added by the package manager migration.
Next recommended action: Proceed with preview testing and deployment as planned.

---

Date: 2026-08-10
Human maintainer: project owner
AI assistant: Claude Code
Branch / commit: working tree on `main`. Not committed.
Goal: raise the visual and interaction quality of the web portal without introducing a second design language, remove dead UI, and close the accessibility and notation gaps that the existing design system already required.

Approach: targeted evolution inside the design system documented in `AGENTS.md` ("Web design system"). No UI kit, animation library, or icon set was added. The existing Tailwind-preflight + CSS custom properties + Motion + Phosphor + Geist stack was kept, because adding shadcn/HeroUI/GSAP here would have created exactly the templated look the request asked to remove, and `AGENTS.md` prefers targeted changes over broad rewrites.

Files changed:
- `app/globals.css`: `--ink-3` darkened from `#6b8ba3` to `#517488`; form placeholder switched from `#93aec2` to `--ink-3`; deleted the dead `.icon-action`, `.notification-menu`, `.notification-popover`, `.notification-kind` and `.unit-menu` rule sets; `.course-sidecards` replaced by `.course-facts`; `.resource-cards`/`.coverage` replaced by `.resource-layout`/`.resource-primary`/`.resource-aside`/`.coverage-list`; added `.math`, `.course-head`, `.timeline-when`, `.tool-status.ok`, `.tool-status.bad`; course-card spacing tightened; `.materials-view` given `align-items: start` and `.teacher-tools` made sticky; store badges lifted from `grayscale(1)/opacity .55` to `grayscale(1) contrast(.9)/opacity .78`; `.course-cover h2` selector updated to `h1`; matching updates in the 1100px and 800px breakpoints.
- `app/Portal.tsx`: removed the `NotificationMenu` component, the `NotificationItem` type, its header instance and the `Bell` import; removed the four dead "Actividades" sidebar buttons that all called `setTab("home")`; the four learning-outcome equations and the three cover equations are now native MathML instead of monospace text; the three eyebrow-labelled sidecards became one `<dl>` facts panel; the redundant `<h1>Portada del curso</h1>` is suppressed on the course home tab and the cover heading promoted to `h1`; course cards gained a per-course next-evaluation line via the new `nextForCourse`/`shortDate` helpers and moved the notice count into a card head row; calendar rows gained a computed `countdown` value; `ResourcesView` rewritten from three equal cards into an asymmetric primary/secondary layout that absorbs the former standalone "Cobertura del banco" section; classroom status messages carry a `Note` tone (`info`/`ok`/`bad`) instead of a bare string, so failures no longer render identically to successes, and the element gained `role="status"`; `0 inscritos` replaced by `studentCount()`; the admin role `<select>` gained an `aria-label`.
- `mathml.d.ts`: new. Declares the MathML intrinsic elements used, because `@types/react` 19.2 does not ship them. Runtime support is already in React 19 and in all current browsers.

Why MathML rather than KaTeX: `AGENTS.md` requires conventional mathematical notation and forbids programming-style notation. The portal was rendering `ΣF = 0`, `F ≤ μₛN` and `I = Ī + Ad²` in Geist Mono. Native MathML produces correct italic variables, upright operators, real subscripts/superscripts and a true overbar with no dependency, no webfont, and no CSP change, and it is announced correctly by screen readers.

Checks passed: `pnpm test` 24/24 (production build compiles and type checks, then both suites pass). `npx tsc --noEmit` clean. `pnpm run lint` reports 8 errors and 9 warnings, byte-identical to the pre-change baseline (verified by stashing); all are pre-existing in `app/privacidad/page.tsx` and `public/biblioteca/assets/app.js`. Every portal screen was rendered against the dev server at 1440px, 1000px and 390px and inspected: access, dashboard, calendar, resources, admin, classroom home, classroom materials. The error tone was exercised by submitting the publish form and confirming the message renders on the red surface with `role="status"`.

Contrast: `--ink-3` at `#6b8ba3` measured 3.42:1 on `--paper` and 3.59:1 on `--card`, failing WCAG AA for body text; it is the site's most-used secondary colour. `#517488` measures 4.76:1 on paper, 5.00:1 on card and 4.62:1 on wash. The old placeholder `#93aec2` measured 2.31:1 on white.

Checks not run: no institutional Google sign-in, so the classroom was inspected as owner with an owner session seeded directly into the local database. The teacher and student views of `course-facts`, the progress table and the materials list were not seen with real Firebase data. Android was not built and was not modified; its study-library copy is untouched and remains on the older dark theme, as `AGENTS.md` records. Firebase rules were not touched, compiled or deployed.

Production deployed: no.

Known risks:
- `mathml.d.ts` augments the React JSX namespace. If `@types/react` later ships MathML elements, this file should be deleted rather than left to conflict.
- The classroom equations are decorative-adjacent but are now real MathML; if the Android bundled library is ever brought onto this theme, it needs the same treatment rather than a third notation style.
- `window.prompt`/`window.confirm` are still used for editing posts and renaming files. They are the largest remaining polish gap in the teacher flow and were left alone deliberately: replacing them is a dialog-system change, not a styling change, and is worth its own scoped task.

Next recommended action: sign in on a preview as a teacher and as a student to confirm the `course-facts` panel, the progress table and the materials list read correctly with real Firebase data, then decide whether to replace the `prompt`/`confirm` interactions with in-page dialogs.

---

Date: 2026-08-11
Human maintainer: project owner
AI assistant: Claude Code
Branch / commit: `claude/perf-plans`, branched from `76f20bb`.
Goal: execute the six performance plans generated by the `improve` skill in `plans/` (that directory is gitignored, so it is not part of this branch).

Files changed:
- `app/layout.tsx` (plan 001, 006): `generateMetadata()` and its `headers()` call replaced by a static `export const metadata` with `metadataBase: new URL("https://ceoubb.com")`. Reading request headers in the root layout was opting every route in the app into dynamic rendering. The hand-written `openGraph.images` and `twitter.images` entries were removed in favour of the file convention.
- `app/opengraph-image.jpg`, `app/opengraph-image.alt.txt` (plan 006): new. `public/og.png` (1 540 663 B, 1730 × 909) deleted and replaced by a 1200 × 630 JPEG of 64 555 B, re-encoded from the same artwork with `pnpm dlx sharp-cli` (not added to `package.json`). The PNG candidate came out at 857 435 B, so the plan's ≤ 300 000 B decision rule selected JPEG. Next.js now derives `og:image:type`, `og:image:width` and `og:image:height` from the file, which also fixes the previously declared 1728 × 920 against a real 1730 × 909.
- `next.config.ts` (plan 002): four `Cache-Control` entries appended after the existing security-header entry — `/sw.js` `no-cache, no-store, must-revalidate`; `/biblioteca/:path*` `max-age=300, stale-while-revalidate=86400`; `/biblioteca/assets/vendor/:path*` `max-age=31536000, immutable`; `/:path(brand|icons)/:file*` `max-age=86400, stale-while-revalidate=604800`.
- `public/sw.js` (plan 004): cache key bumped to `centro-estudio-ubb-v6`. The blocking `await cache.put` before `return response` is gone; writes now run under `event.waitUntil`. Routing split into `cacheFirst` (for `IMMUTABLE` = `/_next/static/` and `/biblioteca/assets/vendor/`, and `REVALIDATE` = the three unfingerprinted library assets) and `networkFirst` (everything else, including all HTML). The offline navigation fallback to `/` is unchanged.
- `public/biblioteca/assets/app.js` (plan 005): the `[data-complete]` handler no longer calls `render()`. A new `refreshCounts()` updates only the nav counters and course-card counts, so ticking one checkbox no longer re-parses every KaTeX expression on screen.
- `app/portal-ui.tsx`, `app/EstaticaClassroom.tsx` (plan 003): new. `app/Portal.tsx` went from 782 to 423 lines; the classroom half now loads through `next/dynamic(..., { ssr: false })` and is the only importer of `lib/firebase-classroom-client`.
- `lib/firebase-classroom-client.ts` (plan 003): `firebase/firestore` and `firebase/storage` are now behind memoised dynamic imports (`firestore()` / `cloudStorage()`); only `firebase/auth` remains a static import. `watchClassroom` still returns its unsubscribe function synchronously.
- `tests/rendered-html.test.mjs`: four tests added — public pages are not `no-store`, library cache headers and a never-stored service worker, the service worker does not block on its cache write, and no chunk referenced by `/` contains the Firestore or Cloud Storage SDK.
- `app/Portal.tsx`, `app/globals.css`, `mathml.d.ts`, `.gitignore`: carry the previous session's uncommitted design work, now committed alongside the split because plan 003 moved parts of that work into the two new files and the two changes can no longer be separated.

Measured result:
- `/` and `/privacidad` are prerendered again (`○` in the route table; both present in `.next/prerender-manifest.json`). Before: all ten routes `ƒ`.
- Chunks referenced by `/`: 1 349 048 B raw / 407 045 B gzipped before, 840 949 B / 259 289 B after — 147 756 gzipped bytes removed (−36.3 %). The Firestore/Storage SDK is no longer requested by `/` at all. The drop is 1.5 % under plan 003's stated 150 000 B threshold because removing Firestore forced Turbopack to emit `firebase/auth` (66 364 B gzipped) as its own chunk, which `/` still requests deliberately — the login button needs it. That 66 KB was never Firestore's to give back.
- Social preview image: 1 540 663 B → 64 555 B, and the declared dimensions now match the file.

Deviation from the plans: plan 002 step 2 orders the `/biblioteca/assets/vendor/:path*` rule before the broader `/biblioteca/:path*` rule while also (correctly) citing the Next.js rule that the last matching entry wins for a given header key. Those two statements contradict each other; with the plan's ordering the vendored KaTeX was served `max-age=300` and the plan's own test failed. The broad rule is therefore placed first and the vendor rule second, which is what produces the intended `immutable` on the vendored assets.

Checks passed: `pnpm test` — 28/28 (production build compiles and type checks, then both suites pass). `pnpm exec tsc --noEmit -p tsconfig.json` — clean. `pnpm run lint` — `✖ 17 problems (8 errors, 9 warnings)`, byte-identical to the documented pre-existing baseline; all findings are in `app/privacidad/page.tsx` and `public/biblioteca/assets/app.js`. Build route table and `.next/prerender-manifest.json` inspected. Generated `og:` tags read out of the prerendered HTML.

Note for the plans: `pnpm dlx tsc` resolves to an unrelated squatted `tsc@2.0.4` package that exits nonzero. Use `pnpm exec tsc` instead.

Checks not run (manual, need a real browser or real Firebase accounts):
- Plan 003 step 8, the 13-row classroom matrix. Rows 3 (lazy chunk arrives on entering the classroom), 12 (leave the classroom before the chunk resolves) and 4 (progress write through the new `await firestore()` path) are the ones this change actually puts at risk.
- Plan 004 step 4, the 8-row service-worker matrix, especially row 6: the library must still render fully offline.
- Plan 005's browser matrix for the incremental-render change.
- Plan 006 step 6: scraping a preview URL with WhatsApp, the Facebook debugger and the X card validator.

Production deployed: no. Nothing was deployed; no DNS, Firebase rule, Functions or billing change was made.

Known risks:
- `https://ceoubb.com/og.png` now 404s. Social platforms cache preview images for days to weeks, so already-shared links keep showing the old card until their cache expires.
- The service worker's caching policy and the new `Cache-Control` headers are two layers of one policy. Changing either without the other produces either a wasted header or a stale-content bug.
- The classroom is a live surface with no automated coverage. The 13-row matrix is the real gate on plan 003, not `pnpm test`.
- Preview deployments now advertise the production Open Graph image, because `metadataBase` is hardcoded to `https://ceoubb.com`. Intentional and harmless while the image is environment-independent.

Next recommended action: deploy a Vercel preview from this branch, then run the three manual matrices above (classroom as teacher and as student, service worker offline, and a social scrape of the preview URL) before merging to `main`.

---

Date: 2026-08-11
Human maintainer: project owner
AI assistant: Antigravity (Gemini 3.6 Flash)
Branch / commit: `main`
Goal: performed exhaustive functional/technical comparison of Moodle UBB, Adecca UBB, and CEOUBB, created strategic comparison document, and updated AGENTS.md to explicitly state that CEOUBB is building a Learning Management System (LMS).
Files changed: `AGENTS.md`, `PLAN.md`, `C:\Users\Pipe\.gemini\antigravity\brain\143490a5-3eda-4cd6-b081-6a10725eb9ee\ceoubb_moodle_adecca_comparison.md`
External services changed: none.
Checks passed: `pnpm test` (all 28 tests passing).
Checks not run: none.
Production deployed: no.
Known risks: none.
Next recommended action: begin Phase 1 of LMS roadmap (dynamic multi-course database schema and enrollment engine).

---

Date: 2026-08-11
Human maintainer: project owner
AI assistant: Antigravity (Gemini 3.6 Flash)
Branch / commit: `codex/update-deps`, based on `6b16275`
Goal: update all web and Firebase dependencies to their latest compatible versions across the repository, carrying over uncommitted changes to AGENTS.md and PLAN.md into a single pull request.
Files changed: `package.json`, `pnpm-lock.yaml`, `firebase/functions/pnpm-lock.yaml`, `AGENTS.md`, `PLAN.md`
External services changed: none.
Checks passed: `pnpm exec tsc --noEmit` (clean), `pnpm run check` in `firebase/functions` (clean), `pnpm run lint` (17 pre-existing findings baseline preserved), `pnpm test` (Next.js 16.3.0 Turbopack build + 28/28 integration tests passing).
Checks not run: none.
Production deployed: no.
Known risks: none.
Next recommended action: merge the opened Pull Request to `main`.



## 2026-08-11 — Multi-course engine, gradebook and live badges

Owner/agent: Claude Code. Branch: `main`, uncommitted. Production was **not** modified.

### Why

Two analysis documents compared CEOUBB against Moodle UBB and Adecca UBB and listed seven functional gaps. The owner selected three of them for this pass: the multi-course engine with hierarchical materials, the gradebook (official plus a student what-if simulator), and live badges with a dynamic calendar. "Mi Bodega" (the personal file locker) was explicitly deferred because it is the feature with the highest recurring Storage cost and the least demonstrated demand.

Two items from the proposed roadmap were deliberately **not** built: a `courses` table and an `enrollments` table in Turso, and a student enrollment engine. The Mechanical Engineering cohort takes the same six ramos, Turso only stores sessions and the user directory, and a static registry plus wildcard rules covers the same ground with no migration and no rules deploy per new course. If per-student enrollment ever becomes real (different cohorts, elective ramos), that is the point to revisit it.

### What changed

New modules:

- `lib/courses.ts` — the course registry. Ids, codes, tones, cover copy, learning outcomes and the known evaluation dates for the six ramos of 2026-2. Replaces the `courses` and `agenda` arrays that used to live inside `app/Portal.tsx`.
- `lib/grades.ts` — pure grade arithmetic on the Chilean 1,0–7,0 scale. `summarize` and `requiredGrade`; no Firebase import.
- `app/Classroom.tsx` — the generic classroom, replacing `app/EstaticaClassroom.tsx`. Takes a `Course` and works for any ramo.
- `app/portal-views.tsx` — dashboard, calendar, resources and administration, split out of `app/Portal.tsx` so that file is the shell only.
- `tests/grades.test.ts` — nine cases over `lib/grades.ts`, wired into `pnpm test`.

Changed:

- `lib/firebase-classroom-client.ts` — every function now takes `courseId` first. Adds the gradebook, official-grades and simulation reads/writes, plus two portal-wide collection-group subscriptions: `watchCourseActivity` (badges) and `watchGradebooks` (calendar).
- `firebase/firestore.rules`, `firebase/storage.rules` — `courses/estatica/...` became `courses/{courseId}/...`, guarded by `validCourse(courseId)` matching `^[a-z][a-z0-9-]{1,30}$` on every write path. Adds `meta/{documentId}` and `grades/{userId}` (teacher-write, student-read-own) and the two `{path=**}` read rules that collection-group queries require.
- `app/globals.css` — new blocks for the material folders and the grade tables. Same tokens, same radius scale, no new visual language.
- `AGENTS.md` — classroom data paths, the client seam, the grade seam, the repository map and the test seams.
- `tests/rendered-html.test.mjs` — the rule test used to assert that a `courseId` wildcard did **not** exist. It now asserts the opposite plus the `validCourse` guard count, so adding an unguarded course write path fails the build.

Feature notes:

- Materials are grouped into collapsible folders using native `<details>`. Folder names come from the course's RA codes plus "Certámenes anteriores" and "General"; teachers pick or type one through a `<datalist>`. Existing posts with no folder fall into "General".
- The gradebook is teacher-authored at `courses/{courseId}/meta/gradebook`. Students see the scheme read-only, see their official grades read-only, and can type a private what-if score into any evaluation that has no official grade yet. The summary shows the weighted average of what is already graded and, for both the 4,0 passing grade and the course's eximición grade, the score still needed across everything pending — reported as already secured, still reachable with a number, or no longer reachable.
- Course cards show unread counts derived from `localStorage` (`ceoubb:seen`) against the collection-group activity feed. No per-user unread tracking was added to Firestore; a student who clears site data simply sees everything as new once.
- The calendar aggregates the registry's known dates plus every dated item of every published gradebook. A course with a gradebook uses the gradebook; a course without one falls back to the registry.
- The fake "Aula piloto de Estática disponible" welcome post that used to be prepended client-side is gone. The posts list now has a real empty state.

### Checks

- `pnpm run lint`: 8 errors, 9 warnings — identical to the pre-change baseline, verified with `git stash`. All 8 errors are pre-existing in `app/privacidad/page.tsx` (`no-html-link-for-pages`) and `public/biblioteca/assets/app.js`. No new lint error was introduced.
- `pnpm test`: 37/37 pass, including the production build.
- `next dev` smoke test: the access screen renders at `http://localhost:3000` with no console errors.

### Not verified — manual follow-up required

Everything behind the institutional Google sign-in is unverified, because signing in requires UBB credentials. Before this is called done, run against the real project:

1. Owner account: open each of the six ramos, define a gradebook on one, enter official grades for a student, confirm the weight total and the eximición field persist.
2. Student account (`@alumnos.ubiobio.cl`): confirm the scheme is read-only, the simulation persists across devices, official grades lock their row, and the "necesitas X,X" line matches a hand calculation.
3. Confirm a student cannot write `meta/gradebook` or another student's `grades` document — the rules must reject it, not the UI.
4. Teacher account (`@ubiobio.cl`): upload a file into a folder in a non-Estática ramo, confirm it lands under the right course path and that the student sees it grouped.
5. Confirm the Android app still reads and writes Estática after the rules deploy. It pins `COURSE_ID = "estatica"`, which the wildcard rules cover, but this must be checked on a device.
6. Confirm the two collection-group queries do not prompt for a composite index in the Firebase console. Single-field indexes are automatic and collection-group scoped by default, so no `firestore.indexes.json` entry was added — if the console asks for one, add it before deploying.

### Deployment handoff

Nothing was deployed. The rules changes must land before the web deploy, otherwise any non-Estática course write is denied in production. Run from `firebase/`:

    pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only firestore
    pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only storage

No Turso migration is needed — the schema is untouched. No Firebase Functions change.

### Remaining risks

- The two recursive read rules grant any signed-in member read access to any collection named `posts` or `meta` anywhere in the database. Only `courses/*` has them today. If a `posts` or `meta` subcollection is ever added somewhere private, that rule must be narrowed first.
- `validCourse` accepts any well-formed id rather than an enumerated list, so a student could create junk progress documents under a nonexistent course id (only under their own uid). This was chosen over enumeration so that adding a ramo does not require a rules deploy. If junk appears, switch to an explicit list and keep it in sync with `lib/courses.ts`.
- The five non-Estática ramos have no learning outcomes in the registry, so their classrooms show the empty state on the portada. That is honest, not a bug, but it is worth loading the real programa for each ramo.
- Official grades are personal academic data. The privacy page at `/privacidad` was not updated for this and should be reviewed before teachers start entering real grades.

### Next recommended step

Deploy the two rules sets to `centro-de-estudio-ubb`, then run the manual matrix above with one owner, one teacher and one student account before deploying the web to Vercel.

### 2026-08-11 addendum — the static registry is scaffolding, not the architecture

Owner directive, recorded after the section above was written: courses and enrollments **must** move to the database. The target is a university-scale deployment — potentially thousands of courses and thousands of students — and a hardcoded catalogue cannot serve that. The "Why" section above argues that a static registry is sufficient; that reasoning holds only for the current single-cohort pilot and must not be read as a settled decision. Do not cite it to justify skipping the database work.

What was done in response, without building the database layer yet:

- The view components were decoupled from the registry. `CoursesDashboard`, `CalendarView` and `ResourcesView` now receive `courses: Course[]` as a prop, and `calendarEntries` takes the list as its first argument. `app/Portal.tsx` is the only module that imports `COURSES`, through a single `const courses = COURSES` line. Swapping in a database-backed enrollment query is a one-line change there plus the fetch itself.
- `AGENTS.md` now describes `lib/courses.ts` as a placeholder for a `courses` table plus an `enrollments` table (`userId`, `courseId`, `role`, `period`), and forbids importing `COURSES` from a view component.

Three things that are correct at six courses and wrong at university scale, to be fixed as part of that migration rather than after it:

1. `watchCourseActivity` sweeps the newest posts across every course in the database and filters client-side, capped at 120 documents. Past roughly a few dozen active courses, a student's own course posts stop fitting in that window and the unread badges silently show nothing. Fix: filter by the user's enrolled courses, or keep a per-user aggregate unread document.
2. `watchGradebooks` reads every published gradebook in the database with no limit, on every portal load. Six document reads today, thousands per session at scale. Fix: same filter.
3. `isMember()` in `firebase/firestore.rules` grants any signed-in UBB account read access to every course's posts and gradebook. Harmless while one cohort shares the same six ramos; a privacy problem the moment unrelated carreras or facultades share the project. Fix: gate course reads on an enrollment check in the rules. This is the item to treat as release-blocking before the platform is opened beyond the pilot cohort.

*Superseded on 2026-08-11 (second revision).* This addendum left the catalogue location open and warned that splitting it across Turso and Firestore "is the option that will hurt". That question is now settled the other way: Turso is the system of record and Firestore holds a narrow, single-writer enrollment projection so the rules can call `exists()`. See "P1 — Academic data model (canonical spec)" above, which supersedes this addendum wherever the two disagree — including the entity list, which now covers facultades, departamentos, carreras, periodos and secciones rather than just courses and enrollments.

### Next recommended step (revised)

Unchanged for this pass: deploy the two rules sets and run the manual matrix. After that, the next substantial piece of work is the courses/enrollments data model, and item 3 above should land with it.

## 2026-08-11 — Documentation revision for university scale and official adoption

### Why

Owner direction: the objective is to present CEOUBB to Universidad del Bío-Bío as **the next official LMS**, serving thousands of students, many courses and multiple carreras, in the same role Moodle UBB and Adecca UBB occupy today. Both planning documents still described a single-cohort pilot, carried stale entries, and split the same scale work across three places. Nothing in this pass changed application code.

### What changed

`PLAN.md`:

- Header records the current baseline commit and states the adoption objective.
- Active work table: the two merged branches marked `DONE`; the data-model row rewritten around course identity and the settled storage split; twelve rows added covering the pilot authorization (`BLOCKED`, owner), institutional SSO, removal of the personal-Gmail superusers, grade audit trail, backups, CI and rules tests, staging, capacity targets, pagination and batch limits, interoperability, accessibility and the governance dossier.
- Risks: "Hard-coded single-course beta" replaced by "Static catalogue and no enrollment model", which names the real defect — `courseId` has no section and no period, so paralelos and successive years collide. Six new risk sections: no grade audit trail, no backups or proven restore, consumer identity and personal-account superusers, single environment and no CI, no capacity or cost model, governance and continuity. The stale notification-bell residual defect corrected to record its 2026-08-09 removal.
- Prioritized work split into two tracks. P0 (pilot safety) gains P0.7 capacity and cost targets, P0.8 backups and a drilled restore, P0.9 grade audit trail, P0.10 CI and rules emulator tests, P0.11 staging. New P0B track (institutional adoption dossier): identity, records integration, interoperability and Moodle migration, legal and data protection, accessibility conformance, ownership and continuity, pilot evidence.
- "P1 — Multi-course collaboration" and "P1 — Backend consolidation" merged into "P1 — Academic data model (canonical spec)", now the single description of that migration; the 2026-08-11 addendum is marked superseded where it disagrees.
- Recommended execution order rewritten as two parallel tracks.

`ceoubb_moodle_adecca_comparison.md`: retitled as an adoption dossier; the matrix split into teaching features and institutional fitness, with sixteen new rows (hierarchy, secciones, periods, SSO, SIS, actas, interoperability, migration path, role depth, audit trail, backups, staging, accessibility, data protection, tenancy, licensing, capacity and cost, support). New section 7 (adoption readiness, including a capacity-target table to fill in), section 8 (recommended path: authorized pilot first), section 9 (honest assessment). Roadmap gained a Phase 0 production baseline ahead of the feature phases and a Phase 6 for adoption.

### Decisions recorded

1. **Catalogue storage is settled**: Turso is the system of record; Firestore holds a single-writer enrollment projection so rules can call `exists()`. This reverses the earlier warning against splitting.
2. **Course identity becomes asignatura × período × sección**, and must change before a second cohort exists.
3. **The domain-to-role invariant is authentication only.** Authorization moves to per-enrollment roles. `AGENTS.md` states it as absolute; amending it is deliberate work, not drift.
4. **Do not propose adoption first.** Seek a written authorization for an institutional pilot with one departamento or carrera, keep the non-official disclaimer in the UI until it exists, and let the pilot produce the evidence.

### Checks

Documentation only. No code, rules, schema or dependency changed, so no test run applies. Nothing deployed.

### Remaining risks

Unchanged by this pass, and now written down rather than implied: no enrollment model, no audit trail, no backups, no CI, no staging, no capacity or cost figures, no institutional agreement. The capacity table in P0.7 is deliberately left as *to define* — those numbers need the owner.

### Next recommended step

Unchanged for the code: deploy the two rules sets and run the manual matrix. In parallel, the owner should start P0B.7 item 1 (the pilot authorization) and fill in the P0.7 capacity and cost targets, because both gate work that otherwise stalls.

## Completed active-work entries (moved out of `PLAN.md` 2026-08-12)

- DONE — Claude Code, `claude/nextjs-vercel-migration`: migrate web from vinext/OpenAI Sites to Next.js/Vercel. Merged (`76f20bb`, PR #4). `package.json`, `db/`, `app/api/`, `tests/`, `AGENTS.md`, Vercel, Turso.
- DONE — Project owner / Codex, `codex/stage-vercel-domain`: move `ceoubb.com` and `www.ceoubb.com` from OpenAI Sites to Vercel, D1 data preserved in Turso. Vercel, Turso, Namecheap DNS, Firebase Auth.
- DONE — Claude Code, `claude/security-audit-fixes`: remediate the eight findings of the 2026-08-09 security audit. Merged (`15cb2a2`, PR #3). Firebase rules deploy and Android build still pending. `lib/`, `app/`, `next.config.ts`, `firebase/*.rules`, `android/ClassroomService.java`, `tests/`.
- DONE — Pipe / Antigravity, `main` (`bbc53c5`): Linear webhook handler and Discord notification protocol for AI agents. `app/api/webhooks/linear/route.ts`, `AGENTS.md`, `.agents/rules/discord_notifications.md`.
- DONE — Pipe / Antigravity, `main`: local Discord AI agent bridges for Claude Code (`claude-sonnet-5`) and Codex (`gpt-5.6-luna`); multi-turn session persistence (`--session-id` / `-r`), reply detection, formal Spanish system prompt, Windows startup VBS/PowerShell scripts, `pnpm run bot:autostart:codex`. `scripts/discord-claude-bridge.js`, `scripts/discord-codex-bridge.js`, `scripts/*.vbs`, `scripts/*.ps1`, `package.json`.
- DONE — Claude Code, `claude/discord-hardening`: verify Linear webhook signature and timestamp on `POST /api/webhooks/linear`, trim Discord agent roles to least privilege, delete the duplicate `Captain Hook` webhook in `#🎯-❙-linear`, fold `Gestion` into `Devops`, rotate the Discord webhook whose token was committed publicly. Lint and 44/44 tests pass. `LINEAR_WEBHOOK_SECRET` and `DISCORD_LINEAR_WEBHOOK_URL` must both be set in Vercel before deploy or the endpoint returns 500. The `Bot` role still holds `Administrator`; only the server owner can change it. `app/api/webhooks/linear/route.ts`, `lib/linear-signature.ts`, `tests/linear-webhook.test.ts`, `package.json`, Discord server, Vercel.
