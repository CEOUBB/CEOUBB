# Centro de Estudio UBB: Plan y Agent Handoff

Last verified 2026-08-28 · baseline `e9e85c4` · repo `https://github.com/CEOUBB/CEOUBB.git` · production `https://ceoubb.com`

**Objective: present CEOUBB to Universidad del Bío-Bío as the next official LMS.** Every priority is ordered against that. Rationale: `docs/institutional/moodle-adecca-comparison.md` (scope and adoption dossier); this file is authoritative for status, deployment and verification.

## How to use

Read `AGENTS.md` first: invariants, setup, commands and identifiers live there and are not repeated here. Update this file after any material feature, infra change, deploy, store submission, security change or architectural decision.

Status labels: `DONE` (implemented and verified at the level stated) · `ACTIVE` (owner working on it) · `NEXT` (ready and prioritized) · `BLOCKED` (needs an external decision, account, approval or credential) · `BACKLOG` (valuable, not release-critical).

Before starting: add a row to Active work with task, branch, owner and files. Remove it when merged (completed rows go to `docs/archive/PLAN_ARCHIVE.md`).

Companion files:

- [`DESIGN.md`](DESIGN.md): Fuente canónica del sistema de diseño institucional, tokens de color y tipografía.
- [`docs/archive/PLAN_ARCHIVE.md`](docs/archive/PLAN_ARCHIVE.md): completed work, implemented milestones, full handoff history.
- [`docs/institutional/moodle-adecca-comparison.md`](docs/institutional/moodle-adecca-comparison.md): Moodle & Adecca institutional comparison and adoption dossier.
- [`docs/legal/README.md`](docs/legal/README.md): CEO-40, carpeta borrador para Jurídica sobre encargo UBB/CEOUBB, retención y borrado, derechos, residencia/subencargados y término del servicio.
- [`docs/operations/capacity-cost-baseline.md`](docs/operations/capacity-cost-baseline.md): CEO-9, envolvente de 12.000 estudiantes, 3.000 secciones y 3.000 concurrentes; modelo CLP 450 base / CLP 1.000 techo por estudiante-año; SLO, RPO/RTO y protocolo de evidencia.
- [`docs/specs/p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md): P0.1-P0.11 detail and acceptance criteria.
- [`docs/specs/p0b-adoption.md`](docs/specs/p0b-adoption.md): P0B.1-P0B.7 institutional adoption dossier.
- [`docs/specs/p0-react-doctor-remediation.md`](docs/specs/p0-react-doctor-remediation.md): React Doctor quality & frontend reliability remediation spec (SDD).
- [`docs/specs/p1-academic-model.md`](docs/specs/p1-academic-model.md): canonical academic data model / enrollment migration spec.
- [`docs/specs/p2-academic-time-blocking-planner.md`](docs/specs/p2-academic-time-blocking-planner.md): Academic Time-Blocking Planner & deadline sync spec (SDD).
- [`docs/specs/p3-study-resources-hub.md`](docs/specs/p3-study-resources-hub.md): Study Resources Hub, AI Models & UBB Perks spec (SDD).
- [`docs/specs/p4-portal-views-modularization.md`](docs/specs/p4-portal-views-modularization.md): portal views modularization spec (SDD).
- [`docs/specs/p5-capacitor-mobile-migration.md`](docs/specs/p5-capacitor-mobile-migration.md): Capacitor mobile architecture migration & mobile-first UX spec (SDD).
- [`docs/specs/p6-ci-cd-automation-enhancements.md`](docs/specs/p6-ci-cd-automation-enhancements.md): CI/CD Automations & Integration Quality Enhancement spec (SDD).
- [`docs/specs/p7-enterprise-repository-standards.md`](docs/specs/p7-enterprise-repository-standards.md): Enterprise Repository Standards, Document Architecture & Governance spec (SDD).
- [`docs/specs/p7-teacher-workspace-preview.md`](docs/specs/p7-teacher-workspace-preview.md) — preview navegable exclusivamente docente, inspirado conceptualmente en Canvas UdeC, ADECCA y Moodle, con datos sintéticos y aislamiento total del backend productivo.
- [`docs/specs/p8-live-class-banner.md`](docs/specs/p8-live-class-banner.md): CEO-56, contrato verificado para el enlace Zoom/Teams por sección y su banner inmediato en la portada del aula.
- [`docs/specs/p8-performance-and-scalability-remediations.md`](docs/specs/p8-performance-and-scalability-remediations.md): Optimizaciones de Rendimiento, Escalabilidad y Desacoplamiento de Carga (SDD).
- [`docs/specs/p9-enterprise-harness-evolution.md`](docs/specs/p9-enterprise-harness-evolution.md): Enterprise AI Agent Harness Evolution, Test-Locking & Deterministic Governance (SDD).
- [`docs/specs/p10-institutional-lms-evolution.md`](docs/specs/p10-institutional-lms-evolution.md): Institutional LMS core, enrollment isolation, and bounded real-time architecture spec (SDD).
- [`openspec/specs/academic/spec.md`](openspec/specs/academic/spec.md): contrato vivo del modelo académico y de CEO-25.
- [`docs/specs/p11-ui-ux-deliberate-remediation.md`](docs/specs/p11-ui-ux-deliberate-remediation.md): UI/UX Deliberate Quality Remediation, Manrope/Merriweather Typography SSOT & Layout Performance spec (SDD).
- [`docs/specs/p16-classroom-retrocompatibility-mobile-parity.md`](docs/specs/p16-classroom-retrocompatibility-mobile-parity.md): CEO-61, contrato verificado de retrocompatibilidad de avisos históricos, tablas Markdown seguras y overflow técnico local en Web/Capacitor.
- [`docs/specs/p17-wcag-22-aa-conformance.md`](docs/specs/p17-wcag-22-aa-conformance.md): CEO-42, auditoría verificada del portal, biblioteca y documentos públicos; contrato de teclado, lector de pantalla, contraste, reflujo, movimiento reducido, formularios y declaración WCAG 2.2 AA.
- [`docs/specs/p17-immutable-grade-audit-trail.md`](docs/specs/p17-immutable-grade-audit-trail.md): CEO-7, historial transaccional e inmutable de notas y configuración del libro.
- [`docs/specs/p18-firebase-app-check-rollout.md`](docs/specs/p18-firebase-app-check-rollout.md): CEO-47, atestación web y Android, observación previa y despliegue gradual de enforcement para Firebase.
- [`docs/specs/p17-bulk-enrollment-import.md`](docs/specs/p17-bulk-enrollment-import.md): CEO-16, importación CSV de matrículas por sección con previsualización, pendientes reclamables en el primer ingreso e idempotencia estricta.
- [`docs/specs/p17-moodle-course-import.md`](docs/specs/p17-moodle-course-import.md): CEO-39, importación segura e idempotente de respaldos Moodle TGZ/ZIP y nóminas CSV, con materiales compatibles, matrículas pendientes y auditoría.
- [`openspec/specs/classroom/rich-posts/spec.md`](openspec/specs/classroom/rich-posts/spec.md): CEO-55, especificación viva de publicaciones técnicas seguras con Markdown, código, KaTeX y vista previa compartida en web/Android.
- [`openspec/specs/operations/capacity-cost/spec.md`](openspec/specs/operations/capacity-cost/spec.md): CEO-9, contrato operativo de capacidad, costo unitario y continuidad.
- [`openspec/specs/editor/multimodal-authoring/spec.md`](openspec/specs/editor/multimodal-authoring/spec.md): CEO-59, contrato vivo del editor académico sincronizado en modos Visual, Markdown + LaTeX y HTML libre.
- [`docs/specs/p15-publication-wizard.md`](docs/specs/p15-publication-wizard.md): CEO-60, contrato verificado para el wizard docente de tres pasos, split-button, preferencia local y alertas silenciosas.
- **Discord AI Bridges & Automation Suite**: Inyección de contexto histórico del canal en bridges locales, persistencia de sesiones en disco (`.cache/`), ejecución de comandos `/doctor`, `/review-pr` y webhook de CI/CD en `app/api/webhooks/github/route.ts`. **Asistente Cloud 24/7 en Vercel Serverless** implementado en `app/api/discord/interactions/route.ts`.

## Active work

- [ACTIVE] **P7 — Espacio docente CEOUBB: código completo en revisión.** Rama `codex/teacher-assignment-preview`, owner Codex/Joaquín. Implementa inicio docente, actividades, autoría progresiva, cola paginada, mesa de corrección, libro de calificaciones y `Vista estudiante` read-only con fixtures en memoria. La ruta `/preview/docente` queda aislada del backend, marcada `noindex` y responde 404 en producción. Local: unit 67/67, lint, typecheck, Functions, build y recorrido visual escritorio/móvil aprobados; GitHub CI, React Doctor y Vercel Preview verdes. Pendiente revisión funcional de Pipe antes de salir de Draft. `docs/specs/p7-teacher-workspace-preview.md`, `app/preview/docente/`, `tests/teacher-workspace-preview.test.ts`, `tests/rendered-html.test.mjs`.
  - **Rediseño sobre el shell del portal (2026-08-15).** La preview había levantado su propio cromo —barra institucional navy con filete heráldico, riel lateral propio, botones, campos, tablas y diálogos duplicados en un módulo CSS de 1 015 líneas con una escala tipográfica de 10–13 px— y se leía como un producto distinto del portal. Ahora monta el shell real: `.app-shell`, `.app-header` de papel (62 px, escudo UBB, rastro de contexto), `.app-sidebar` de 268 px con `.side-item` y su riel azul, cortina `.sidebar-scrim` bajo 900 px, `.portal-main`, `.page-head`, `.primary-button`/`.secondary-button`, `.next-strip` para el próximo vencimiento, `.post-list` para las actividades, `.grades-summary`/`.grades-table` para el libro, `.teacher-tools` para la mesa de corrección, `.planner-dialog` para los dos diálogos y `.empty-state`/`.sr-only` para estados y anuncios. La marca de vista previa pasó de banner propio a píldora dorada dentro del rastro de contexto —los tests de HTML siguen encontrando «Vista previa» y «datos de ejemplo»— y los tres contadores dejaron de ser tres tarjetas iguales para ser una sola tira con tres lecturas. El módulo CSS bajó de 1 015 a 721 líneas y sólo conserva lo que el portal no tiene (flujo de la actividad, cola de entregas, rúbrica, hoja de entrega simulada, píldoras de estado). El riel arranca cerrado en móvil vía `useSyncExternalStore` sobre `matchMedia`, no con un efecto que fije estado. Corregido de paso el rótulo duplicado «Sección Sección 1». Verificación: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit` (104/104) y `pnpm test` (129/129) en verde; recorrido en 1440×1000 y 375×812 sin scroll horizontal, con tabla de entregas contenida en su propio `overflow-x`, mesa de corrección apilada bajo 1100 px y ambos diálogos con cuerpo desplazable. El detector de Impeccable sólo reporta avisos sobre tamaños y colores que el propio `app/globals.css` ya usa (13 px, `#047857`, `#0369a1`).
- [ACTIVE] **P5: Capacitor migration: PR #13 actualizado; compilación local y entorno Android SDK completados.** Rama `claude/capacitor-migration`. Toolchain configurado con OpenJDK 21 LTS y Android SDK 36 (`build-tools 36.0.0`, `platform-tools`). Se añadió soporte dinámico para `CAPACITOR_SERVER_URL` en `capacitor.config.ts` y se registraron las huellas SHA-1/SHA-256 de depuración en Firebase Console y `google-services.json`. `assembleDebug` compiló exitosamente (196 tareas limpias) y generó `CEOUBB-debug.apk` (~6.0 MB). Pendiente: verificación manual en dispositivo físico sobre el despliegue (§7.2 checklist). `android/`, `capacitor.config.ts`
- [NEXT] **Declared debt from P5 §0.3: no kill switch.** With `server.url` remote the installed app always renders deployed `main`: a broken deploy breaks the app with no store rollback. Acceptable in a pilot; at university scale this needs a minimum-version / kill-switch endpoint the shell checks on launch. `app/api/`, `capacitor.config.ts`
- [NEXT] **P5 conditional debt: DOM virtualization stays out until measured.** REQ-CAP-08 sets the budget (under 1 500 active nodes, p95 interaction under 200 ms, long tasks under 50 ms during scroll) and `content-visibility: auto` is the current answer. `@tanstack/react-virtual` may only be introduced against a measurement on a low-end device that exceeds those thresholds. `app/globals.css`, `app/Classroom.tsx`
- [NEXT] **P5: iOS is a scaffold, not a target.** `ios/` is versioned and consistent but never built: no macOS/Xcode, no `GoogleService-Info.plist`, no Apple Developer enrolment or APNs key. Apple guideline 4.2 (minimum functionality) is the reason push, haptics, downloads and offline library had to land first. `ios/`
- [NEXT] Run the classroom, gradebook and calendar manual matrix with owner, teacher and student accounts. Rules deployed 2026-08-14; only the verification remains. Firebase
- [NEXT] Academic data model: course identity becomes _asignatura × periodo × sección_; Turso system of record, Firestore one-way enrollment projection. Spec: [`p1-academic-model.md`](docs/specs/p1-academic-model.md). `db/`, `drizzle/`, `lib/courses.ts`, `app/Portal.tsx`, `firebase/firestore.rules`
- [NEXT] Gate course reads on an enrollment check in the rules. Today any signed-in UBB account reads every course. Release-blocking before the platform opens beyond the pilot cohort. `firebase/firestore.rules`
- [NEXT] Replace the two database-wide collection-group sweeps (`watchCourseActivity`, `watchGradebooks`) with enrollment-filtered queries. The badge sweep fails silently past a few dozen courses. `lib/firebase-classroom-client.ts`
- [NEXT] Pagination for posts, files, roster and grade matrix; chunk `saveStudentScores` under the 500-op Firestore batch limit; add the composite indexes enrollment-filtered queries need. `lib/firebase-classroom-client.ts`, `app/Classroom.tsx`, `firebase/firestore.indexes.json`
- [NEXT] Update `/privacidad` to cover official academic grades before any teacher enters real data. `app/privacidad/page.tsx`
- [NEXT] Institutional SSO (SAML 2.0 / OIDC / CAS) against the UBB directory, replacing consumer Google sign-in; role from directory membership, not the email suffix (P0B.1). `lib/access-policy.ts`, `lib/auth.ts`, `app/api/`, Firebase Auth
- [NEXT] Remove the two hardcoded personal Gmail owner exceptions, replaced by directory-backed admin accounts (P0B.1). Three surfaces now, not five: the native domain mirror died with `ClassroomService.java`. `lib/access-policy.ts`, `firebase/*.rules`, `android/app/src/main/res/values/firebase.xml`
- [NEXT] Desplegar y cerrar operación P0.9 después de fusionar CEO-7: Functions primero, portal, índice y reglas al final; ejecutar matriz owner/docente/estudiante y añadir la vista de consulta del historial. `firebase/functions/`, `firebase/firestore.*`, `app/views/classroom/`
- [NEXT] Backups and a **drilled** restore: scheduled Firestore export, Turso backup, stated RPO/RTO (P0.8). Sharpest risk in the repository. Firebase, Turso, `firebase/functions/`
- [NEXT] Firebase Emulator Suite rule tests for Firestore and Storage as merge gate (P0.10). `tests/`, `firebase/`
- [NEXT] Demostrar P0.7 en staging: 3.000 sesiones concurrentes por 30 minutos, apertura inicial ≤ 200 lecturas Firestore, p95 ≤ 2 s, 5xx < 0,1%, costo anualizado ≤ CLP 1.000 por estudiante y simulacro RPO 1 h / RTO 4 h. Los objetivos y el modelo ya están definidos por CEO-9; todavía no son garantías. `docs/operations/capacity-cost-baseline.md`, staging, billing export
- [NEXT] Run the production authentication, Storage and notification test matrix (P0.1-P0.3). Web, Android, Firebase
- [NEXT] Desplegar la etapa de observación de CEO-47, validar la matriz Web/Android físico durante 24 horas con ≥99 % de tokens válidos y aplicar App Check por producto sólo si supera el gate. Firebase, Vercel, Android
- [BLOCKED] Project owner: **written authorization for an institutional pilot** with one departamento or carrera: named academic sponsor, one semester, real students, signed data-processing annex. No agent can do this; every adoption item depends on it. UBB (DTI, VRA, jurídica)
- [BLOCKED] Project owner: Google Play verification and official listing URL. Play Console
- [BLOCKED] Project owner: choose and fund the native iOS strategy and Apple Developer enrollment. App Store Connect
- [BACKLOG] Assignment submissions against an evaluation + teacher feedback text per grade. `lib/firebase-classroom-client.ts`, `app/Classroom.tsx`, `firebase/*.rules`
- [BACKLOG] "Mi Bodega" personal file locker. Deferred by decision; needs a per-student quota and a Storage cost estimate first. Firebase Storage, `firebase/storage.rules`
- [BACKLOG] Teacher-facing assignment and revocation of the per-section `assistant` role delivered by CEO-25; the participant directory, search, filters and individual contact ship in CEO-24. `app/api/`, academic administration surface
- [BACKLOG] Calendar month view, recurring weekly class schedules, and drag-to-create/move in the planner grid. The weekly view shipped with P2. `app/views/calendar/`, `lib/courses.ts`
- [BACKLOG] Load real learning outcomes and evaluation schedules for the five non-Estática ramos. `lib/courses.ts`
- [BACKLOG] Interoperability: LTI 1.3, SCORM/xAPI, IMS Common Cartridge, QTI, Moodle `.mbz` importer (P0B.3). Required for adoption; nothing exists. New surface
- [BACKLOG] Project owner: tenancy, licensing and continuity dossier: transfer procedure for Firebase/Vercel/Turso, declared license or escrow, maintenance commitment, external penetration test (P0B.6). Governance

## Production inventory: what is NOT done

Everything not listed here is done and verified; the full inventory lives in `docs/archive/PLAN_ARCHIVE.md`. Deployed and working today: `ceoubb.com` on Vercel with Turso, Firebase Auth with the institutional domain policy, Firestore + Storage rules published, `notifyStudentsOnCoursePost` and `deleteMyAccount` on Node.js 22 in `southamerica-west1`, FCM HTTP v1, PWA, `/biblioteca/`, `/privacidad`, Android source at `versionCode 13` / `versionName 1.0.6`.

- Web: store badges have no listing URLs (placeholders, non-clickable); no public account-deletion entry page; the local portal/library redesign is uncommitted and undeployed.
- Android: release AAB install, Google sign-in, upload/download, role behaviour, account deletion and FCM delivery **not verified** on a clean physical device. Bundled library still on the old dark maroon theme.
- iOS: nothing exists: no Xcode project, bundle ID, APNs config or iOS Firebase app. Badge is a placeholder and must not be linked.
- Firebase/GCP: App Check Web/Android está registrado y Firestore, Storage y Authentication permanecen en observación `UNENFORCED`; faltan despliegue de clientes, tráfico representativo por 24 horas, Android físico y enforcement gradual. No hay web push VAPID key ni pruebas de reglas con Emulator Suite. Cloud Billing alerts are configured, but the account remains in Free Trial and must be activated as paid before expiry to avoid service interruption.
- GitHub: branch protection and required review not documented as enabled.

## Architectural risks and technical debt

Detail and remediation live in the spec files; this is the index.

- **Static catalogue, no enrollment model**: the blocking debt. `courseId` carries no section and no period, so paralelos and successive years collide in one collection; roles are global and email-derived; no bulk enrollment path. Cost rises with every day of real pilot data. -> [`p1-academic-model.md`](docs/specs/p1-academic-model.md)
- **Grade audit trail not deployed or surfaced**: PR #70 captura cada cambio de forma transaccional e inmutable, pero producción aún sobrescribe `grades/{uid}` hasta desplegar Functions/portal/índice/reglas; la vista de consulta sigue pendiente. -> P0.9
- **No backups, no proven restore**: no Firestore export, no Turso backup, no restore ever performed. -> P0.8
- **Consumer identity and personal-account superusers**: two hardcoded Gmail owners across web, both rules files and the Android service. -> P0B.1
- **Rules lack emulator coverage**: staging now deploys and seeds before production, but Firestore and Storage rules still have no Emulator Suite tests. -> P0.10
- **Capacity targets are defined but not demonstrated**: CEO-9 fija 12.000 estudiantes, 3.000 secciones, 3.000 concurrentes, CLP 450 base / CLP 1.000 techo y RPO 1 h / RTO 4 h. Falta la prueba de carga, el costo pagado medido y el simulacro de restauración en staging. -> P0.7, P0.8
- **Governance and continuity**: personal Firebase/Vercel/Turso accounts, convenio de tratamiento sólo en borrador, sin revisión jurídica ni firma, no accessibility statement, no external pentest, bus factor of two. La licencia MIT existe, pero faltan transferencia de tenencias y salida ensayada. -> P0B.4, P0B.6
- **Account deletion compliance gap**: backend Function and Android invocation exist; the public `/eliminar-cuenta` route was removed from the web UI. -> P0.6
- **Web/Android library divergence**: `assets/data.js` matches; HTML, JS, styles and the native bridge differ. Academic corrections may reach only one platform. Needs a content-sync script that copies portable content and verifies hashes without overwriting native-only behaviour.
- **Test coverage gap**: no Firebase rule emulator tests, no Android unit/instrumentation tests, no end-to-end multi-role tests.
- **Store distribution gap**: Play approval, testing tracks, listing assets, policy declarations and final AAB verification remain; no iOS app.
- **D1 leftovers**: `posts`, `files`, `progress` tables still physically exist in the imported Turso copy, unreferenced. Drop only after confirming the rows are not needed.

## Remaining work: two parallel tracks

- **P0 pilot safety**: protects today's students; deployment- and correctness-blocking. -> [`p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md)
- **P0B institutional adoption**: what DTI, Vicerrectoría Académica and jurídica require before CEOUBB can be proposed as official. Cannot be produced in the week before a presentation. -> [`p0b-adoption.md`](docs/specs/p0b-adoption.md)

### Track A: pilot safety, in order

1. Deploy the wildcard course rules, run P0.1-P0.3 on real accounts and devices, fix functional failures.
2. Add rules emulator tests (P0.10); staging (P0.11) now deploys and seeds before production.
3. Backups and a drilled restore (P0.8) prior to teachers entering real grades.
4. P0.5 before inviting a larger beta group; P0.4 billing alerts are configured.
5. P0.6 and the `/privacidad` grade update, before store submission or real grades, whichever comes first.
6. Deploy the verified grade audit trail from CEO-7, run the multi-role matrix and surface its read-only history (P0.9).
7. Ejecutar la prueba P0.7 contra los objetivos ya definidos por CEO-9 y cerrar el simulacro P0.8; la identidad de sección y las reglas por matrícula ya forman la base del conjunto de datos.
8. Finish the Google Play testing/submission path.
9. Decide and begin the iOS architecture in a separate workstream.

### Track B: adoption, in order

1. Owner obtains the written pilot authorization (`BLOCKED`). Items 2-4 can start immediately without it.
2. Legal and data protection (P0B.4); ownership, tenancy, continuity (P0B.6).
3. Institutional identity design (P0B.1): it constrains the data model, so specify it before P1 work item 2 is written.
4. Accessibility audit (P0B.5).
5. Interoperability and the Moodle importer (P0B.3): largest single item, and the first thing an evaluation asks about.
6. Records integration and the actas decision (P0B.2).
7. Pilot evidence, then the proposal (P0B.7).

## P1: Google Play release

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

## P1: iOS implementation and App Store release

1. Decide architecture (native SwiftUI, shared cross-platform shell, or other maintainable approach); document before scaffolding.
2. Enroll in the Apple Developer Program, configure App Store Connect.
3. Reserve a stable bundle ID aligned with the product identity.
4. Register the iOS Firebase app; configure Google sign-in, Firestore, Storage, Functions, FCM/APNs, App Check.
5. Implement institutional role behaviour, offline library, classroom, uploads, notifications, privacy, account deletion.
6. Test on physical iPhone and iPad.
7. Prepare App Privacy answers, screenshots, metadata, support/privacy URLs, TestFlight.
8. Submit for App Review.
9. Link the App Store badge only after the listing is public.

## P2: Quality, automation, operations

- Android debug build in CI (the GitHub Actions and rules-emulator items were promoted to P0.10).
- Android unit/instrumentation tests and a release smoke-test checklist.
- Error/crash monitoring and a privacy-conscious logging policy.
- Content synchronization tool for web/Android academic material.
- Accessibility review: keyboard, screen reader, contrast, text scaling, reduced motion.
- Performance, caching, PWA update behaviour, offline failure modes.
- Academic content review: correctness, references, copyright, units, notation, encoding.
- Replace the direct Drive APK link inside the authenticated portal once Play is public.
- Decide whether browser push is required; configure a VAPID key only if it is.

## Settled decisions: do not relitigate

1. **Catalogue storage**: Turso is the system of record; Firestore holds a single-writer enrollment projection so rules can call `exists()`.
2. **Course identity is a section**: asignatura × periodo × sección, and must change before a second cohort exists.
3. **The domain-to-role invariant is authentication only.** Authorization moves to per-enrollment roles. `AGENTS.md` still states it as absolute; amending it is deliberate work in one commit with tests, not drift.
4. **Do not propose adoption first.** Get a written authorization for a pilot with one departamento or carrera, keep the non-official disclaimer in the UI until it exists, let the pilot produce the evidence.

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

In parallel, the owner starts P0B.7 item 1 (pilot authorization), provisions staging and schedules the P0.7 load test plus the P0.8 restoration drill against the published targets.

