## Why

CEO-9 identifica que “escalar” no es verificable mientras CEOUBB no declare población, secciones, simultaneidad, costo unitario ni tolerancia a incidentes. La UBB reportó 11.112 estudiantes de pregrado diurno en 2022, pero el repositorio mantenía todos los campos P0.7 como `_to define_`.

## What Changes

- Fijar una envolvente de 12.000 estudiantes activos, 3.000 secciones, 72.000 matrículas y 3.000 estudiantes concurrentes.
- Limitar la apertura inicial del portal estudiantil a 200 lecturas Firestore para hasta ocho secciones.
- Adoptar CLP 450 como caso base y CLP 1.000 como techo de infraestructura por estudiante-año.
- Adoptar 99,9% de SLO mensual, RPO de una hora y RTO crítico de cuatro horas.
- Definir el perfil de carga, restauración y medición financiera que convierte objetivos en evidencia.

## Capabilities

### New Capabilities

- `operations/capacity-cost`: contrato operativo de capacidad institucional, costo unitario y continuidad.

### Modified Capabilities

<!-- None. This change establishes operational targets without changing runtime behavior. -->

## Impact

**Documentación y especificación**

- `docs/operations/capacity-cost-baseline.md`
- `docs/specs/p0-pilot-safety.md`
- `docs/institutional/moodle-adecca-comparison.md`
- `openspec/specs/operations/capacity-cost/spec.md` después del archivo
- `PLAN.md` y `docs/archive/PLAN_ARCHIVE.md`

**Non-goals**

- No ejecutar carga contra producción ni afirmar capacidad sin prueba en staging.
- No configurar respaldos ni afirmar RPO/RTO antes del simulacro P0.8.
- No calcular remuneraciones, soporte, migración, capacitación, impuestos ni precio de venta a UBB.
- No habilitar “Mi Bodega” ni ampliar cuotas de archivos.
- No modificar precios, presupuestos o recursos en proveedores externos desde esta PR.
