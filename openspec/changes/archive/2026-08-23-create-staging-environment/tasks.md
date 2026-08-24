# DAG de ejecución

## 1. Contrato

- [x] 1.1 Formalizar alcance, requisitos EARS, escenarios BDD, diseño y rollback de CEO-12. Verificación: `pnpm exec openspec validate create-staging-environment --strict`.

## 2. RED: protección automatizada

- [x] 2.1 Añadir pruebas para targets prohibidos, configuración Firebase por entorno, manifest sintético y orden staging→producción. Verificación: `node --experimental-strip-types --test tests/staging-environment.test.ts` (debe fallar antes de GREEN).
- [x] 2.2 Registrar el nuevo test en los scripts y renovar el lock SHA-256. Verificación: `node scripts/verify-test-hashes.mjs --generate`.

## 3. GREEN: configuración y sembrado

- [x] 3.1 Parametrizar Firebase web/server y definir variables de ejemplo. Requisitos: REQ-STG-01, REQ-STG-04. Verificación: `pnpm run typecheck`.
- [x] 3.2 Implementar guardas fail-closed y manifest idempotente. Requisitos: REQ-STG-01, REQ-STG-02. Verificación: prueba focal.
- [x] 3.3 Implementar migración/sembrado Turso y commit Firestore acotado. Requisitos: REQ-STG-02, REQ-STG-05. Verificación: sembrado local repetido dos veces.

## 4. Automatización

- [x] 4.1 Añadir aliases y runbook de ambos entornos. Requisitos: REQ-STG-01, REQ-STG-05. Verificación: `pnpm run check:rules`.
- [x] 4.2 Añadir workflow staging→promoción y gate del despliegue web. Requisitos: REQ-STG-03, REQ-STG-04. Verificación: pruebas focales y formato.

## 5. Provisionamiento

- [x] 5.1 Crear Firebase staging, Firestore regional, apps web y reglas/índices/Functions de staging. Requisito: REQ-STG-05. Verificación: inventario Firebase y despliegue exitoso.
- [x] 5.2 Crear `ceoubb-staging`, generar credencial dedicada y ejecutar el sembrado dos veces. Requisito: REQ-STG-02. Verificación: conteos deterministas.
- [x] 5.3 Configurar GitHub Environment y Vercel Preview sin mostrar secretos. Requisito: REQ-STG-04. Verificación: inventarios de variables y ejecución del workflow.

## 6. REFACTOR y cierre

- [x] 6.1 Ejecutar `verify:fast`, invariantes, formato, lint y suite integral.
- [x] 6.2 Archivar el cambio OpenSpec, actualizar PLAN/handoff y abrir PR en español vinculada a CEO-12.
