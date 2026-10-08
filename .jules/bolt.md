## 2025-02-23 - Classroom / EvaluationTeamsEditor

- **Finding:** Creating `Map` or `Set` inside `useMemo` hooks using `new Map(array.map(...))` or `new Set(array.flatMap(...))` allocates unnecessary intermediate tuple arrays (`[key, value][]`) and intermediate arrays during every evaluation.
- **Attempted / Identified Solution:** Replaced `new Map(students.map(...))` and `new Set(teams.flatMap(...))` with imperative `for...of` loops using `.set()` and `.add()`.
- **Outcome / Learning:** Succeeded without functional regression. Eliminates intermediate allocations while preserving exact typing and functionality.
- **Future Rule:** When constructing lookup Maps or Sets from arrays in React `useMemo` hooks or performance-critical loops, use imperative `for...of` loops with `.set()` or `.add()` instead of `new Map(array.map(...))` or `new Set(array.flatMap(...))`.
