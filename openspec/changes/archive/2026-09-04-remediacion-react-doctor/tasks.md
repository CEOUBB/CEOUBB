## 1. Seguridad y Manejo de Rutas (Error de GET Handler)

- [x] 1.1 Remediar `app/api/interop/lti/authorize/route.ts` eliminando `Object.create(null)` y asegurando ausencia de efectos secundarios en peticiones GET. Verificar ejecutando `node --experimental-strip-types --test tests/interop-services.test.ts`.

## 2. Robustez en Runtime y Prevención de Bugs

- [x] 2.1 Implementar guardas `URL.canParse()` antes de instanciar `new URL()` en `lib/interop/config.ts` y `proxy.ts`. Verificar con `pnpm run test:unit`.
- [x] 2.2 Reemplazar la aserción no nula `!` por validación explícita de coincidencia de regex en `lib/interop/xml.ts:73`. Verificar ejecutando `node --experimental-strip-types --test tests/interop-formats.test.ts`.
- [x] 2.3 Explicitar la interrupción de flujo con `throw fail(...)` en `lib/services/interop-qti.ts:64` para satisfacer el analizador estático de respuestas fetch. Verificar con `pnpm run typecheck`.
- [x] 2.4 Paralelizar consultas independientes a base de datos en `lib/services/interop.ts` mediante `Promise.all`. Verificar ejecutando `node --experimental-strip-types --test tests/interop-services.test.ts`.
- [x] 2.5 Unificar los 5 estados `useState` de `app/views/classroom/InteropSection.tsx` en un estado atómico estructurado o reducer tipado. Verificar con `pnpm run typecheck`.
- [x] 2.6 Refactorizar y documentar el ciclo de vida del borrador editable en `app/views/classroom/SubmissionReviewTray.tsx` para evitar advertencias de estado derivado. Verificar ejecutando `node --experimental-strip-types --test tests/submission-review.test.ts`.

## 3. Rendimiento y Concurrencia de I/O

- [x] 3.1 Sustituir bucles secuenciales de lectura de entradas ZIP por `Promise.all` en `lib/interop/packages.ts:81` y `lib/interop/qti.ts:405`. Verificar con `node --experimental-strip-types --test tests/interop-formats.test.ts`.
- [x] 3.2 Paralelizar la subida y el borrado en caso de fallo en `lib/services/interop-storage.ts:77, 101` mediante `Promise.all`. Verificar con `node --experimental-strip-types --test tests/interop-services.test.ts`.
- [x] 3.3 Optimizar iteraciones encadenadas (`.filter().map()`) en una sola pasada en `lib/interop/qti.ts:37, 259`. Verificar con `node --experimental-strip-types --test tests/interop-formats.test.ts`.

## 4. Modernización de Esquemas Zod 4

- [x] 4.1 Migrar los 16 esquemas de `lib/interop/config.ts`, `lib/interop/lti.ts`, `lib/interop/xapi.ts`, `lib/services/interop.ts` y `app/api/interop/tools/route.ts` de la sintaxis Zod 3 `z.object({...}).strict()` a la canónica Zod 4 `z.strictObject({...})`. Verificar ejecutando `node --experimental-strip-types --test tests/interop-formats.test.ts tests/interop-services.test.ts`.

## 5. Mantenibilidad y Descomposición de Componentes UI

- [x] 5.1 Descomponer `app/contacto/ContactForm.tsx` extrayendo subcomponentes de campos y reduciendo la complejidad ciclomática por debajo de 15. Verificar con `pnpm run typecheck` y `pnpm run test:a11y`.
- [x] 5.2 Modularizar `app/views/classroom/InteropSection.tsx` dividiendo los paneles de herramientas y recursos en componentes específicos bajo 300 líneas. Verificar con `pnpm run typecheck`.
- [x] 5.3 Extraer subcomponentes y paneles modales en `app/views/classroom/PublishView.tsx` y `app/views/classroom/QuizzesSection.tsx`. Verificar con `pnpm run typecheck`.
- [x] 5.4 Extraer subárboles JSX duplicados en `app/views/ViewSkeletons.tsx` y `app/accesibilidad/page.tsx` hacia componentes reutilizables. Verificar con `pnpm run typecheck`.

## 6. Verificación de Calidad y Re-escaneo de React Doctor

- [x] 6.1 Ejecutar validación de formato y arnés rápido: `pnpm run format:check`, `pnpm run verify:fast` y `pnpm run verify:invariants`.
- [x] 6.2 Ejecutar re-escaneo de `react-doctor`: `npx react-doctor@latest --verbose` y validar que el score suba a >90/100 con 0 errores de seguridad.
