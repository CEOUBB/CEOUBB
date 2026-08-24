## 1. Contract and RED

- [x] 1.1 Definir REQ-FEEDBACK-01 a REQ-FEEDBACK-06 con EARS y escenarios BDD. Verificación: `pnpm exec openspec validate add-private-grade-feedback --strict`.
- [x] 1.2 Añadir `tests/grade-feedback.test.ts`, registrarla en los scripts y comprobar el fallo RED. Verificación: `node --experimental-strip-types --test tests/grade-feedback.test.ts`.
- [x] 1.3 Sellar la suite RED en el snapshot SHA-256. Verificación: `node scripts/verify-test-hashes.mjs --generate`.

## 2. Server Domain and Persistence

- [x] 2.1 Añadir normalización acotada de feedback vigente y de solicitudes. Verificación: `node --experimental-strip-types --test tests/grade-feedback.test.ts`.
- [x] 2.2 Añadir la mutación transaccional auditada con autorización de sección y nota previa. Verificación: `node --experimental-strip-types --test tests/grade-feedback.test.ts`.
- [x] 2.3 Mantener escritura directa denegada y aislar el historial propio de feedback. Verificación: `pnpm run verify:invariants`.

## 3. Client and UI

- [x] 3.1 Proyectar feedback en los listeners existentes y exponer el cliente callable. Verificación: `pnpm run typecheck`.
- [x] 3.2 Añadir editor docente único, accesible y responsive en la matriz. Verificación: `node --experimental-strip-types --test tests/grade-feedback.test.ts`.
- [x] 3.3 Mostrar feedback privado en la tabla estudiantil y la hoja móvil. Verificación: `node --experimental-strip-types --test tests/grade-feedback.test.ts`.

## 4. Verification and Archive

- [x] 4.1 Ejecutar GREEN/REFACTOR sin alterar la suite sellada. Verificación: `pnpm run verify:fast`.
- [x] 4.2 Ejecutar invariantes, lint, formato, Functions, React Doctor y suite integral. Verificación: `pnpm test`.
- [x] 4.3 Archivar el delta OpenSpec y actualizar PLAN/handoff. Verificación: `pnpm exec openspec validate --specs`.
- [x] 4.4 Crear commit, publicar la rama y abrir el PR en español vinculado a CEO-21. Verificación: PR #73 abierto en GitHub.
