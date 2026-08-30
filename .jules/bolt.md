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
