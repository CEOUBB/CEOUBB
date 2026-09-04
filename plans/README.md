# Master Architecture Remediation Index & Risk/Performance Matrix

> **AUDIT FRAMEWORK:** Tree 3 Depth Analysis (Reliability, Concurrency, Performance & Cybersecurity)  
> **DISCIPLINE:** `/improve` (Self-contained, production-grade remediation specifications)  
> **APPLICATION:** Centro de Estudio UBB (`CEOUBB`) — Institutional LMS  
> **TARGET BASELINE:** Cloudflare Workers, Turso libSQL, Firebase Auth/Firestore/Storage/Functions, Capacitor 7 Mobile  
> **LATEST COMMIT AUDITED:** `8d0ef73`

---

## 1. Executive Summary & Overall Health

This repository index houses the definitive remediation specifications derived from the comprehensive Tree 3 institutional audits:
1. **Software Reliability, Concurrency & Data Integrity Audit:** Plans 070–080 (Active & Gated).
2. **Performance, Algorithmic Complexity & Core Web Vitals Audit:** Plans 060–065 (Completed & Gated).
3. **Cybersecurity & Multi-Store Invariants Audit:** Plans 050–059 (Mitigated & Superada).

All plans are fully self-contained, specify exact file locations, explain the concrete failure scenario with failing test cases, and include complete, compilable implementations with zero placeholders or `// TODO` comments.

---

## 2. Master Software Reliability & Concurrency Matrix (Plans 070–080)

| # | Plan | Surface / Domain | Severity / Impact | Failure Scenario & Root Cause | Proposed Remediation | Effort | Evidence (`file:line`) | Status |
|---|---|---|---|---|---|---|---|---|
| **070** | [Plan 070](070-bug-iso-mapper-timestamp-corruption.md) | Firebase Cloud Mappers | **CRITICAL (P1)** | `iso(value)` descarta cadenas ISO históricas y las sobrescribe con la hora actual (`NOW`), corrompiendo notificaciones y fechas de entrega | Validar strings ISO, timestamps numéricos e instancias `Date` antes de recurrir a `NOW` | S | [`lib/firebase/mappers.ts#L177-L186`](../lib/firebase/mappers.ts#L177-L186), [`lib/firebase/quizzes.ts#L116`](../lib/firebase/quizzes.ts#L116), [`lib/firebase/posts.ts#L427`](../lib/firebase/posts.ts#L427) | **COMPLETED** |
| **071** | [Plan 071](071-bug-formatday-rangeerror-whitewash.md) | Web Client Formatting | **CRITICAL (P1)** | `formatDay()` concatena `T12:00:00` sobre marcas ISO completas produciendo `Invalid Date` y arrojando `RangeError`, provocando pantalla blanca en cuestionarios | Parser defensivo `parseDateSafely()` que detecta marcas ISO existentes y previene excepciones | S | [`lib/portal-utils.ts#L232-L235`](../lib/portal-utils.ts#L232-L235), [`app/views/classroom/StudentQuizzes.tsx#L362`](../app/views/classroom/StudentQuizzes.tsx#L362) | **COMPLETED** |
| **072** | [Plan 072](072-bug-turso-schema-drift-missing-tables.md) | Persistence / Turso libSQL | **CRITICAL (P1)** | Turso producción (`ceoubb`) carece de 4 tablas (`section_profiles`, `assistant_assignments`, `matriculas_pendientes`, `moodle_imports`) y 2 índices, arrojando `no such table` | Script DDL idempotente para crear tablas e índices faltantes en Turso producción | M | [`db/schema.ts#L148-L205`](../db/schema.ts#L148-L205), [`lib/services/teacher-course-management.ts#L225`](../lib/services/teacher-course-management.ts#L225), Turso MCP `ceoubb` | **COMPLETED** |
| **073** | [Plan 073](073-edge-grades-nan-weight-leak.md) | Academic Grade Engine | **HIGH (P1)** | `normalizeItems` evalúa `Math.max(0, NaN) <= 0` como `false`, filtrando ítems con `weight: NaN` que corrompen promedios y notas requeridas | Filtrar explícitamente con `Number.isFinite(rawWeight) && rawWeight > 0` | S | [`lib/grades.ts#L68-L84`](../lib/grades.ts#L68-L84), [`tests/grades.test.ts`](../tests/grades.test.ts) | **COMPLETED** |
| **074** | [Plan 074](074-concurrency-dual-store-enrollment-orphans.md) | Multi-Store Concurrency | **HIGH (P2)** | Si `projectEnrollments` falla tras escribir en Turso, el error se silencia y los alumnos matriculados quedan huérfanos sin acceso a Firestore | Telemetría estructurada, retorno de estado y endpoint de reconciliación de proyecciones | M | [`lib/services/bulk-enrollment.ts#L124-L153`](../lib/services/bulk-enrollment.ts#L124-L153), [`app/api/enrollments/import/apply/route.ts#L18`](../app/api/enrollments/import/apply/route.ts#L18) | **COMPLETED** |
| **075** | [Plan 075](075-resilience-classroom-error-boundaries.md) | React Resilience Boundary | **MEDIUM (P2)** | Ausencia total de Error Boundaries en el aula; cualquier error de renderizado desmonta el portal completo hacia `global-error.tsx` | Implementar `ClassroomErrorBoundary` accesible con tokens OKLCH e iconos Phosphor | M | [`app/views/ClassroomView.tsx`](../app/views/ClassroomView.tsx), [`app/global-error.tsx`](../app/global-error.tsx) | **COMPLETED** |
| **076** | [Plan 076](076-mobile-offline-webview-fallback.md) | Capacitor Android Bridge | **MEDIUM (P2)** | `MainActivity.java` vacía; ante fallos de conexión al arrancar en modo remote-first, Android muestra el error nativo de Chromium en lugar del fallback local | Interceptar `onReceivedError` en `WebViewClient` y redirigir a `capacitor/www/index.html` | S | [`android/app/src/main/java/.../MainActivity.java#L5`](../android/app/src/main/java/cl/ubb/centroestudio/MainActivity.java#L5), [`capacitor.config.ts#L20-L25`](../capacitor.config.ts#L20-L25) | **COMPLETED** |
| **077** | [Plan 077](077-concurrency-reentrancy-guards-floating-promises.md) | Async Concurrency / Forms | **HIGH (P2)** | Doble clic rápido en "Guardar esquema" o "Exportar QTI" dispara mutaciones y descargas concurrentes sin bloqueo de reentrancia | Guardas `if (saving) return;`, atributos `disabled` e indicadores de carga | S | [`app/views/classroom/GradebookSettingsEditor.tsx#L45`](../app/views/classroom/GradebookSettingsEditor.tsx#L45), [`app/views/classroom/TeacherQuizzes.tsx#L220`](../app/views/classroom/TeacherQuizzes.tsx#L220) | **COMPLETED** |
| **078** | [Plan 078](078-resilience-stale-closures-dialog-state.md) | React State & Closures | **MEDIUM (P2)** | Al cambiar de estudiante en el diálogo de historial, no se resetea el estado previo y se muestran notas obsoletas; `page?.items.length` arroja TypeError si items es nulo | Limpieza síncrona en `useEffect` y encadenamiento seguro `(page?.items?.length ?? 0)` | S | [`app/views/classroom/GradeHistoryDialog.tsx#L112-L153`](../app/views/classroom/GradeHistoryDialog.tsx#L112-L153) | **COMPLETED** |
| **079** | [Plan 079](079-ssot-dual-store-admin-mutation.md) | Multi-Store Persistence SSOT | **MEDIUM (P2)** | `AdminView` ejecuta escritura redundante a Firestore desde el cliente tras mutación en backend, arrojando falsas advertencias y violando SSOT | Eliminar llamada cliente redundante y confiar en la transacción compensatoria de `/api/admin/users` | S | [`app/views/AdminView.tsx#L116-L129`](../app/views/AdminView.tsx#L116-L129), [`app/api/admin/users/route.ts#L150-L170`](../app/api/admin/users/route.ts#L150-L170) | **COMPLETED** |
| **080** | [Plan 080](080-resilience-user-preferences-zod-cache.md) | Local Storage & Type Safety | **MEDIUM (P2)** | `readCache()` realiza cast inseguro `as UserPreferences` de `localStorage` sin Zod, colapsando la UI con `TypeError` ante esquemas antiguos o corruptos | Validación determinista con `preferencesSchema.safeParse` y fallback a `defaultPreferences()` | S | [`lib/user-preferences.ts#L38-L46`](../lib/user-preferences.ts#L38-L46), [`lib/services/user-profile.ts#L48-L56`](../lib/services/user-profile.ts#L48-L56) | **COMPLETED** |

---

## 3. Comprehensive Reliability Findings Ledger (Tree 3 Audit)

| # | Archivo / Función | Rama / Hoja | Tipo de Defecto | Escenario de Disparo (Trigger) | Impacto | Esfuerzo | Evidencia (`file:line`) | Plan Asociado |
|---|---|---|---|---|---|---|---|---|
| **R01** | `lib/firebase/mappers.ts:iso()` | 1.2 `leaf-null-coalescing` | Corrupción de fechas históricas | Se invoca `iso("2026-01-01T00:00:00Z")` y descarta la fecha retornando `NOW` | Fechas de entrega e hilos de chat se muestran como recién creados | S | `lib/firebase/mappers.ts:L177-L186` | [Plan 070](070-bug-iso-mapper-timestamp-corruption.md) |
| **R02** | `lib/portal-utils.ts:formatDay()` | 1.2 `leaf-null-coalescing` | Fatal `RangeError` (Crash) | Estudiante abre resultados de cuestionario con marca ISO completa | Pantalla blanca de error fatal (`global-error.tsx`) | S | `lib/portal-utils.ts:L233`, `StudentQuizzes.tsx:L362` | [Plan 071](071-bug-formatday-rangeerror-whitewash.md) |
| **R03** | Turso DB `ceoubb` | 4.1 `leaf-schema-drifts` | Fatal `no such table` | Docente intenta consultar o editar perfil de asignatura en `/api/teacher/courses` | Error 500 / Crash de endpoints de cursos docentes en producción | M | `db/schema.ts:L148`, Turso MCP `describe_table` | [Plan 072](072-bug-turso-schema-drift-missing-tables.md) |
| **R04** | `lib/grades.ts:normalizeItems()` | 1.1 `leaf-numeric-bounds` | Fuga de `NaN` | Input de ponderación contiene string no numérico (`"foo"`) | `summarize` produce `totalWeight: NaN`; `requiredGrade` retorna `NaN` | S | `lib/grades.ts:L73-L75` | [Plan 073](073-edge-grades-nan-weight-leak.md) |
| **R05** | `lib/services/bulk-enrollment.ts` | 3.2 `leaf-partial-failures` | Estado huérfano / Desync | Falla temporal de Google Cloud tras escribir matrículas en Turso | Estudiantes matriculados sin acceso a Firestore (403 permanente) | M | `lib/services/bulk-enrollment.ts:L133-L152` | [Plan 074](074-concurrency-dual-store-enrollment-orphans.md) |
| **R06** | `app/views/ClassroomView.tsx` | 3.1 `leaf-swallowed-errors` | Ausencia de Error Boundary | Cualquier error de renderizado en panel hijo desborda al documento raíz | Desmontaje total de la SPA y pérdida de formularios no guardados | M | `app/views/ClassroomView.tsx`, `app/global-error.tsx` | [Plan 075](075-resilience-classroom-error-boundaries.md) |
| **R07** | `MainActivity.java` | 6.1 `leaf-offline-fallbacks` | Falla de fallback offline | Inicio de app móvil Android sin conexión en modo remote-first | Muestra error hostil Chromium `net::ERR_NAME_NOT_RESOLVED` | S | `android/.../MainActivity.java:L5` | [Plan 076](076-mobile-offline-webview-fallback.md) |
| **R08** | `lib/firebase/grades.ts:L56,L105` | 3.1 `leaf-swallowed-errors` | Error silenciado / Sin telemetría | Falla conexión WebSocket a Firestore al observar libro de notas | Silencia el objeto de error y solo pasa string genérico a callback | S | `lib/firebase/grades.ts:L56, L105` | [Plan 075](075-resilience-classroom-error-boundaries.md) |
| **R09** | `lib/portal-utils.ts:countdown()` | 1.1 `leaf-numeric-bounds` | Salida corrupta `"En NaN días"` | Evaluación con fecha vacía o malformada | Renders visuales de días restantes muestran texto `"En NaN días"` | S | `lib/portal-utils.ts:L197-L206` | [Plan 071](071-bug-formatday-rangeerror-whitewash.md) |
| **R10** | `lib/portal-utils.ts:formatBytes()` | 1.1 `leaf-numeric-bounds` | Valor engañoso | Archivo vacío de 0 bytes se formatea como `"1 KB"` | Muestra peso falso de 1 KB en lugar de 0 B | S | `lib/portal-utils.ts:L243-L246` | [Plan 071](071-bug-formatday-rangeerror-whitewash.md) |
| **R11** | `GradebookSettingsEditor.tsx` | 2.1 `leaf-floating-promises` | Condición de carrera / Mutación doble | Docente hace doble clic rápido en "Guardar esquema" | Doble despacho de mutación auditada a Firestore | S | `GradebookSettingsEditor.tsx:L45-L66` | [Plan 077](077-concurrency-reentrancy-guards-floating-promises.md) |
| **R12** | `GradeHistoryDialog.tsx` | 2.2 `leaf-stale-closures` | Retención de datos obsoletos | Cambio de estudiante en diálogo sin limpiar estado previo | Muestra datos del alumno anterior mientras carga el nuevo | S | `GradeHistoryDialog.tsx:L116-L153` | [Plan 078](078-resilience-stale-closures-dialog-state.md) |
| **R13** | `AdminView.tsx` | 4.2 `leaf-orphaned-projections` | Mutación cliente redundante | `AdminView` llama a `updateRemoteUserRole` tras mutación en API | Riesgo de sobreescritura y falsas advertencias si falla el cliente | S | `AdminView.tsx:L119-L124` | [Plan 079](079-ssot-dual-store-admin-mutation.md) |
| **R14** | `MultimodalEditor.tsx` | 5.1 `leaf-god-modules` | Módulo Dios (Deuda Técnica) | 2.765 líneas acoplando WYSIWYG, AST Markdown, KaTeX y audio | Mantenimiento frágil y alto riesgo de regresiones | L | `MultimodalEditor.tsx:L1-L2765` | Plan Catálogo |
| **R15** | `lib/user-preferences.ts` | 6.2 `leaf-device-boundaries` | Cast inseguro de `localStorage` | Datos corruptos o esquema antiguo en almacenamiento local | `TypeError` al acceder a propiedades anidadas en el arranque | S | `lib/user-preferences.ts:L38-L46` | [Plan 080](080-resilience-user-preferences-zod-cache.md) |

---

## 4. Master Execution Order & Architectural Dependency Graph

```
[Wave 1: Critical Operational Outages & Runtime Crashes (Immediate Execution)]
       ├── [x] Plan 070: Normalización de Función iso() (lib/firebase/mappers.ts)
       ├── [x] Plan 071: Robustecimiento de formatDay() y Fechas (lib/portal-utils.ts)
       ├── [x] Plan 072: Reconciliación de Esquema Turso Producción (db/schema.ts, ceoubb)
       └── [x] Plan 073: Blindaje de normalizeItems Contra NaN (lib/grades.ts)

[Wave 2: Multi-Store Concurrency, SSOT & React Resilience Boundaries]
       ├── [x] Plan 074: Reconciliación de Proyecciones de Matrícula (lib/services/bulk-enrollment.ts)
       ├── [x] Plan 075: ClassroomErrorBoundary para el Aula Virtual (app/views/ClassroomView.tsx)
       ├── [x] Plan 077: Guardas de Reentrancia en Mutaciones Asíncronas (GradebookSettingsEditor.tsx)
       ├── [x] Plan 078: Aislamiento de Estado y Cierres en Modales (GradeHistoryDialog.tsx)
       ├── [x] Plan 079: Consolidación SSOT Dual-Store en Administración (AdminView.tsx)
       └── [x] Plan 080: Validación Zod en Caché Local de Preferencias (lib/user-preferences.ts)

[Wave 3: Mobile Native Bridge & Offline Fallback]
       └── [x] Plan 076: Intercepción de Red en Android WebView (MainActivity.java)
```

---

## 5. Prior Performance & Algorithmic Optimization Matrix (Plans 060–065)

| # | Plan | Surface / Domain | Severity / Impact | Complexity / Bottleneck | Proposed Optimization | Status |
|---|---|---|---|---|---|---|
| **060** | [Plan 060](060-perf-bundle-decoupling-academic-sanitizer.md) | Web Bundle Splitting | **HIGH (P1)** | Chunk `2jee60yzhn7je.js` (821.9 KB raw) arrastra KaTeX + Unified + Highlight.js | Segregar `sanitizeAcademicHtml` a `lib/academic-sanitizer.ts` | **COMPLETED** |
| **061** | [Plan 061](061-perf-cwv-mobile-lcp-tbt-optimization.md) | Web Runtime & Mobile IPC | **HIGH (P1)** | LCP móvil de 9.6s; TBT 430ms (reCAPTCHA upfront por import estático) | Descriptor `sizes` responsivo; lazy App Check on-intent | **COMPLETED** |
| **062** | [Plan 062](062-perf-turso-sessions-index-smart-placement.md) | Persistence & Edge Network | **HIGH (P1)** | `SCAN sessions` en poda; latencia WAN transcontinental ~150ms TTFB | Índice B-Tree `idx_sessions_expires_at`; Smart Placement | **COMPLETED** |
| **063** | [Plan 063](063-perf-bulk-enrollment-csv-parser-memory.md) | Algorithmic Complexity & GC | **MEDIUM (P2)** | Asignación de 5 MB Uint8Array para byteLength; concatenación char por char | Parser por slices e índices $O(N)$; `Buffer.byteLength` $O(1)$ | **COMPLETED** |
| **064** | [Plan 064](064-perf-react-portal-state-decomposition.md) | React Rendering Engine | **MEDIUM (P2)** | Objeto monolítico de 46 props no memoizado en `usePortalCore` | Extraer `CourseCard` en `React.memo` con handlers estables | **COMPLETED** |
| **065** | [Plan 065](065-perf-firebase-lazy-listeners.md) | Real-Time Cloud Data | **MEDIUM (P2)** | 18–24 listeners WebSockets concurrentes en montaje de portal | Lazy listeners según vista activa (`grades`); desconexión background | **COMPLETED** |

---

## 6. Master Cybersecurity Findings Table (Plans 050–059)

| # | Vulnerability | Surface | Severity | Remediation Plan | Status |
|---|---|---|---|---|---|
| **01** | Owner Account Deletion Bypass | Cloud Functions / Auth | **CRITICAL (9.1)** | [Plan 050](050-sec-owner-account-deletion.md) | **RESOLVED** |
| **02** | Foreign Key Violation & DoS on Account Deletion | Turso Relational DB | **HIGH (7.5)** | [Plan 051](051-sec-turso-foreign-keys-cascade.md) | **RESOLVED** |
| **03** | Trans-Store Role Desynchronization & Priv Escalation | Multi-Store Admin Mutation | **HIGH (7.2)** | [Plan 052](052-sec-trans-store-role-sync.md) | **RESOLVED** |
| **04** | Stored XSS via Storage MIME Validation Gap | Firebase Storage Rules | **HIGH (8.1)** | [Plan 053](053-sec-storage-mime-stored-xss.md) | **RESOLVED** |
| **05** | Unrestricted Document Schema on Profile Creation | Cloud Firestore Rules | **MEDIUM (6.5)** | [Plan 054](054-sec-firestore-profile-creation-schema.md) | **RESOLVED** |
| **06** | OS Command Injection (RCE) in Discord Bridge | Host Automation Scripts | **CRITICAL (9.8)** | [Plan 055](055-sec-discord-bridge-command-injection.md) | **RESOLVED** |
| **07** | Production WAF Bypass via `workers_dev: true` | Cloudflare Edge / WAF | **HIGH (7.5)** | [Plan 056](056-sec-cloudflare-workers-dev-waf.md) | **RESOLVED** |
| **08** | Avatar Upload Magic Bytes Spoofing | Web API / File Ingestion | **MEDIUM (6.3)** | [Plan 057](057-sec-avatar-magic-bytes-validation.md) | **RESOLVED** |
| **09** | Indirect Prompt Injection in PR Reviewer | AI Copilot / LLM | **MEDIUM (6.5)** | [Plan 058](058-sec-discord-pr-prompt-injection.md) | **RESOLVED** |
| **10** | Uncontrolled Session Concurrency & Dead Pruning | Authentication / Sessions | **MEDIUM (5.3)** | [Plan 059](059-sec-session-concurrency-dependency-audit.md) | **RESOLVED** |
