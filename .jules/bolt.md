## 2026-08-28 - Planner Block Layout (`lib/planner.ts`)

- **Finding:** `placeBlocks` computed `Math.max(...columnEnds)` inside the iteration loop for every block, resulting in repeated array spreading and scanning ($O(C)$ per block, where $C$ is active column count).
- **Attempted / Identified Solution:** Maintained an incremental `clusterMaxEnd` state variable updated on column assignment and reset on `flush()`.
- **Outcome / Learning:** Reduced cluster boundary check from $O(C)$ array spread to $O(1)$ scalar comparison while maintaining 100% equivalence.
- **Future Rule:** Avoid array spread into `Math.max` or similar variadic calls inside hot layout loops when peak/bounds state can be incrementally maintained.

## 2026-08-28 - Búsqueda de Libros de Calificaciones en `calendarEntries` (`lib/portal-utils.ts`)

- **Finding:** `calendarEntries` realizó una búsqueda lineal (`gradebooks.find(...)`) sobre la lista de libros de calificaciones para cada curso matriculado en el portal, generando una complejidad de $O(N \times M)$ en la carga y renderizado del calendario.
- **Attempted / Identified Solution:** Indexación previa de `gradebooks` en un `Map<string, CourseGradebook>` mapeado por `courseId` antes de recorrer los cursos.
- **Outcome / Learning:** Se redujo la complejidad temporal de $O(N \times M)$ a $O(N + M)$ con búsquedas $O(1)$ por curso, manteniendo exactitud funcional en las entradas generadas.
- **Future Rule:** Indexar siempre relaciones uno-a-uno o uno-a-varios mediante Map/Set antes de iteraciones anidadas sobre colecciones del estado global.

## 2026-08-31 - Conteo de bloques y entregas en `CalendarView` (`app/views/calendar/CalendarView.tsx`)

- **Finding:** `CalendarView` realizaba múltiples pasadas con `visible.filter(...)` en cada renderizado para calcular por separado los contadores `dueCount` y `blockCount`.
- **Attempted / Identified Solution:** Consolidación de ambos contadores en una única pasada $O(N)$ y memoización del objeto resultado con `useMemo`.
- **Outcome / Learning:** Se eliminaron alojamientos temporales repetidos y pasadas sobrantes sobre el arreglo de elementos visibles manteniendo comportamiento idéntico.
- **Future Rule:** Consolidar pasadas y asignaciones temporales en lecturas estadísticas derivadas de colecciones en componentes de React.

## 2026-09-01 - Determinación de columnas máximas en `worksheetXml` (`lib/grade-record-exports.ts`)

- **Finding:** `worksheetXml` ejecutaba `Math.max(1, ...rows.map((row) => row.cells.length))` para cada hoja de cálculo Excel generada, creando un arreglo intermedio y desempacando argumentos variádicos en la pila de llamadas.
- **Attempted / Identified Solution:** Reemplazo por un bucle iterativo `for` de pasada única que calcula `maxColumns` escalarmente.
- **Outcome / Learning:** Se eliminó la asignación de memoria $O(N)$ por hoja y el riesgo de desbordamiento de pila (_call stack overflow_) en exportaciones con miles de registros de calificaciones.
- **Future Rule:** Reemplazar `Math.max(...arr.map(...))` por bucles iterativos simples en utilidades de procesamiento de datos por lotes o generación de documentos.

## 2026-09-03 - Optimización de renderizado académico en `renderAcademicContentToHtml` (`lib/academic-content.ts`)

- **Finding:** `normalizeDisplayMath` dividía y procesaba por líneas cualquier texto académico mediante `split("\n")` y múltiples expresiones regulares en cada renderizado, aun cuando el texto no contenía bloques de ecuaciones `$$`. Adicionalmente, el objeto `academicProcessors` instanciaba dos canalizaciones idénticas de Unified.
- **Attempted / Identified Solution:** Cortocircuito escalar $O(1)$ `if (!content.includes("$$")) return content;` al inicio de `normalizeDisplayMath` y reutilización de una única instancia `academicProcessor` entre formatos.
- **Outcome / Learning:** Se eliminó la división de cadenas y asignaciones de arreglos $O(N)$ por renderizado para contenido de prosa general, además de reducir el consumo de memoria al cargar el módulo.
- **Future Rule:** Cortocircuitar transformaciones de texto basadas en arreglos o expresiones regulares usando comprobaciones escalares simples (`includes`, `indexOf`) antes de efectuar operaciones de segmentación.

## 2026-09-04 - Construcción de mapas en centro de comunicaciones (`lib/communications.ts`)

- **Finding:** `readCursorMap` y `deriveNotifications` utilizaban el patrón `new Map(array.map(...))` asignando arreglos de tuplas intermedias `[clave, valor]` en cada derivación de notificaciones y recuento de mensajes no leídos.
- **Attempted / Identified Solution:** Reemplazo por bucles `for..of` directos con `map.set(...)` sin asignación de tuplas intermedias.
- **Outcome / Learning:** Se eliminó la doble asignación de memoria por elemento en la generación de notificaciones, reduciendo la presión sobre el recolector de basura en re-renderizados frecuentes del portal.
- **Future Rule:** Construir objetos `Map` iterando directamente con `for..of` e invocando `map.set()` en lugar de mapear colecciones a arreglos temporales de tuplas `[k, v]`.

## 2026-09-05 - Construcción de Map de cursos en el planificador (`lib/planner.ts`)

- **Finding:** `plannerItems` utilizaba `new Map(input.courses.map((course) => [course.id, course]))`, generando arreglos de tuplas intermedias `[id, course]` en la construcción del alimentador de eventos.
- **Attempted / Identified Solution:** Sustitución por un bucle `for..of` directo con `byId.set(course.id, course)`.
- **Outcome / Learning:** Se eliminó la asignación temporal de arreglos de tuplas por elemento en cada renderizado y filtrado del calendario, reduciendo la recolección de basura.
- **Future Rule:** Construir mapas directamente con iteraciones `for..of` en funciones puras de transformación llamadas frecuentemente.

## 2026-09-07 - Determinación de columnas máximas de tabla en `convertTables` (`lib/multimodal-editor.ts`)

- **Finding:** `convertTables` calculaba la cantidad de columnas de las tablas con `Math.max(...grid.map((row) => row.length))`, generando un arreglo intermedio $O(N)$ y desempaquetando argumentos variádicos en la pila de llamadas.
- **Attempted / Identified Solution:** Reemplazo por un bucle iterativo `for..of` escalar de pasada única sobre `grid`.
- **Outcome / Learning:** Se eliminó la asignación de memoria intermedia por tabla en la conversión de HTML a Markdown académico y se previno un posible desbordamiento de pila (_stack overflow_) en tablas extensas.
- **Future Rule:** Reemplazar `Math.max(...arr.map(...))` por un bucle `for` o `for..of` con acumulador escalar en funciones de transformación o serialización.

## 2026-09-08 - Recuento de avance de revisiones en `reviewProgress` (`app/views/classroom/submission-review-model.ts`)

- **Finding:** `reviewProgress` realizaba dos llamadas independientes a `rows.filter(...)` en cada cálculo del estado de avance, asignando dos arreglos intermedios temporales $O(N)$ y haciendo dos pasadas completas sobre la lista de entregas.
- **Attempted / Identified Solution:** Consolidación de ambos contadores (`graded` y `delivered`) en una sola pasada iterativa `for..of` de $O(N)$ tiempo y $O(1)$ espacio.
- **Outcome / Learning:** Se eliminó la asignación de memoria de arreglos temporales y se redujo la iteración de dos pasadas a una sola, preservando 100% la equivalencia funcional.
- **Future Rule:** Consolidar pasadas y evitar múltiples invaciones a `.filter()` sobre el mismo arreglo en funciones de agregación o cálculo de métricas.

## 2026-09-09 - Cálculo de contadores en `teacherCounters` (`app/preview/docente/teacher-preview-model.ts`)

- **Finding:** `teacherCounters` ejecutaba tres operaciones `.filter(...)` separadas sobre los arreglos `submissions` y `activities` para calcular los contadores de entregas pendientes, entregas faltantes y actividades borrador. Esto generaba tres arreglos temporales intermedios y pasadas redundantes.
- **Attempted / Identified Solution:** Consolidación de la agregación de contadores en bucles `for..of` directos de pasada única de $O(N)$ tiempo y $O(1)$ espacio adicional.
- **Outcome / Learning:** Se eliminó la asignación de arreglos temporales en la derivación de contadores de la vista previa del docente, manteniendo 100% la equivalencia funcional.
- **Future Rule:** Evitar llamadas encadenadas o múltiples a `.filter(...).length` cuando se computan múltiples contadores escalares a partir de los mismos datos de entrada.

## 2026-09-11 - Construcción de Map de preguntas en `QuizCorrectionView` (`app/views/classroom/StudentQuizzes.tsx`)

- **Finding:** `QuizCorrectionView` utilizaba `new Map(quiz.questions.map((question) => [question.id, question]))`, asignando arreglos de tuplas intermedias `[id, question]` en la vista de resultados de cuestionarios.
- **Attempted / Identified Solution:** Sustitución por un bucle `for..of` directo con `byQuestion.set(question.id, question)`.
- **Outcome / Learning:** Se eliminó la asignación de memoria de arreglos de tuplas por elemento en la visualización de corrección de cuestionarios manteniendo exactitud funcional.
- **Future Rule:** Construir mapas de búsqueda a partir de arreglos en vistas usando bucles `for..of` e invocar `.set()` directamente sin asignación de tuplas intermedio.

## 2026-09-12 - Construcción de Map de cursos y días en `CalendarView` (`app/views/calendar/CalendarView.tsx`)

- **Finding:** `CalendarView` instanciaba mapas de cursos y días indexados (`courseById` y `byDay`) mediante `new Map(courses.map(...))` y `new Map(days.map(...))`, creando arreglos temporales de tuplas `[clave, valor]` en cada actualización de filtros o días visibles.
- **Attempted / Identified Solution:** Sustitución por bucles `for..of` directos con `map.set(...)` en los bloques `useMemo` correspondientes.
- **Outcome / Learning:** Se eliminó la asignación intermedia de tuplas por elemento en la vista del calendario del usuario, reduciendo el trabajo del recolector de basura durante la navegación de fechas.
- **Future Rule:** En componentes React de vistas principales con re-renderizado frecuente, construir objetos Map dentro de `useMemo` iterando de forma imperativa con `for..of` y `map.set`.
