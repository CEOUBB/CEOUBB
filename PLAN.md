# Centro de Estudio UBB: Plan y Agent Handoff

Last verified 2026-08-16 · baseline `0d7c97b` · repo `https://github.com/CEOUBB/CEOUBB.git` · production `https://ceoubb.com`

**Objective: present CEOUBB to Universidad del Bío-Bío as the next official LMS.** Every priority is ordered against that. Rationale: `docs/institutional/moodle-adecca-comparison.md` (scope and adoption dossier); this file is authoritative for status, deployment and verification.

## How to use

Read `AGENTS.md` first: invariants, setup, commands and identifiers live there and are not repeated here. Update this file after any material feature, infra change, deploy, store submission, security change or architectural decision.

Status labels: `DONE` (implemented and verified at the level stated) · `ACTIVE` (owner working on it) · `NEXT` (ready and prioritized) · `BLOCKED` (needs an external decision, account, approval or credential) · `BACKLOG` (valuable, not release-critical).

Before starting: add a row to Active work with task, branch, owner and files. Remove it when merged (completed rows go to `docs/archive/PLAN_ARCHIVE.md`).

Companion files:

- [`DESIGN.md`](DESIGN.md): Fuente canónica del sistema de diseño institucional, tokens de color y tipografía.
- [`docs/archive/PLAN_ARCHIVE.md`](docs/archive/PLAN_ARCHIVE.md): completed work, implemented milestones, full handoff history.
- [`docs/institutional/moodle-adecca-comparison.md`](docs/institutional/moodle-adecca-comparison.md): Moodle & Adecca institutional comparison and adoption dossier.
- [`docs/specs/p0-pilot-safety.md`](docs/specs/p0-pilot-safety.md): P0.1-P0.11 detail and acceptance criteria.
- [`docs/specs/p0b-adoption.md`](docs/specs/p0b-adoption.md): P0B.1-P0B.7 institutional adoption dossier.
- [`docs/specs/p0-react-doctor-remediation.md`](docs/specs/p0-react-doctor-remediation.md): React Doctor quality & frontend reliability remediation spec (SDD).
- [`docs/specs/p1-academic-model.md`](docs/specs/p1-academic-model.md): canonical academic data model / enrollment migration spec.
- [`docs/specs/p2-academic-time-blocking-planner.md`](docs/specs/p2-academic-time-blocking-planner.md): Academic Time-Blocking Planner & deadline sync spec (SDD).
- [`docs/specs/p3-study-resources-hub.md`](docs/specs/p3-study-resources-hub.md): Study Resources Hub, AI Models & UBB Perks spec (SDD).
- [`docs/specs/p4-portal-views-modularization.md`](docs/specs/p4-portal-views-modularization.md): portal views modularization spec (SDD). Implemented 2026-08-14: `app/portal-views.tsx` is now a four-line barrel over `app/views/` (`CoursesDashboard.tsx`, `AdminView.tsx`, `calendar/`, `resources/`). Public exports and behaviour unchanged; `pnpm run typecheck`, `pnpm run lint` and `pnpm test` (53/53) pass.
- [`docs/specs/p5-capacitor-mobile-migration.md`](docs/specs/p5-capacitor-mobile-migration.md): Capacitor mobile architecture migration & mobile-first UX spec (SDD). Implemented 2026-08-15 on `claude/capacitor-migration`. The hand-rolled `android/` WebView (`StudyBridge`, `ClassroomService.java`, 1 261 lines of Java) was replaced by a Capacitor 7 runtime, remote-first against `https://ceoubb.com`. Reapplied on the regenerated Gradle project: release `signingConfig` from `keystore.properties`, `versionCode 14` / `versionName 1.1.0`, `minSdk 26`, byte-identical `google-services.json`, verified App Links `intent-filter`, `POST_NOTIFICATIONS`. New seam: `lib/mobile-bridge.ts` (platform, haptics, status bar, hardware back, external links), `lib/push-notifications.ts`, `lib/native-files.ts`, `app/mobile-shell.tsx` + `app/mobile-shell.css` (bottom nav, `vaul` sheets). Native Google Sign-In via `@capacitor-firebase/authentication` + `signInWithCredential`; the browser keeps `signInWithPopup` and both branches derive the role from `roleForEmail`. CSP admits `capacitor://localhost` and `https://localhost` in `default-src`/`script-src`/`connect-src` and nothing else changed. The duplicated `android/app/src/main/assets/www/` tree (3.5 MB) is gone; `public/sw.js` (`v7`) is the only offline coverage of `/biblioteca`. `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit` (57/57) and `pnpm test` (80/80) pass.
- [`docs/specs/p6-ci-cd-automation-enhancements.md`](docs/specs/p6-ci-cd-automation-enhancements.md): CI/CD Automations & Integration Quality Enhancement spec (SDD). Implemented 2026-08-16 on `feat/ci-cd-automations`. PR category auto-labeling (`.github/labeler.yml`, `labeler.yml`), Conventional Commits & Spanish PR title validation (`semantic-pr.yml`), Android Capacitor native compilation in CI with Discord failure alert (`android-ci.yml`), Next.js bundle size budget analyzer and CI report (`scripts/check-bundle-size.mjs`, `bundle-analysis.yml`), and workflow integrity test suite (`tests/ci-workflows.test.ts`). `pnpm run test:unit` (100/100), `pnpm test` (123/123), `typecheck` y `lint` limpios.
- [`docs/specs/p7-enterprise-repository-standards.md`](docs/specs/p7-enterprise-repository-standards.md): Enterprise Repository Standards, Document Architecture & Governance spec (SDD). Implemented 2026-08-16 on `feat/enterprise-repo-standards` (PR #22).
- [`docs/specs/p7-teacher-workspace-preview.md`](docs/specs/p7-teacher-workspace-preview.md) — preview navegable exclusivamente docente, inspirado conceptualmente en Canvas UdeC, ADECCA y Moodle, con datos sintéticos y aislamiento total del backend productivo. Estado `EN EJECUCION`; Joaquín aprobó requisitos y marcadores SDD el 2026-08-15.
- [`docs/specs/p8-performance-and-scalability-remediations.md`](docs/specs/p8-performance-and-scalability-remediations.md): Optimizaciones de Rendimiento, Escalabilidad y Desacoplamiento de Carga (SDD). Implemented 2026-08-16 on `feat/perf-and-scalability-remediations`. Índices en clave foránea `sessions.user_id`, función `pruneExpiredSessions`, paginación y búsqueda en `GET /api/admin/users` y `AdminView`, code-splitting dinámico de vistas secundarias en `app/Portal.tsx`, mapa $O(1)$ en `CoursesDashboard`, memoización de filas de notas en `GradesSection` y lotes `WriteBatch` en Cloud Functions. `pnpm run test:unit` (110/110), `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check` y `pnpm test` (133/133) pasando al 100%.
- [`docs/specs/p9-enterprise-harness-evolution.md`](docs/specs/p9-enterprise-harness-evolution.md): Enterprise AI Agent Harness Evolution, Test-Locking & Deterministic Governance (SDD). Implemented 2026-08-17. Deterministic SHA-256 test-locking (`scripts/verify-test-hashes.mjs`), fast-feedback gates (`verify:fast` <3s, `verify:invariants`), modular glob-scoped rules `.agents/rules/*.mdc` (001 to 005), dual-store user role synchronization in `AdminView.tsx` and `lib/firebase/profile.ts`, formal ADR suite in `docs/architecture/adr/` (0001 to 0004), and SDD skill v4.0.0. `verify:fast` (111/111 passing in <2.8s), `typecheck`, `lint` and `format:check` passing clean.
- [`docs/specs/p10-institutional-lms-evolution.md`](docs/specs/p10-institutional-lms-evolution.md): Institutional LMS core, enrollment isolation, and bounded real-time architecture spec (SDD).
- [`docs/specs/p11-ui-ux-deliberate-remediation.md`](docs/specs/p11-ui-ux-deliberate-remediation.md): UI/UX Deliberate Quality Remediation, Manrope/Merriweather Typography SSOT & Layout Performance spec (SDD).
- [`openspec/changes/add-rich-classroom-posts`](openspec/changes/add-rich-classroom-posts/proposal.md): CEO-55, publicaciones técnicas seguras con Markdown, código, KaTeX y vista previa compartida en web/Android.
- **Discord AI Bridges & Automation Suite** (Implemented 2026-08-14 / 2026-08-15): Inyección de contexto histórico del canal en bridges locales, persistencia de sesiones en disco (`.cache/`), ejecución de comandos `/doctor`, `/review-pr` y webhook de CI/CD en `app/api/webhooks/github/route.ts`. **Asistente Cloud 24/7 en Vercel Serverless** implementado en `app/api/discord/interactions/route.ts`: soporta comando `/gemini` (y `/consultar`) con respuesta diferida (`type: 5`), inyección de contexto en vivo (`AGENTS.md`, `PLAN.md`, `design-ceoubb.md`), _Function Calling_ nativo hacia Linear (`LINEAR_API_KEY`) y GitHub (`GITHUB_TOKEN`), y script de registro global/guild `scripts/register-discord-commands.js`. 37/37 unit tests pasados, `pnpm run typecheck`, `pnpm run lint` y `next build` limpios.

## Active work

- [ACTIVE] **CEO-55 — Publicaciones técnicas con Markdown, bloques de código y fórmulas (2026-08-20).** Rama `elpapijuaco325/ceo-55-editor-rico-para-publicaciones-markdown-bloques-de-codigo-y`; cambio OpenSpec [`add-rich-classroom-posts`](openspec/changes/add-rich-classroom-posts/proposal.md), capacidad `classroom/rich-posts` (`REQ-RICH-01` … `REQ-RICH-07`). Conserva `body: string`, reutiliza KaTeX vendorizado, no añade dependencias ni implementación Android paralela, y limita nuevas escrituras a 40.000 caracteres. Archivos principales: `lib/rich-text.ts`, `app/views/classroom/RichText.tsx`, `app/views/classroom/RichPostEditor.tsx`, integración de aula, estilos y `tests/rich-text.test.ts`. Verificación final y PR pendientes.
- [BLOQUEADO EN DESPLIEGUE] **P14 — Privacidad y términos para datos académicos reales (CEO-11, 2026-08-20).** Rama `claude/ceo-11-issue-98568f`. Cambio OpenSpec [`openspec/changes/expand-privacy-for-academic-data`](openspec/changes/expand-privacy-for-academic-data/proposal.md), capacidad `legal/privacy-and-terms` (`REQ-PRIV-01` … `REQ-PRIV-08`):
  - **Inventario de datos académicos (REQ-PRIV-01):** `app/privacidad/page.tsx` reescrita en ocho secciones numeradas y citables; declara notas 1,0–7,0, evaluaciones, ponderaciones, promedios, matrículas, entregas, archivos, token de notificaciones y la bitácora de auditoría con su dirección IP.
  - **Divulgación de destinatarios (REQ-PRIV-02):** se declara explícitamente que la cuenta `owner` lee las calificaciones de cualquier sección para auditar. El acceso se conserva por decisión del propietario; `firebase/firestore.rules` no cambia.
  - **Marco legal (REQ-PRIV-03):** documentos redactados bajo la Ley 21.719 (vigencia dic-2026) en vez de la 19.628, y descargo de que las notas de la plataforma no son el acta oficial de la universidad.
  - **Retención acotada (REQ-PRIV-04, REQ-PRIV-08):** `AUDIT_IP_RETENTION_MONTHS = 12` y `purgeAgedAuditIpAddresses` en `lib/services/academic-catalog.ts` anulan la IP vencida conservando el historial de puntajes; la ruta `app/api/cron/audit-retention/route.ts` exige `Bearer CRON_SECRET` (falla cerrada si el secreto falta) y `vercel.json` la agenda a diario. Sin migración de esquema.
  - **Derechos del titular (REQ-PRIV-05):** acceso, rectificación, supresión, oposición, portabilidad y bloqueo, con canal `contacto@ceoubb.com` y plazo máximo de 30 días corridos. La corrección de una nota se enruta al docente de sección. Sin endpoint self-service: la ley exige canal y plazo, no botón.
  - **Términos de uso (REQ-PRIV-06):** nueva ruta `app/terminos/page.tsx` con independencia institucional, elegibilidad por dominio, uso aceptable, responsabilidad docente sobre las notas publicadas, ausencia de garantía de disponibilidad y causales de suspensión. Enlazada desde el pie de `app/Portal.tsx` y desde `app/sitemap.xml/route.ts`.
  - **Telemetría fijada (REQ-PRIV-07):** `sentry.client.config.ts` declara `maskAllText`, `maskAllInputs` y `blockAllMedia` de forma explícita. Coinciden con el default de `@sentry/replay@10.70.0`, y van escritas para que un upgrade no retire en silencio una garantía ya publicada.
  - **CSS:** `.policy-page` se extendió con `h3`, listas, índice y rejilla `dl` término/regla; ninguna clase nueva por ruta. Desviación deliberada de la tarea 6.8, que prohibía CSS nuevo: un documento legal largo necesita índice y rejilla para poder consultarse.
  - Verificación: `pnpm run verify:fast` (169/169), `pnpm run verify:invariants` (31/31), `pnpm run lint` (0/0), `pnpm test` (194/194 tras `next build`), test-locking SHA-256 regenerado (20 archivos). Sin desbordamiento horizontal a 375px ni 1280px; contraste de cuerpo 19,9:1 y de términos 20,7:1; anclas del índice resueltas.
  - **Pendiente antes de desplegar:** provisionar y monitorear `contacto@ceoubb.com` (el documento publica un plazo contra esa casilla) y definir `CRON_SECRET` en Vercel. Tras el despliegue, verificar que la ruta de retención responde 401 sin credencial y `{ purged: n }` con ella. Recién entonces cerrar CEO-11 y habilitar la carga de notas reales.
- [DONE] **P13 — Remediación de Seguridad en Profundidad, Aislamiento de Datos y Blindaje de Invariantes (2026-08-19).** Rama `fix/deep-security-and-isolation-remediation`. Spec [`docs/specs/p13-deep-application-security-and-isolation-remediation.md`](docs/specs/p13-deep-application-security-and-isolation-remediation.md) (`VERIFICADA`):
  - **Normalización de UID en Proyección de Matrículas (REQ-SEC-07):** Saneamiento del prefijo `firebase:` en `enrollmentDocumentPath` y `parseEnrollmentProjection` de `lib/services/enrollment-projection.ts`, garantizando coincidencia exacta con `request.auth.uid` en reglas `isEnrolled()` de Firestore.
  - **Protección IDOR en Entregas de Evaluaciones (REQ-SEC-08):** Blindaje de reglas en `firebase/firestore.rules` (`/courses/{courseId}/submissions/{submissionId}`) con comprobación estricta de pertenencia `(resource == null || resource.data.uid == request.auth.uid)` en mutaciones `update`.
  - **Blindaje contra Inyección de Comandos en Discord Bridge (REQ-SEC-09):** Configuración de `shell: false` en `spawnSafeCommand` (`scripts/discord-context-helper.js`) previniendo RCE sobre Windows ante contenido no confiable de canales.
  - **Sincronización Dual-Store de Roles en el Servidor (REQ-SEC-10):** Mutación transaccional server-side en `PATCH /api/admin/users` hacia Turso y Firestore (`projectUserRoleToFirestore`) con credenciales de servicio OAuth.
  - **Aislamiento de Diagnóstico Sentry y Fuga de Variables Locales (REQ-SEC-11):** Desactivación con HTTP 404 de `/api/sentry-test` en producción y condicionamiento de `includeLocalVariables` únicamente a desarrollo en `sentry.server.config.ts`.
  - **Saneamiento de Protocolos de Enlaces (REQ-SEC-12):** Validación estricta de esquemas `http://` y `https://` en `lib/firebase/mappers.ts`, neutralizando vectores XSS vía `javascript:`.
  - **Protección de Cuenta Propietaria (REQ-SEC-13):** Bloqueo de auto-eliminación de cuentas con rol `owner` en `DELETE /api/auth/me`.
  - **Higiene en Webhooks y Firmas Criptográficas (REQ-SEC-14):** Falla cerrada ante secretos vacíos en `lib/linear-signature.ts` y sanitización de mensajes de error en webhooks de GitHub y Linear.
  - Verificación: `pnpm run verify:fast` (157/157), `pnpm run verify:invariants` (31/31), `pnpm run lint` (0 advertencias, 0 errores), `pnpm test` (182/182) y test-locking SHA-256 completados exitosamente.
- [DONE] **P11 — Remediación UI/UX Deliberate, SSOT Tipográfica Manrope/Merriweather y Rendimiento de Movimiento (2026-08-19).** Rama `feat/ceo-deliberate-ui-ux-remediation`. Spec [`docs/specs/p11-ui-ux-deliberate-remediation.md`](docs/specs/p11-ui-ux-deliberate-remediation.md) (`VERIFICADA`):
  - **SSOT Tipográfica (REQ-DELIB-01):** Unificación oficial de tipografía en `DESIGN.md`, `AGENTS.md`, `.agents/rules/003-ui-components.mdc`, `README.md` y `tests/ci-workflows.test.ts` a `Merriweather` (Display / Editorial) y `Manrope` (Core UI / Operacional).
  - **Limpieza de Kickers / Eyebrows (REQ-DELIB-08):** Eliminación de anti-patrones de micro-rótulos `.eyebrow` sobre títulos en `portal-shell.tsx`, `TeacherWorkspacePreview.tsx`, `privacidad/page.tsx` y `public/biblioteca/index.html`.
  - **Numerales Tabulares (REQ-DELIB-02):** Aplicación estricta de `.num` (`font-variant-numeric: tabular-nums lining-nums`) en `GradesSection.tsx`, `ProgressSection.tsx`, `AdminView.tsx` y `teacher-preview-panels.tsx`.
  - **Accesibilidad y Estados Táctiles (REQ-DELIB-03, REQ-DELIB-04):** Corrección de `outline: none` en `mobile-shell.css` con `:focus-visible` accesible en hojas inferiores y adición de respuesta táctil `:active` inmediata ($0\text{ms}$) en el espacio docente.
  - **Rendimiento de Movimiento (REQ-DELIB-05, REQ-DELIB-06):** Eliminación de animaciones de layout (`transition: top`, `transition: width`) por transforms GPU (`translateY`, `scaleX`) en `globals.css` y `styles.css`; protección de animaciones con `useReducedMotion()`.
  - **Tokens y Honestidad (REQ-DELIB-07):** Reemplazo de `#8b5cf6` por acento institucional en `lib/courses.ts` y `styles.css`; calibración de `theme-color` a `#0055b8` y CTA del tutor en la biblioteca.
  - Verificación: `pnpm run verify:fast` (146/146), `pnpm run verify:invariants` (31/31), `typecheck`, `lint` y `deliberate check` limpios al 100%.
- [DONE] **P10 — Núcleo académico institucional, aislamiento por matrícula y tiempo real acotado (2026-08-17).** Rama `feat/nucleo-academico-institucional`. Spec [`docs/specs/p10-institutional-lms-evolution.md`](docs/specs/p10-institutional-lms-evolution.md); planes 031–034.
  - **031 (REQ-ACAD-01, REQ-AUDIT-01).** `db/schema.ts` define `facultades`, `departamentos`, `carreras`, `asignaturas`, `periodos`, `secciones`, `matriculas` y `grade_audit_logs`, con el índice único `idx_seccion_asignatura_periodo_num` y `idx_matriculas_seccion_usuario`. Migración `drizzle/0004_dear_lorna_dane.sql`. `lib/services/academic-catalog.ts` expone consultas con `.limit()` y cursor indexado; `tests/academic-model.test.ts` fija estructura, cascadas y el techo de página.
  - **032 (REQ-SEC-01, REQ-SEC-02, REQ-ACAD-02).** Se eliminaron `DEVELOPER_EMAILS` y las cuentas personales de `lib/access-policy.ts`, de ambos ficheros de reglas y de `android/.../firebase.xml`. El rango `owner` se lee de `users.role` mediante `role()`. `lib/services/enrollment-projection.ts` proyecta la matrícula a `enrollments/{uid}/sections/{seccionId}` por REST con cuenta de servicio (sin dependencias nuevas) y las reglas la exigen con `exists()`. Se retiraron los dos comodines `match /{path=**}/`.
  - **033 (REQ-PERF-01, REQ-PERF-02).** `watchCourseActivity` y `watchGradebooks` reciben las secciones matriculadas y abren una escucha por sección (tope 40, 20 publicaciones por sección) en vez de barrer `collectionGroup`. `saveSectionScores` particiona la matriz en lotes de 400 operaciones. `GET /api/enrollments/me` alimenta al portal.
  - **034 (REQ-EVAL-01).** `uploadStudentSubmission` sube a `courses/{seccionId}/submissions/{evalId}/{uid}/` con techo de 25 MB y comprobante en Firestore; `GradesSection.tsx` muestra adjuntar, progreso y comprobante dentro de la propia evaluación en escritorio y en la hoja móvil.
  - **Riesgo de despliegue.** Las reglas deniegan toda sección sin marcador de matrícula: hay que proyectar las matrículas y publicar `FIREBASE_SERVICE_ACCOUNT_EMAIL` / `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` antes de desplegar. Además ninguna cuenta `@gmail.com` puede volver a iniciar sesión: el propietario debe operar con una cuenta institucional promovida a `users.role = 'owner'`.
  - Verificación: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:unit` (146/146), `pnpm run verify:invariants` y `pnpm test` en verde; snapshot SHA-256 de pruebas regenerado por enmienda formal de la spec (`SPEC-010`, estado `APROBADA`).
- [DONE] **React Doctor 100 Health Score & Frontend Reliability Remediations (2026-08-17).** PR #31 (`feat/react-doctor-100-health-score`). Planes 028, 029 y 030 completados. 100/100 en React Doctor con 0 advertencias, 0 errores y 0 reglas suprimidas o ignoradas. Modularización de `app/Portal.tsx` (`portal-screens.tsx`, `portal-shell.tsx`, `portal-sheets.tsx`, `portal-types.ts`), `CalendarView.tsx` (`CalendarHeader.tsx`), migración de animaciones layout a GPU transforms, unificación de estado atómico con `useReducer`, limpieza de código muerto y exports no utilizados, eliminación de mutaciones de autorización desde cliente, e integración determinista de listeners Capacitor en `useHardwareBack`.
- [ACTIVE] **P7 — Espacio docente CEOUBB: código completo en revisión.** Rama `codex/teacher-assignment-preview`, owner Codex/Joaquín. Implementa inicio docente, actividades, autoría progresiva, cola paginada, mesa de corrección, libro de calificaciones y `Vista estudiante` read-only con fixtures en memoria. La ruta `/preview/docente` queda aislada del backend, marcada `noindex` y responde 404 en producción. Local: unit 67/67, lint, typecheck, Functions, build y recorrido visual escritorio/móvil aprobados; GitHub CI, React Doctor y Vercel Preview verdes. Pendiente revisión funcional de Pipe antes de salir de Draft. `docs/specs/p7-teacher-workspace-preview.md`, `app/preview/docente/`, `tests/teacher-workspace-preview.test.ts`, `tests/rendered-html.test.mjs`.
  - **Rediseño sobre el shell del portal (2026-08-15).** La preview había levantado su propio cromo —barra institucional navy con filete heráldico, riel lateral propio, botones, campos, tablas y diálogos duplicados en un módulo CSS de 1 015 líneas con una escala tipográfica de 10–13 px— y se leía como un producto distinto del portal. Ahora monta el shell real: `.app-shell`, `.app-header` de papel (62 px, escudo UBB, rastro de contexto), `.app-sidebar` de 268 px con `.side-item` y su riel azul, cortina `.sidebar-scrim` bajo 900 px, `.portal-main`, `.page-head`, `.primary-button`/`.secondary-button`, `.next-strip` para el próximo vencimiento, `.post-list` para las actividades, `.grades-summary`/`.grades-table` para el libro, `.teacher-tools` para la mesa de corrección, `.planner-dialog` para los dos diálogos y `.empty-state`/`.sr-only` para estados y anuncios. La marca de vista previa pasó de banner propio a píldora dorada dentro del rastro de contexto —los tests de HTML siguen encontrando «Vista previa» y «datos de ejemplo»— y los tres contadores dejaron de ser tres tarjetas iguales para ser una sola tira con tres lecturas. El módulo CSS bajó de 1 015 a 721 líneas y sólo conserva lo que el portal no tiene (flujo de la actividad, cola de entregas, rúbrica, hoja de entrega simulada, píldoras de estado). El riel arranca cerrado en móvil vía `useSyncExternalStore` sobre `matchMedia`, no con un efecto que fije estado. Corregido de paso el rótulo duplicado «Sección Sección 1». Verificación: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit` (104/104) y `pnpm test` (129/129) en verde; recorrido en 1440×1000 y 375×812 sin scroll horizontal, con tabla de entregas contenida en su propio `overflow-x`, mesa de corrección apilada bajo 1100 px y ambos diálogos con cuerpo desplazable. El detector de Impeccable sólo reporta avisos sobre tamaños y colores que el propio `app/globals.css` ya usa (13 px, `#047857`, `#0369a1`).
- [DONE] **P9: Evolución del Arnés de Desarrollo, Gobernanza de Contexto y SDD Enterprise (2026-08-17).** Spec [`docs/specs/p9-enterprise-harness-evolution.md`](docs/specs/p9-enterprise-harness-evolution.md).
- [DONE] **Dual-store user role mutation sync (2026-08-17).** Resolved teacher promotion desynchronization between Turso (`users.role`) and Firestore (`users/{uid}.role`) via `updateRemoteUserRole` and `AdminView.tsx`. Verified with `tests/admin-api.test.ts` (REQ-ACCESS-04).
- [DONE] **P8: Optimizaciones de Rendimiento, Escalabilidad y Desacoplamiento de Carga (2026-08-16).** Rama `feat/perf-and-scalability-remediations`. Spec [`docs/specs/p8-performance-and-scalability-remediations.md`](docs/specs/p8-performance-and-scalability-remediations.md).
- [DONE] **P7: Estandarización Enterprise del Repositorio y Arquitectura Documental (2026-08-16).** PR #22. Spec [`docs/specs/p7-enterprise-repository-standards.md`](docs/specs/p7-enterprise-repository-standards.md).
- [DONE] **Automatización de Releases y Distribución de APK (2026-08-16).** PR #21.
- [DONE] **P6 — Automatizaciones de CI/CD y Calidad de Integración (2026-08-16).** Rama `feat/ci-cd-automations`. Spec [`docs/specs/p6-ci-cd-automation-enhancements.md`](docs/specs/p6-ci-cd-automation-enhancements.md) (`VERIFICADA`):
  - **TASK-01 (REQ-CICD-07)**: `.github/labeler.yml` y `.github/workflows/labeler.yml` con `actions/labeler@v5` para etiquetado automático por rutas (`📱 mobile / android`, `🔥 firebase / backend`, `🌐 web / frontend`, `📝 documentation`, `⚙️ ci / cd`).
  - **TASK-02 (REQ-CICD-05, REQ-CICD-06)**: `.github/workflows/semantic-pr.yml` con `amannn/action-semantic-pull-request@v5` para control de Conventional Commits y títulos en Español.
  - **TASK-03 (REQ-CICD-01, REQ-CICD-02)**: `.github/workflows/android-ci.yml` para compilación nativa de Capacitor (`assembleDebug lintDebug`) con JDK 21 (Temurin), caché Gradle y alerta de Discord en `#🚨-❙-alertas`.
  - **TASK-04 (REQ-CICD-03, REQ-CICD-04)**: `scripts/check-bundle-size.mjs` y `.github/workflows/bundle-analysis.yml` para presupuesto de First Load JS y generación de reporte en `GITHUB_STEP_SUMMARY`.
  - **TASK-05 (REQ-CICD-08)**: `tests/ci-workflows.test.ts` con cobertura de sintaxis de workflows, configuración de labeler, linter de títulos y presupuesto de bundle. Registrado en `package.json`.
  - Verificación: `pnpm run test:unit` (100/100), `pnpm test` (123/123), `pnpm run typecheck`, `pnpm run lint`, `check:functions` y `check:rules` todos en verde.
- [DONE] **Refactorización de Arquitectura, Modularidad y Tests (2026-08-15).** Rama `feat/code-structure-refactor`.
- [DONE] **P6 — Pase de UI/UX móvil sobre el portal (2026-08-15).**
- [NEXT] **P6: deuda declarada: el inset inferior de Android es una constante, no una medida.** `--safe-bottom` usa `max(env(...), 24px)` por debajo de 768px porque la WebView no expone el alto real de la barra de gestos. En un teléfono con navegación de tres botones o sin barra, esos 24px son relleno que nadie pidió. La solución correcta es leer el inset desde el contenedor nativo y publicarlo como variable CSS al arrancar. `app/globals.css`, `lib/mobile-bridge.ts`
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
- [NEXT] Grade audit trail: author, timestamp, previous value on every score change (P0.9). `lib/firebase-classroom-client.ts`, `firebase/firestore.rules`, `firebase/functions/`
- [NEXT] Backups and a **drilled** restore: scheduled Firestore export, Turso backup, stated RPO/RTO (P0.8). Sharpest risk in the repository. Firebase, Turso, `firebase/functions/`
- [NEXT] Firebase Emulator Suite rule tests for Firestore and Storage as merge gate (P0.10). `tests/`, `firebase/`
- [NEXT] Staging Firebase project and seeded emulator dataset (P0.11). Every deploy instruction targets production today. Firebase, `firebase/`
- [NEXT] Define and record the P0.7 capacity and cost targets, then load-check against them. Without numbers, "production-ready" is untestable. `docs/specs/p0-pilot-safety.md`, Google Cloud billing
- [NEXT] Run the production authentication, Storage and notification test matrix (P0.1-P0.3). Web, Android, Firebase
- [NEXT] Configure billing budget alerts and App Check rollout (P0.4, P0.5). Google Cloud, Firebase
- [BLOCKED] Project owner: **written authorization for an institutional pilot** with one departamento or carrera: named academic sponsor, one semester, real students, signed data-processing annex. No agent can do this; every adoption item depends on it. UBB (DTI, VRA, jurídica)
- [BLOCKED] Project owner: Google Play verification and official listing URL. Play Console
- [BLOCKED] Project owner: choose and fund the native iOS strategy and Apple Developer enrollment. App Store Connect
- [BACKLOG] Assignment submissions against an evaluation + teacher feedback text per grade. `lib/firebase-classroom-client.ts`, `app/Classroom.tsx`, `firebase/*.rules`
- [BACKLOG] "Mi Bodega" personal file locker. Deferred by decision; needs a per-student quota and a Storage cost estimate first. Firebase Storage, `firebase/storage.rules`
- [BACKLOG] Participants directory: `Ayudantes` role, roster search/filter, contact actions. `app/Classroom.tsx`
- [BACKLOG] Calendar month view, recurring weekly class schedules, and drag-to-create/move in the planner grid. The weekly view shipped with P2. `app/views/calendar/`, `lib/courses.ts`
- [BACKLOG] Load real learning outcomes and evaluation schedules for the five non-Estática ramos. `lib/courses.ts`
- [BACKLOG] Interoperability: LTI 1.3, SCORM/xAPI, IMS Common Cartridge, QTI, Moodle `.mbz` importer (P0B.3). Required for adoption; nothing exists. New surface
- [BACKLOG] WCAG 2.2 AA audit and published conformance statement (P0B.5). Legal obligation for a state body. Web portal, `public/biblioteca/`
- [BACKLOG] Project owner: tenancy, licensing and continuity dossier: transfer procedure for Firebase/Vercel/Turso, declared license or escrow, maintenance commitment, external penetration test (P0B.6). Governance

## Production inventory: what is NOT done

Everything not listed here is done and verified; the full inventory lives in `docs/archive/PLAN_ARCHIVE.md`. Deployed and working today: `ceoubb.com` on Vercel with Turso, Firebase Auth with the institutional domain policy, Firestore + Storage rules published, `notifyStudentsOnCoursePost` and `deleteMyAccount` on Node.js 22 in `southamerica-west1`, FCM HTTP v1, PWA, `/biblioteca/`, `/privacidad`, Android source at `versionCode 13` / `versionName 1.0.6`.

- Web: store badges have no listing URLs (placeholders, non-clickable); no public account-deletion entry page; the local portal/library redesign is uncommitted and undeployed.
- Android: release AAB install, Google sign-in, upload/download, role behaviour, account deletion and FCM delivery **not verified** on a clean physical device. Bundled library still on the old dark maroon theme.
- iOS: nothing exists: no Xcode project, bundle ID, APNs config or iOS Firebase app. Badge is a placeholder and must not be linked.
- Firebase/GCP: App Check not configured; no web push VAPID key; no Emulator Suite rule tests; no Cloud Billing budgets or alerts; billing trial/paid status still **pending verification**.
- GitHub: branch protection and required review not documented as enabled.

## Architectural risks and technical debt

Detail and remediation live in the spec files; this is the index.

- **Static catalogue, no enrollment model**: the blocking debt. `courseId` carries no section and no period, so paralelos and successive years collide in one collection; roles are global and email-derived; no bulk enrollment path. Cost rises with every day of real pilot data. -> [`p1-academic-model.md`](docs/specs/p1-academic-model.md)
- **No grade audit trail**: `grades/{uid}` overwritten in place. Disqualifying for an official gradebook. -> P0.9
- **No backups, no proven restore**: no Firestore export, no Turso backup, no restore ever performed. -> P0.8
- **Consumer identity and personal-account superusers**: two hardcoded Gmail owners across web, both rules files and the Android service. -> P0B.1
- **Single environment, no CI**: one Firebase project, deploys go straight to it, rules have no emulator tests. -> P0.10, P0.11
- **No capacity or cost model**: "production-ready" is untestable and cost per student does not exist. -> P0.7
- **Governance and continuity**: personal Firebase/Vercel/Turso accounts, no license, no data-processing agreement, no accessibility statement, no external pentest, bus factor of two. -> P0B.6
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
2. CI + rules emulator tests (P0.10) and staging (P0.11). Everything after this is verified before production.
3. Backups and a drilled restore (P0.8) prior to teachers entering real grades.
4. P0.4 and P0.5 before inviting a larger beta group.
5. P0.6 and the `/privacidad` grade update, before store submission or real grades, whichever comes first.
6. Grade audit trail (P0.9).
7. Define P0.7 targets, then build the academic data model against them. Course identity lands first; enrollment-gated rules land with it.
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

In parallel, the owner starts P0B.7 item 1 (pilot authorization) and fills in the P0.7 capacity and cost targets.
