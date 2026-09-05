# Centro de Estudio UBB: Project Plan & Agent Handoff

## Handoff: pulido del campus, 2026-09-04

- **Ajuste solicitado:** restaurado únicamente el icono gris de calendario junto a «En tu agenda»; se mantiene un solo acceso contextual.

- **Correcciones:** navegación lateral blanca con selección azul tenue; retiradas las franjas decorativas de cuestionarios; entrada al aula alineada y subrayada al pasar el cursor, sin movimiento de tarjeta; columnas del calendario con la misma reserva de scrollbar.
- **Simplificación:** eliminada la promoción de biblioteca del dashboard y el botón superior de calendario. La agenda conserva un único acceso contextual, sin iconos repetidos. Login, Merriweather y `public/biblioteca/` preservados.
- **Regresión reproducible:** `e2e/campus-polish.spec.ts` comprueba dashboard, hover, calendario y cuestionarios a 1918, 1440, 900 y 390 px contra la base local de demostración.
- **Verificación del pulido:** cuatro recorridos de navegador aprobados; `verify:fast` completado con typecheck, 559 pruebas, 64 sellos y 29 especificaciones; lint sin errores. La revisión visual independiente pidió retirar el texto redundante «Controles en línea», ya eliminado y recapturado.

## Handoff: rediseño del campus, 2026-09-04

- **Alcance entregado:** portal autenticado y soporte, con navegación azul profundo, Merriweather conservada, cursos compactos, agenda contextual, estados vacíos honestos, accesos docentes móviles, categorías de recursos y entrada directa al formulario de contacto. Auditoría: `docs/design/campus-review.md`. Sistema construido: `DESIGN.md`.
- **Límites:** login y `public/biblioteca/` preservados; sin dependencias nuevas, cambios de seguridad, cambios de datos de producción ni despliegue. CSS de rediseño aislado en `app/campus.css`, importado después de las capas existentes.
- **Corrección funcional:** `nextEntry` no devuelve evaluaciones pasadas. Nueva prueba `tests/dashboard-agenda.test.ts`; se añadió exclusivamente su sello SHA-256, sin cambiar pruebas ni sellos anteriores.
- **Verificación:** `verify:fast` pasó con 559 pruebas y 29 especificaciones; `verify:invariants` pasó con 35 pruebas. Compilación de producción completada. La suite completa pasó con 577 pruebas en ejecución secuencial. La ejecución paralela tuvo un fallo de salida del proceso de interop, aunque sus subpruebas pasaron; su ejecución aislada pasó con 10 pruebas. No se modificaron aserciones para resolverlo. React Doctor: 90/100, tres advertencias en los módulos de interoperabilidad no modificados.
- **UX local:** recorridos en 1440 × 1000 y 390 × 844, búsqueda administrativa y acceso a gestión docente móvil. Se comprobaron controles cargados, teclado en mensajes, saltos de soporte y desbordamiento del documento. Capturas de desarrollo en `.impeccable/review/`. Revisión independiente de Impeccable: `ship` para las correcciones puntuadas de gestión docente y aula.
- **Accesibilidad:** axe sin infracciones detectadas en siete pantallas y dos tamaños, con reglas WCAG A/AA hasta 2.2. Se añadió foco y nombre accesible a la región desplazable del calendario, con comprobación de teclado. El resultado corresponde a los estados probados, no a una certificación completa.
- **Desarrollo:** servidor en `http://localhost:3000`, con `TURSO_DATABASE_URL=file:local.db` y `CEOUBB_ENVIRONMENT=preview`; ejecutar `pnpm dev --port 3000` con esas variables si se reinicia. Las cuentas de demostración pertenecen a la base local. Para pruebas de producción, quitar `CEOUBB_ENVIRONMENT=preview` del proceso de pruebas.
- **Limitaciones:** las funciones de Firebase requieren sus servicios y credenciales; no se fabricaron conversaciones o resultados de producción. La automatización de Brave fue detenida por Computadora al no poder determinar con suficiente certeza la URL de la ventana. No se afirma una entrega visual verificada dentro de Brave.

Last verified 2026-09-01 · baseline `2131d97` · repo `https://github.com/CEOUBB/CEOUBB.git` · production `https://ceoubb.com`

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
- [`docs/operations/evidence/ceo-71-2026-08-31.md`](docs/operations/evidence/ceo-71-2026-08-31.md): Approved staging evidence for 3,000 authenticated sessions over a 31-minute synchronized plateau, provider telemetry, latency gates, and CLP 425 projected infrastructure cost per student-year.
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
- [`docs/specs/p19-quiz-engine-gift-import.md`](docs/specs/p19-quiz-engine-gift-import.md): Verified contract for bounded GIFT/CSV import, timed quiz attempts, per-question auto-save, immediate correction, and auditable gradebook integration.
- [`docs/specs/p20-firebase-rules-emulator-suite.md`](docs/specs/p20-firebase-rules-emulator-suite.md): Verified Firestore and Storage Emulator Suite authorization matrix and mandatory merge gate.
- [`docs/specs/p17-bulk-enrollment-import.md`](docs/specs/p17-bulk-enrollment-import.md): CSV enrollment import per section with preview, claimable pending enrollments on first login, and strict idempotency.
- [`docs/specs/p17-moodle-course-import.md`](docs/specs/p17-moodle-course-import.md): Secure and idempotent import of Moodle TGZ/ZIP backups and CSV rosters, with compatible materials, pending enrollments, and audit trails.
- [`openspec/specs/classroom/rich-posts/spec.md`](openspec/specs/classroom/rich-posts/spec.md): Living specification of secure technical posts with Markdown, code highlighting, KaTeX math, and shared Web/Android previews.
- [`openspec/specs/operations/capacity-cost/spec.md`](openspec/specs/operations/capacity-cost/spec.md): Operational contract for capacity, unit cost, and business continuity.
- [`openspec/specs/editor/multimodal-authoring/spec.md`](openspec/specs/editor/multimodal-authoring/spec.md): Living contract for synchronized academic editor across Visual, Markdown + LaTeX, and Raw HTML modes.
- [`docs/specs/p15-publication-wizard.md`](docs/specs/p15-publication-wizard.md): Historical contract for the teacher 3-step publishing wizard, split-button, local preference, and silent alerts. Superseded by the publication studio; the alert policy and the local editor preference survive unchanged.
- [`openspec/specs/classroom/publication-studio/spec.md`](openspec/specs/classroom/publication-studio/spec.md): Living contract for the full-page publication studio, content presets, per-publication attachments, per-section local drafts, and cover consolidation.
- **Discord AI Bridges & Automation Suite**: Historical channel context injection in local bridges, disk session persistence (`.cache/`), `/doctor` and `/review-pr` command execution, and CI/CD webhook in `app/api/webhooks/github/route.ts`. **24/7 Cloud Assistant on Edge Serverless** implemented in `app/api/discord/interactions/route.ts`.

## Active work

- [REVIEW] **P22: corrección CodeQL en PR #151 (2026-09-05).** Codex/Juako, rama `codex/importador-adecca`, base `origin/main` verificada en `f9fc4e4`. Corregidos ambos recortes de puntuación de URLs en `lib/adecca/privacy.ts` mediante un recorrido inverso lineal compartido, sin omitir alertas ni modificar reglas de seguridad. Regresión RED/GREEN: 200.000 paréntesis superaban cinco segundos; ahora la misma prueba termina en unos 140 ms. Verificación local: lint, formato, compilación/TypeScript y `pnpm test` 596/596, incluidas 19/19 ADECCA; especificación actualizada y pruebas selladas. Invariantes y arnés rápido ejecutados por hooks de publicación. El commit anterior ya aprobó CI, emuladores, Android, Semgrep, tamaño y compilación/despliegue de preview Cloudflare; pendiente nueva comprobación remota CodeQL del commit correctivo. Sin fusión ni despliegue productivo.

- [DONE] **CEO-83: Rediseño integral de los esqueletos de carga (2026-09-04).** Felipe Arce / Claude Code, rama `claude/skeleton-design-improvements-d8d29d`. Los esqueletos ahora replican el contenido real de cada pantalla en vez de aproximarlo:
  - **Barrido más calmo:** `.sk::after` baja la cresta de `rgba(255,255,255,0.92)` a `0.5` y ensancha el degradado (1.9 s); nuevo hueso `.sk-quiet` para lo que en la pantalla real es texto secundario, de modo que la silueta conserva jerarquía.
  - **Copia fija escrita de verdad:** los títulos, bajadas, pestañas y rótulos que no dependen de datos (`Calendario`, `Avisos y mensajes`, `Configuración`, `Administración de cuentas`, `Recursos de estudio`, `Administrar ramos`) se renderizan como texto y ya no parpadean al resolver el módulo.
  - **Calendario:** la grilla usa la semana real desde `getSantiagoDateISO()`, marca hoy y el fin de semana, coloca las 13 horas con su `top` porcentual (antes se apilaban todas en `08:00`) y añade la tira de días del ancho móvil.
  - **Esqueletos nuevos:** `CommunicationsSkeleton` y `TeacherCoursesSkeleton` reemplazan los préstamos de `ResourcesSkeleton` y `AdminSkeleton` en `app/portal-shell.tsx`; `AdminSkeleton` suma períodos académicos y paginación.
  - **Interiores del aula:** `QuizListSkeleton`, `InteropListSkeleton`, `ConversationSkeleton`, `GradeHistorySkeleton`, `DocumentPaneSkeleton` y `TeacherCoursesBodySkeleton` sustituyen los textos «Cargando…» de cuestionarios, recursos externos, conversaciones, historial de notas, visor de entregas y espacio docente.
  - **Arranque:** `LoadingScreen` dibuja la ruta activa, la campana y la identidad en la barra, la navegación como icono más rótulo, los ramos con nombre y código, la tira de próxima evaluación como tarjeta y las fichas con código, docente, regla, metadatos y acción. `app/mobile-shell.css` oculta ruta, campana y nombre en teléfono y apila la tira.
  - Verificación: `format:check`, `typecheck`, `lint`, `verify:fast` (29/29) y `verify:invariants` en verde; detector de Impeccable sin hallazgos en el código nuevo.

- [DONE] **CEO-82: Protocolo de Confiabilidad, Concurrencia y Persistencia Multitienda — Planes 070 al 080 (2026-09-04).** Felipe Arce / Antigravity, rama `full_reliability_audit_protocol`. Se implementaron de forma secuencial y bajo la filosofía `/ponytail full` los 11 planes de confiabilidad auditados en `plans/`:
  - **Onda 1 (Crashes, Outages e Integridad Numérica):**
    - Plan 070: Normalización determinista de timestamps en `lib/firebase/mappers.ts:iso()` protegiendo strings ISO históricos, marcas numéricas y Dates sin sobrescritura con reloj local.
    - Plan 071: Parseo defensivo `parseDateSafely()` en `lib/portal-utils.ts` eliminando `RangeError: Invalid time value` en `formatDay()`, previendo `NaN` en `countdown()` y soportando `formatBytes(0)` con `'0 KB'`.
    - Plan 072: Reconciliación de esquema Turso en producción `ceoubb` mediante DDL idempotente creando 4 tablas faltantes (`section_profiles`, `assistant_assignments`, `matriculas_pendientes`, `moodle_imports`) e índices B-Tree en `sessions` (`idx_sessions_expires_at`, `idx_sessions_user_id`). Verificado 100% íntegro vía `scripts/verify-turso-production-schema.mjs`.
    - Plan 073: Blindaje de `normalizeItems` en `lib/grades.ts` con `Number.isFinite(rawWeight) && rawWeight > 0`, previniendo fugas de `NaN` en promedios y notas requeridas; sincronización a Cloud Functions (`firebase/functions/generated/grades.js`).
  - **Onda 2 (Concurrencia, Cierres, SSOT y Resiliencia en React):**
    - Plan 074: Telemetría estructurada en `applyEnrollmentImport()`, exportación de `reconcileSectionProjections()` y nuevo endpoint seguro `app/api/sections/[sectionId]/projections/reconcile/route.ts` para mitigar proyecciones huérfanas en Firestore.
    - Plan 075: Componente accesible `ClassroomErrorBoundary` envolviendo paneles dinámicos en `app/views/classroom/ClassroomView.tsx`, reteniendo sesión y estado global ante fallos en vistas hijas.
    - Plan 077: Guardas atómicas de reentrancia `if (saving) return;` en `GradebookSettingsEditor.tsx` e indicador con bloqueo UI `disabled={exportingQti}` en `TeacherQuizzes.tsx`.
    - Plan 078: Limpieza síncrona en `useEffect` (`setPage(null); setError("");`) y encadenamiento seguro `(page?.items?.length ?? 0) === 0` en `GradeHistoryDialog.tsx`, eliminando retención de datos de estudiantes previos.
    - Plan 079: Eliminación de mutación cliente redundante a Firestore en `AdminView.tsx`, preservando SSOT transaccional en `/api/admin/users`.
    - Plan 080: Validación determinista con `preferencesSchema.safeParse` en `lib/user-preferences.ts:readCache()` con fallback seguro a `defaultPreferences()`.
  - **Onda 3 (Puente Nativo Móvil y Respaldo Offline):**
    - Plan 076: Intercepción de errores de red del frame principal (`isForMainFrame()`) en `MainActivity.java` y configuración de `errorPath: "index.html"` en `capacitor.config.ts`, cargando el documento de respaldo local en lugar de la pantalla genérica Chromium.
  - **Verificación Completa:**
    - Arnés rápido `pnpm run verify:fast`: 553/553 tests unitarios pasando, 62/62 archivos de pruebas sellados con hash SHA-256 intactos, 29/29 especificaciones OpenSpec validadas.
    - Invariantes `pnpm run verify:invariants`: 35/35 pruebas de invariantes de seguridad y modelo académico pasando.
    - Formato `pnpm run format:check`: 100% de archivos con estilo Prettier limpio.

- [DONE] **CEO-79: remediación integral de calidad React Doctor y modularización frontend (2026-09-04).** Felipe Arce / Antigravity, rama `sync_run_react_doctor`. Se completaron al 100% las 17 tareas de `openspec/changes/remediacion-react-doctor`:
  - Seguridad y rutas: eliminación de `Object.create(null)` y supresión de efectos colaterales en GET (`app/api/interop/lti/authorize/route.ts`).
  - Robustez runtime: protección de parseos URL con `URL.canParse()` y bloques try/catch en `lib/interop/config.ts` y `proxy.ts`, eliminación de aserción `!` en `lib/interop/xml.ts`, interrupción explícita con `throw fail(...)` en `lib/services/interop-qti.ts`, y paralelización de consultas en `lib/services/interop.ts`.
  - Concurrencia de I/O: paralelización de lectura ZIP y subidas/limpiezas Storage con `Promise.all` (`lib/interop/packages.ts`, `lib/interop/qti.ts`, `lib/services/interop-storage.ts`), y sustitución de encadenamientos `.filter().map()` por `.flatMap()`.
  - Esquemas Zod 4: migración de 16 esquemas de `z.object({...}).strict()` a `z.strictObject({...})`.
  - Descomposición y modularización UI: extracción de `useTurnstile.ts` y campos atómicos en `app/contacto/ContactForm.tsx`; modularización de `InteropSection.tsx` en `InteropAuthoringPanel.tsx` y `InteropToolRegistration.tsx` con `useReducer`; extracción de `PublishPanels.tsx` en `PublishView.tsx`; división modular de `QuizzesSection.tsx` en `TeacherQuizzes.tsx`, `StudentQuizzes.tsx`, `QuizQuestionField.tsx`, `QuizViews.tsx` y `quiz-shared.ts`; creación de `PolicyHead.tsx` para cabeceras públicas compartidas; y componente `PaginationActions.tsx` unificando la navegación de listas en `GradesSection.tsx`, `ProgressSection.tsx` y `FinalGradeRecordsPanel.tsx`.
  - Verificación: `react-doctor` sube de 49/100 a 92/100 (Great) con 0 errores de seguridad y 0 errores funcionales; arnés rápido `verify:fast` en verde (553/553 tests unitarios, 62/62 archivos sellados por hash SHA-256 intactos, 27/27 especificaciones OpenSpec validadas); `verify:invariants` en verde (35/35 pruebas de invariantes); `lint` y `typecheck` con 0 errores; y `format:check` en verde.
- [REVIEW] **P22: importación local de cursos y materiales ADECCA UBB (2026-09-05).** Codex/Juako, rama `codex/importador-adecca`, sincronizada con `origin/main` en `f9fc4e4`. Implementación terminada y verificada localmente; [PR #151](https://github.com/CEOUBB/CEOUBB/pull/151) abierta para revisión, con CI iniciado. ZIP organizado, manifiesto JSON y nómina CSV; previsualización con nombres y omisiones, archivos de hasta 50 MiB con SHA-256 y allowlist de Storage, publicaciones deterministas sin notificaciones, participantes opt-in, ejecución ligada a actor/token/plan y contadores calculados por servidor. Migración 0013 agrega tres tablas propias; purga diaria de pendientes en Cloudflare y endpoint Vercel, con `CRON_SECRET`. Verificado: 17/17 pruebas ADECCA, `pnpm test` con build y 594/594, `verify:fast` con 576/576, TypeScript, lint, formato, 35/35 invariantes, Functions y 30/30 OpenSpec; navegador escritorio/móvil 390×844, ZIP sintético y retorno de foco con Escape. OpenNext local bloqueado por symlinks de Windows y binarios nativos `sharp`; verificar build Linux/tamaño en CI. Aplicar migración antes de habilitar; pendiente prueba Storage/Firestore en staging y WebView. Cancelación/reimportación entre cuentas puede dejar blobs huérfanos y los reintentos conservan un único trabajo por sección/huella; detalle en `docs/operations/adecca-course-import.md`. Sin fusión ni despliegue productivo; continuación automática eliminada a petición del mantenedor.

- [ACTIVE] **CEO-78: bandeja de corrección docente con visor PDF integrado (2026-09-03).** Claude Code/Juako, rama `claude/bandeja-correccion-docente-pdfslick-6ea612`, [PR #135](https://github.com/CEOUBB/CEOUBB/pull/135), base `1ad46df`. El aula suma una mesa de corrección a pantalla completa para quien enseña la sección: cola de entregas por evaluación cruzada con la nómina, visor `@pdfslick/react` cargado con `next/dynamic` (`ssr: false`), nota validada en la escala 1,0 a 7,0 hacia `saveStudentScores`, retroalimentación privada con retardo de 700 ms hacia `saveGradeFeedback`, atajos J y K suprimidos dentro de campos editables, y consulta de la pauta publicada sin reiniciar la corrección en curso. Nueva escucha `watchSectionSubmissions` en `lib/firebase/storage.ts` con `limit()` explícito de 500; no se tocan reglas de Firestore ni de Storage, que ya autorizan al docente por `teachesSection`. Verificado: `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, `pnpm run format:check` y `pnpm run build` en verde, 18 casos nuevos en `tests/submission-review.test.ts` con sellado SHA-256 regenerado, y React Doctor sin errores tras corregir la referencia mutada en render y la promesa suelta del panel de pauta. Verificado en navegador con base local sembrada y sesión docente de desarrollo: la revisión en pantalla destapó que el visor abortaba cada entrega por desajuste de versiones de PDF.js (API 6.3.289 contra worker 6.2.108 embebido en `@pdfslick/core`); se corrigió fijando `GlobalWorkerOptions.workerSrc` al worker del mismo paquete que provee la API, declarando `pdfjs-dist` como dependencia directa y sellando el contrato con una prueba. Pendiente antes de aprobar: comprobación del visor dentro del WebView de Capacitor en dispositivo. El worker de PDF.js se emite como recurso estático y queda fuera del paquete de arranque del aula; revisar su peso si se amplía el visor.

- [ACTIVE] **CEO-73: corregido el exceso de tamaño del artefacto Cloudflare (2026-09-03).** Codex/Juako, PR #133. Tras corregir el primer error, los builds Linux compilaron, pero la subida rechazó 3737,79 KiB gzip frente al límite de 3072 KiB. Causa: el parche Turbopack de OpenNext inyectaba incondicionalmente `@vercel/og`, `resvg.wasm` y `yoga.wasm` también en el middleware sin importaciones de imágenes. Se acota la inclusión a imports descubiertos, conservando la variante compatible cuando se utiliza. Verificado: regresión rojo/verde, tres casos nuevos sin alterar pruebas existentes, instalación congelada, lint, formato, `pnpm test` (551/551 con build/TypeScript), build Cloudflare y `wrangler deploy --env preview --dry-run` (3054,36 KiB gzip, antes 3743,48 KiB en Windows). Worker local: portada 200, tres rutas del origen de contenido 404 con `no-store` y sesión anónima sin usuario. Los checks de PR validarán el despliegue Linux; producción no promovida. Margen local de solo 17,64 KiB: revisar el tamaño al ampliar dependencias o funcionalidades. Sin cambiar `proxy.ts`, contratos ni plan de pago.

- [ACTIVE] **CEO-73: corregida la resolución de dependencias del middleware Cloudflare (2026-09-03).** Codex/Juako, misma rama de CEO-73 y [PR #133](https://github.com/CEOUBB/CEOUBB/pull/133), base `44a76e3`, corrección `b1df722`. Fallo reproducido en `pnpm run cloudflare:build`: OpenNext seleccionaba la condición `module` de `@opentelemetry/api`, pero el tracing de Next.js solo copiaba CommonJS. El parche existente de OpenNext ahora usa la condición `node` y prioriza `main`; el lockfile solo cambia el hash del parche. Verificado localmente con 548/548 tests, build Cloudflare y Worker; compilación confirmada en Linux por GitHub Actions y Workers Builds. La subida encontró después el límite de tamaño, corregido en la entrada anterior. Windows necesitó un adaptador temporal de enlaces de directorios a junctions para el build; artefactos locales en `out/ceo73-validation/`, fuera del commit. Sin cambios de contratos, reglas, datos, dependencias ni versiones; producción no promovida. El soporte de middleware Node.js sigue siendo experimental en OpenNext 1.20.4; se conserva el aislamiento de `proxy.ts` y se debe revisar este parche al actualizar el adaptador.

- [ACTIVE] **CEO-73: interoperabilidad LTI 1.3, SCORM/xAPI y QTI implementada para revisión.** Codex/Juako, rama `elpapijuaco325/ceo-73-soporte-de-interoperabilidad-academica-e-importacion-de`, base `090d950`. Especificación `docs/specs/p21-academic-interoperability.md`; cambios acotados a `lib/interop/`, `lib/services/interop*`, `db/`, `drizzle/`, `app/api/interop/`, rutas de curso, interfaz de aula y pruebas nuevas. Implementa LTI Core OIDC/RS256, reproductor de un SCO/actividad en origen aislado, persistencia SCORM y Statements xAPI, importación/exportación QTI 2.1 e interfaz docente. Migración aditiva 0011. Verificado: lint, typecheck, 525 unitarias, 548 tests con build/HTTP, 26 specs y navegador (QTI y SCORM guardar/reanudar/aislamiento; Storage simulado). Manual `docs/operations/academic-interoperability.md`. Pendiente de activación: migración staging, host separado, claves y validación de proveedores/carga Cloudflare. Retención y limpieza de objetos huérfanos documentadas. Sin nuevas dependencias ni cambios productivos; ejecución y PR autorizados directamente por el usuario.

- [ACTIVE] **CEO-69: historial visual de notas implementado y verificado; pendiente revisión del PR.** Codex/Juako, rama `elpapijuaco325/ceo-69-mostrar-interfaz-visual-de-historial-de-cambios-de-notas`, base `090d950`, 2026-09-02. Diálogo por celda con autor, fecha exacta en Chile y nota anterior/final; altas, correcciones y retiros consultables incluso en secciones archivadas. GET privado autorizado por sesión/matrícula de docente, coordinador, ayudante o superusuario; selector de solo lectura para ayudantes. Páginas de 25 eventos, máximo 26 lecturas por petición y cursor timestamp/ID; sin nuevas escuchas. Verificado: `verify:fast` 512/512 + integridad + 26 contratos, invariantes 35/35, lint limpio, `pnpm test` 535/535, revisión interactiva de escritorio/móvil a 390 × 844 con datos sintéticos. Archivos: `app/views/classroom/`, `app/api/sections/`, `lib/grade-history*`, `lib/services/grade-history.ts`, `lib/section-roles.ts`, índice y pruebas. Especificación: `docs/specs/p21-grade-history-view.md`. Producción: no desplegada. Requiere índice compuesto listo, credenciales de servicio existentes y backend CEO-7 operativo; la matriz de cuentas reales se verifica en staging tras desplegar el índice.
- [ACTIVE] **CEO-70: Firebase Emulator Suite rule tests as mandatory merge gate.** Implemented and locally verified on branch `elpapijuaco325/ceo-70-configurar-suite-de-pruebas-automatizadas-para-reglas-de`: Firestore/Storage matrix 4/4, unit suite 470/470, full build suite 495/495, lint/typecheck/format/Functions/OpenSpec green. The active GitHub ruleset for `main` now requires `Firebase Rules Emulator`; production rules and data were not deployed. Awaiting merge. `tests/firebase-rules.test.ts`, `firebase/firebase.json`, `package.json`, `.github/workflows/ci.yml`, `docs/specs/p20-firebase-rules-emulator-suite.md`.
- [DONE] **P1: Publication studio, full-page authoring, editor multimodal, integración de prism-react-renderer y correcciones de contraste/UI.** Felipe Arce. Branch `feat/estudio-publicacion`. La pestaña `Materiales` fue consolidada en la portada y se implementó el estudio de publicación en pantalla completa con presets, inspector, estadísticas y adjuntos directos. Se integró `prism-react-renderer` para el resaltado de sintaxis multiplataforma y seguro (cero XSS). Se solucionaron los bugs de UI del editor multimodal (desbordamiento de barra de herramientas, focus clipping redondeado, eliminación de tirador nativo/gap inferior, viñetas de listas, tablas con thead/th semánticos, tokenizadores y contraste de sintaxis para HTML, JS, TS, CSS, JSON, Bash, C, Java, y preservación íntegra de bloques `<pre>` al alternar pestañas). La tercera pestaña del editor fue ajustada con honestidad a `Marcado HTML` ("Para editar o pegar etiquetas HTML estándar reconocidas por el aula") y se blindó el AST y round-trip para etiquetas semánticas seguras (`<u>`, `<del>`, `<s>`, `<strike>`, `<mark>`, `<sub>`, `<sup>`, `~~`). Verificado con 519 tests pasando al 100% y builds limpios. Tras la critica de diseno de `/impeccable` (21/40 en las heuristicas de Nielsen) se cerraron los hallazgos: confirmacion nombrando a cuantos estudiantes alcanza la alerta antes de publicar con push y boton que declara el modo, aviso visible al salir de HTML porque el marcado se normaliza, estado invalido visible al publicar con el cuerpo vacio, pestanas de modo con activacion manual para que recorrerlas con las flechas no cambie la preferencia guardada, barra de herramientas que se desplaza en una sola fila, vista previa vacia reducida a una franja, estado del borrador en tres pasos y guardado declarado como local al equipo, objetivos tactiles de 44 px bajo 1024 px y estado de publicacion junto a la barra. El inspector no expone carpeta, fecha de entrega ni enlace externo por decision de producto: esos campos viajan vacios en el formulario y REQ-PUB-03 del contrato `classroom/publication-studio` queda pendiente de enmienda para reflejarlo. `app/views/classroom/`, `app/globals.css`, `lib/rich-text.ts`, `lib/multimodal-editor.ts`, `tests/`
- [DONE] **P1: Renderizado de bloques alineados en RichText/Vista Previa y fiabilidad/estado activo en barra del editor (PR #122).** Felipe Arce. Branch `feat/estudio-publicacion`. Se resolvió la fuga de etiquetas HTML crudas (`<div style="text-align: center;">...</div>`, `<p style="text-align: center;">...&nbsp;</p>`) en la Vista Previa y en la portada del aula cuando se alinea texto en el editor multimodal. Se extendió el modelo semántico `RichBlock` con `align?: TextAlignment` en párrafos y encabezados, se incorporó `parseAlignedBlock` en `lib/rich-text.ts` con normalización de entidades `&nbsp;`, y se implementó la renderización con estilo `textAlign` en `RichText.tsx` y `lib/multimodal-editor.ts`. En `MultimodalEditor.tsx`, se solucionó la pérdida de selección previa al pulsar herramientas de la barra restaurando `savedSelectionRef`, se expandió la detección de herramientas activas (`checkActiveTools`) para incluir listas (`insertUnorderedList`, `insertOrderedList`), encabezados (`h1`, `h2`, `h3`), citas (`blockquote`) y callouts con refresco síncrono inmediato en `applyTool`, y se implementó retroalimentación táctil/visual de pulsación instantánea (`:active` y `data-pressed` con micro-escala `scale(0.92)`) en `app/globals.css`. Verificado con `verify:fast` (490/490 tests + SHA-256 test-locking), `verify:invariants` (35/35 tests + Firebase rules), `typecheck` (0 errores), `lint` (0 advertencias) y Prettier limpio. `lib/rich-text.ts`, `app/views/classroom/RichText.tsx`, `lib/multimodal-editor.ts`, `app/views/classroom/MultimodalEditor.tsx`, `app/globals.css`
- [DONE] **P1: Motion engineering & micro-interactions for publication studio (/impeccable animate PR #122).** Felipe Arce. Branch `feat/estudio-publicacion`. Se dotó al estudio de publicación docente de un sistema de animaciones fluidas, discretas y optimizadas para GPU (`transform` y `opacity` exclusivos, duraciones de 100-180 ms con desaceleración institucional `cubic-bezier(0.16, 1, 0.3, 1)`): escalonado sutil en selección de plantillas, micro-elevación y feedback de pulsación táctil en tarjetas de preset, botones y pestañas de modo, revelación suave del panel de vista previa al alternarse sin saltos de layout, pulsación de respiración controlada y asentamiento elástico en el indicador de autoguardado, despliegue emergente rápido del menú contextual `/` y animación de entrada para archivos subidos a la lista de adjuntos. Se blindó completamente la accesibilidad WCAG 2.2 neutralizando incondicionalmente cualquier traslación, escala o animación en `prefers-reduced-motion: reduce`. Verificado con `verify:fast` (490/490 tests + SHA-256 test-locking), `typecheck` (0 errores) y `lint` (0 advertencias). `app/views/classroom/PublishView.tsx`, `app/globals.css`
- [DONE] **P1: 11 Features avanzadas del editor multimodal y visualizador docente (PR #122).** Felipe Arce. Branch `feat/estudio-publicacion`. Se implementaron las 11 funcionalidades enriquecidas solicitadas: tachado (`TextStrikethrough`, `~~texto~~`, `<del>`), superíndice (`TextSuperscript`, `<sup>`), subíndice (`TextSubscript`, `<sub>`), resaltador (`Highlighter`, `<mark>`), código en línea (`Code`, `<code>`), limpiar formato (`Eraser`), texto justificado (`TextAlignJustify`), sangría/desangría (`TextIndent`, `TextOutdent`), listas de verificación/checklists interactivas (`ListChecks`, `- [ ]` / `- [x]`), deshacer/rehacer nativo (`ArrowUUpLeft`, `ArrowUUpRight`), barra accesible de buscar y reemplazar con navegación y reemplazo masivo (`MagnifyingGlass`, `<FindReplaceBar>`), y notas al pie bidireccionales (`Note`, `[^id]`, `[^id]: ...`). Sincronizadas entre el lienzo visual, Markdown y HTML, con renderizado completo en `RichText.tsx` y pruebas unitarias ampliadas. Verificado con `verify:fast` (493/493 tests + SHA-256 test-locking), `verify:invariants` (35/35), `typecheck` (0 errores) y `lint` (0 advertencias). `lib/rich-text.ts`, `lib/multimodal-editor.ts`, `app/views/classroom/MultimodalEditor.tsx`, `app/views/classroom/RichText.tsx`, `app/globals.css`, `tests/`
- [DONE] **P1: QA End-to-End con Chrome DevTools MCP y estabilización de UI/editor (PR #122).** Felipe Arce. Branch `feat/estudio-publicacion`. Se resolvió la detección del menú de comandos rápidos `/` en documentos con contenido previo implementando `getLineTextBeforeCaret` y posicionamiento robusto de cursor; se eliminó la asimetría de altura entre el editor HTML y la vista previa aplicando `height: 100%; flex: 1 1 auto;` en `.editor-code-pane` y `.editor-source`; se corrigió el recorte de botones de la barra de herramientas (`flex: 0 0 auto`, `min-height: 0` en el lienzo) con proporciones de 32px y espaciado de hover holgado; y se blindó la conversión de bloques alineados con fórmulas KaTeX y spans de Chromium para evitar fugas de etiquetas crudas. Toda la guía de verificación manual (Fases 1 a 4) fue ejecutada y aprobada al 100% mediante subagente automatizado en `http://localhost:5873` con `chrome-devtools-mcp`. Verificado con `verify:fast` (495/495 tests + SHA-256 test-locking), `verify:invariants` (35/35), `typecheck` (0 errores) y `lint` (0 advertencias). `app/views/classroom/MultimodalEditor.tsx`, `lib/multimodal-editor.ts`, `app/globals.css`, `tests/multimodal-editor.test.ts`
- [DONE] **The local development database was regenerated and seeded.** `local.db` was regenerated from scratch applying all Drizzle migrations (`drizzle/0000`–`0010`) and seeded with academic fixtures (faculties, departments, careers, subjects, sections, section profiles, enrollments and test users) via `scripts/setup-local-db.mjs`. Quick-access sign-in as `docente.demo@ubiobio.cl` and `estudiante.demo@alumnos.ubiobio.cl` works seamlessly for local development and manual QA. Added `pnpm db:setup:local` and `pnpm db:seed:local` to `package.json`. `scripts/setup-local-db.mjs`, `local.db`, `package.json`
- [NEXT] **P6: declared debt: Android bottom inset is a constant, not a measurement (CEO-67).** `--safe-bottom` uses `max(env(...), 24px)` below 768px because the WebView does not expose the true gesture bar height. On a three-button device or gesture-less phone, 24px is unrequested padding. The correct solution is reading the inset from the native container and publishing it as a CSS variable on boot. `app/globals.css`, `lib/mobile-bridge.ts`
- [NEXT] **Declared debt from P5 §0.3: no kill switch (CEO-68).** With `server.url` remote the installed app always renders deployed `main`: a broken deploy breaks the app with no store rollback. Acceptable in a pilot; at university scale this requires a minimum-version / kill-switch endpoint checked by the shell on launch. `app/api/`, `capacitor.config.ts`
- [NEXT] **P5 conditional debt: DOM virtualization stays out until measured.** REQ-CAP-08 sets the budget (under 1,500 active nodes, p95 interaction under 200ms, long tasks under 50ms during scroll) and `content-visibility: auto` is the current solution. `@tanstack/react-virtual` may only be introduced against physical measurements on low-end hardware exceeding those thresholds. `app/globals.css`, `app/Classroom.tsx`
- [NEXT] **P5/P1: iOS implementation and App Store release (CEO-77).** `ios/` is versioned and consistent but unbuilt: requires Apple Developer enrollment, APNs key, and TestFlight build. `ios/`
- [NEXT] Run classroom, gradebook, and calendar manual test matrix across owner, teacher, and student accounts. Security rules deployed 2026-08-14; verification pending. Firebase
- [NEXT] Deploy and conclude operational milestone P0.9: merge CEO-69, deploy its composite index before the portal, and run the real-account multi-role matrix. The read-only history UI is implemented and locally verified. `app/views/classroom/`, `firebase/firestore.indexes.json`
- [NEXT] Backups and a **drilled** restore: scheduled Firestore exports, Turso backups, stated RPO/RTO (CEO-6). Critical repository priority. Firebase, Turso, `firebase/functions/`
- [NEXT] Execute production authentication, Storage, and push notification verification matrix on physical device (CEO-33). Web, Android, Firebase
- [NEXT] Deploy App Check observation phase (CEO-47), validate Web/physical Android matrix for 24 hours with >= 99% valid tokens, and enable enforcement per product surface only after passing gate. Firebase, Cloudflare, Android
- [NEXT] **P1: Bandeja rápida de corrección docente con visor PDF integrado vía PDFSlick (CEO-78).** Felipe Arce. Visualización fluida de entregas de estudiantes con `@pdfslick/react` (SSR diferido), panel de nota y feedback privado en contexto. `app/views/classroom/`
- [NEXT] **P1: Soporte de entregas grupales y asignación de equipos en evaluaciones (CEO-80).** Felipe Arce. Configuración grupal en buzones de entrega con réplica atómica de comprobantes, notas y retroalimentación. `app/views/classroom/`, `lib/`
- [NEXT] **P2: Refactor(classroom): retirar pestaña volátil de Progreso y purgar tablas legacy en Turso (CEO-81).** Felipe Arce. Simplificación de navegación en el aula y purga de tablas residuales huérfanas (`posts`, `files`, `progress`). `app/views/classroom/`, `db/schema.ts`
- [BLOCKED] Project owner: **written authorization for an institutional pilot** with one department or degree program (CEO-36): named academic sponsor, single semester, real students, signed data-processing agreement. External institutional dependency. UBB (DTI, VRA, legal counsel)
- [BLOCKED] Project owner: Google Play developer verification and official listing URL (CEO-32). Play Console
- [BLOCKED] Project owner: choose and fund native iOS strategy and Apple Developer enrollment (CEO-35). App Store Connect
- [BACKLOG] "Mi Bodega" personal file locker (CEO-31). Deferred by decision; requires per-student quota and Storage cost estimation first. Firebase Storage, `firebase/storage.rules`
- [BACKLOG] Calendar month view, recurring weekly class schedules, and drag-to-create/move in planner grid (CEO-72). Weekly view shipped with P2. `app/views/calendar/`
- [BACKLOG] Interoperabilidad ampliada tras CEO-73: LTI Advantage, secuenciación/múltiples SCO, LRS completo, QTI fuera del perfil 2.1 implementado e IMS Common Cartridge; validación institucional y certificación pendientes. Los perfiles Core, single-SCO/Tin Can y banco QTI están implementados en CEO-73; importador Moodle `.mbz` en CEO-39.
- [BACKLOG] Project owner: tenancy, licensing, and continuity dossier: transfer procedure for Firebase/Cloudflare/Turso, declared license or escrow, maintenance commitment, external penetration test (CEO-41). Governance
- [BACKLOG] Unit and instrumented testing suite for Android native shell (CEO-75 / P2). `android/`
- [BACKLOG] Web Push notifications with VAPID keys for desktop browsers (CEO-76 / P2). Web, Firebase

## Production inventory: what is NOT done

Everything not listed here is implemented and verified; the full historical inventory lives in `docs/archive/PLAN_ARCHIVE.md`. Deployed and operational: `ceoubb.com` on Cloudflare Workers with Turso libSQL, Firebase Auth with institutional domain policy, Firestore + Storage rules published, `notifyStudentsOnCoursePost` and `deleteMyAccount` Cloud Functions on Node.js 22 in `southamerica-west1`, FCM HTTP v1, PWA, `/biblioteca/`, `/privacidad`, Android source at `versionCode 13` / `versionName 1.0.6`.

- Web: app store badges remain non-clickable placeholders; local portal/library redesign uncommitted/undeployed.
- Android: release AAB installation, Google Sign-In, upload/download, role behavior, account deletion, and FCM delivery **not verified** on a clean physical device (CEO-33). Bundled offline library remains on legacy maroon theme.
- iOS: unbuilt scaffold: no Xcode project configuration, bundle ID, APNs certificates, or iOS Firebase app (CEO-77). Badge remains non-clickable.
- Firebase/GCP: App Check Web/Android registered with Firestore, Storage, and Auth remaining in observation (`UNENFORCED`); pending client deployment, 24-hour representative traffic, physical Android validation, and gradual enforcement. Firestore and Storage now have a verified emulator matrix; no web push VAPID key is configured. Cloud Billing alerts are configured, but the account remains in Free Trial and must be converted to paid prior to expiration.
- GitHub: the active `main` ruleset requires `Lint, Typecheck & Test`, `Firebase Rules Emulator`, and semantic PR titles; required review status remains undocumented.

## Architectural risks and technical debt

Detailed context and specifications reside in `docs/specs/`.

- **Static catalogue, no enrollment model**: blocking architectural debt. `courseId` lacks section and period dimensions, causing successive semesters and sections to collide; roles are global and email-derived; no automated bulk enrollment. -> [`p1-academic-model.md`](docs/specs/p1-academic-model.md)
- **Grade audit trail deployment**: PR #70 implements transactional, immutable logging, but production continues overwriting `grades/{uid}` until Functions/portal/index/rules are fully deployed. CEO-69 implements and locally verifies the read-only history UI; its index and portal still require deployment. -> P0.9
- **No automated backups, unverified restore**: no scheduled Firestore exports, no automated Turso database backups, no restore drill executed (CEO-6). -> P0.8
- **Capacity proof is staging-specific**: CEO-71 passed 3,000 authenticated sessions for 1,860 synchronized seconds with HTTP p95 472 ms, zero 5xx/authorization errors and CLP 425 projected infrastructure cost per student-year on the tested Vercel commit. This is not a production SLA; the later Cloudflare hosting migration needs separate latency evidence, Turso platform row counters were unavailable and the RPO 1 h / RTO 4 h restoration drill remains unverified (CEO-6). -> P0.8
- **Governance and continuity**: personal accounts for Firebase/Cloudflare/Turso hosting; data-processing agreement in draft stage without legal sign-off; missing public accessibility statement; no external pentest; bus factor of two. MIT license active, but tenancy transfer and exit procedures require formalization (CEO-41). -> P0B.4, P0B.6
- **Web/Android library divergence**: `assets/data.js` matches; HTML, JS, styles, and native bridge differ. Single library copy in `public/biblioteca/` established as SSOT.
- **Test coverage gaps**: no Android unit/instrumentation tests (CEO-75) and no browser/device multi-role end-to-end integration tests. Firebase role and enrollment boundaries are covered by the Emulator Suite gate from CEO-70.
- **Store distribution**: Play Console review, internal/closed testing tracks, listing assets, policy declarations, and final AAB verification remain (CEO-32); iOS application unbuilt (CEO-77).
- **D1 legacy leftovers**: `posts`, `files`, `progress` tables remain in imported Turso database copy, unreferenced. Drop only after verifying data is obsolete.

## Remaining work: two parallel tracks

- **P0 pilot safety**: protects active students; blocks deployment and correctness. -> [`p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md)
- **P0B institutional adoption**: requirements from DTI, Academic Directorate (VRA), and legal counsel prior to formal proposal. -> [`p0b-adoption.md`](docs/specs/p0b-adoption.md)

### Track A: pilot safety, in order

1. Deploy wildcard course security rules; execute P0.1-P0.3 on physical devices with real accounts; resolve defects (CEO-33).
2. Rules emulator tests and required merge gate completed (CEO-70); keep staging (P0.11) deploys and seeds ahead of production.
3. Establish automated backups and execute a drilled restoration (CEO-6) before instructors input authentic grade records.
4. Complete P0.5 prior to expanding beta cohort; P0.4 billing alerts are active.
5. Deploy grade audit trail (CEO-7); execute multi-role matrix; expose read-only grade history UI (CEO-69).
6. Preserve the approved P0.7 capacity evidence from CEO-71 and complete the P0.8 restoration drill.
7. Complete Google Play testing and store submission pipeline (CEO-32).
8. Formalize iOS architecture decisions and initiate native build track (CEO-77).

### Track B: adoption, in order

1. Project owner obtains written pilot authorization (CEO-36, `BLOCKED`). Items 2-4 proceed in parallel.
2. Legal annex and data protection compliance (P0B.4 / CEO-40); tenancy, ownership, and continuity dossier (P0B.6 / CEO-41).
3. Full WCAG 2.2 AA accessibility audit (P0B.5 / CEO-42).
4. Interoperability and Moodle course package importer (P0B.3 / CEO-39 & CEO-73).
5. Academic records integration and official grade certification (P0B.2 / CEO-74).
6. Compile empirical pilot evidence (CEO-48), then present formal institutional proposal (CEO-49 / P0B.7).

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

Deploy the Firestore and Storage rule sets to `centro-de-estudio-ubb` (using the selective deployment process defined in `AGENTS.md`), then execute the manual verification matrix across owner, teacher, and student roles prior to Cloudflare production promotion.

In parallel, the owner starts P0B.7 item 1 (pilot authorization) and schedules the P0.8 restoration drill against the published RPO/RTO targets. P0.7 capacity evidence is complete in staging.
