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
