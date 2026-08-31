# Propuesta: Ejecutar la prueba de carga institucional P0.7

Estado: APROBADA por instrucción directa del mantenedor en CEO-71 (2026-08-30).

## Why

CEO-9 fijó una envolvente de 12.000 estudiantes, 3.000 secciones, 72.000 matrículas y 3.000 sesiones concurrentes, pero esos valores siguen siendo objetivos sin evidencia empírica. CEO-71 debe convertirlos en una prueba reproducible sobre staging, sin afectar producción, y producir un reporte que distinga con precisión resultados aprobados, fallidos y bloqueados por telemetría incompleta.

## What Changes

- Incorporar un arnés HTTP con k6 dividido en seis generadores de carga de 500 sesiones cada uno.
- Generar datos académicos y credenciales sintéticas por shard, con aislamiento estricto del proyecto Firebase y la base Turso de staging.
- Simular navegación del portal, consultas Turso, lectura de avisos/notas/certámenes en Firestore y guardado acotado de respuestas de certamen.
- Capturar resultados k6, métricas Cloud Monitoring de Firestore y contadores Turso antes/después de la prueba.
- Consolidar los seis shards, evaluar SLO y proyectar el costo anual sin descontar créditos promocionales.
- Publicar evidencia como artefacto de GitHub Actions y mantener staging protegido mediante bypasses de automatización efímeros.

## Capabilities

### Modified Capabilities

- `operations/capacity-cost`: Añadir el contrato ejecutable de carga distribuida, medición por proveedor, proyección de costo y clasificación de evidencia.
- `operations/staging`: Añadir el fixture institucional separado del sembrado ordinario y el acceso automatizado efímero al Preview protegido.

## Non-goals

- No ejecutar carga contra `ceoubb.com`, Firebase producción ni Turso producción.
- No modificar reglas de seguridad, política de roles, matemática de notas ni límites funcionales para facilitar la prueba.
- No declarar RPO/RTO demostrado; el simulacro de restauración pertenece a P0.8.
- No convertir precios presupuestarios en un SLA o cotización contractual.

## Impact

- Código operativo: `load-tests/`, `scripts/capacity-*.mjs`.
- Automatización: `.github/workflows/capacity-load-test.yml`, `package.json`.
- Pruebas: `tests/capacity-load-test.test.ts`, hash de bloqueo.
- Evidencia y operación: `docs/operations/capacity-load-test.md`, `docs/operations/evidence/`.
- Servicios externos: staging de Vercel, Turso y Firebase; producción permanece fuera de alcance.
