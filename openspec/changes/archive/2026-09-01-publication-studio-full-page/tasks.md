## 1. Contract

- [x] 1.1 Registrar el alcance aprobado en EARS/BDD y decidir la materialización del estudio dentro de la SPA en vez de una ruta nueva. Verificar: `openspec validate --specs`.
- [x] 1.2 Confirmar con el mantenedor las dos decisiones que cambiaban el trabajo: pantalla completa dentro del portal y adjuntos dentro del documento de la publicación.

## 2. Modelo de contenido

- [x] 2.1 Añadir el bloque `divider` a `RichBlock`, declararlo en `startsBlock` y parsearlo antes del cierre de párrafo, sin romper la fila de alineación de tablas. Verificar: `node --experimental-strip-types --test tests/multimodal-editor.test.ts`.
- [x] 2.2 Extraer `calloutFromQuote` e `inlineToPlainText` a `lib/rich-text.ts` y consumirlos desde el editor y desde `RichText`. Verificar: prueba dirigida.
- [x] 2.3 Completar el round-trip `---` ↔ `<hr>` retirando `hr` del patrón de HTML protegido. Verificar: prueba dirigida.

## 3. Persistencia

- [x] 3.1 Definir `ClassroomAttachment`, `toAttachments` y `MAX_POST_ATTACHMENTS`; proyectar `attachments` en `toPost`. Verificar: prueba dirigida.
- [x] 3.2 Añadir `uploadPostAttachment`, que sube bytes sin escribir en Firestore. Verificar: prueba dirigida.
- [x] 3.3 Aceptar `attachments` en `publishClassroomPost` y escribirlos en el mismo documento. Verificar: prueba dirigida.
- [x] 3.4 Añadir plantillas por preset, borrador local por sección y estadísticas de lectura en `lib/publication-workflow.ts`. Verificar: prueba dirigida.

## 4. Interfaz

- [x] 4.1 Crear `PublishView`: etapa de presets, barra pegajosa con autoguardado, lienzo e inspector. Verificar: `pnpm run typecheck`.
- [x] 4.2 Extender `MultimodalEditor` con H1–H3, listas, cita, callout de aviso y de evaluación, separador y menú `/`. Verificar: prueba dirigida.
- [x] 4.3 Retirar la pestaña «Materiales», mover `+ Nueva publicación` e `Importar Moodle` al encabezado y montar el estudio bajo el estado `composing`. Verificar: `pnpm run typecheck`.
- [x] 4.4 Mostrar adjuntos, carpeta y buscador en la Portada; eliminar la tarjeta de biblioteca y el panel de subida. Verificar: prueba dirigida.
- [x] 4.5 Encaminar el gesto atrás de Android hacia la vista anidada antes de abandonar la pantalla. Verificar: `pnpm run typecheck` y revisión del manejador.
- [x] 4.6 Escribir los estilos del estudio y retirar el CSS de materiales y de los diálogos, respetando el presupuesto móvil sin `backdrop-filter`. Verificar: `node --experimental-strip-types --test tests/mobile-performance-budget.test.ts`.

## 5. Verificación

- [x] 5.1 Reapuntar las pruebas que leían `MaterialsSection`, `PublicationLauncher` y `PublicationComposerDialog` a los archivos que hoy sostienen esas garantías, sin debilitar ninguna aserción.
- [x] 5.2 Añadir cobertura de plantillas, borrador, estadísticas, adjuntos, separador, callout y comandos rápidos.
- [x] 5.3 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check` y `pnpm run test:unit`.
- [x] 5.4 Regenerar el snapshot SHA-256 de pruebas y ejecutar `pnpm run verify:fast` y `pnpm run verify:invariants`.
- [x] 5.5 Ejecutar `pnpm test` con la compilación de producción.
- [x] 5.6 Actualizar `PLAN.md`, consolidar la spec maestra y archivar este delta.
