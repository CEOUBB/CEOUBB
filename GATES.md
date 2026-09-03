# GATES.md — Acceptance Gates & Quality Invariants Protocol (Tree 3 Audit)

> **AUDIT RUNNER:** Antigravity Principal Platform Engineer & Lead Quality Architect  
> **DISCIPLINE:** `/improve` (Read-only on source code) & `/unlazy tree 3`  
> **TARGET REPO:** `CEOUBB` (`cl.ubb.centroestudio` / `centro-de-estudio-ubb`)  
> **STATUS:** AUDIT COMPLETE — REMEDIATION PLANS 040–045 UPDATED & VERIFIED

---

## 1. Branch 1: CI/CD Workflows & Pipeline Automation

### 1.1 `leaf-ci-workflows`

- **OWNS:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/semgrep.yml`, `.github/workflows/semantic-pr.yml`, `.github/workflows/draft-release.yml`, `.github/workflows/labeler.yml`, `.github/workflows/react-doctor.yml`, `.github/workflows/capacity-load-test.yml`, `.github/workflows/bundle-analysis.yml`, `.github/workflows/release-android.yml`, `.github/workflows/pr-agent.yml`, `.github/workflows/firebase-release.yml`, `tests/ci-workflows.test.ts`
- **CHECK:** Auditar permisos de `GITHUB_TOKEN` (principio de menor privilegio), configuración de concurrencia (`concurrency: cancel-in-progress`), disparadores redundantes en PRs y forks, matrices de Node/OS y manejo seguro de secretos sin exposición en logs.
- **EXPECT:** Cero workflows con permisos `write-all` implícitos; concurrencia habilitada en todos los flujos de PR; secretos aislados en entornos y cero llamadas sin timeout explícito.
- **STATUS:** ✅ **AUDITED & GATED** — Confirmados 11 workflows sin `timeout-minutes` (14 jobs desprotegidos), cancelación destructiva en `main` por `cancel-in-progress: true` incondicional, y detección de regresión en borrador previo de Plan 040 (que eliminaba el job `staging`). Plan 040 corregido y blindado en [Plan 040](plans/040-cicd-pipeline-consolidation-and-timeouts.md).

### 1.2 `leaf-build-caching`

- **OWNS:** `.github/workflows/*.yml`, `package.json`, `next.config.ts`, `open-next.config.ts`, `patches/@opennextjs__cloudflare.patch`, `wrangler.jsonc`
- **CHECK:** Auditar la efectividad de la caché de dependencias (`pnpm store`), caché de build de Next.js (`.next/cache`), capas de compilación en OpenNext Cloudflare y tiempos de setup en CI.
- **EXPECT:** Configuración de `actions/setup-node` o `pnpm/action-setup` con estrategia de caché declarada; reducción esperada de I/O y cold-start de CI > 40%.
- **STATUS:** ✅ **AUDITED & GATED** — Ausencia de restauración de `.next/cache` en `deploy.yml` diagnosticada (agrega 60-90s por build de OpenNext); triple invocación de `next build` en PRs identificada y consolidada en [Plan 040](plans/040-cicd-pipeline-consolidation-and-timeouts.md).

---

## 2. Branch 2: Unit & Fast-Verification Tiers

### 2.1 `leaf-fast-harness`

- **OWNS:** `scripts/verify-test-hashes.mjs`, `.agents/.test-hashes.json`, `tests/grades.test.ts`, `tests/access-policy.test.ts`, `tests/academic-model.test.ts`, `tests/final-grade-records.test.ts`, `tests/portal-utils.test.ts`, `package.json`
- **CHECK:** Evaluar el tiempo de respuesta del arnés rápido `pnpm run verify:fast` (< 3.0s), la estrictez del chequeo de tipos (`tsc --noEmit`), la exhaustividad del sellado criptográfico SHA-256 (`.test-hashes.json`) y la ausencia total de test weakening.
- **EXPECT:** 100% de suites puras desacopladas de I/O; verificación SHA-256 a prueba de manipulación; tiempo de feedback ultra-rápido verificado.
- **STATUS:** ✅ **AUDITED & GATED** — `verify:invariants` verificado en **722 ms** (< 1.0s); sellado SHA-256 activo en 54 archivos; detectada falta de normalización CRLF/LF en hash cross-platform y bypass de regeneración de snapshot en `--check`. Resuelto en [Plan 041](plans/041-unit-test-isolation-and-fast-harness.md).

### 2.2 `leaf-mock-isolation`

- **OWNS:** `tests/dev-auth.test.ts`, `tests/fast-boot-session.test.ts`, `tests/communications.test.ts`, `tests/user-settings.test.ts`, `tests/services.test.ts`, `tests/moodle-import.test.ts`, `tests/support-api.test.ts`, `db/index.ts`
- **CHECK:** Auditar aislamiento de estado global, limpieza de `globalThis`/`fetch`/`localStorage` mocks, eliminación de esperas ciegas (`setTimeout`/`sleep`), y determinismo en suites concurrentes.
- **EXPECT:** Cero timers ciegos en tests unitarios; restauración garantizada de stubs y mocks en `afterEach`/`after`; tasa de flakiness 0.0%.
- **STATUS:** ✅ **AUDITED & GATED** — Detectadas 6 llamadas de red reales a `api.github.com` en `tests/services.test.ts:182-200` con aserciones tautológicas `typeof null === "object"`. Diseñado mock granular y hermético para GitHub API en [Plan 041](plans/041-unit-test-isolation-and-fast-harness.md).

---

## 3. Branch 3: Integration & Multi-Store Testing

### 3.1 `leaf-turso-test-db`

- **OWNS:** `drizzle.config.ts`, `drizzle/`, `lib/db/`, `tests/helpers/db-harness.ts`, `tests/admin-api.test.ts`, `tests/bulk-enrollment.test.ts`, `tests/teacher-course-management.test.ts`, `tests/classroom-pagination.test.ts`, `tests/grades-batch.test.ts`
- **CHECK:** Auditar paridad entre SQLite local/en memoria y LibSQL Turso en producción; verificar cláusulas `.limit()` en cada query, transacciones de rollback automático por test y cursores indexados.
- **EXPECT:** Cero queries sin límites; migraciones reproducibles en entorno de pruebas; aislamiento de datos entre tests sin colisión de claves primarias.
- **STATUS:** ✅ **AUDITED & GATED** — Brecha de paridad crítica: SQLite en memoria ejecuta con `PRAGMA foreign_keys = OFF`, ignorando `ON DELETE CASCADE` y claves foráneas en tests. DDL manual incompleto en tests y queries sin `.limit()` en aserciones de test detectadas. Resuelto con arnés `createIsolatedTestDb()` con `PRAGMA foreign_keys = ON;` y `SAVEPOINT` en [Plan 042](plans/042-integration-turso-memory-and-firebase-emulators.md).

### 3.2 `leaf-firebase-emulators`

- **OWNS:** `firebase/firebase.json`, `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/functions/`, `tests/integration/firebase-rules.test.ts`, `tests/firebase-mappers.test.ts`, `tests/app-check.test.ts`, `tests/deep-security-remediation.test.ts`
- **CHECK:** Auditar cobertura de reglas de seguridad en Firestore y Storage, aislamiento de proyección de membresía (`enrollments/{uid}/sections/{seccionId}`), dual-store synchronization y uso de emuladores locales en testing.
- **EXPECT:** 100% de reglas de seguridad validadas con suite declarativa; cero wildcards peligrosos (`match /{path=**}`); paridad exacta con políticas institucionales.
- **STATUS:** ✅ **AUDITED & GATED** — Falso test de reglas en CI (job `firebase_rules` solo evalúa regex de `rules_version`). Diseñada suite declarativa AST con `@firebase/rules-unit-testing` desacoplada en `test:rules` en [Plan 042](plans/042-integration-turso-memory-and-firebase-emulators.md).

---

## 4. Branch 4: E2E, Smoke & Browser Testing

### 4.1 `leaf-e2e-critical-paths`

- **OWNS:** `playwright.config.ts`, `e2e/`, `tests/rendered-html.test.mjs`, `tests/capacity-load-test.test.ts`, `tests/publication-workflow.test.ts`, `tests/multimodal-editor.test.ts`, `tests/rich-text.test.ts`, `tests/live-class.test.ts`, `tests/participants.test.ts`
- **CHECK:** Auditar robustez de selectores (uso de `getByRole`/semántica accesible vs selectores CSS frágiles), validación de flujos críticos de usuario (autenticación, subida de evaluaciones, edición multimodal), y simulación de escenarios offline.
- **EXPECT:** Cero selectores frágiles basados en clases Tailwind dinámicas; cobertura de flujos institucionales críticos con aserciones semánticas deterministas.
- **STATUS:** ✅ **AUDITED & GATED** — Ausencia de arnés de navegador real (Playwright); tests E2E acoplados a regex de código fuente (`fs.readFileSync`). Causa raíz de 404 en `/preview/docente` diagnosticada en `teacher-preview-environment.ts`. Configuración de Playwright headless y precedencia determinista de preview en [Plan 043](plans/043-e2e-playwright-harness-and-wcag-a11y-audit.md).

### 4.2 `leaf-visual-a11y-smoke`

- **OWNS:** `tests/accessibility.test.ts`, `tests/support-pages.test.ts`, `tests/teacher-workspace-preview.test.ts`, `tests/privacy-terms.test.ts`, `app/views/resources/ResourcesView.tsx`, `DESIGN.md`
- **CHECK:** Auditar la suite de accesibilidad WCAG 2.2, contraste de color, estructura de encabezados, soporte de `prefers-reduced-motion`, formato numérico tabular (`tabular-nums`) e integridad iconográfica `@phosphor-icons/react`.
- **EXPECT:** Cero violaciones WCAG 2.2 Nivel AA; validación automatizada de tokens OKLCH y físicas de animación amortiguadas.
- **STATUS:** ✅ **AUDITED & GATED** — Violación de AGENTS.md §5.6 detectada: 14 marcas de terceros en SVG inline en `ResourcesView.tsx`. Ceguera matemática de contraste OKLCH en `accessibility.test.ts`. Resuelto con sustitución Phosphor y conversor matemático OKLCH en [Plan 043](plans/043-e2e-playwright-harness-and-wcag-a11y-audit.md).

---

## 5. Branch 5: Static Analysis, Linting & Quality Gates

### 5.1 `leaf-static-linters`

- **OWNS:** `eslint.config.mjs`, `tsconfig.json`, `.prettierrc.json`, `.prettierignore`, `doctor.config.json`, `lib/discord/gemini-copilot.ts`
- **CHECK:** Auditar configuración de ESLint 9 flat config, plugins `@next/eslint-plugin-next`, `typescript-eslint`, reglas anti-bypass de tipos (`no-explicit-any`), `react-doctor` y reglas SAST con Semgrep.
- **EXPECT:** Configuración linter hermética con cero warnings permitidos en CI; verificación de dependencias de tipos y exclusión estricta de bypasses.
- **STATUS:** ✅ **AUDITED & GATED** — `eslint.config.mjs` sin bloque de reglas estrictas; bypass activo `any[]` en `lib/discord/gemini-copilot.ts:229`. Descartada instrucción obsoleta sobre `MultimodalEditor.tsx` (funciones slash en uso activo). Resuelto en [Plan 044](plans/044-quality-gates-eslint-and-git-hooks.md).

### 5.2 `leaf-precommit-security`

- **OWNS:** `.git/hooks/`, `scripts/scan-staged-secrets.mjs`, `scripts/verify-commit-msg.mjs`, `package.json`
- **CHECK:** Auditar existencia y robustez de hooks de pre-commit (lint-staged, simple-git-hooks o scripts de verificación rápida), validación de Conventional Commits en español y detección de secretos en el pipeline de desarrollo local.
- **EXPECT:** Pre-commit hooks operativos ejecutando `verify:invariants` y chequeo de hashes SHA-256 antes de cada commit; protección contra filtración de credenciales.
- **STATUS:** ✅ **AUDITED & GATED** — Cero hooks instalados en `.git/hooks/`. Diseñada integración de `simple-git-hooks` con `scan-staged-secrets.mjs` (escaneo de tokens Turso/Google/Discord en staged diff) y `verify-commit-msg.mjs` en [Plan 044](plans/044-quality-gates-eslint-and-git-hooks.md).

---

## 6. Branch 6: Release Engineering & Deployment Previews

### 6.1 `leaf-preview-environments`

- **OWNS:** `lib/firebase-config.ts`, `wrangler.jsonc`, `open-next.config.ts`, `.github/workflows/deploy.yml`, `scripts/staging-environment.mjs`, `tests/staging-environment.test.ts`
- **CHECK:** Auditar la automatización del despliegue en Cloudflare Pages/Workers, generación de URLs efímeras de preview por pull request, estrategia de seed de base de datos para staging y variables de entorno.
- **EXPECT:** Pipelines de despliegue deterministas con previews aisladas; seed de datos idempotente y verificable.
- **STATUS:** ✅ **AUDITED & GATED** — **Crash P0 en runtime detectado en `lib/firebase-config.ts:57-59` (`STAGING_ENV_REQUIRED`)** al evaluar Workers de preview. Desincronización de Firebase en `main` (`promote_to_production: false`) corregida en [Plan 045](plans/045-release-cloudflare-previews-and-mobile-ci.md).

### 6.2 `leaf-mobile-build-ci`

- **OWNS:** `capacitor.config.ts`, `android/gradle.properties`, `.github/workflows/android-ci.yml`, `.github/workflows/release-android.yml`, `tests/capacitor-config.test.ts`
- **CHECK:** Auditar pipeline de compilación de Android (`android-ci.yml`), sincronización de assets `public/biblioteca/` (invariante de copia única), presupuestos de rendimiento móvil (bundle size, boot time) y empaquetado de release.
- **EXPECT:** Android build reproducible en CI con Gradle cache; validación de invariante de biblioteca única; empaque APK/AAB verificado.
- **STATUS:** ✅ **AUDITED & GATED** — Invariante de copia única en `public/biblioteca` confirmado; detectada persistencia de Keystore en disco en `release-android.yml` y Gradle caching desactivado en `android/gradle.properties`. Resuelto en [Plan 045](plans/045-release-cloudflare-previews-and-mobile-ci.md).
