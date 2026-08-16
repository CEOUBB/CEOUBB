# P8 — Optimizaciones de Rendimiento, Escalabilidad y Desacoplamiento de Carga (SDD Specification)

**Status:** `VERIFICADA` · **Target:** `db/`, `app/api/`, `app/views/`, `app/Portal.tsx`, `firebase/functions/`, `lib/auth.ts`, `tests/`  
**Autor:** Antigravity · **Reviewer:** Pipe / Joaquín  
**Framework:** Next.js 16 (App Router), React 19, Turso/libSQL (Drizzle ORM), Firebase Cloud Functions v2, TypeScript

---

## 0. Resumen Ejecutivo y Motivación

A partir de la auditoría profunda de rendimiento (`/improve perf`), se identificaron cuellos de botella algorítmicos, de persistencia y de empaquetado que impactan la escalabilidad institucional de **CEOUBB** hacia el objetivo de miles de estudiantes:

1. **Escaneos Secuenciales en SQL:** La tabla `sessions` carece de índice en la clave foránea `userId`, forzando _Full Table Scans_ en SQLite/libSQL en cada eliminación de cuenta o consulta por usuario.
2. **Consultas Masivas sin Paginación:** `GET /api/admin/users` extrae la totalidad de usuarios sin límites ni filtros, provocando payloads excesivos y bloqueo de renderizado en `AdminView`.
3. **Sobrecarga del Bundle Inicial:** Vistas secundarias pesadas (`CalendarView`, `ResourcesView` con su dataset estático de ~18.2 KB, y `AdminView`) se importan de forma estática en `Portal.tsx`, inflando el First Load JS del inicio.
4. **Degradación en Renderizado React:** Búsquedas lineales repetidas dentro de `.map()` en `CoursesDashboard` y falta de memoización en la matriz de calificaciones docente provocan micro-congelamientos (_jank_) al digitar notas.
5. **Eliminaciones No Loteadas en Cloud Functions:** `deleteMyAccount` invoca eliminaciones individuales de documentos en paralelo en vez de usar lotes atómicos (`batch`), arriesgando timeouts en Firebase Functions.
6. **Falta de Purga de Sesiones Expiradas:** La tabla `sessions` acumula registros vencidos de forma indefinida.

---

## 1. Requisitos Formales (EARS & RFC 2119)

### A. Indexación y Persistencia (Turso/libSQL)

- **REQ-PERF-01 (Ubiquitous):** La tabla `sessions` en `db/schema.ts` SHALL declarar un índice explícito sobre la columna `userId` (`idx_sessions_user_id`) para acelerar consultas y eliminaciones por usuario.
- **REQ-PERF-02 (Ubiquitous):** El módulo `lib/auth.ts` SHALL exponer la función `pruneExpiredSessions()` que ejecute `DELETE FROM sessions WHERE expires_at <= ?` de forma segura.

### B. Paginación y Filtrado en Endpoints de Administración

- **REQ-PERF-03 (Event-Driven):** WHEN un cliente autenticado como `owner` consulte `GET /api/admin/users`, el endpoint SHALL soportar parámetros de consulta opcionales `page` (número de página >= 1, default 1), `limit` (tamaño de página entre 1 y 100, default 50) y `q` (búsqueda insensible a mayúsculas por nombre o correo).
- **REQ-PERF-04 (State-Driven):** La respuesta de `GET /api/admin/users` SHALL retornar un objeto estructurado `{ users: PublicUser[], total: number, page: number, totalPages: number }`.
- **REQ-PERF-05 (Event-Driven):** La vista `app/views/AdminView.tsx` SHALL incorporar controles de paginación y campo de búsqueda reactivo, evitando renderizar miles de nodos DOM simultáneamente.

### C. Desacoplamiento de Carga y Code-Splitting

- **REQ-PERF-06 (Ubiquitous):** El componente `app/Portal.tsx` SHALL cargar `CalendarView`, `ResourcesView` y `AdminView` mediante importaciones dinámicas (`next/dynamic`) con placeholders de carga semánticos, garantizando que el bundle inicial contenga solo el Área Personal esencial.

### D. Optimización de Renderizado React

- **REQ-PERF-07 (State-Driven):** `app/views/CoursesDashboard.tsx` SHALL precalcular los contadores de actividad y entregas no leídas en un mapa indexado $O(1)$ (`Map<string, CourseActivitySummary>`), eliminando filtros y escaneos lineales $O(C \times A)$ en cada render.
- **REQ-PERF-08 (State-Driven):** Las filas de estudiantes en la matriz de calificaciones docente (`GradesSection.tsx`) SHALL aislarse como componentes memoizados para que la edición de una nota individual no re-renderice la grilla completa de estudiantes.

### E. Operaciones por Lote en Cloud Functions

- **REQ-PERF-09 (Event-Driven):** WHEN se invoque la función `deleteMyAccount` en `firebase/functions/index.js`, las eliminaciones de documentos en Firestore SHALL ejecutarse mediante lotes `WriteBatch` (agrupados en chunks de hasta 400 operaciones), y las referencias de almacenamiento SHALL resolverse de forma dinámica sin identificadores de ramo hardcodeados.

---

## 2. Criterios de Aceptación BDD (Gherkin Scenarios)

```gherkin
Scenario: Búsqueda y paginación en el directorio de administración
  Given un usuario autenticado con rol "owner"
  When realiza una petición GET a "/api/admin/users?page=1&limit=10&q=mecanica"
  Then el código de respuesta HTTP debe ser 200
  And el cuerpo JSON debe contener la lista paginada "users" con máximo 10 elementos
  And debe incluir los metadatos "total", "page" y "totalPages"

Scenario: Eliminación eficiente de sesiones por usuario
  Given un usuario con 3 sesiones activas en la base de datos
  When se ejecuta la eliminación de cuenta o revocación en "/api/auth/me"
  Then la consulta de borrado utiliza el índice "idx_sessions_user_id"
  And todas las sesiones asociadas al usuario son eliminadas

Scenario: Carga bajo demanda de recursos y calendario
  Given un estudiante que ingresa al inicio ("Área personal")
  When se descarga el HTML y bundle inicial de la aplicación
  Then los módulos de "CalendarView", "ResourcesView" y "AdminView" no se incluyen en el chunk crítico
  And solo se descargan al navegar explícitamente a sus respectivas pestañas

Scenario: Purga de sesiones expiradas
  Given registros en "sessions" con fecha "expiresAt" anterior al momento actual
  When se ejecuta "pruneExpiredSessions()"
  Then los registros vencidos son eliminados de la base de datos
  And las sesiones vigentes permanecen intactas
```

---

## 3. Topología de Componentes y Diseño Técnico

```mermaid
graph TD
    subgraph Frontend [Portal Client Next.js]
        Portal[Portal.tsx Shell]
        Dashboard[CoursesDashboard.tsx - Pre-indexed O(1)]
        DynCal[dynamic import: CalendarView]
        DynRes[dynamic import: ResourcesView + Data]
        DynAdm[dynamic import: AdminView]
    end

    subgraph API [Next.js Route Handlers]
        AuthMe[/api/auth/me - DELETE with Index]
        AdminUsers[/api/admin/users - Paginated & Filtered]
    end

    subgraph Database [Turso / libSQL]
        UsersTbl[(users table)]
        SessionsTbl[(sessions table - idx_sessions_user_id)]
    end

    subgraph Firebase [Cloud Functions v2]
        DeleteAcc[deleteMyAccount - WriteBatch Chunked]
    end

    Portal --> Dashboard
    Portal -.->|on-demand| DynCal
    Portal -.->|on-demand| DynRes
    Portal -.->|on-demand| DynAdm
    DynAdm --> AdminUsers
    AdminUsers --> UsersTbl
    AuthMe --> SessionsTbl
    DeleteAcc -->|WriteBatch <= 400| Firebase
```

---

## 4. DAG de Tareas y Descomposición de Ejecución

- [x] **TASK-01 (REQ-PERF-01, REQ-PERF-02):** Agregar índice `idx_sessions_user_id` en `db/schema.ts`, implementar `pruneExpiredSessions` en `lib/auth.ts` y generar migración Drizzle.
- [x] **TASK-02 (REQ-PERF-03, REQ-PERF-04, REQ-PERF-05):** Actualizar `app/api/admin/users/route.ts` con paginación, total y búsqueda por texto `q`, actualizar `app/views/AdminView.tsx` y ampliar `tests/admin-api.test.ts`.
- [x] **TASK-03 (REQ-PERF-06):** Configurar `next/dynamic` en `app/Portal.tsx` para `CalendarView`, `ResourcesView` y `AdminView`.
- [x] **TASK-04 (REQ-PERF-07, REQ-PERF-08):** Optimizar agregación en `CoursesDashboard.tsx` y memoizar filas en `GradesSection.tsx`.
- [x] **TASK-05 (REQ-PERF-09):** Optimizar `deleteMyAccount` en `firebase/functions/index.js` usando lotes `WriteBatch` y eliminando paths estáticos.
- [x] **TASK-06 (REQ-PERF-08, REQ-CICD-08):** Ejecutar verificación completa (`pnpm run test:unit`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm test`), actualizar `PLAN.md` y `plans/README.md`.
