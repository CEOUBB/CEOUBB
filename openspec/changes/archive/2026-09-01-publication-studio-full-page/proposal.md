## Why

La vista del ramo repartía el mismo contenido en dos lugares. La pestaña **Materiales** listaba los archivos del docente mientras la **Portada** listaba sus avisos, aunque en Firestore ambos son documentos de la misma colección `posts`: un archivo es una publicación con `storagePath`. El estudiante tenía que adivinar en cuál de las dos pestañas había quedado la pauta de un certamen, y el docente publicaba el aviso en un sitio y subía su pauta en otro, sin relación entre ambos.

El flujo de redacción, además, vivía dentro de un diálogo modal: un asistente de tres pasos seguido de un compositor de altura acotada. Un modal es adecuado para una decisión breve, no para escribir una guía de estudio de varias páginas con fórmulas, tablas y bloques de código. El mantenedor entregó el alcance con anotaciones sobre la interfaz actual y la instrucción explícita de convertir la redacción en una página propia y enriquecer el editor.

## What Changes

- Eliminar la pestaña **Materiales** y centralizar en la **Portada** las publicaciones del docente junto con sus archivos adjuntos.
- Mover `+ Nueva publicación` e **Importar Moodle** al encabezado del ramo como accesos permanentes, disponibles desde cualquier pestaña.
- Retirar la tarjeta «Biblioteca académica del ramo» y el panel lateral «Subir un archivo», cuya función absorbe el inspector del estudio.
- Reemplazar el asistente modal y el compositor modal por un estudio de publicación a pantalla completa dentro de la pantalla del ramo: lienzo central de redacción e inspector lateral de metadatos.
- Convertir las cuatro opciones iniciales en presets que inyectan una plantilla preestructurada en el cuerpo del editor.
- Enriquecer el editor multimodal con títulos H1–H3, listas ordenadas y con viñetas, cita, callouts de aviso y de evaluación, separador temático y un menú de comandos rápidos con `/`.
- Guardar automáticamente un borrador local por sección y recuperarlo al volver.
- Adjuntar archivos dentro del propio documento de la publicación mediante un campo `attachments`, en lugar de crear entradas sueltas.
- Renderizar callouts y separadores en la publicación publicada, no sólo dentro del editor.

## Non-goals

- No se crea una ruta `/cursos/[id]/publicar`. El portal es una SPA cliente sin enrutado por URL; introducir una ruta obligaría a rehacer el arranque de sesión, la resolución de la sección y la validación de rol fuera del shell existente. El estudio ocupa toda la pantalla del portal y se comporta como página, con su propio retroceso y gesto atrás de Android.
- No se migran publicaciones históricas. Un documento sin `attachments` se lee como lista vacía y un archivo antiguo con `storagePath` sigue apareciendo como adjunto descargable.
- No se añade una dependencia de editor. El editor multimodal existente se extiende; no se incorpora ProseMirror, TipTap ni equivalente.
- No se toca la política de roles, la proyección de inscripciones ni las reglas de Firestore o Storage.

## Capabilities

### New Capabilities

- `classroom/publication-studio`: página de redacción a pantalla completa, presets con plantilla, inspector de metadatos, adjuntos por publicación, borrador local y estadísticas de lectura.

### Modified Capabilities

- `classroom/rich-posts`: el modelo de contenido gana el bloque separador y el reconocimiento compartido de callouts para editor y publicación.
- `editor/multimodal-authoring`: la barra suma bloques estructurales y aparece el menú de comandos rápidos.
- `classroom/large-lists-pagination`: el buscador que vivía en «Materiales» pasa a la Portada sobre el listado de publicaciones.

### Removed Capabilities

- `classroom/publication-wizard`: el asistente modal de tres pasos y su split-button desaparecen. La preferencia local de editor (`ceoubb_default_editor`) sobrevive y la gobierna el estudio.

## Impact

**Código**

- `lib/rich-text.ts` — bloque `divider`, `calloutFromQuote` e `inlineToPlainText` compartidos.
- `lib/multimodal-editor.ts` — round-trip del separador, callout compartido, comandos rápidos.
- `lib/publication-workflow.ts` — plantillas por preset, borrador local por sección y estadísticas de lectura.
- `lib/firebase/mappers.ts`, `lib/firebase/posts.ts`, `lib/firebase/storage.ts` — adjuntos del documento y subida sin escritura en Firestore.
- `app/views/classroom/` — se elimina `MaterialsSection`, `PublicationLauncher`, `PublicationWizardDialog` y `PublicationComposerDialog`; aparece `PublishView`.
- `app/usePortalCore.tsx` — el gesto atrás de Android atiende primero a la vista anidada.
- `app/globals.css` y `app/mobile-shell.css` — estilos del estudio; se retira el CSS de materiales y de los diálogos.

**Datos y escala**

- Campo `attachments` en documentos nuevos, con techo de seis entradas por publicación. Los documentos históricos sin el campo se leen como lista vacía.
- La subida de un adjunto ya no crea un documento propio en `posts`: la publicación es la única escritura.
- Cero consultas o listeners nuevos. El borrador vive en `localStorage`, acotado por sección.
