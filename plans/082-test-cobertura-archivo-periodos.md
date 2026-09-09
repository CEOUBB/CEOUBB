# Plan 082: Cobertura de Pruebas en Archivo y Proyecciones de Períodos Académicos

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8a0d7eb..HEAD -- lib/services/academic-period-archive.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `8a0d7eb`, 2026-09-09

## Why this matters

El módulo `lib/services/academic-period-archive.ts` implementa la lógica crítica de cierre semestral institucional (`archiveAcademicPeriod`), paginación acotada de períodos (`listAcademicPeriods`), listado de secciones proyectables (`listPeriodSectionProjections`) y sincronización forzada hacia Firestore (`syncAcademicPeriodProjection`).
Actualmente este archivo tiene un **0% de cobertura de pruebas** y no está importado en ninguna suite de `tests/`. Agregar una suite de pruebas exhaustiva previene regresiones transaccionales, garantiza la idempotencia en períodos ya archivados y asegura el correcto rollback ante fallos en las proyecciones a Firestore.

## Current state

- Relevant files:
  - `lib/services/academic-period-archive.ts` — Lógica de archivo, consulta y proyección de períodos (151 líneas, 0% coverage).
  - `tests/helpers/db-harness.ts` — Utilidad para inicializar base de datos libSQL en memoria con el esquema Drizzle.
  - `tests/academic-period-archive.test.ts` — Nuevo archivo de pruebas a crear.

Fragmento clave actual en `lib/services/academic-period-archive.ts:41-81`:
```ts
export async function listAcademicPeriods(
  options: { limit?: number; cursor?: string | null } = {}
): Promise<Page<AcademicPeriodSummary>> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select()
    .from(periodos)
    .where(options.cursor ? lt(periodos.id, options.cursor) : undefined)
    .orderBy(desc(periodos.id))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? last.id : null,
  };
}
```

## Commands you will need

| Purpose   | Command                                                                                   | Expected on success |
|-----------|-------------------------------------------------------------------------------------------|---------------------|
| Run test  | `node --experimental-strip-types --test tests/academic-period-archive.test.ts`           | all pass            |
| Fast gate | `pnpm run verify:fast`                                                                    | exit 0              |
| Format    | `pnpm run format`                                                                         | exit 0              |

## Scope

**In scope**:
- `tests/academic-period-archive.test.ts` (create)
- `package.json` (añadir el test a la lista del script `test`)
- `.agents/.test-hashes.json` (actualizar sellado con `node scripts/verify-test-hashes.mjs --generate`)

**Out of scope**:
- No modificar la lógica de producción de `lib/services/academic-period-archive.ts`.
- No alterar reglas ni esquemas de base de datos.

## Git workflow

- Match Conventional Commits: `test(academic): agregar pruebas unitarias para archivo de periodos y proyecciones (#082)`

## Steps

### Step 1: Crear `tests/academic-period-archive.test.ts`

Crear el archivo de pruebas utilizando `node:test`, `node:assert/strict`, `getDb()` configurando `process.env.TURSO_DATABASE_URL = "file::memory:?cache=shared";` y aplicando las migraciones de `drizzle/`.

La suite debe cubrir los siguientes casos:
1. `listAcademicPeriods`:
   - Inserta múltiples períodos (`2025-1`, `2025-2`, `2026-1`).
   - Retorna períodos ordenados de forma descendente por `id`.
   - Respeta el límite `boundedLimit` y pagina con `cursor` determinista (`nextCursor`).
2. `listPeriodSectionProjections`:
   - Inserta secciones vinculadas a un período y a otro período ajeno.
   - Filtra exclusivamente las secciones del `periodoId` solicitado.
   - Pagina de forma ascendente por `secciones.id`.
3. `loadPeriodAccess` (a través de `archiveAcademicPeriod` y `syncAcademicPeriodProjection`):
   - Rechaza identificadores con segmentos inválidos (ej. `"periodo/con/slash"`) arrojando `PeriodArchiveError` con código `"invalid_period"`.
   - Rechaza períodos inexistentes arrojando `PeriodArchiveError` con código `"not_found"`.
4. `archiveAcademicPeriod`:
   - Idempotencia: si el período ya tiene `estado: "archivado"`, retorna `alreadyArchived: true` sin ejecutar mutaciones innecesarias ni proyectar de nuevo.
   - Éxito de archivo: cambia el estado a `"archivado"` en Turso.
   - Manejo de fallos en proyecciones: si la proyección a Firestore falla (ej. credenciales de servicio ausentes), revierte/lanza `PeriodArchiveError` con código `"projection_failed"` y el estado no queda en `"archivado"`.
5. `syncAcademicPeriodProjection`:
   - Sincroniza correctamente los metadatos y secciones del período activo.

**Verify**: `node --experimental-strip-types --test tests/academic-period-archive.test.ts` → exit 0, todos los tests pasan.

### Step 2: Registrar en `package.json` y regenerar hash

1. Añadir `tests/academic-period-archive.test.ts` a la lista de tests en `package.json` en el script `"test"`.
2. Ejecutar `node scripts/verify-test-hashes.mjs --generate` para actualizar `.agents/.test-hashes.json`.
3. Ejecutar `pnpm run verify:fast` para comprobar typecheck, tests y sellado.

**Verify**: `pnpm run verify:fast` → exit 0.

## Test plan

- Ejecutar `node --experimental-strip-types --test --experimental-test-coverage tests/academic-period-archive.test.ts` y constatar que la cobertura de `lib/services/academic-period-archive.ts` sube de 0% a >85%.

## STOP conditions

- Si la estructura de la tabla `periodos` o `secciones` en SQLite requiere claves foráneas que bloquean inserciones en tests sin crear facultades/asignaturas previas, poblar las filas padre necesarias (facultad, departamento, asignatura) siguiendo el patrón de `tests/bulk-enrollment.test.ts`.
