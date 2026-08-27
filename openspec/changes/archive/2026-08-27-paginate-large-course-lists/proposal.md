# Proposal: Paginar Listas Grandes y Particionar Lotes de Notas (CEO-17)

## Why

En secciones de gran tamaño (>300 estudiantes, común en asignaturas de plan común y cursos masivos de la Universidad del Bío-Bío), la carga simultánea y el renderizado no acotado de cientos de elementos en el DOM provoca degradación de rendimiento e interactividad en el navegador, así como riesgo de fallas críticas si las operaciones de persistencia superan el límite de 500 operaciones por lote en Firestore. Es indispensable dotar a las vistas del aula (calificaciones docentes, avance de estudiantes y materiales) de paginación interactiva, búsqueda en tiempo real y particionamiento en lotes seguros (máximo 400 operaciones).

## What Changes

- **Paginación y búsqueda en la Matriz Docente de Calificaciones (`GradesSection.tsx`):**
  - Implementar paginación en el cliente con selector de tamaño de página (25, 50, 100 estudiantes) y navegación accesible ("Anterior", "Siguiente", número de página y total).
  - Agregar barra de búsqueda reactiva por nombre o correo institucional con debounce / tiempo real.
  - Asegurar la edición y guardado de notas sin perder estado de filas fuera de la página visible.

- **Paginación y búsqueda en la Vista Docente de Avance (`ProgressSection.tsx`):**
  - Incorporar paginación y búsqueda por estudiante para la tabla de resultados de aprendizaje completados en cursos masivos.

- **Búsqueda y visualización escalable en Materiales (`MaterialsSection.tsx`):**
  - Incorporar búsqueda instantánea de archivos por nombre en todas las carpetas del curso.
  - Añadir paginación / limitación progresiva de archivos mostrados por carpeta cuando el volumen de recursos sea elevado.

- **Verificación y robustez de Lotes de Calificaciones (`lib/firebase/grades.ts`):**
  - Garantizar que las operaciones masivas de escritura de notas mantengan el particionamiento estricto en chunks $\le 400$ operaciones respetando los límites de Firestore.

## Capabilities

### New Capabilities

- `classroom/large-lists-pagination`: Paginación, búsqueda y contratos de renderizado seguro para listas extensas de materiales, avance y matriz de calificaciones en el aula virtual.

### Modified Capabilities

- `grades`: Especificación de límites de loteo para escrituras masivas de calificaciones y presentación paginada en el libro de notas docente.

## Impact

- `app/views/classroom/GradesSection.tsx`: Paginación y búsqueda en `TeacherGrades`.
- `app/views/classroom/ProgressSection.tsx`: Paginación y búsqueda en nómina de avance docente.
- `app/views/classroom/MaterialsSection.tsx`: Búsqueda y paginación de archivos compartidos.
- `app/views/classroom/classroom-utils.ts`: Funciones de paginación, búsqueda y cálculo de subconjuntos.
- `lib/firebase/grades.ts`: Verificación de invariantes de particionamiento seguro ($\le 400$ ops).
- `tests/`: Suites de pruebas unitarias para filtrado, paginación y chunking masivo.
