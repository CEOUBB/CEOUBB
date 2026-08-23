## Why

Linear **CEO-27** exige que un docente pueda crear y configurar su ramo sin coordinación manual del equipo mantenedor. El modelo académico ya representa asignaturas, períodos, secciones y el rol `assistant`, pero no existe una mutación docente autorizada ni una interfaz que conecte esa estructura con el gradebook y el portal.

## What Changes

- Añadir alta transaccional de una sección y su matrícula docente sobre Turso.
- Añadir una ficha de sección editable sin alterar la identidad académica canónica.
- Reutilizar el gradebook Firestore para configurar evaluaciones y ponderaciones desde el panel.
- Permitir designar y retirar ayudantes estudiantiles registrados con reversión determinista del rol anterior.
- Sustituir el catálogo estático del portal por DTO acotados de matrículas activas.
- Añadir un espacio docente responsive con datos, evaluaciones y equipo en una sola superficie.

## Capabilities

### New Capabilities

- `academic/teacher-course-management`: creación y administración autónoma de secciones por su docente responsable.

### Modified Capabilities

<!-- Ninguna capacidad existente cambia sus permisos de Firestore o Storage. -->

## Impact

**Código**

- `db/schema.ts`, `drizzle/` — fichas de sección y asignaciones reversibles de ayudantía.
- `lib/course-management.ts`, `lib/services/teacher-course-management.ts` — contratos, validación y transacciones.
- `app/api/courses/me/`, `app/api/teacher/courses/` — lectura y mutaciones autenticadas.
- `app/views/TeacherCoursesView.tsx`, `app/views/classroom/GradebookSettingsEditor.tsx`, `app/Portal.tsx`, `app/globals.css` — experiencia docente y catálogo dinámico.
- `tests/teacher-course-management.test.ts` — aceptación ejecutable.

**Datos y escala**

- Una ficha 1:1 por sección y una fila sólo mientras exista una ayudantía administrada.
- Todas las listas usan cursor y máximo 100; el gradebook abre una escucha de documento exacta.
- La proyección Turso → Firestore conserva un único escritor y compensa fallos de creación/asignación.

**Non-goals**

- No se invita a cuentas no registradas ni se importa un padrón SIS/CSV.
- No se amplían permisos de ayudantes para publicar o calificar.
- No se permite que el docente modifique períodos, departamentos o la identidad de una sección ya creada.
- No se despliegan migraciones, reglas ni aplicaciones.
