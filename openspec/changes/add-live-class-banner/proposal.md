## Why

Linear **CEO-56** recoge la acción que estudiantes y docentes buscan justo antes de una clase: entrar a la videoconferencia de su sección sin recorrer publicaciones ni copiar enlaces desde otro sistema. El aula no tiene hoy un contrato dedicado para esa reunión, por lo que el dato termina enterrado en avisos y pierde visibilidad.

El P8 histórico en `docs/specs/p8-live-class-banner.md` fue aprobado por el mantenedor antes de que `main` incorporara OpenSpec. Este delta registra el mismo alcance en el arnés vigente; no agrega decisiones de producto ni amplía permisos.

## What Changes

- Persistir un único enlace normalizado por sección en `courses/{courseId}/meta/live-class`.
- Aceptar solamente HTTPS de Zoom o Microsoft Teams, con validación previa en cliente y paridad en reglas.
- Añadir una escucha de documento acotada al aula abierta y propagar altas, cambios y eliminación en tiempo real.
- Mostrar un banner de entrada antes de los avisos y no renderizar espacio alguno cuando un estudiante no tiene enlace.
- Permitir que el equipo docente ya autorizado para la sección configure o quite el enlace.
- Mantener el aislamiento por matrícula vigente en todas las lecturas y escrituras.

## Capabilities

### New Capabilities

- `classroom/live-class`: configuración, autorización, sincronización y presentación del enlace de videoclase de una sección.

### Modified Capabilities

<!-- None. Grades, enrollments, posts and role derivation keep their existing contracts. -->

## Impact

**Código**

- `lib/live-class.ts` — contrato puro y normalización de URL.
- `lib/firebase/posts.ts` — estado, listener de documento y mutación.
- `firebase/firestore.rules` — validación y autorización específica.
- `app/views/classroom/` y `app/globals.css` — editor docente y banner responsive.
- `tests/live-class.test.ts` — escenarios del contrato, reglas y composición de portada.
- `package.json` y `.agents/.test-hashes.json` — registro y bloqueo de la nueva suite.

**Datos y escala**

- Un documento por sección y una escucha O(1) únicamente mientras el aula está abierta.
- Sin consultas `collectionGroup`, duplicación por estudiante ni migración de Turso.

**Non-goals**

- No se implementa horario, recurrencia ni resaltado por bloque; corresponde a CEO-23.
- No se incrusta video ni se administran reuniones mediante APIs de Zoom o Teams.
- No se introduce el rol `assistant`: el modelo vigente sólo expone `owner`, `teacher` y `student`. Las ayudantías requieren una ampliación formal de la matrícula antes de recibir permisos de edición.
- No se despliegan reglas de Firebase desde este cambio.
