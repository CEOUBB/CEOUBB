# P17 — Historial inmutable de cambios de notas (CEO-7)

- **Estado:** VERIFICADA
- **Fecha:** 2026-08-23
- **Responsables:** Codex / Juako
- **Autorización:** orden directa del mantenedor de ejecutar y abrir PR sin gates de aprobación intermedios
- **Contrato vivo:** `openspec/specs/grades/spec.md`
- **Cambio archivado:** `openspec/changes/archive/2026-08-23-add-immutable-grade-audit-trail/`
- **Pull request:** [#70](https://github.com/CEOUBB/CEOUBB/pull/70)

## Objetivo

Cerrar P0.9 mediante una ruta de escritura que no permita modificar una nota o la configuración del libro sin crear, en el mismo commit, evidencia append-only de autor, tiempo de servidor, valor anterior y valor nuevo.

## Requisitos y aceptación

Los requisitos EARS `REQ-AUDIT-01` a `REQ-AUDIT-07`, sus escenarios BDD, el esquema, la taxonomía de errores, los presupuestos de seguridad/escala y el DAG ejecutable viven en el delta OpenSpec enlazado. Esta especificación documental conserva la trazabilidad requerida por `AGENTS.md` sin duplicar el contrato.

## Verificación requerida

- RED documentado antes de código productivo y hashes generados al cerrar la suite.
- `pnpm run verify:fast`
- `pnpm run verify:invariants`
- `pnpm run lint`
- `pnpm run format:check`
- `pnpm run check:functions`
- `pnpm test`

## Límites

No incluye vista visual del historial, reconstrucción retroactiva, despliegue productivo ni integración con actas UBB. El descargo de plataforma independiente permanece sin cambios.

## Resultado

Las mutaciones de notas y ponderaciones usan Functions autenticadas en `southamerica-west1`; cada diferencia se escribe en la misma transacción que el estado oficial, con identidad derivada del token y tiempo de servidor. Las reglas deniegan las escrituras cliente sobre `grades`, `meta/gradebook` y `gradeAudit`. Verificación: `verify:fast` 236/236, invariantes 31/31, suite integral 261/261, lint, formato, Functions y build en verde.
