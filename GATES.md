# GATES.md — Acceptance Gates & Quality Invariants Protocol (Tree 3 Software Reliability, Concurrency & Data Integrity Audit)

> **AUDIT RUNNER:** Principal Software Reliability Engineer & Lead Code Auditor  
> **DISCIPLINE:** `/improve` (Read-only on source code; self-contained remediation plans) & `/unlazy tree 3`  
> **TARGET REPO:** `CEOUBB` (`cl.ubb.centroestudio` / `centro-de-estudio-ubb`)  
> **COMMIT BASELINE:** `8d0ef73`  
> **STATUS:** ALL 11 RELIABILITY REMEDIATION PLANS (070–080) FULLY IMPLEMENTED & VERIFIED ON PRODUCTION AND LOCAL RUNTIMES

---

## 1. Branch 1: Logical Edge Cases & Numeric Integrity

### 1.1 `leaf-numeric-bounds`

- **OWNS:** `lib/grades.ts`, `lib/portal-utils.ts`, `lib/firebase/storage.ts`, `lib/planner.ts`, `tests/grades.test.ts`, `tests/portal-utils.test.ts`
- **CHECK:** Auditar operaciones aritméticas (división, multiplicación, redondeo, ponderación), desbordamiento de límites numéricos, valores `NaN`, `Infinity`, arrays vacíos y coerción de strings inválidos.
  - Oráculo 1: `normalizeItems([{ id: 'test', weight: 'foo' }])` no debe emitir items con `weight: NaN`.
  - Oráculo 2: `countdown('invalid')` no debe retornar cadenas que contengan `'NaN'`.
  - Oráculo 3: `formatBytes(0)` debe retornar `'0 KB'` o `'0 B'` en lugar de `'1 KB'`.
  - Oráculo 4: `onProgress` en `lib/firebase/storage.ts` debe evaluar `snapshot.totalBytes > 0` antes de dividir.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 073](plans/073-edge-grades-nan-weight-leak.md) (blindaje de `normalizeItems` con `Number.isFinite`) y [Plan 071](plans/071-bug-formatday-rangeerror-whitewash.md) (`formatBytes(0)` y prevención de `NaN` en `countdown`).

### 1.2 `leaf-null-coalescing`

- **OWNS:** `lib/firebase/mappers.ts`, `lib/portal-utils.ts`, `app/views/classroom/GradeHistoryDialog.tsx`, `app/portal-types.ts`, `tests/firebase-mappers.test.ts`, `tests/portal-utils.test.ts`
- **CHECK:** Auditar encadenamiento opcional inseguro (`obj?.a.b`), aserciones no nulas forzadas (`!`), coerción implícita de tipos, manipulación de fechas en `iso()` y `formatDay()`.
  - Oráculo 1: `iso('2026-01-01T00:00:00.000Z')` debe preservar la marca temporal en lugar de sobreescribirla con `new Date().toISOString()`.
  - Oráculo 2: `formatDay('2026-09-04T19:12:08.000Z')` no debe lanzar `RangeError: Invalid time value`.
  - Oráculo 3: `GradeHistoryDialog.tsx:153` no debe evaluar `page?.items.length` sin proteger `page.items`.
  - Oráculo 4: `readSeen()` en `app/portal-types.ts` debe verificar `!Array.isArray(saved)`.
- **EXPECT:** `iso()` valida strings ISO existentes y timestamps numéricos; `formatDay()` detecta cadenas con `T` y no duplica sufijos de hora; encadenamiento opcional completo `(page?.items?.length ?? 0) === 0`.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 070](plans/070-bug-iso-mapper-timestamp-corruption.md), [Plan 071](plans/071-bug-formatday-rangeerror-whitewash.md) y [Plan 078](plans/078-resilience-stale-closures-dialog-state.md).

---

## 2. Branch 2: Async Concurrency, Promises & Timing

### 2.1 `leaf-floating-promises`

- **OWNS:** `app/views/classroom/GradebookSettingsEditor.tsx`, `app/views/classroom/TeacherQuizzes.tsx`, `app/views/classroom/FinalGradeRecordsPanel.tsx`, `lib/firebase/grades.ts`
- **CHECK:** Auditar manejadores asíncronos (`onClick`, `onSubmit`), mutaciones sin bloqueo de reentrancia (doble clic / multi-submit), descargas sin indicador de carga ni desactivación de controles.
  - Oráculo 1: `save` en `GradebookSettingsEditor.tsx` debe impedir ejecuciones concurrentes cuando `saving === true`.
  - Oráculo 2: Botón de exportación QTI en `TeacherQuizzes.tsx` debe mantener estado de carga y desactivar clics subsiguientes mientras la descarga esté en curso.
- **EXPECT:** Guardas atómicas de reentrancia (`if (saving) return;`), atributos `disabled={saving}` en botones de acción y bloqueo de multi-envío.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 077](plans/077-concurrency-reentrancy-guards-floating-promises.md) (guardas de reentrancia y bloqueo UI en exportación QTI).

### 2.2 `leaf-stale-closures`

- **OWNS:** `app/views/classroom/GradeHistoryDialog.tsx`, `app/views/AdminView.tsx`, `app/usePortalCore.tsx`
- **CHECK:** Auditar efectos `useEffect`, dependencias omitidas en `useCallback`, retención de datos de estudiantes previos en modales y suscripciones huérfanas.
  - Oráculo 1: Al cambiar `studentId` o `gradeItemId` en `GradeHistoryDialog`, el estado previo (`page`, `error`) debe ser limpiado inmediatamente para no mostrar datos del estudiante anterior durante la carga.
  - Oráculo 2: Al cambiar `searchQuery` en `AdminView`, la paginación debe reinicializarse de forma sincronizada con el estado local.
- **EXPECT:** Limpieza explícita del estado dependiente de props al dispararse el efecto; abort controllers vinculados a señales de cancelación en cada cambio de contexto.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 078](plans/078-resilience-stale-closures-dialog-state.md) (limpieza síncrona en `useEffect` y encadenamiento seguro).

---

## 3. Branch 3: Error Handling & Resilience Boundaries

### 3.1 `leaf-swallowed-errors`

- **OWNS:** `app/views/classroom/ClassroomView.tsx`, `app/views/classroom/StudentQuizzes.tsx`, `app/views/classroom/GradesSection.tsx`, `app/views/classroom/MultimodalEditor.tsx`, `app/components/ErrorBoundary.tsx`
- **CHECK:** Identificar bloques `catch` vacíos que silencian excepciones operativas y ausencia de React Error Boundaries en módulos complejos del aula virtual.
  - Oráculo 1: Un error de renderizado en `StudentQuizzes` o `GradesSection` no debe desmontar el `Portal` completo ni forzar la redirección a `global-error.tsx`.
  - Oráculo 2: Todo error capturado en promesas o servicios debe emitir telemetría estructurada (Sentry / console.error) y feedback visual accesible.
- **EXPECT:** Componente `ClassroomErrorBoundary` envolviendo paneles dinámicos del aula virtual; retención de la sesión del usuario y opción de recuperación "Reintentar vista".
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 075](plans/075-resilience-classroom-error-boundaries.md) (componente `ClassroomErrorBoundary` con tokens OKLCH e iconos Phosphor envolviendo paneles dinámicos).

### 3.2 `leaf-partial-failures`

- **OWNS:** `lib/services/bulk-enrollment.ts`, `app/api/enrollments/import/apply/route.ts`, `lib/services/enrollment-projection.ts`
- **CHECK:** Auditar mutaciones dual-store (Turso libSQL + Cloud Firestore). Identificar fallos donde Turso confirma la transacción pero Firestore falla (cuota, red, timeout) sin mecanismo de reintento ni compensación.
  - Oráculo 1: En `applyEnrollmentImport`, si `projectEnrollments` falla, los estudiantes registrados en Turso no deben quedar permanentemente sin proyección en Firestore (`projectionPending: true` sin reintento).
- **EXPECT:** Reintento automático con backoff exponencial; tabla de sincronización pendiente o endpoint de conciliación para proyecciones huérfanas.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 074](plans/074-concurrency-dual-store-enrollment-orphans.md) (telemetría estructurada, retorno de estado y endpoint de reconciliación de proyecciones huérfanas).

---

## 4. Branch 4: Persistence & Data Desynchronization

### 4.1 `leaf-schema-drifts`

- **OWNS:** `db/schema.ts`, `drizzle/`, `lib/services/teacher-course-management.ts`, `lib/services/bulk-enrollment.ts`
- **CHECK:** Cotejar mediante Turso MCP (`execute_read_only_query`, `describe_table`) la concordancia exacta entre el esquema Drizzle y la base de datos de producción `ceoubb`.
  - Oráculo 1: Las tablas `section_profiles`, `assistant_assignments`, `matriculas_pendientes`, `moodle_imports` deben existir en la base de datos de producción `ceoubb`.
  - Oráculo 2: Los índices `idx_sessions_expires_at` e `idx_sessions_user_id` deben existir en la tabla `sessions` de producción.
- **EXPECT:** Cero errores `SQLite error: no such table` en endpoints de gestión docente y matriculación; tablas e índices B-Tree creados en producción.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 072](plans/072-bug-turso-schema-drift-missing-tables.md). Ejecutado DDL idempotente en producción `ceoubb` mediante Turso MCP: 4 tablas (`section_profiles`, `assistant_assignments`, `matriculas_pendientes`, `moodle_imports`) e índices B-Tree creados y verificados al 100%.

### 4.2 `leaf-orphaned-projections`

- **OWNS:** `app/views/AdminView.tsx`, `app/api/admin/users/route.ts`, `lib/services/enrollment-projection.ts`
- **CHECK:** Auditar discrepancias de roles y membresías entre Turso y Firestore. Identificar escrituras redundantes o descoordinadas desde el cliente.
  - Oráculo 1: `AdminView.tsx` no debe mutar Firestore directamente (`updateRemoteUserRole`) si `app/api/admin/users` ya gestiona la transacción dual-store con reversión automática en el servidor.
- **EXPECT:** Eliminación de la llamada cliente redundante; respeto irrestricto del principio de Single Source of Truth (SSOT).
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 079](plans/079-ssot-dual-store-admin-mutation.md) (eliminación de mutación cliente redundante a Firestore, centralizada en `/api/admin/users`).

---

## 5. Branch 5: Architectural Debt & Maintainability (Fragility)

### 5.1 `leaf-god-modules`

- **OWNS:** `app/views/classroom/MultimodalEditor.tsx`, `app/views/classroom/GradesSection.tsx`, `lib/rich-text.ts`
- **CHECK:** Identificar módulos gigantes (>700 líneas) con alta complejidad ciclomática, múltiples responsabilidades acopladas y riesgo severo de regresión al ser modificados.
  - Oráculo 1: `MultimodalEditor.tsx` (2.765 líneas) debe descomponerse en sub-módulos cohesivos (barra de herramientas, parser KaTeX, modal de código, slash menu).
  - Oráculo 2: `GradesSection.tsx` (956 líneas) debe separar la planilla docente de la vista de notas del estudiante.
- **EXPECT:** Plan de modularización y desacoplamiento estructural con interfaces de props tipadas y cero regresiones funcionales.
- **STATUS:** ⚠️ **TECHNICAL DEBT AUDITED & CATALOGUED** — Documentado en Matriz de Confiabilidad (Hallazgos 5.1.1, 5.1.2).

### 5.2 `leaf-ssot-violations`

- **OWNS:** `lib/portal-utils.ts`, `lib/access-policy.ts`, `lib/grades.ts`, `app/views/AdminView.tsx`
- **CHECK:** Identificar reimplementaciones o divergencias en funciones utilitarias compartidas (parseo de fechas, cálculo de ponderaciones, dominios de acceso, mutaciones de roles).
  - Oráculo 1: Unificar las 7 funciones de formateo de fecha en `lib/portal-utils.ts` en un adaptador defensivo que soporte fechas cortas, marcas ISO completas y maneje errores sin excepciones.
  - Oráculo 2: Centralizar la mutación de roles de usuario en el servidor (`/api/admin/users`) eliminando llamadas directas del cliente a Firestore en `AdminView.tsx`.
- **EXPECT:** Utilidad canónica consolidada `formatAcademicDate` y eliminación de bypass cliente a Firestore.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 071](plans/071-bug-formatday-rangeerror-whitewash.md) y [Plan 079](plans/079-ssot-dual-store-admin-mutation.md).

---

## 6. Branch 6: Client Runtime, Mobile Seams & Offline States

### 6.1 `leaf-offline-fallbacks`

- **OWNS:** `android/app/src/main/java/cl/ubb/centroestudio/MainActivity.java`, `capacitor.config.ts`, `capacitor/www/index.html`
- **CHECK:** Auditar el comportamiento del contenedor móvil Capacitor ante fallos de conexión al arrancar (`server.url: 'https://ceoubb.com'`).
  - Oráculo 1: Si el dispositivo está sin conexión o falla la resolución DNS, la WebView debe cargar `capacitor/www/index.html` en lugar de la pantalla de error nativa de Chromium (`net::ERR_NAME_NOT_RESOLVED`).
- **EXPECT:** Interceptor en `MainActivity.java` sobre `onReceivedError` en `WebViewClient` que redirige a la URL local de respaldo (`webDir`).
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 076](plans/076-mobile-offline-webview-fallback.md) (intercepción en `MainActivity.java` y `errorPath` en `capacitor.config.ts`).

### 6.2 `leaf-device-boundaries`

- **OWNS:** `lib/user-preferences.ts`, `lib/mobile-bridge.ts`, `app/views/SettingsView.tsx`
- **CHECK:** Auditar lectura de almacenamiento local (`localStorage`) en WebViews restringidas o con datos corruptos / esquemas antiguos.
  - Oráculo 1: `readCache()` en `lib/user-preferences.ts` debe validar la estructura con Zod y no arrojar `TypeError` al acceder a propiedades anidadas si el JSON local está corrupto.
- **EXPECT:** Validación determinista `userPreferencesSchema.safeParse` con fallback transparente a `defaultPreferences()`.
- **STATUS:** ✅ **VERIFIED & REMEDIATED** — Resuelto en [Plan 080](plans/080-resilience-user-preferences-zod-cache.md) (validación determinista Zod en caché de preferencias con fallback seguro).
