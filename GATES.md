# GATES.md — Acceptance Gates & Quality Invariants Protocol (Tree 3 Audit)

> **AUDIT RUNNER:** Antigravity Principal Platform Engineer & Lead Quality Architect
> **DISCIPLINE:** `/improve` (Read-only on source code) & `/unlazy tree 3`
> **TARGET REPO:** `CEOUBB` (`cl.ubb.centroestudio` / `centro-de-estudio-ubb`)
> **STATUS:** AUDIT COMPLETE — REMEDIATION PLANS 040–045 GENERATED

---

## 1. Branch 1: CI/CD Workflows & Pipeline Automation

### 1.1 `leaf-ci-workflows`

- **OWNS:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/semgrep.yml`, `.github/workflows/semantic-pr.yml`, `.github/workflows/draft-release.yml`, `.github/workflows/labeler.yml`, `.github/workflows/react-doctor.yml`, `.github/workflows/capacity-load-test.yml`, `.github/workflows/bundle-analysis.yml`, `tests/ci-workflows.test.ts`
- **CHECK:** Auditar permisos de `GITHUB_TOKEN` (principio de menor privilegio), configuración de concurrencia (`concurrency: cancel-in-progress`), disparadores redundantes en PRs y forks, matrices de Node/OS y manejo seguro de secretos sin exposición en logs.
- **EXPECT:** Cero workflows con permisos `write-all` implícitos; concurrencia habilitada en todos los flujos de PR; secretos aislados en entornos y cero llamadas sin timeout explícito.
- **STATUS:** ✅ **AUDITED** — Diagnosticados 11 workflows sin `timeout-minutes`, colisión en `cancel-in-progress: true` en `main` y permisos top-level excesivos. Remediación en [Plan 040](plans/040-cicd-pipeline-consolidation-and-timeouts.md).

### 1.2 `leaf-build-caching`

- **OWNS:** `.github/workflows/*.yml`, `package.json`, `next.config.ts`, `open-next.config.ts`, `patches/@opennextjs__cloudflare.patch`, `wrangler.jsonc`
- **CHECK:** Auditar la efectividad de la caché de dependencias (`pnpm store`), caché de build de Next.js (`.next/cache`), capas de compilación en OpenNext Cloudflare y tiempos de setup en CI.
- **EXPECT:** Configuración de `actions/setup-node` o `pnpm/action-setup` con estrategia de caché declarada; reducción esperada de I/O y cold-start de CI > 40%.
- **STATUS:** ✅ **AUDITED** — Ausencia de restauración de `.next/cache` en `deploy.yml` y triple invocación de `next build` en cada PR detectada. Remediación en [Plan 040](plans/040-cicd-pipeline-consolidation-and-timeouts.md).

---

## 2. Branch 2: Unit & Fast-Verification Tiers

### 2.1 `leaf-fast-harness`

- **OWNS:** `scripts/verify-test-hashes.mjs`, `.agents/.test-hashes.json`, `tests/grades.test.ts`, `tests/access-policy.test.ts`, `tests/academic-model.test.ts`, `tests/final-grade-records.test.ts`, `tests/portal-utils.test.ts`, `package.json`
- **CHECK:** Evaluar el tiempo de respuesta del arnés rápido `pnpm run verify:fast` (< 3.0s), la estrictez del chequeo de tipos (`tsc --noEmit`), la exhaustividad del sellado criptográfico SHA-256 (`.test-hashes.json`) y la ausencia total de test weakening.
- **EXPECT:** 100% de suites puras desacopladas de I/O; verificación SHA-256 a prueba de manipulación; tiempo de feedback ultra-rápido verificado.
- **STATUS:** ✅ **AUDITED** — `verify:invariants` verificado en **649 ms** (< 1.0s); sellado SHA-256 activo en 54 archivos; detectada falta de normalización CRLF/LF en hash cross-platform. Remediación en [Plan 041](plans/041-unit-test-isolation-and-fast-harness.md).

### 2.2 `leaf-mock-isolation`

- **OWNS:** `tests/dev-auth.test.ts`, `tests/fast-boot-session.test.ts`, `tests/communications.test.ts`, `tests/user-settings.test.ts`, `tests/services.test.ts`, `tests/moodle-import.test.ts`, `tests/support-api.test.ts`
- **CHECK:** Auditar aislamiento de estado global, limpieza de `globalThis`/`fetch`/`localStorage` mocks, eliminación de esperas ciegas (`setTimeout`/`sleep`), y determinismo en suites concurrentes.
- **EXPECT:** Cero timers ciegos en tests unitarios; restauración garantizada de stubs y mocks en `afterEach`/`after`; tasa de flakiness 0.0%.
- **STATUS:** ✅ **AUDITED** — Detectadas llamadas de red reales a `api.github.com` en `tests/services.test.ts` y contaminación de singleton en `db/index.ts`. Remediación en [Plan 041](plans/041-unit-test-isolation-and-fast-harness.md).

---

## 3. Branch 3: Integration & Multi-Store Testing

### 3.1 `leaf-turso-test-db`

- **OWNS:** `drizzle.config.ts`, `drizzle/`, `lib/db/`, `tests/admin-api.test.ts`, `tests/bulk-enrollment.test.ts`, `tests/teacher-course-management.test.ts`, `tests/classroom-pagination.test.ts`, `tests/grades-batch.test.ts`
- **CHECK:** Auditar paridad entre SQLite local/en memoria y LibSQL Turso en producción; verificar cláusulas `.limit()` en cada query, transacciones de rollback automático por test y cursores indexados.
- **EXPECT:** Cero queries sin límites; migraciones reproducibles en entorno de pruebas; aislamiento de datos entre tests sin colisión de claves primarias.
- **STATUS:** ✅ **AUDITED** — Detectado DDL manual incompleto en `admin-api` y 5 queries sin cláusula `.limit()`. Diseñado arnés `createIsolatedTestDb()` con `SAVEPOINT` rollback en [Plan 042](plans/042-integration-turso-memory-and-firebase-emulators.md).

### 3.2 `leaf-firebase-emulators`

- **OWNS:** `firebase.json`, `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/functions/`, `tests/firebase-mappers.test.ts`, `tests/app-check.test.ts`, `tests/deep-security-remediation.test.ts`, `tests/backend-remediation.test.ts`
- **CHECK:** Auditar cobertura de reglas de seguridad en Firestore y Storage, aislamiento de proyección de membresía (`enrollments/{uid}/sections/{seccionId}`), dual-store synchronization y uso de emuladores locales en testing.
- **EXPECT:** 100% de reglas de seguridad validadas con suite declarativa; cero wildcards peligrosos (`match /{path=**}`); paridad exacta con políticas institucionales.
- **STATUS:** ✅ **AUDITED** — Identificada vulnerabilidad crítica: 100% de tests de reglas evalúan regex estático sin motor AST. Diseñada suite declarativa con `@firebase/rules-unit-testing` en [Plan 042](plans/042-integration-turso-memory-and-firebase-emulators.md).

---

## 4. Branch 4: E2E, Smoke & Browser Testing

### 4.1 `leaf-e2e-critical-paths`

- **OWNS:** `tests/rendered-html.test.mjs`, `tests/capacity-load-test.test.ts`, `tests/publication-workflow.test.ts`, `tests/multimodal-editor.test.ts`, `tests/rich-text.test.ts`, `tests/live-class.test.ts`, `tests/participants.test.ts`
- **CHECK:** Auditar robustez de selectores (uso de `getByRole`/semántica accesible vs selectores CSS frágiles), validación de flujos críticos de usuario (autenticación, subida de evaluaciones, edición multimodal), y simulación de escenarios offline.
- **EXPECT:** Cero selectores frágiles basados en clases Tailwind dinámicas; cobertura de flujos institucionales críticos con aserciones semánticas deterministas.
- **STATUS:** ✅ **AUDITED** — Detectado fallo 404 en `/preview/docente` en `rendered-html.test.mjs` por falta de `CEOUBB_ENVIRONMENT: preview` y tests E2E limitados a `fs.readFileSync`. Remediación con Playwright en [Plan 043](plans/043-e2e-playwright-harness-and-wcag-a11y-audit.md).

### 4.2 `leaf-visual-a11y-smoke`

- **OWNS:** `tests/accessibility.test.ts`, `tests/support-pages.test.ts`, `tests/teacher-workspace-preview.test.ts`, `tests/privacy-terms.test.ts`, `DESIGN.md`
- **CHECK:** Auditar la suite de accesibilidad WCAG 2.2, contraste de color, estructura de encabezados, soporte de `prefers-reduced-motion`, formato numérico tabular (`tabular-nums`) e integridad iconográfica `@phosphor-icons/react`.
- **EXPECT:** Cero violaciones WCAG 2.2 Nivel AA; validación automatizada de tokens OKLCH y físicas de animación amortiguadas.
- **STATUS:** ✅ **AUDITED** — Detectada falta de cálculo matemático de contraste OKLCH y presencia de SVGs inline en `ResourcesView.tsx`. Remediación en [Plan 043](plans/043-e2e-playwright-harness-and-wcag-a11y-audit.md).

---

## 5. Branch 5: Static Analysis, Linting & Quality Gates

### 5.1 `leaf-static-linters`

- **OWNS:** `eslint.config.mjs`, `tsconfig.json`, `.prettierrc*`, `.github/workflows/react-doctor.yml`, `.github/workflows/semgrep.yml`
- **CHECK:** Auditar configuración de ESLint 9 flat config, plugins `@next/eslint-plugin-next`, `typescript-eslint`, reglas anti-bypass de tipos (`no-explicit-any`), `react-doctor` y reglas SAST con Semgrep.
- **EXPECT:** Configuración linter hermética con cero warnings permitidos en CI; verificación de dependencias de tipos y exclusión estricta de bypasses.
- **STATUS:** ✅ **AUDITED** — Diagnosticados 4 errores en `MultimodalEditor.tsx`, bypass `any` en `gemini-copilot.ts` y falsos positivos en React Doctor. Remediación en [Plan 044](plans/044-quality-gates-eslint-and-git-hooks.md).

### 5.2 `leaf-precommit-security`

- **OWNS:** `.git/hooks/`, `scripts/`, `package.json`, `.agents/rules/`, `.github/workflows/semantic-pr.yml`
- **CHECK:** Auditar existencia y robustez de hooks de pre-commit (lint-staged, simple-git-hooks o scripts de verificación rápida), validación de Conventional Commits en español y detección de secretos en el pipeline de desarrollo local.
- **EXPECT:** Pre-commit hooks operativos ejecutando `verify:invariants` y chequeo de hashes SHA-256 antes de cada commit; protección contra filtración de credenciales.
- **STATUS:** ✅ **AUDITED** — Inexistencia de hooks locales en `.git/hooks/`. Diseñada integración de `simple-git-hooks` + `scan-staged-secrets.mjs` + `verify-commit-msg.mjs` en [Plan 044](plans/044-quality-gates-eslint-and-git-hooks.md).

---

## 6. Branch 6: Release Engineering & Deployment Previews

### 6.1 `leaf-preview-environments`

- **OWNS:** `scripts/seed-staging.mjs`, `scripts/staging-environment.mjs`, `tests/staging-environment.test.ts`, `.github/workflows/deploy.yml`, `wrangler.jsonc`, `open-next.config.ts`
- **CHECK:** Auditar la automatización del despliegue en Cloudflare Pages/Workers, generación de URLs efímeras de preview por pull request, estrategia de seed de base de datos para staging y variables de entorno.
- **EXPECT:** Pipelines de despliegue deterministas con previews aisladas; seed de datos idempotente y verificable.
- **STATUS:** ✅ **AUDITED** — Diagnosticado crash fatal `STAGING_ENV_REQUIRED` en el runtime del Worker de preview y desincronización de Firebase en `main`. Remediación en [Plan 045](plans/045-release-cloudflare-previews-and-mobile-ci.md).

### 6.2 `leaf-mobile-build-ci`

- **OWNS:** `capacitor.config.ts`, `android/`, `.github/workflows/android-ci.yml`, `.github/workflows/release-android.yml`, `tests/capacitor-config.test.ts`, `tests/mobile-bridge.test.ts`, `tests/mobile-performance-budget.test.ts`, `tests/native-services.test.ts`
- **CHECK:** Auditar pipeline de compilación de Android (`android-ci.yml`), sincronización de assets `public/biblioteca/` (invariante de copia única), presupuestos de rendimiento móvil (bundle size, boot time) y empaquetado de release.
- **EXPECT:** Android build reproducible en CI con Gradle cache; validación de invariante de biblioteca única; empaque APK/AAB verificado.
- **STATUS:** ✅ **AUDITED** — Invariante de copia única de `public/biblioteca` confirmado; detectada falta de Gradle caching/paralelismo y persistencia residual de Keystore. Remediación en [Plan 045](plans/045-release-cloudflare-previews-and-mobile-ci.md).
