# P7: Estandarización Enterprise del Repositorio y Arquitectura Documental (SDD Specification)

**Status:** `VERIFICADA` · **Target:** Root, `.github/`, `docs/`, `package.json`, `tsconfig.json`, `tests/`  
**Autor:** Antigravity · **Reviewer:** Pipe / Joaquín  
**Framework:** Next.js 16, TypeScript, GitHub Actions, Dependabot, Prettier, Markdown

---

## 0. Resumen Ejecutivo y Motivación

Para posicionar a **Centro de Estudio UBB (CEOUBB)** con los estándares de ingeniería senior de empresas como Google, Microsoft y Stripe, es imperativo erradicar el desorden y duplicación en la raíz (_Root Document Clutter_), establecer una jerarquía documental modular y canónica (_Single Source of Truth_), implementar plantillas de gobernanza completas (`.editorconfig`, `.gitattributes`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `CODEOWNERS`, Issue Forms YAML) y robustecer el ecosistema de CI/CD, dependencias y tooling de desarrollo.

---

## 1. Requisitos Formales (EARS & RFC 2119)

### A. Higiene Documental y Single Source of Truth (SSOT)

- **REQ-ENT-01 (Ubiquitous):** The system SHALL consolidate the design system specification into a single canonical file `DESIGN.md` at the repository root, incorporating all unique token definitions, typography, components, and rules from `design-ceoubb.md`, and deleting `design-ceoubb.md`.
- **REQ-ENT-02 (Ubiquitous):** The system SHALL relocate institutional research dossiers into `docs/institutional/moodle-adecca-comparison.md` and historical plan records into `docs/archive/PLAN_ARCHIVE.md`.
- **REQ-ENT-03 (State-Driven):** WHILE maintaining active sprint tracking in `PLAN.md`, the system SHALL rotate completed `[DONE]` task records into `docs/archive/PLAN_ARCHIVE.md` to keep `PLAN.md` lean and focused on active and upcoming tasks.

### B. Gobernanza y Repositorio Enterprise

- **REQ-ENT-04 (Ubiquitous):** The system SHALL establish root governance files:
  - `.editorconfig`: UTF-8 encoding, 2-space indentation, LF line endings, trailing whitespace trimming.
  - `.gitattributes`: LF normalization for scripts (`*.sh`, `gradlew`, `*.js`, `*.ts`) and binary attributes for keystores, images, and SQLite databases.
  - `CONTRIBUTING.md`: Contributing guide detailing development setup, branch naming, Conventional Commits in Spanish, test execution, and PR lifecycle.
  - `SECURITY.md`: Vulnerability disclosure policy, contact channels, and Chilean data privacy compliance (Ley 19.628 / Ley 21.719).
  - `LICENSE`: MIT / Academic License declaration.
  - `.github/CODEOWNERS`: Path-based reviewer assignments for Android, Firebase, Access Policy, CI/CD, and core web views.
  - `README.md`: Flagship project presentation with badges, architecture overview, quickstart, security notices, and documentation map.

### C. Plantillas GitHub y Dependabot Multi-Ecosistema

- **REQ-ENT-05 (Event-Driven):** WHEN contributors create issues or pull requests on GitHub, the system SHALL provide YAML issue forms (`.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `config.yml`) and an enhanced `PULL_REQUEST_TEMPLATE.md` with verification gates (Security, A11y, Performance Budget, Mobile Seam).
- **REQ-ENT-06 (Ubiquitous):** The system SHALL update `.github/dependabot.yml` to monitor root npm, `.github/workflows`, `/firebase/functions` (npm), and `/android` (gradle).

### D. Tooling, Formateo y Arquitectura de Decisiones (ADRs)

- **REQ-ENT-07 (Ubiquitous):** The system SHALL configure unified code formatting via `.prettierrc.json` and `.prettierignore`, add `format` scripts to `package.json`, and enforce `forceConsistentCasingInFileNames: true` in `tsconfig.json`.
- **REQ-ENT-08 (Ubiquitous):** The system SHALL establish `docs/adr/` with initial architectural decision records:
  - `0001-turso-firestore-split.md`
  - `0002-capacitor-mobile-runtime.md`
  - `0003-domain-role-derivation.md`

### E. Integridad y Pruebas

- **REQ-ENT-09 (Ubiquitous):** The test suite SHALL verify the existence, syntax, and schema integrity of all new governance files, templates, and relocated documentation paths without regressions.

---

## 2. Criterios de Aceptación BDD (Gherkin Scenarios)

```gherkin
Scenario: Unificación de sistema de diseño y eliminación de duplicados
  Given el repositorio con "DESIGN.md" y "design-ceoubb.md"
  When se ejecuta la consolidación documental
  Then "DESIGN.md" contiene todos los tokens, tipografías y especificaciones de componentes
  And "design-ceoubb.md" ya no existe en el repositorio
  And todas las referencias en "AGENTS.md", "PRODUCT.md" y código fuente apuntan a "DESIGN.md"

Scenario: Limpieza de raíz y jerarquía modular de docs
  Given "ceoubb_moodle_adecca_comparison.md" y "PLAN_ARCHIVE.md" en la raíz
  When se reorganiza la documentación
  Then "docs/institutional/moodle-adecca-comparison.md" contiene el dossier de adopción
  And "docs/archive/PLAN_ARCHIVE.md" contiene el histórico acumulado de tareas
  And "PLAN.md" conserva únicamente el sprint activo y backlog inmediato

Scenario: Gobernanza de repositorio y plantillas de issues
  Given el repositorio configurado bajo estándares enterprise
  When un usuario o agente consulta la raíz y ".github/"
  Then existen ".editorconfig", ".gitattributes", "CONTRIBUTING.md", "SECURITY.md", "LICENSE", ".github/CODEOWNERS"
  And existen formularios YAML en ".github/ISSUE_TEMPLATE/" para bug reports y feature requests

Scenario: Dependabot multi-directorio y formateo unificado
  Given el archivo ".github/dependabot.yml"
  When Dependabot ejecuta su análisis
  Then revisa "/", "/firebase/functions" y "/android"
  And "pnpm run format:check" valida el estilo de código con Prettier
```

---

## 3. Descomposición de Tareas (Execution DAG)

- [x] **TASK-01 (REQ-ENT-01, REQ-ENT-02, REQ-ENT-03):** Consolidación documental (Unificar `DESIGN.md`, eliminar `design-ceoubb.md`, mover dossier a `docs/institutional/` y archivo a `docs/archive/`, rotar `PLAN.md`, actualizar referencias en `AGENTS.md`, `PRODUCT.md`, `lib/discord/` y tests).
- [x] **TASK-02 (REQ-ENT-04):** Gobernanza de Repositorio (`.editorconfig`, `.gitattributes`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `.github/CODEOWNERS`, `README.md`).
- [x] **TASK-03 (REQ-ENT-05, REQ-ENT-06):** Plantillas GitHub & Dependabot (`.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`).
- [x] **TASK-04 (REQ-ENT-07):** Tooling & Formateo (`.prettierrc.json`, `.prettierignore`, `package.json`, `tsconfig.json`).
- [x] **TASK-05 (REQ-ENT-08):** Architectural Decision Records (`docs/adr/0001-...`, `0002-...`, `0003-...`).
- [x] **TASK-06 (REQ-ENT-09):** Validación Integral y Pruebas (`pnpm run test:unit`, `pnpm test`, `typecheck`, `lint`).
