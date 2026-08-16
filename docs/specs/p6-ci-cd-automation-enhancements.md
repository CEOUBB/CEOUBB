# P6 — Automatizaciones de CI/CD y Calidad de Integración (SDD Specification)

**Status:** `VERIFICADA` · **Target:** `.github/workflows/`, `.github/labeler.yml`, `scripts/`  
**Autor:** Antigravity / Claude Code · **Reviewer:** Pipe / Joaquín  
**Framework:** GitHub Actions, Node.js 22, pnpm, Next.js 16, Gradle 8.11, Capacitor 8

---

## 0. Resumen Ejecutivo y Motivación

CEOUBB cuenta actualmente con pipelines básicos para linting, typecheck, tests y deploy en Vercel (`ci.yml`, `deploy.yml`, `react-doctor.yml`, `semgrep.yml`). Sin embargo, existen 4 áreas críticas descubiertas en la operativa diaria con agentes y colaboradores:

1. **Vulnerabilidad de Build Nativo en Android (Capacitor):** Los cambios en `capacitor.config.ts`, `android/` o plugins nativos de Capacitor no se compilan en CI, provocando que roturas de Gradle solo se detecten en compilaciones manuales locales.
2. **Deriva en Rendimiento y Tamaño de Bundle Web:** CEOUBB se ejecuta en redes móviles y dentro del WebView de Capacitor. No existe una alerta o guardrail en CI que impida introducir accidentalmente librerías pesadas en rutas cliente.
3. **Incumplimiento de la Política de Commits y PRs:** `AGENTS.md` exige Conventional Commits con títulos y descripciones estrictamente en **Español**. Actualmente no existe un linter automático que bloquee PRs con títulos en inglés o no semánticos (`WIP`, `fix bug`).
4. **Falta de Clasificación y Triaje Automatizado de PRs:** La ausencia de etiquetas automáticas dificulta identificar rápidamente qué subsistemas (`mobile`, `firebase`, `frontend`, `docs`) son impactados por cada pull request.

---

## 1. Requisitos Formales (EARS & RFC 2119)

### A. CI para Compilación Nativa Android (Capacitor)

- **REQ-CICD-01 (Event-Driven):** WHEN un pull request o push a `main` modifique archivos en `android/**`, `capacitor.config.ts`, `package.json` o `pnpm-lock.yaml`, el pipeline `android-ci.yml` SHALL configurar Java 21 (Temurin), sincronizar Capacitor (`cap sync android`) y ejecutar `./gradlew assembleDebug lintDebug`.
- **REQ-CICD-02 (Event-Driven):** IF la compilación nativa de Android o el linter de Gradle falla en GitHub Actions, THEN el pipeline SHALL despachar una alerta con formato Embed al canal `#🚨-❙-alertas` de Discord (`1536936245643579462`).

### B. Análisis y Presupuesto de Tamaño de Bundle (Next.js)

- **REQ-CICD-03 (Event-Driven):** WHEN se ejecute el build de Next.js en CI para un pull request, el sistema SHALL analizar los manifiestos de `.next` (`build-manifest.json` / `app-build-manifest.json`) y generar un resumen estructurado en el `GITHUB_STEP_SUMMARY`.
- **REQ-CICD-04 (Unwanted Behavior):** IF el First Load JS compartido o el chunk individual de cualquier ruta cliente supera el presupuesto límite configurado (250 kB gzipped / 800 kB sin comprimir), THEN el chequeo de bundle SHALL fallar o emitir un warning explícito bloqueante en CI.

### C. Linter Semántico de Títulos de PR en Español

- **REQ-CICD-05 (Event-Driven):** WHEN un PR sea abierto, editado o sincronizado, el pipeline `semantic-pr.yml` SHALL verificar que el título cumpla el estándar Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `build:`, `ci:`, `revert:`).
- **REQ-CICD-06 (Event-Driven):** El título del PR SHALL incluir una descripción coherente y estar escrito en **Español** según las reglas de `AGENTS.md`, rechazando títulos con prefijos o verbos genéricos en inglés.

### D. Etiquetado Automático de PRs (PR Labeler)

- **REQ-CICD-07 (Event-Driven):** WHEN se reciba un evento de Pull Request, el pipeline `labeler.yml` (`actions/labeler@v5`) SHALL asignar automáticamente etiquetas contextuales según las rutas de archivos modificadas:
  - `📱 mobile / android`: `android/**`, `capacitor.config.ts`, `capacitor/**`, `lib/mobile-bridge.ts`, `lib/native-files.ts`, `lib/push-notifications.ts`, `app/mobile-shell.tsx`.
  - `🔥 firebase / backend`: `firebase/**`, `db/**`, `drizzle/**`, `app/api/**`.
  - `🌐 web / frontend`: `app/**`, `lib/**`, `public/**`.
  - `📝 documentation`: `docs/**`, `*.md`, `.agents/**`.
  - `⚙️ ci / cd`: `.github/**`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`.

### E. Integridad y Pruebas Unitarias

- **REQ-CICD-08 (Ubiquitous):** La suite de pruebas automatizadas SHALL incluir `tests/ci-workflows.test.ts` para verificar la existencia sintáctica, consistencia de permisos y configuración de todos los workflows y del archivo `.github/labeler.yml`.

---

## 2. Criterios de Aceptación BDD (Gherkin Scenarios)

```gherkin
Scenario: Validación automática de build Android ante cambios en Capacitor
  Given un PR que modifica "capacitor.config.ts" o "android/app/build.gradle"
  When el runner de GitHub Actions ejecuta el workflow "android-ci.yml"
  Then se sincroniza Capacitor con "pnpm exec cap sync android"
  And se compila exitosamente el target ":app:assembleDebug" con JDK 21
  And no se generan errores de sintaxis Gradle

Scenario: Bloqueo de PR con título en inglés o sin formato convencional
  Given un pull request con el título "update login styles and fix crash"
  When se dispara el workflow "semantic-pr.yml"
  Then el check de Semantic PR debe fallar con error descriptivo
  And indicar que debe usarse un prefijo válido y resumen en español (ej. "fix(auth): corregir fallo de inicio de sesión")

Scenario: Etiquetado automático según árbol de archivos
  Given un pull request que modifica "android/app/src/main/AndroidManifest.xml" y "firebase/firestore.rules"
  When el workflow "labeler.yml" se ejecuta sobre el PR
  Then el PR recibe las etiquetas "📱 mobile / android" y "🔥 firebase / backend"
  And no requiere intervención manual

Scenario: Control de presupuesto de bundle de Next.js
  Given la compilación de producción de Next.js en CI
  When el script "scripts/check-bundle-size.mjs" analiza los artefactos de ".next"
  Then genera una tabla markdown en GITHUB_STEP_SUMMARY con el First Load JS por ruta
  And valida que ningún chunk exceda el presupuesto máximo
```

---

## 3. Diseño Técnico y Topología

```mermaid
graph TD
    PR[Pull Request Abierto / Actualizado] --> LBL[Workflow: labeler.yml]
    PR --> SEM[Workflow: semantic-pr.yml]
    PR --> CI[Workflow: ci.yml - Web Lint & Tests]
    PR --> BND[Workflow: bundle-analysis.yml / ci.yml]
    PR --> AND[Workflow: android-ci.yml - Path Filtered]

    LBL -->|actions/labeler@v5| LABELS[Aplica Etiquetas: 📱 mobile, 🔥 firebase, 🌐 web, etc.]
    SEM -->|action-semantic-pull-request@v5| TITLE_CHECK[Valida Conventional Commits + Español]
    CI -->|pnpm test & typecheck| VERCEL_READY[Aprobación de Calidad Web]
    BND -->|scripts/check-bundle-size.mjs| STEP_SUMMARY[Publica Resumen de Bundle en Actions]
    AND -->|cap sync + ./gradlew assembleDebug| ANDROID_CHECK[Verifica Compilación APK Debug]
    AND -->|Si falla| DISCORD_ALERT[Notifica Embed a #🚨-❙-alertas]
```

### Matriz de Permisos Mínimos Requeridos

| Workflow              | Evento                 | Permisos GHA requeridos                               |
| :-------------------- | :--------------------- | :---------------------------------------------------- |
| `android-ci.yml`      | `pull_request`, `push` | `contents: read`                                      |
| `semantic-pr.yml`     | `pull_request_target`  | `pull-requests: read`, `statuses: write`              |
| `labeler.yml`         | `pull_request_target`  | `contents: read`, `pull-requests: write`              |
| `bundle-analysis.yml` | `pull_request`, `push` | `contents: read`, `pull-requests: write` (si comenta) |

---

## 4. Grafo de Tareas y Plan de Ejecución (DAG)

- [x] **TASK-01:** Crear configuración de etiquetado `.github/labeler.yml` y workflow `.github/workflows/labeler.yml` (`REQ-CICD-07`).
- [x] **TASK-02:** Crear workflow de validación de títulos semánticos `.github/workflows/semantic-pr.yml` (`REQ-CICD-05`, `REQ-CICD-06`).
- [x] **TASK-03:** Crear workflow de compilación nativa `.github/workflows/android-ci.yml` con soporte de caché Gradle y alerta Discord (`REQ-CICD-01`, `REQ-CICD-02`).
- [x] **TASK-04:** Implementar script `scripts/check-bundle-size.mjs` y workflow de verificación de bundle `bundle-analysis.yml` (`REQ-CICD-03`, `REQ-CICD-04`).
- [x] **TASK-05:** Crear suite de pruebas `tests/ci-workflows.test.ts` y registrarla en `package.json` (`REQ-CICD-08`).
- [x] **TASK-06:** Verificación integral (`pnpm run test:unit`, `pnpm test`, `pnpm run lint`, `pnpm run typecheck`), actualización de `PLAN.md` y formalización de Pull Request con el template oficial.
