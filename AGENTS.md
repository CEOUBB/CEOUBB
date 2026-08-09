# AGENTS.md

## Purpose and scope

This file contains repository-wide instructions for every coding agent working on Centro de Estudio UBB, including OpenAI Codex and Claude Code. It follows the open [AGENTS.md format](https://agents.md/). These instructions apply to the entire repository unless a more specific `AGENTS.md` is added in a subdirectory.

Read this file and `PLAN.md` completely before editing. A direct user instruction overrides this file. A nested `AGENTS.md` overrides this file only for files inside that nested directory.

## Project summary

Centro de Estudio UBB is an independent educational platform for Universidad del Bío-Bío students and teachers. It is not an official university service.

The repository contains three product surfaces:

- A web portal built with React 19, vinext, Vite, TypeScript, and OpenAI Sites/Cloudflare bindings.
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
- Sites project ID in `.openai/hosting.json`: `appgprj_6a76e9bdf030819198b5eddefbf6ba72`
- Sites bindings: D1 `DB`, R2 `FILES`

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
- `db/`, `drizzle/`, `app/api/`: legacy/parallel D1 and R2 application backend. Do not assume it is the canonical classroom backend.
- `worker/`: Sites/Cloudflare worker entry point.
- `.openai/hosting.json`: Sites project and binding declarations. Do not replace or casually edit it.
- `android/`: native Android project.
- `android/app/src/main/assets/www/`: Android's bundled offline study library and classroom bridge assets.
- `android/app/src/main/java/cl/ubb/centroestudio/`: native Firebase authentication, classroom, file, and notification services.
- `firebase/`: Firebase rules, indexes, Functions, and deployment configuration.
- `tests/`: rendered web application tests.

## Architecture and source-of-truth rules

### Web hosting

The web application is an existing Sites project. Preserve vinext, the Sites Vite plugin, Cloudflare-compatible ESM output, `.openai/hosting.json`, and the current package manager artifacts. Do not replace the framework with a new Next.js, Vite, or Cloudflare scaffold.

Do not run a raw `wrangler deploy` for production. Hosting is managed by Sites. An assistant without the Sites publishing capability should complete and validate the build, then record a deployment handoff in `PLAN.md` instead of inventing a different hosting path.

### Authentication and roles

The allowed access policy is an invariant:

- `@alumnos.ubiobio.cl`: student.
- `@ubiobio.cl`: teacher.
- `elpapijuaco325@gmail.com`: owner/developer exception.
- `felipearce.2004@gmail.com`: owner/developer collaborator exception.
- Every other personal, institutional, or university domain must be rejected.

Role behavior must remain synchronized across:

- `lib/access-policy.ts`
- `lib/auth.ts`
- `app/api/auth/firebase/route.ts`
- `firebase/firestore.rules`
- `firebase/storage.rules`
- `android/app/src/main/java/cl/ubb/centroestudio/ClassroomService.java`
- relevant tests in `tests/`

Never implement authorization only in the UI. Firestore and Storage rules are the security boundary.

### Classroom data

Firebase is the current source of truth for the collaborative Estática beta:

- User profiles: `users/{uid}`
- Posts: `courses/estatica/posts/{postId}`
- Progress: `courses/estatica/progress/{uid}`
- Files: `courses/estatica/{uploaderUid}/{timestamp}_{safeFileName}`
- Student notification topic: `course_estatica_students`

The web Firebase client and native Android service use course ID `estatica`. Some legacy D1/R2 routes still use `estatica-440299`. Do not mix those IDs or extend both backends independently. Any backend consolidation must be an explicit task with migration and rollback plans.

Teachers and owners may create material. A teacher may edit or delete only their own material; owners may administer all material. Students may read/download and update only their own progress. Direct uploads are limited to 50 MiB.

### Study library duplication

`public/biblioteca/` and `android/app/src/main/assets/www/` are related but are not exact mirrors. `assets/data.js` is currently shared-equivalent, while the HTML, application JavaScript, classroom bridge, and styles intentionally differ.

When changing academic content:

- Treat `public/biblioteca/ramos/` and `public/biblioteca/assets/data.js` as the web source.
- Deliberately propagate relevant content to `android/app/src/main/assets/www/`.
- Preserve Android-only authentication, privacy, offline, and native bridge behavior.
- Compare the resulting files instead of blindly copying the whole directory.
- Verify KaTeX rendering, accents, units, symbols, and offline behavior.

### Android

The Android app is native Java with a bundled web library. Current release metadata is in `android/app/build.gradle`. At the time of this file, it is package `cl.ubb.centroestudio`, `versionCode 13`, `versionName 1.0.6`, `minSdk 26`, `targetSdk 36`, and `compileSdk 36`.

There is no Gradle wrapper in the repository. Do not add generated release artifacts or signing material. The app's release keystore is external and must never be regenerated unless the owner explicitly requests key rotation and understands the Play signing consequences.

### iOS

There is currently no native iOS/Xcode project in this repository. The App Store badge is a non-clickable placeholder. Do not claim iOS availability until an iOS implementation is built, signed, tested, and accepted in App Store Connect.

## Development setup and commands

### Web application

Requirements: Node.js `>=22.13.0`.

Use npm for the root web project because `README.md` and the primary workflow are npm-based. Avoid changing both root lockfiles during an unrelated task.

```bash
npm ci
npm run dev
npm run build
npm run lint
npm test
```

`npm test` performs a production build before running the Node test suite. Run `npm run lint` separately because it is not included in `npm test`.

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
- Mathematical material must render in conventional mathematical notation through KaTeX or equivalent presentation. Do not expose programming-style notation such as `x^2` when the rendered UI can show \(x^2\).
- Preserve SI units, significant figures, assumptions, and sign conventions in engineering exercises.
- Do not copy copyrighted exams, textbooks, solution manuals, or university material without permission. Prefer original exercises inspired by course outcomes and cite reference books without reproducing protected text.

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
npm run lint
npm test
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
- Store badges must remain non-clickable placeholders until the official Google Play and App Store listing URLs exist.
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

