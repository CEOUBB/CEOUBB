## 1. Contract and RED

- [x] 1.1 Registrar el alcance aprobado de CEO-60 en EARS/BDD y diseñar el flujo sin consultas adicionales.
- [x] 1.2 Añadir `tests/publication-workflow.test.ts` para preferencia válida, valor inválido, menú, tres pasos, alertas y accesibilidad. RED confirmado por `ERR_MODULE_NOT_FOUND` para `lib/publication-workflow.ts`.
- [x] 1.3 Registrar la nueva suite en los tres comandos y en el snapshot SHA-256. Verificación: 25 archivos bloqueados.

## 2. Domain and Persistence

- [x] 2.1 Crear el contrato puro de modos, contenido, alerta y persistencia local. Verificar: prueba dirigida.
- [x] 2.2 Extender la publicación con `notifyStudents` y conservar la notificación de documentos históricos. Verificar: prueba dirigida y `pnpm run check:functions`.

## 3. Interface

- [x] 3.1 Crear el split-button con ruta principal síncrona, menú accesible y reapertura del wizard. Verificar: prueba dirigida.
- [x] 3.2 Crear el wizard de tres pasos con selección única, retroceso, cierre y preferencia opcional. Verificar: prueba dirigida.
- [x] 3.3 Crear el editor modal bajo demanda y conectar tipo, carpeta y alerta al formulario canónico. Verificar: prueba dirigida.
- [x] 3.4 Reemplazar el formulario permanente, conservar la subida de archivos y añadir estilos responsive/foco. Verificar: `pnpm run typecheck` y navegador.

## 4. Verification and Archive

- [x] 4.1 Ejecutar `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, `pnpm run format:check` y `pnpm test`.
- [x] 4.2 Ejecutar React Doctor sobre el alcance cambiado y recorrer escritorio/móvil sin overflow ni errores.
- [x] 4.3 Actualizar `PLAN.md`, marcar la spec histórica `VERIFICADA` y archivar el delta OpenSpec.
- [ ] 4.4 Crear commit y PR en español; adjuntar el PR a CEO-60 y actualizar el issue.
