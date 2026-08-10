# AGENTS.md

## Purpose and scope

This file contains repository-wide instructions for every coding agent working on Centro de Estudio UBB, including OpenAI Codex and Claude Code. It follows the open [AGENTS.md format](https://agents.md/). These instructions apply to the entire repository unless a more specific `AGENTS.md` is added in a subdirectory.

Read this file and `PLAN.md` completely before editing. A direct user instruction overrides this file. A nested `AGENTS.md` overrides this file only for files inside that nested directory.

## Project summary

Centro de Estudio UBB is an independent educational platform for Universidad del Bío-Bío students and teachers. It is not an official university service.

The repository contains three product surfaces:

- A web portal built with React 19, Next.js (App Router), TypeScript, and Turso/libSQL, deployed on Vercel.
- A native Android application written in Java that embeds the offline study library and integrates native Firebase services.
- Firebase infrastructure for Authentication, Firestore, Storage, Cloud Functions, and Cloud Messaging.

The public production domain is `https://ceoubb.com`. The canonical Git repository is `https://github.com/CEOUBB/CEOUBB.git`, and the default branch is `main`.

## Canonical infrastructure identifiers

Treat these identifiers as configuration, not secrets. Do not change them without explicit owner approval.

- Firebase project ID: `centro-de-estudio-ubb`
- Firebase project number / messaging sender ID: `411177916202`
- Firebase region for Firestore, Storage, and Functions: `southamerica-west1`
- Default Storage bucket: `centro-de-estudio-ubb.firebasestorage.app`
- Android application ID: `cl.ubb.centroestudio`
- Web hosting: Vercel (zero-config Next.js project; no `vercel.json` is required)
- Web database: Turso/libSQL, configured through the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables

## Human and AI collaboration protocol

Two people maintain this project using different assistants: one uses Codex and the other uses Claude Code. GitHub is the shared source of truth; local chat history is not.

At the beginning of every task:

1. Read `AGENTS.md`, `PLAN.md`, and the relevant source files.
2. Run `git status --short`, `git branch --show-current`, and `git log -5 --oneline`.
3. Fetch the remote and confirm that the working branch is based on the current `origin/main`.
4. Preserve any existing uncommitted work. Never discard, reset, overwrite, or reformat another contributor's changes.
5. Check the active and recently completed items in `PLAN.md` before selecting work.

When both assistants may work concurrently:

- Use a separate branch per task. Prefer `codex/<short-task>` for Codex and `claude/<short-task>` for Claude Code.
- Do not let two agents edit the same files at the same time. If scopes overlap, stop and coordinate before continuing.
- Pull with fast-forward only. Never force-push shared branches and never rewrite another contributor's commits.
- Keep commits small and single-purpose. Use imperative English commit subjects, for example `Add Firebase rules tests`.
- Before merging, rebase or merge the latest `origin/main`, resolve conflicts deliberately, and rerun all relevant checks.
- Only one person or agent should perform a production deployment at a time.
- After material work, update `PLAN.md` with the result, verification performed, deployment status, remaining risks, and the next recommended action.

Direct commits to `main` have been used during initial development, but feature branches and reviewed pull requests are the preferred workflow now that two maintainers are active.

## Repository map

- `app/`: web routes, UI, authentication endpoints, and portal features.
- `app/Portal.tsx`: primary web UI, login, dashboard, Estática classroom, progress, administration, and store placeholders.
- `lib/`: shared web authentication, access policy, Firebase client setup, and classroom client logic.
- `public/biblioteca/`: browser-accessible study library and academic material.
- `public/brand/`, `public/icons/`, `public/manifest.webmanifest`, `public/sw.js`: branding and PWA assets.
- `db/`, `drizzle/`: Turso/libSQL schema and migrations backing the web session and user directory only. It is not the classroom backend.
- `app/api/`: web session, Firebase sign-in exchange, and owner administration endpoints.
- `android/`: native Android project.
- `android/app/src/main/assets/www/`: Android's bundled offline study library and classroom bridge assets.
- `android/app/src/main/java/cl/ubb/centroestudio/`: native Firebase authentication, classroom, file, and notification services.
- `firebase/`: Firebase rules, indexes, Functions, and deployment configuration.
- `tests/`: rendered web application tests.

## Architecture and source-of-truth rules

### Web hosting

The web application is a Next.js App Router project deployed on Vercel. Preserve the standard Next.js layout, the pnpm lockfile (`pnpm-lock.yaml`), and zero-config Vercel deployment. Do not reintroduce vinext, Vite, Cloudflare Workers, D1, or R2, and do not add a bundler config the framework does not need.

The web database is Turso/libSQL, reached through `db/index.ts` with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Local development can point `TURSO_DATABASE_URL` at `file:local.db`. Never commit the auth token.

An assistant without Vercel publishing access should complete and validate the build, then record a deployment handoff in `PLAN.md` instead of inventing a different hosting path. Deploy previews before production, and never change `ceoubb.com` DNS without explicit owner sign-off.

### Authentication and roles

The allowed access policy is an invariant:

- `@alumnos.ubiobio.cl`: student.
- `@ubiobio.cl`: teacher.
- `elpapijuaco325@gmail.com`: owner/developer exception.
- `felipearce.2004@gmail.com`: owner/developer collaborator exception.
- Every other personal, institutional, or university domain must be rejected.

`lib/access-policy.ts` is the single implementation of that policy for the web. `roleForEmail` lives there and nowhere else: no other TypeScript module may re-derive a role from an email domain, and `tests/access-policy.test.ts` fails the build if one does.

The rules files and the Android service cannot import TypeScript, so they hold their own copies. Role behavior must therefore remain synchronized across:

- `lib/access-policy.ts` (source of truth)
- `firebase/firestore.rules`
- `firebase/storage.rules`
- `android/app/src/main/res/values/firebase.xml` (the two owner addresses)
- `android/app/src/main/java/cl/ubb/centroestudio/ClassroomService.java`

`tests/access-policy.test.ts` drives the `ACCESS_CASES` matrix through `roleForEmail` and asserts that each of those surfaces still names the same owner addresses and institutional domains. Add a case to `ACCESS_CASES` whenever the policy changes.

Never implement authorization only in the UI. Firestore and Storage rules are the security boundary.

### Classroom data

Firebase is the current source of truth for the collaborative Estática beta:

- User profiles: `users/{uid}`
- Posts: `courses/estatica/posts/{postId}`
- Progress: `courses/estatica/progress/{uid}`
- Files: `courses/estatica/{uploaderUid}/{timestamp}_{safeFileName}`
- Student notification topic: `course_estatica_students`

The web Firebase client and native Android service use course ID `estatica`. The unused D1/R2 classroom routes that used `estatica-440299` were deleted during the Vercel migration; Firebase is now the only classroom backend. The writerless `notifications` and `notification_reads` tables, `GET/POST /api/notifications` and the web notification bell were removed on 2026-08-09; Firebase Cloud Messaging on `course_estatica_students` is the only notification path.

`lib/firebase-classroom-client.ts` owns the whole Firestore/Storage surface of the classroom. It exposes one subscription, `watchClassroom(teaching, onChange, onError)`, which syncs the profile once and returns already-shaped `ClassroomPost`, `ClassroomFile` and `ClassroomStudent` values, plus the commands `publishClassroomPost`, `uploadClassroomFile`, `editClassroomPost`, `renameClassroomFile`, `deleteClassroomPost`, `saveClassroomProgress` and `classroomFileUrl`. Raw Firestore documents must not cross that seam: keep record shaping, post-kind normalization and author-role derivation inside the module, not in `app/Portal.tsx`.

Teachers and owners may create material. A teacher may edit or delete only their own material; owners may administer all material. Students may read/download and update only their own progress. Direct uploads are limited to 50 MiB.

### Study library duplication

`public/biblioteca/` and `android/app/src/main/assets/www/` are related but are not exact mirrors. `assets/data.js` is currently shared-equivalent, while the HTML, application JavaScript, classroom bridge, and styles intentionally differ.

When changing academic content:

- Treat `public/biblioteca/ramos/` and `public/biblioteca/assets/data.js` as the web source.
- Deliberately propagate relevant content to `android/app/src/main/assets/www/`.
- Preserve Android-only authentication, privacy, offline, and native bridge behavior.
- Compare the resulting files instead of blindly copying the whole directory.
- Verify KaTeX rendering, accents, units, symbols, and offline behavior.

The two copies are currently on different visual themes. `public/biblioteca/` was moved onto the light institutional design system on 2026-08-10 so it matches the portal; `android/app/src/main/assets/www/` is still on the previous dark maroon theme. That divergence is known and temporary, not a style to copy. When the Android copy is rethemed, port the tokens from `public/biblioteca/assets/styles.css` rather than inventing a third palette, and keep the Android-only classroom bridge markup intact.

### Android

The Android app is native Java with a bundled web library. Current release metadata is in `android/app/build.gradle`. At the time of this file, it is package `cl.ubb.centroestudio`, `versionCode 13`, `versionName 1.0.6`, `minSdk 26`, `targetSdk 36`, and `compileSdk 36`.

There is no Gradle wrapper in the repository. Do not add generated release artifacts or signing material. The app's release keystore is external and must never be regenerated unless the owner explicitly requests key rotation and understands the Play signing consequences.

### iOS

There is currently no native iOS/Xcode project in this repository. The App Store badge is a non-clickable placeholder. Do not claim iOS availability until an iOS implementation is built, signed, tested, and accepted in App Store Connect.

## Development setup and commands

### Web application

Requirements: Node.js `>=22.13.0`.

**Package manager policy**: It is strictly prohibited to use anything other than `pnpm` (`no npm`, `no bun`) for managing dependencies and running project scripts. (`npx` is still allowed only for specific tools/commands that cannot be installed or run through `pnpm dlx`).

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm test
```

`pnpm test` performs a production build, then runs the Node test suite with `--experimental-strip-types` so tests can import the TypeScript modules directly. Run `pnpm run lint` separately because it is not included in `pnpm test`.

The suite has two seams and no third one should be invented:

- `tests/access-policy.test.ts` imports `lib/access-policy.ts` and calls it. Pure, no server, no database.
- `tests/rendered-html.test.mjs` migrates a throwaway libSQL database in the OS temp directory, seeds an owner, a teacher and a student, starts `next start` against it through `TURSO_DATABASE_URL`, and exercises the session and administration endpoints over HTTP with real session cookies.

Assert on behaviour through those seams. Do not add regular-expression assertions over source text; the few that remain exist only for store-badge compliance and for the Firebase rules, which no test process can execute.

Schema changes need `npm run db:generate` and a migration applied to Turso before the matching deploy. The suite applies `drizzle/*.sql` in order, so an unapplied or malformed migration fails the tests.

### Firebase Functions and rules

Requirements: Firebase CLI access to project `centro-de-estudio-ubb`; Node.js 22 for the deployed Functions runtime.

The Functions subproject uses pnpm:

```bash
cd firebase/functions
pnpm install --frozen-lockfile
pnpm run check
```

Run deployments from `firebase/` and deploy only the resources changed:

```bash
pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only firestore
pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only storage
pnpm dlx firebase-tools@latest deploy --project centro-de-estudio-ubb --only functions --force
```

Production deployment changes external state and may affect billing. Do it only when the user's request authorizes deployment. Never expose Firebase CLI tokens, OAuth codes, service-account keys, or billing data in commits, logs, issues, or chat responses.

### Android application

Requirements: JDK 17, Android SDK 36, and a compatible installed Gradle/Android Gradle Plugin environment.

```bash
cd android
gradle :app:assembleDebug
```

Release builds require the owner's local `keystore.properties` and keystore. Before producing a Play bundle, increment `versionCode`, choose the intended `versionName`, run the relevant tests, and build the AAB using the existing signing configuration. Never commit APK, AAB, keystore, or signing passwords.

## Coding and content conventions

- Preserve TypeScript strict mode and existing React functional patterns.
- Match the surrounding code style: double quotes, semicolons, and two-space indentation in TypeScript/JavaScript; standard Java formatting in Android code.
- Do not add new source-code comments unless the user explicitly requests them. Preserve existing comments unless removal is requested.
- Prefer targeted changes over broad rewrites or dependency upgrades.
- Keep user-facing copy in clear Chilean Spanish. Technical documentation for agents may remain in English.
- Use semantic HTML, accessible labels, keyboard support, responsive layouts, and adequate contrast.
- Preserve the UBB-inspired blue/cyan/yellow/red palette and the independent-project disclaimer. Do not imply official university endorsement.
- Follow the web design system described in "Web design system" below instead of introducing a second visual language.
- Mathematical material must render in conventional mathematical notation through KaTeX or equivalent presentation. Do not expose programming-style notation such as `x^2` when the rendered UI can show \(x^2\).
- Preserve SI units, significant figures, assumptions, and sign conventions in engineering exercises.
- Do not copy copyrighted exams, textbooks, solution manuals, or university material without permission. Prefer original exercises inspired by course outcomes and cite reference books without reproducing protected text.

## Web design system

The portal, the access screen and the web study library share one light institutional language. The portal's copy lives in `app/globals.css` as custom properties plus plain class selectors; the library keeps its own standalone copy of the same tokens in `public/biblioteca/assets/styles.css`, because that page must run offline with no build step. Keep the two token blocks in sync by hand. There is no Tailwind utility usage in the app markup; `@import "tailwindcss"` is kept only for its preflight reset.

The library page cannot use `next/font`, Phosphor or Motion: it is static, dependency-free and offline-first. It uses a system font stack, CSS transitions, and inline Phosphor SVG markup copied from the MIT icon set. Do not add a webfont link or a script tag to it; `font-src 'self' data:` in the CSP would block the font anyway, and any network dependency breaks offline study.

- One theme for the whole site: light. Page `--paper` `#f5fafe`, surfaces `--card` white, text `--ink` `#0b2f4d`, secondary `--ink-2` / `--ink-3`, hairlines `--line` / `--line-2`. Do not add a section that inverts to dark; use `.panel-navy` when a block needs weight.
- One accent: `--blue` `#0057a4` with `--blue-deep` and `--cyan` for support. `--gold` and `--red` are course-identity and alert colors, never general accents.
- The institutional four-color rule (`--bar`, blue to cyan to gold to red) is the signature element. It appears once per surface: the top edge of the portal header, the right edge of the access panel and the course cover, the bottom edge of the download banner.
- `.panel-navy` is the shared dark accent block (course cover, course identity, download banner). It carries the shield watermark and the four-color rule.
- Radius scale is locked: `--r-card` `.9rem` for cards and panels, `--r-control` `.6rem` for buttons and inputs, `99px` for pills. Do not introduce a third card radius.
- Type is Geist Sans through `next/font`, with Geist Mono reserved for codes, dates, equations and counters.
- Icons come from `@phosphor-icons/react` only, at `size={14..22}` and default weight. Do not hand-roll SVG icons and do not add a second icon family or reintroduce text glyphs such as `⌂`, `◎` or `Σ` as icons.
- Motion comes from `motion/react` only. `<MotionConfig reducedMotion="user">` wraps the portal shell, so `prefers-reduced-motion` is honored globally. The vocabulary is deliberately small: screen and tab changes cross-fade through `<Screen>`, the header nav underline is a shared `layoutId="nav-indicator"`, lists reveal with the shared `rise` and `stagger` variants, cards lift with `whileHover`, and progress bars animate `scaleX`. Animate only transform and opacity, and do not add a scroll-hijack, parallax or infinite loop to an academic surface.
- When an element animates with Motion, its hover lift belongs in `whileHover`, not in CSS. Motion writes inline transforms that a CSS `:hover` rule cannot override.
- Copy is plain and factual. Section subtitles must carry real information (`Periodo 2026-2 · 6 ramos activos`) or be omitted. Do not add decorative eyebrows above every heading, invented metrics, status pills such as "Portal sincronizado", or filler marketing sentences.
- Every list and table needs its empty state; several already exist as `.empty-state` and `.empty-row`.

## Security and privacy requirements

- Default to deny in Firestore and Storage rules, then grant the minimum role-specific access.
- Keep institutional email verification and server-side role checks intact.
- Do not add passwords, RUTs, OAuth codes, service-account files, private addresses, phone numbers, Firebase CLI credentials, billing details, or signing secrets to the repository.
- `.env*`, keystores, release binaries, service-account JSON, local Android configuration, and Firebase debug files are intentionally ignored. Preserve those rules.
- Firebase web config and `android/app/google-services.json` are client configuration, not server authorization. Security must not depend on hiding them.
- Do not log ID tokens or personal user data.
- Validate upload type, size, ownership, and storage path on every surface.
- Treat account deletion, privacy policy, data retention, Google Play Data safety, and Apple privacy disclosures as release-blocking compliance work.
- Do not modify DNS, billing plans, IAM roles, store accounts, production rules, or production data unless the active user request clearly authorizes that exact action.

## Testing expectations

Run the smallest relevant checks during development and all applicable checks before committing.

For web-only changes:

```bash
pnpm run lint
pnpm test
```

For Firebase Functions changes:

```bash
cd firebase/functions
pnpm install --frozen-lockfile
pnpm run check
```

For Firebase rule changes, compile/deploy to an authorized test or production project only with permission. Prefer adding Emulator Suite rule tests before broadening access.

For Android changes, at minimum build the debug variant. Authentication, Storage uploads, notification permissions, deep links, offline library access, and FCM delivery require manual testing on a physical Android device.

When changing roles or authentication, test this matrix:

- owner/developer account
- collaborator/developer account
- `@ubiobio.cl` teacher
- `@alumnos.ubiobio.cl` student
- rejected personal Gmail
- rejected external university account
- signed-out visitor

When changing classroom features, test create/read/update/delete permissions, a 50 MiB boundary case, progress isolation, download access, and notification delivery.

## Deployment and release rules

- A successful local build is not proof that production was deployed.
- Record the exact target, result, date, and commit in `PLAN.md` after every production deployment.
- Verify `https://ceoubb.com` after web deployment without changing DNS unless necessary and authorized.
- Keep Firebase resources in `southamerica-west1` unless a deliberate migration is approved. Resource locations are difficult or impossible to change later.
- Use selective Firebase deploys. Avoid deploying unrelated rules and Functions together.
- Keep the Artifact Registry cleanup policy enabled so old Functions images do not accumulate cost.
- Store badges must remain non-clickable placeholders until the official Google Play and App Store listing URLs exist. They appear on the access screen and in the portal download banner. Never point an official store badge at the Drive APK; the direct download is a separate, plainly labelled link.
- Do not publish a release under a different Android application ID; doing so creates a separate app.

## Documentation and handoff requirements

`PLAN.md` is the living cross-agent handoff. Update it whenever a task changes architecture, infrastructure, deployment status, store readiness, security, data model, or a major user-visible feature.

Every handoff must state:

- what changed and why
- files and services affected
- checks that passed or were not run
- whether production was modified
- unresolved risks or manual follow-up
- the next recommended step

Do not mark an item complete because code exists locally. Completion requires relevant verification and, when requested, successful deployment.

## Definition of done

A task is complete only when:

1. The requested behavior is implemented without unrelated rewrites.
2. Security and role invariants remain enforced on the server/rules layer.
3. Relevant automated checks pass.
4. Required manual checks are completed or explicitly handed off.
5. Documentation and `PLAN.md` reflect material changes.
6. No secrets, generated binaries, or unrelated local changes are committed.
7. The branch is synchronized and the commit/push or PR status is clearly reported.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
