# AGENTS.md

## Purpose and scope

This file contains repository-wide instructions for every coding agent working on Centro de Estudio UBB, including OpenAI Codex and Claude Code. It follows the open [AGENTS.md format](https://agents.md/). These instructions apply to the entire repository unless a more specific `AGENTS.md` is added in a subdirectory.

Read this file and `PLAN.md` completely before editing. A direct user instruction overrides this file. A nested `AGENTS.md` overrides this file only for files inside that nested directory.

`ceoubb_moodle_adecca_comparison.md` at the repository root compares CEOUBB feature by feature against Moodle UBB and Adecca UBB, marks each gap resolved, partial, open or deferred, records what breaks at university scale, and — since the 2026-08-11 second revision — carries the institutional adoption dossier: what a state university's evaluation requires beyond features. Read it before proposing new product work, and update it when you close one of its items.

## Project summary

Centro de Estudio UBB is an independent educational platform and Learning Management System (LMS) for Universidad del Bío-Bío students and teachers. It is not an official university service. It aims to unify course management, academic materials delivery, offline study resources, evaluation tracking, and collaborative virtual classrooms into a modern, centralized platform.

**Objective: present CEOUBB to Universidad del Bío-Bío as the next official LMS**, in the role Moodle UBB and Adecca UBB occupy today — thousands of students, thousands of course sections, multiple facultades and carreras. Two consequences bind every agent:

- Judge architectural decisions against university scale and against an institutional evaluation (DTI, Vicerrectoría Académica, jurídica), not against the current single-cohort pilot. A design that only works for six ramos is technical debt the moment it is written, and must be labelled as such when it is unavoidable.
- Until a written agreement with the university exists, the product remains independent and non-official. Keep the disclaimer in the UI, keep the store badges as placeholders, and never present CEOUBB as institutional. Section 8 of `ceoubb_moodle_adecca_comparison.md` is the agreed path: an authorized pilot first, the proposal afterwards.

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
- `app/Portal.tsx`: portal shell — session check, access screen, header navigation and screen routing.
- `app/portal-views.tsx`: course dashboard, academic calendar, resources and account administration.
- `app/Classroom.tsx`: the generic classroom, rendered for any course in the registry (portada, participantes, notas, progreso, materiales).
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

**Scope of this invariant, and its planned successor.** Everything above is an *authentication and account-eligibility* rule: it decides who may enter CEOUBB at all, and it stays enforced exactly as written until it is deliberately replaced. It is not an authorization model, and it cannot become one:

- A domain suffix cannot express per-course roles. The same person is a teacher in one section and a student in another, and `Ayudante` and `Coordinador` do not exist in it at all.
- The two owner/developer Gmail exceptions are permanent superusers bound to personal consumer accounts. Correct for a pilot run by its two authors; an audit finding in an institutional review.

The target state is institutional SSO (SAML 2.0 / OIDC / CAS) against the UBB directory, with roles taken from directory membership plus per-enrollment role records, and directory-backed administrator accounts replacing the two exceptions. That is `P0B.1` in `PLAN.md`. Amending this section is deliberate work — one commit, `ACCESS_CASES` and the four synchronized surfaces updated together — not something to drift into while building a feature. Until that commit lands, do not weaken, bypass or duplicate the rule as written.

### Classroom data

Firebase is the current source of truth for the collaborative Estática beta:

- User profiles: `users/{uid}`
- Posts: `courses/{courseId}/posts/{postId}`
- Progress: `courses/{courseId}/progress/{uid}` (also holds each student's private `simulated` grade map)
- Files: `courses/{courseId}/{uploaderUid}/{timestamp}_{safeFileName}`
- Grading scheme: `courses/{courseId}/meta/gradebook` (teacher-authored `items[]` plus the `exemption` grade)
- Official grades: `courses/{courseId}/grades/{uid}` (teacher-written, readable by that student and by teachers)
- Student notification topic: `course_estatica_students`

`lib/courses.ts` is the course registry: the single list of course ids, codes, tones, learning outcomes and known evaluation dates for the web. It is a static module **as scaffolding only**. The owner's stated direction is that courses and enrollments must move to the database: a university-scale deployment means thousands of courses and thousands of students, and a hardcoded list cannot serve that. Treat the current module as a placeholder for the relational academic model specified in "P1 — Academic data model (canonical spec)" of `PLAN.md` — `facultades`, `departamentos`, `carreras`, `planes_de_estudio`, `asignaturas`, `periodos`, `secciones` and `enrollments` (`userId`, `seccionId`, `role`, `state`) — not as a settled architecture, and do not add a second hardcoded catalogue anywhere else.

Two decisions about that model are settled; do not relitigate them in a feature branch:

- **Course identity is a section**, that is *asignatura × período × sección*, not an asignatura. Today `courseId = "estatica"` is one global bucket, so two paralelos of the same ramo, or the same ramo in a later year, would write into the same `courses/estatica/posts`. Anything that assumes one document tree per asignatura is writing debt.
- **Turso is the system of record** for every entity above; **Firestore holds a narrow one-way projection** of enrollments (membership and role only) whose sole purpose is to let rules answer "is this user enrolled here?" with `exists()`. That projection has exactly one writer and is never authored by a client. Earlier documentation warned against splitting the data; that warning is superseded.

The interface is already shaped for that swap. Only `app/Portal.tsx` imports the registry; `CoursesDashboard`, `CalendarView` and `ResourcesView` take `courses: Course[]` as a prop, and `calendarEntries(courses, gradebooks)` takes the list as an argument. Migrating means replacing one `const courses = COURSES` with the signed-in user's enrolled courses. Keep it that way: never import `COURSES` from a view component.

These things break at scale and must be fixed as part of that migration, not after it:

- `watchCourseActivity` sweeps the newest posts of every course in the database and filters client-side. Beyond a few dozen active courses a student's own posts stop fitting in the window and the unread badges silently go empty. Replace with a query filtered by enrolled courses, or a per-user aggregate document.
- `watchGradebooks` reads every published gradebook in the database, unlimited, on each portal load. Six documents today; thousands of reads per session at university scale.
- `isMember()` grants any signed-in UBB account read access to every course's posts and gradebook. That is acceptable while one cohort shares six ramos and is a privacy problem the moment unrelated faculties coexist. Course reads must then be gated on an enrollment check in the rules.
- Posts, files, the participant roster and the grade matrix all load whole. Each needs pagination before a 300-student section opens it.
- `saveStudentScores` writes the whole section in one batch; Firestore caps a write batch at 500 operations. Chunk it.
- Enrollment-filtered queries will need composite indexes that `firebase/firestore.indexes.json` does not have today.
- `course_estatica_students` is a single-course notification topic, and `ClassroomService.java` still pins `COURSE_ID = "estatica"`. Both become per-section with the migration.

Adding a ramo today means adding an entry to the registry, nothing else; the rules accept any `courseId` matching `^[a-z][a-z0-9-]{1,30}$`, so no rules deploy is needed for a new course. The native Android service still pins `COURSE_ID = "estatica"`, which the wildcard rules keep working unchanged. The unused D1/R2 classroom routes that used `estatica-440299` were deleted during the Vercel migration; Firebase is now the only classroom backend. The writerless `notifications` and `notification_reads` tables, `GET/POST /api/notifications` and the web notification bell were removed on 2026-08-09; Firebase Cloud Messaging on `course_estatica_students` is the only notification path.

`lib/firebase-classroom-client.ts` owns the whole Firestore/Storage surface of the classroom. Every function takes `courseId` as its first argument. It exposes the per-course subscription `watchClassroom(courseId, teaching, onChange, onError)`, which syncs the profile once and returns already-shaped `ClassroomPost`, `ClassroomFile`, `ClassroomStudent` and grade values, plus two portal-wide collection-group subscriptions, `watchCourseActivity` (drives the unread badges on the course cards) and `watchGradebooks` (drives the calendar). Commands: `publishClassroomPost`, `uploadClassroomFile`, `editClassroomPost`, `renameClassroomFile`, `moveClassroomPost`, `deleteClassroomPost`, `saveClassroomProgress`, `saveGradebook`, `saveStudentScores`, `saveSimulation` and `classroomFileUrl`. Raw Firestore documents must not cross that seam: keep record shaping, post-kind normalization and author-role derivation inside the module, not in `app/Classroom.tsx`.

`lib/grades.ts` is the only place grade arithmetic lives. It holds the Chilean 1,0–7,0 scale constants, `summarize` (weighted average over what already has a grade) and `requiredGrade` (the score still needed to reach a target, rounded up to one decimal, reported as `closed`, `secured`, `impossible` or `needed`). It is pure and has no Firebase import; `tests/grades.test.ts` drives it directly. Do not re-derive a weighted average anywhere else.

Teachers and owners may create material. A teacher may edit or delete only their own material; owners may administer all material. Students may read/download and update only their own progress. Direct uploads are limited to 50 MiB.

Grades follow the same split. Only teachers and owners write `meta/gradebook` and `grades/{uid}`; a student reads the scheme, reads only their own official grades, and can never write them. The student's own what-if simulation is a `simulated` map inside their own progress document, so it never touches a teacher-owned path. CEOUBB is not the institutional grade record: official grades entered here are a convenience copy, never the source of truth for the university.

That disclaimer is what currently substitutes for a grade audit trail — nothing records who changed a score, when, or what the previous value was, because `grades/{uid}` is overwritten in place. It stops being sufficient the moment the platform is proposed as an official gradebook. `P0.9` in `PLAN.md` specifies append-only grade history (author, timestamp, previous and new value) written where clients cannot bypass or edit it. Do not build new grade write paths that would have to be retrofitted for it: any new writer should assume history is coming.

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
- `tests/grades.test.ts` imports `lib/grades.ts` the same way. Same seam, same rules: pure functions called directly. Import types with `import type`, otherwise `--experimental-strip-types` fails on the missing runtime export.
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
- Assume every academic record in the platform is personal data of a real student. Grades, rosters and progress are held under Ley 19.628 and the Ley 21.719 regime; keep Firestore, Storage and Functions in `southamerica-west1`, and treat retention, export and deletion as product requirements rather than afterthoughts.
- There is no backup regime and no proven restore today (`P0.8`). Until there is, treat any change that can mass-write or mass-delete classroom data as high risk, and do not run one against production without an explicit, current instruction.
- Grade write paths must be designed for the append-only history in `P0.9`. Never add a path that lets a client silently overwrite a score with no record.
- The two personal-account owner exceptions are a known finding, tracked in `P0B.1`. Do not add a third exception, and do not widen what those accounts can do.
- No deploy of Firestore or Storage rules should reach production without having run against the emulator suite or a staging project (`P0.10`, `P0.11`).

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

Emulator Suite rule tests and GitHub Actions CI are `P0.10` in `PLAN.md`, not a nice-to-have: once course reads are gated on enrollment, the rules are the only thing standing between one carrera's students and another's material, and nothing in the current suite can execute them. Any change that introduces or modifies an enrollment check should land together with its emulator test. When adding a scale-sensitive path (a query, a batch write, a list view), state in the handoff what its behaviour is at the `P0.7` capacity targets — an unbounded query that is fine at six courses is a defect at six thousand.

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
8. Any new query, list view or write path states its behaviour at university scale — bounded, paginated, enrollment-filtered — or is explicitly labelled as pilot-only debt in `PLAN.md`. "Works for six ramos" is not done.
9. Nothing in the change presents CEOUBB as an official or university-endorsed service while no agreement exists.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
