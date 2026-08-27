# Propuesta: Optimización de Rendimiento y Eficiencia del Sistema

## Why

La auditoría en profundidad de rendimiento detectó cuellos de botella en roundtrips WAN a Turso en transacciones interactivas, invalidación de índices por funciones escalares, hashing síncrono intensivo en la renderización de texto enriquecido, preloads de fuentes y CSS bloqueantes en el render crítico, y operaciones seriales asíncronas en rutas API. Esta optimización aborda los hallazgos de alto apalancamiento (_high leverage_) para asegurar que CEOUBB soporte la escala institucional (>5.000 estudiantes) con baja latencia y consumo óptimo de recursos.

## What Changes

- **Base de Datos & Turso**:
  - Reemplazar filtros `upper(codigo)` y `lower(email)` por comparación directa `eq()` para habilitar índices B-Tree únicos.
  - Convertir inserciones individuales en bucle a inserciones por lotes (_multi-row insert_) en reconciliación de Moodle (`lib/services/moodle-import.ts`).
  - Agregar índice compuesto `(usuario_id, estado)` en la tabla `matriculas` en `db/schema.ts`.
  - Deduplicar consulta relacional de 5 tablas entre `listUserSectionMemberships` y `listUserSections` en `/api/enrollments/me`.
- **Frontend & React 19 UI**:
  - Reemplazar hashing FNV-1a y `JSON.stringify` recursivo por clave compuesta en `app/views/classroom/RichText.tsx`.
  - Aislar el estado de edición de publicaciones en `PostsSection.tsx` para evitar re-renderizar todo el feed en cada pulsación de tecla.
- **Next.js, APIs & Webhooks**:
  - Habilitar `experimental.optimizePackageImports` para `@phosphor-icons/react` en `next.config.ts`.
  - Paralelizar llamadas asíncronas a la API de GitHub en `lib/discord/pr-reviewer.ts`.
  - Condicionar la inclusión del catálogo institucional en `/api/teacher/courses` únicamente cuando no haya cursor de paginación.
- **Mobile, Assets & Bundle**:
  - Podar variantes no utilizadas de la fuente `Merriweather` en `app/layout.tsx` (conservar solo 700 bold).
  - Desacoplar importación global de `katex.min.css` en `app/layout.tsx`, cargándolo bajo demanda en `RichText.tsx`.
  - Unificar inicializaciones redundantes de Sentry en cliente.

## Capabilities

### Modified Capabilities

- `database`: Reforzar el uso estricto de índices B-Tree y operaciones en lotes para mutaciones masivas.
- `operations/capacity-cost`: Reforzar presupuestos de carga inicial de portal, reducción de payload de red y ejecución serverless no bloqueante.

## Impact

- **Código Afectado**: `db/schema.ts`, `lib/services/teacher-course-management.ts`, `lib/services/moodle-import.ts`, `app/api/enrollments/me/route.ts`, `app/api/teacher/courses/route.ts`, `app/views/classroom/RichText.tsx`, `app/views/classroom/PostsSection.tsx`, `lib/discord/pr-reviewer.ts`, `next.config.ts`, `app/layout.tsx`, `instrumentation-client.ts`.
- **Dependencias**: Sin nuevas dependencias de terceros.
- **APIs**: Contratos retrocompatibles sin cambios destructivos en clientes existentes.
