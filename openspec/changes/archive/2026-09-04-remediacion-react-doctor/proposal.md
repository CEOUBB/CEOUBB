# Propuesta: Remediación Integral de Diagnósticos React Doctor

## Resumen Ejecutivo

La auditoría automatizada con `react-doctor` sobre el commit de sincronización arrojó un puntaje de salud de **49/100 (Critical)** con **53 incidencias** (1 error de seguridad, 9 advertencias de bugs, 7 advertencias de rendimiento y 36 advertencias de mantenibilidad). Esta propuesta establece una estrategia de remediación por fases para elevar el score a >90/100, eliminando falsos positivos y fragilidades reales de código sin alterar la lógica de negocio ni romper contratos institucionales.

## Why

El portal Centro de Estudio UBB exige los más altos estándares de confiabilidad, rendimiento y mantenibilidad institucional. La existencia de advertencias sobre parsing inseguro de URLs, aserciones no nulas en expresiones regulares, llamadas asíncronas secuenciales dentro de bucles de I/O, esquemas de validación Zod desactualizados y componentes con alta complejidad ciclomática incrementa el riesgo de regresiones y ralentiza la experiencia de usuario. Abordar estos hallazgos de forma planificada y controlada permite blindar la plataforma antes de nuevos despliegues a producción.

## What Changes

- **Seguridad (LTI / OIDC GET Handler):** Sustituir el uso de `Object.create(null)` por estructuras de datos seguras (`new Map` o `Record<string, string>`) en el handler de autorización LTI, resolviendo la heurística de efectos colaterales en peticiones GET.
- **Robustez y Manejo de Errores (Bugs):**
  - Incorporar validaciones defensivas con `URL.canParse()` antes de instanciar `new URL(...)` en `lib/interop/config.ts` y `proxy.ts`.
  - Asegurar la aserción de coincidencia de expresiones regulares en el parser XML (`lib/interop/xml.ts`) mediante guardas explícitas en lugar de aserciones no nulas `!`.
  - Explicitar el flujo de excepción en respuestas HTTP de Firestore (`throw fail(...)`) en `lib/services/interop-qti.ts`.
  - Unificar estados acoplados en `InteropSection.tsx` mediante un reductor tipado o un estado estructurado atómico.
  - Sincronizar o documentar formalmente la clave de remonte para el estado derivado en `SubmissionReviewTray.tsx`.
- **Optimización de Rendimiento (I/O Concurrente):**
  - Paralelizar lecturas de archivos ZIP y cargas a almacenamiento en `lib/interop/packages.ts` y `lib/services/interop-storage.ts` usando `Promise.all` o lotes concurrentes.
  - Ejecutar en paralelo consultas independientes a la base de datos Turso (`users` e `interopResources`) en `lib/services/interop.ts`.
  - Unificar iteraciones encadenadas (`.filter().map()`) en una sola pasada en `lib/interop/qti.ts`.
- **Mantenibilidad y Modernización (Zod 4 & Descomposición UI):**
  - Migrar 16 esquemas con sintaxis Zod 3 `z.object({...}).strict()` al estándar Zod 4 `z.strictObject({...})`.
  - Extraer subcomponentes atómicos en vistas extensas (`ContactForm`, `InteropSection`, `PublishView`, `QuizzesSection`) y subárboles JSX repetidos para reducir complejidad ciclomática (<15) y líneas por componente (<300).

### Non-Goals (Exclusiones del Alcance)

- No se modificarán las interfaces públicas de usuario ni el diseño visual (OKLCH, tipografías institucionales ni flujos UX existentes).
- No se relajarán reglas de validación en `tests/` ni se debilitará el arnés de seguridad de invariants.
- No se instalarán librerías externas adicionales; se utilizarán las primitivas estándar del runtime y las versiones ya presentes en `package.json`.

## Capabilities

### New Capabilities

<!-- Ninguna nueva capacidad de producto; se trata de una remediación de calidad transversal. -->

### Modified Capabilities

- `quality/react-doctor-hardening`: Extiende los requerimientos de calidad estática para exigir el uso de `URL.canParse`, eliminación de aserciones no nulas en regex, paralelización de I/O en bucles con `Promise.all`, adopción estricta de Zod 4 `z.strictObject`, y límites de complejidad ciclomática en funciones React.
- `academic-interoperability`: Actualiza las especificaciones de autorización LTI y procesamiento de paquetes (SCORM/xAPI/QTI) para garantizar concurrencia de subida, parsing seguro de manifiestos y neutralidad de efectos secundarios en handlers HTTP.

## Impact

- **Archivos de Dominio e Interoperabilidad:** `lib/interop/*`, `lib/services/interop*`, `proxy.ts`.
- **Componentes y Vistas React:** `app/views/classroom/*`, `app/contacto/*`, `app/accesibilidad/*`, `app/views/ViewSkeletons.tsx`.
- **Rendimiento:** Reducción sustancial de tiempos de procesamiento de paquetes ZIP y consultas LTI.
- **Herramientas de Calidad:** Health score de `react-doctor` proyectado de 49 a >90/100.
