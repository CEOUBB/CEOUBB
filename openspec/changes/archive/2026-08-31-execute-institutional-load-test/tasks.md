# Tareas: Ejecutar la carga institucional CEO-71

Estado: VERIFICADA; ejecución autorizada por el mantenedor y evidencia aprobada en GitHub Actions #33399710498.

## DAG

- [x] 1.1 Definir pruebas RED para aislamiento, manifest institucional, escenarios k6, agregación, costo y workflow distribuido. Requisitos: REQ-OPS-LOAD-01..06. Verificación: `node --experimental-strip-types --test tests/capacity-load-test.test.ts`.
- [x] 1.2 Generar el hash de bloqueo de las pruebas RED. Requisitos: REQ-OPS-LOAD-06. Verificación: `node scripts/verify-test-hashes.mjs --generate`.
- [x] 2.1 Implementar validación fail-closed, manifest y fixture determinista por shard. Requisitos: REQ-OPS-LOAD-01, REQ-OPS-LOAD-02. Verificación: `node --experimental-strip-types --test tests/capacity-load-test.test.ts`.
- [x] 2.2 Implementar preparación autenticada de Firebase/Turso/Firestore y limpieza de credenciales locales. Requisitos: REQ-OPS-LOAD-02, REQ-OPS-LOAD-03, REQ-OPS-LOAD-06. Verificación: `node --experimental-strip-types --test tests/capacity-load-test.test.ts`.
- [x] 3.1 Implementar escenario k6 de navegación, catálogo, notas, certamen y guardado de respuesta. Requisitos: REQ-OPS-LOAD-02, REQ-OPS-LOAD-03, REQ-OPS-LOAD-04. Verificación: `k6 inspect load-tests/institutional-capacity.js`.
- [x] 3.2 Implementar recolección Cloud Monitoring/Turso y consolidación/costo. Requisitos: REQ-OPS-LOAD-04, REQ-OPS-LOAD-05. Verificación: `node --experimental-strip-types --test tests/capacity-load-test.test.ts`.
- [x] 4.1 Implementar workflow manual de seis runners, bypass Vercel efímero, artefactos y consolidación. Requisitos: REQ-OPS-LOAD-01..06. Verificación: `pnpm run test:unit`.
- [x] 4.2 Documentar operación, precios, supuestos y clasificación de evidencia. Requisitos: REQ-OPS-LOAD-04, REQ-OPS-LOAD-05. Verificación: `pnpm run specs:validate`.
- [x] 5.1 Ejecutar smoke seguro y luego 3.000 sesiones por 30 minutos en staging; guardar artefactos y reporte. Requisitos: REQ-OPS-LOAD-01..06. Verificación: `https://github.com/CEOUBB/CEOUBB/actions/runs/33399710498` y `docs/operations/evidence/ceo-71-2026-08-31.md`.
- [x] 5.2 Ejecutar `pnpm run verify:fast`, `pnpm run lint`, `pnpm test` y confirmar hashes intactos. Requisitos: todos. Verificación: comandos indicados.
- [x] 5.3 Archivar OpenSpec, actualizar `PLAN.md` y dossier operativo. Requisitos: REQ-OPS-LOAD-05. Verificación: `pnpm run specs:validate`.
