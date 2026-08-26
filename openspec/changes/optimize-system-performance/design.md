# Diseño Técnico: Optimización de Rendimiento y Eficiencia del Sistema

## Context

CEOUBB opera con Turso/libSQL (Sistema de Registro) y Cloud Firestore (Proyección Operacional). A medida que el sistema escala hacia la adopción universitaria completa (>5.000 estudiantes), la latencia WAN por roundtrips HTTP en transacciones, el cálculo de hashing síncrono en cliente y la carga innecesaria de recursos en el render inicial degradan la experiencia de usuario y aumentan el consumo de recursos.

## Goals / Non-Goals

**Goals:**

- Maximizar el aprovechamiento de índices B-Tree en Turso eliminando funciones escalares en cláusulas `where`.
- Agrupar escrituras relacionales en multi-row inserts para reducir el tiempo de bloqueo en transacciones WAN.
- Optimizar la reactividad de la interfaz aislando componentes y eliminando hashing síncrono iterativo en `RichText`.
- Reducir el First Contentful Paint (FCP) y el tiempo de evaluación JS en cliente mediante optimización de fuentes, CSS y package imports.
- Paralelizar llamadas asíncronas de integración externa en Discord bots.

**Non-Goals:**

- Modificar las reglas de seguridad o las políticas de acceso institucional (SSOT en `lib/access-policy.ts`).
- Alterar la lógica matemática de notas o redondeos (definida en `lib/grades.ts`).
- Romper retrocompatibilidad con esquemas de datos existentes.

## Decisions

### 1. Índices y Consultas Relacionales en Turso

- **Decisión**: Usar `eq(asignaturas.codigo, input.code)` y `eq(users.email, input.email)` en lugar de envolver con `upper()`/`lower()`, ya que los valores de entrada son previamente normalizados por las capas de servicio y Zod.
- **Decisión**: Añadir `index("idx_matriculas_usuario_estado").on(table.usuarioId, table.estado)` en `db/schema.ts` para resolver matrículas activas en tiempo $O(\log N)$.
- **Decisión**: En `moodle-import.ts`, reemplazar el bucle `for (const item of list) { await tx.insert(...) }` por dos inserciones multi-row: una para matrículas coincidentes y otra para pendientes.

### 2. Frontend & React 19 UI

- **Decisión**: En `app/views/classroom/RichText.tsx`, sustituir la función recursiva `keyedItems` que computa `JSON.stringify(item)` y FNV-1a hash en cada nodo por claves estables compuestas basadas en tipo y posición (`${prefix}-${index}-${node.type}`).
- **Decisión**: En `app/views/classroom/PostsSection.tsx`, mantener el borrador de edición local dentro de la tarjeta de edición para evitar re-renderizar todo el feed de publicaciones al escribir.

### 3. Assets, Bundles & Next.js

- **Decisión**: Agregar `experimental: { optimizePackageImports: ["@phosphor-icons/react"] }` en `next.config.ts` para que el compilador de Next.js transforme los imports de barril en imports directos de componentes.
- **Decisión**: En `app/layout.tsx`, restringir la carga de `Merriweather` a `weight: ["700"], style: ["normal"]` y retirar `katex/dist/katex.min.css` global, cargándolo solo en vistas con contenido matemático.
- **Decisión**: En `lib/discord/pr-reviewer.ts`, paralelizar con `Promise.all([getPullRequest(num), getPullRequestDiff(num), getPullRequestComments(num)])`.

## Risks / Trade-offs

- **[Riesgo] Claves compuestas en RichText**: Si un nodo cambia de posición dinámicamente, React podría re-montar el nodo inline.
  - _Mitigación_: Los bloques de RichText son inmutables durante el ciclo de lectura; las publicaciones completas se re-parsean limpiamente.
- **[Riesgo] Transacciones de inserción masiva en Moodle**: Lotes de inserción excesivamente grandes podrían exceder los límites de parámetros SQL.
  - _Mitigación_: Particionar en chunks de 50 filas si la nómina supera las 50 matrículas.
