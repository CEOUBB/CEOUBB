## Why

Linear **CEO-25** identifica una brecha entre identidad y autorización: una cuenta `@alumnos.ubiobio.cl` debe seguir siendo estudiante a nivel global, pero puede colaborar como ayudante en una sección concreta. Hoy la interfaz deriva todas las capacidades del rol global y las reglas sólo reconocen al docente institucional matriculado, por lo que el rol `assistant` que ya admite `matriculas.rol_seccion` no concede ninguna capacidad real.

## What Changes

- Transportar las matrículas activas como pares acotados `{ sectionId, role }` desde Turso hasta la sesión del portal.
- Resolver las capacidades del aula con el rol de la sección abierta, sin modificar `roleForEmail` ni promover globalmente al estudiante.
- Permitir a `assistant` publicar avisos y subir, renombrar, mover o eliminar únicamente material propio dentro de su sección.
- Mantener notas, progreso agregado, configuración de clase en vivo y metadatos docentes fuera del alcance del ayudante.
- Hacer que Firestore y Storage lean el rol de la proyección de matrícula y apliquen la misma matriz de mínimo privilegio que la interfaz.
- Mostrar «Ayudante» como rol contextual dentro del aula, conservando «Estudiante» en la cuenta global y en cualquier otra sección.

## Capabilities

### Modified Capabilities

- `academic`: autorización contextual por rol de matrícula y transporte acotado de membresías activas.
- `classroom/content-authoring`: publicación de contenido por el equipo de la sección con permisos distintos para docentes y ayudantes.

## Impact

**Código**

- Contrato puro compartido de roles y capacidades por sección.
- Consulta acotada de matrículas y respuestas retrocompatibles de `/api/auth/me` y `/api/enrollments/me`.
- Propagación del rol contextual desde `Portal` hasta el aula.
- Separación UI entre `canManageContent` y `canTeach`.
- Reglas Firestore/Storage basadas en la proyección `enrollments/{uid}/sections/{seccionId}.role`.

**Datos y escala**

- No hay migración: `matriculas.rol_seccion` y la proyección Firestore ya admiten `assistant`.
- La respuesta mantiene el techo institucional de 100 matrículas activas por identidad y no agrega listeners, barridos globales ni escrituras por estudiante.

**Non-goals**

- No se añade una interfaz para nombrar o revocar ayudantes; la administración de matrículas corresponde al flujo académico que escribe Turso y su proyección.
- No se concede al ayudante edición de notas, ponderaciones, progreso agregado ni enlaces de clase en vivo.
- No se cambia el rol global derivado por dominio, la política de acceso institucional ni la excepción administrativa `owner`.
- No se despliegan reglas de Firebase desde este cambio.
