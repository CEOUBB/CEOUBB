# Diseño Técnico: Arquitectura y Estrategia de Remediación React Doctor

## Context

Véase `proposal.md` y las especificaciones delta en `specs/`. Tras la sincronización con `main`, la ejecución de `react-doctor` identificó 53 incidencias que impactan el puntaje de salud del proyecto. Las causas raíz se concentran en cuatro patrones:

1. Heurísticas de efectos colaterales en handlers HTTP de Next.js (uso de `Object.create(null)` en GET).
2. Fragilidades de parsing en tiempo de ejecución (`new URL` sin validación previa, regex con aserción `!`, interrupción de flujo no léxica en fetch).
3. Concurrencia de I/O bloqueada en bucles `for...of` con llamadas `await` secuenciales.
4. Desactualización sintáctica de esquemas Zod (`.object({...}).strict()` de Zod 3 frente a `z.strictObject` de Zod 4) y concentración excesiva de lógica en vistas React (>300 líneas y complejidad ciclomática >15).

## Goals / Non-Goals

**Goals:**

- Resolver el 100% de los errores críticos de seguridad (1 error).
- Eliminar el 100% de las advertencias de bugs y fiabilidad en tiempo de ejecución (9 warnings).
- Paralelizar todas las operaciones de I/O en bucles y optimizar iteraciones encadenadas (7 warnings).
- Actualizar los 16 esquemas Zod al estándar canónico Zod 4 (`z.strictObject`) (16 warnings).
- Reducir la complejidad ciclomática y descomponer componentes gigantes prioritarios (20 warnings de mantenibilidad).
- Elevar el puntaje de salud de `react-doctor` a >90/100 y mantener indemne el arnés de verificación (`pnpm run verify:fast`, `pnpm run verify:invariants`).

**Non-Goals:**

- No rediseñar componentes UI ni modificar estilos visuales de Tailwind/OKLCH.
- No alterar contratos de API externos de interoperabilidad LTI/xAPI/QTI.
- No introducir librerías externas adicionales.

## Decisions

### 1. Manejo seguro de parámetros en GET/POST LTI

- **Decisión:** Reemplazar `const values: Record<string, string> = Object.create(null);` por una instancia de `Map<string, string>` o `const values: Record<string, string> = {};` con asignación controlada sin prototipos dinámicos que activen la regla `nextjs-no-side-effect-in-get-handler`.
- **Alternativas consideradas:** Desactivar la regla mediante directivas de lint o configuración. _Descartado:_ es preferible un código limpio que no active heurísticas de side-effects en endpoints GET.

### 2. Guardas previas con `URL.canParse()`

- **Decisión:** En `lib/interop/config.ts` y `proxy.ts`, envolver o anteponer la validación `if (!URL.canParse(value)) fail(...)` antes de `new URL(value)`.
- **Alternativas consideradas:** `try { new URL(x) } catch { ... }`. _Razón de elección:_ `URL.canParse()` es un estándar moderno de ECMAScript compatible con Node 22+ que no incurre en el overhead de instanciar y capturar una excepción.

### 3. Migración Zod 4 (`z.strictObject`)

- **Decisión:** Reemplazar el encadenamiento `z.object({...}).strict()` por la función canónica de fábrica `z.strictObject({...})` en todos los archivos de `lib/interop/` y rutas API asociadas.
- **Alternativas consideradas:** Mantener `.strict()`. _Razón de elección:_ El proyecto ya utiliza Zod v4.5+, y `z.strictObject` es la API de primera clase optimizada para inferencia estricta de tipos.

### 4. Paralelización de I/O en bucles con `Promise.all`

- **Decisión:**
  - En `lib/interop/packages.ts`: `await Promise.all(archive.entries.map((entry) => archive.read(entry.name)))`.
  - En `lib/services/interop-storage.ts`: Mapear las entradas para subida concurrente y borrado de compensación concurrente.
  - En `lib/services/interop.ts`: Consultas concurrentes `Promise.all([queryActor, queryResource])` en lugar de dos `await` secuenciales.
- **Alternativas consideradas:** Mantener ejecución secuencial para ahorrar memoria. _Razón de elección:_ Los archivos empaquetados SCORM/QTI tienen cuotas estrictas de tamaño (<50MB) y número de archivos; la ejecución concurrente reduce la latencia de subida a R2/Storage de $O(N \cdot T)$ a $O(T)$ bounded.

### 5. Descomposición atómica de componentes de UI

- **Decisión:** Extraer subsecciones de `ContactForm.tsx`, `InteropSection.tsx`, `PublishView.tsx` y `QuizzesSection.tsx` en componentes auxiliares con interfaces de props tipadas y desacoplar lógica compleja a hooks custom (ej. `useContactForm`, `useInteropManager`).
- **Alternativas consideradas:** Dividir indiscriminadamente todo archivo de más de 200 líneas. _Razón de elección:_ Agrupar estrictamente por afinidad de dominio (ej. subpestañas o modales secundarios) preservando el encapsulamiento.

## Diagrama de Arquitectura de la Remediación

```mermaid
flowchart TD
    subgraph Fase 1: Dominio, Seguridad e I/O
        A[LTI Route: app/api/interop/lti/authorize] -->|Map/Object Seguro| B[Zero Side-Effect GET]
        C[Config & Proxy: URL.canParse] -->|Guarda Defensiva| D[Safe URL Instances]
        E[Storage & Packages: Promise.all] -->|I/O Paralelo Bounded| F[Async Loop Optimization]
        G[Interop Schemas: z.strictObject] -->|Zod 4 Canonical| H[Schema Modernization]
        I[Regex & Fetch Guards: lib/interop/xml.ts] -->|Explicit Guards| J[Zero Runtime Crash]
    end

    subgraph Fase 2: Vistas y Mantenibilidad UI
        K[ContactForm & InteropSection] -->|Extraer Custom Hooks| L[Baja Complejidad Ciclomática]
        M[PublishView & QuizzesSection] -->|Subcomponentes Atómicos| N[Límite Menor a 300 Líneas]
        O[JSX Subtrees Repetidos] -->|Header / Card Skeletons| P[Componentes Compartidos]
    end

    B --> Q[React Doctor Score: >90/100]
    D --> Q
    F --> Q
    H --> Q
    J --> Q
    L --> Q
    N --> Q
    P --> Q
```

## Análisis de Blast Radius (Archivos Afectados)

| Archivo                                        | Incidencias React Doctor                              | Tipo de Intervención                 | Nivel de Riesgo |
| :--------------------------------------------- | :---------------------------------------------------- | :----------------------------------- | :-------------- |
| `app/api/interop/lti/authorize/route.ts`       | 1 error (side effect in GET)                          | Corrección de recolección de params  | Muy bajo        |
| `lib/interop/config.ts`                        | 2 bugs (URL parse), 2 zod warnings                    | `URL.canParse()` + `z.strictObject`  | Muy bajo        |
| `proxy.ts`                                     | 1 bug (URL parse)                                     | `URL.canParse()` en hostname check   | Muy bajo        |
| `lib/interop/xml.ts`                           | 1 bug (regex non-null assertion)                      | Validación condicional de match      | Muy bajo        |
| `lib/services/interop-qti.ts`                  | 1 bug (fetch status check)                            | `throw fail(...)` explícito          | Muy bajo        |
| `lib/services/interop.ts`                      | 2 awaits secuenciales, 1 await en loop, 1 zod warning | `Promise.all` y `z.strictObject`     | Bajo            |
| `lib/interop/packages.ts`                      | 1 await en loop                                       | `Promise.all` en lectura de entradas | Bajo            |
| `lib/interop/qti.ts`                           | 1 await en loop, 2 combinaciones de iteración         | `Promise.all` + loop unificado       | Bajo            |
| `lib/services/interop-storage.ts`              | 2 awaits en loop                                      | Subidas y borrados concurrentes      | Medio           |
| `lib/interop/lti.ts`                           | 3 zod warnings                                        | `z.strictObject`                     | Muy bajo        |
| `lib/interop/xapi.ts`                          | 9 zod warnings                                        | `z.strictObject`                     | Muy bajo        |
| `app/api/interop/tools/route.ts`               | 1 zod warning                                         | `z.strictObject`                     | Muy bajo        |
| `app/views/classroom/InteropSection.tsx`       | 1 prefer-useReducer, 1 giant component                | Extraer subcomponente/hook           | Medio           |
| `app/views/classroom/SubmissionReviewTray.tsx` | 1 derived useState, 1 high complexity                 | Manejo de borrador y refactor        | Medio           |
| `app/contacto/ContactForm.tsx`                 | 1 giant component, 1 high complexity                  | Extraer subcomponentes de formulario | Medio           |
| `app/views/classroom/PublishView.tsx`          | 1 giant component                                     | Extraer modales / paneles            | Medio           |
| `app/views/classroom/QuizzesSection.tsx`       | 1 giant component, 2 high complexity                  | Extraer componentes de preguntas     | Medio           |
| `app/views/ViewSkeletons.tsx`                  | 1 duplicate JSX subtree                               | Componente de tarjeta esqueleto      | Muy bajo        |
| `app/accesibilidad/page.tsx`                   | 1 duplicate JSX subtree                               | Componente de cabecera de página     | Muy bajo        |

## Risks / Trade-offs

- **[Riesgo] Modificación de esquemas Zod en interoperabilidad:**
  - _Mitigación:_ Ejecutar inmediatamente la suite completa de pruebas unitarias (`node --experimental-strip-types --test tests/interop-formats.test.ts tests/interop-services.test.ts`) para garantizar compatibilidad 1:1 con payloads válidos e inválidos.
- **[Riesgo] Paralelización excesiva en subida de archivos grandes:**
  - _Mitigación:_ Limitar las operaciones concurrentes a las entradas pre-validadas por el límite estricto de tamaño del ZIP existente en `lib/interop/packages.ts` (límite máximo 50 MB y 500 archivos).
- **[Riesgo] Refactorización de componentes visuales en `app/views/`:**
  - _Mitigación:_ No alterar nombres de propiedades ni eventos de retorno; verificar renderizado sin regresiones visuales manteniendo el contrato con `useReducedMotion()` y tokens OKLCH.

## Rollback Strategy

Dado que el cambio está encapsulado en una rama y gobernado por OpenSpec, cualquier fallo en los tests de regresión o en `pnpm run verify:fast` aborta la integración antes de cualquier commit o push a `main`.
