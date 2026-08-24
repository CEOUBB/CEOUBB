## Why

Linear **CEO-21** identifica que el libro de notas sólo comunica un número y no permite explicar qué estuvo mal ni qué debe revisar el estudiante. La retroalimentación académica necesita viajar con la evaluación, mantenerse privada frente a otros estudiantes y conservar evidencia de sus cambios igual que la nota oficial.

La orden del mantenedor del 2026-08-23 autoriza ejecutar, verificar y publicar el cambio sin solicitar aprobaciones intermedias. Este delta registra esa autorización y acota el trabajo antes de modificar código productivo.

## What Changes

- Añadir un comentario de retroalimentación de hasta 2.000 caracteres por estudiante y evaluación.
- Guardar la retroalimentación en el documento privado de notas existente, sin crear documentos, consultas o listeners adicionales.
- Publicar la mutación mediante una Callable Function autenticada y transaccional; el cliente no obtiene una ruta de escritura directa.
- Crear una entrada inmutable de auditoría por comentario agregado, modificado o retirado, con autor y reloj confiables.
- Permitir lectura sólo al estudiante dueño, al equipo docente autorizado de la sección y al propietario administrativo.
- Incorporar un editor docente accesible y de instancia única para la matriz de notas.
- Mostrar el comentario al estudiante junto a la evaluación en escritorio y dentro de la hoja de detalle móvil.

## Capabilities

### New Capabilities

<!-- None. Private feedback extends the canonical grades capability. -->

### Modified Capabilities

- `grades`: retroalimentación privada, auditada y asociada a una calificación oficial.

## Impact

**Código**

- `lib/grades.ts`, `lib/firebase/grades.ts` y `lib/firebase/posts.ts`: contrato, cliente callable y proyección en tiempo real.
- `firebase/functions/grade-audit.js` y `firebase/functions/index.js`: validación, autorización y transacción auditada.
- `firebase/firestore.rules`: lectura aislada del historial de retroalimentación; las escrituras cliente continúan denegadas.
- `app/views/classroom/GradesSection.tsx` y `app/globals.css`: edición docente y lectura estudiantil responsive.
- `tests/grade-feedback.test.ts`: contrato puro, integración de fuente, privacidad y paridad de vistas.

**Datos y escala**

- Campo opcional `feedback: Record<gradeItemId, string>` dentro de `courses/{courseId}/grades/{uid}`.
- Una escritura adicional en `gradeAudit` sólo cuando el texto normalizado cambia.
- Cero consultas, listeners o documentos de lectura nuevos; un único diálogo docente montado por aula.

**Non-goals**

- No se implementan rúbricas, adjuntos dentro del comentario ni mensajería bidireccional.
- No se obliga a comentar todas las notas ni se migra retroalimentación histórica inexistente.
- No se despliegan Functions ni reglas a producción desde este cambio.
- No se modifica la aritmética de calificaciones, ponderaciones ni promedios.
