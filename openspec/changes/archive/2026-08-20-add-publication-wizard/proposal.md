## Why

Linear **CEO-60** define el acceso docente sin fricción al flujo de publicación. Hoy el aula muestra el formulario completo de forma permanente y no recuerda cómo prefiere redactar cada docente. El resultado obliga a recorrer controles repetidos antes de empezar y no ofrece una ruta clara para configurar destino y alertas.

El mantenedor entregó el alcance, los criterios BDD y la instrucción explícita de ejecutar sin una ronda adicional de aprobación. Este delta registra ese contrato aprobado antes de la implementación.

## What Changes

- Reemplazar el formulario permanente por el split-button `+ Nueva publicación` y un editor bajo demanda.
- Abrir directamente el editor cuando `ceoubb_default_editor` contiene un modo válido, sin espera de red ni modal intermedio.
- Añadir un menú para abrir cualquiera de los tres modos, actualizar la preferencia o volver al asistente.
- Añadir un asistente modal de tres pasos para tipo de contenido, modo de redacción, carpeta y alertas.
- Persistir la preferencia sólo en el dispositivo mediante `localStorage` y tolerar almacenamiento bloqueado o valores inválidos.
- Persistir en cada publicación si corresponde alertar y omitir el envío FCM cuando el docente elige publicación silenciosa.
- Mantener el flujo actual de archivos separado y conservar publicaciones históricas sin migración.

## Capabilities

### New Capabilities

- `classroom/publication-wizard`: lanzamiento instantáneo, asistente docente, preferencia local y selección de alertas para nuevas publicaciones.

### Modified Capabilities

- `classroom/rich-posts`: el editor existente recibe el modo elegido como contexto de lanzamiento; la edición multimodal completa continúa perteneciendo a CEO-59.

## Impact

**Código**

- `lib/publication-workflow.ts` — contrato puro de modos, preferencias y borradores.
- `app/views/classroom/` — split-button, asistente, editor modal e integración con materiales.
- `lib/firebase/posts.ts` y `firebase/functions/index.js` — indicador retrocompatible de alerta y salida silenciosa.
- `app/globals.css` — composición responsive, foco y objetivos táctiles.
- `tests/publication-workflow.test.ts` — aceptación ejecutable y registro SHA-256.

**Datos y escala**

- Un booleano `notifyStudents` por publicación nueva; los documentos históricos sin el campo conservan el envío actual.
- Cero consultas, listeners o escrituras adicionales: la preferencia permanece local y el post conserva una única escritura.

**Non-goals**

- No se implementa el motor WYSIWYG/HTML ni la conversión entre formatos; corresponde a CEO-59.
- No se cambian reglas, roles, matrículas, consultas ni esquemas de Turso.
- No se despliegan Cloud Functions ni el portal desde este cambio.
