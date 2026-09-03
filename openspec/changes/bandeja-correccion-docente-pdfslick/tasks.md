## 1. Dependencias y Capa de Datos

- [x] 1.1 Instalar `@pdfslick/react` mediante `pnpm add @pdfslick/react` y verificar que el proyecto compila con `pnpm run typecheck`.
- [x] 1.2 Implementar la función de escucha en tiempo real `watchSectionSubmissions(courseId, evalId, onChange, onError)` en `lib/firebase/storage.ts` y re-exportarla en `lib/firebase-classroom-client.ts`, verificando que respete la estructura de `courses/{courseId}/submissions`.

## 2. Componente de Visualización PDF Dinámico

- [x] 2.1 Crear el componente cliente `PDFViewerPane` encapsulando `@pdfslick/react` con carga diferida (`next/dynamic` con `ssr: false`), importando sus estilos CSS requeridos y verificando compatibilidad con Web y Capacitor WebView.
- [x] 2.2 Diseñar el estado de fallback accesible para entregas inexistentes ("missing") o archivos no PDF con enlace de descarga directa.

## 3. Bandeja Rápida de Corrección Docente (UI & Ergonomía)

- [x] 3.1 Implementar la cola de entregas de la sección con selector de evaluación, filtrado por ciclo de vida (`all`, `submitted`, `late`, `missing`, `graded`), paginación y avatar del estudiante.
- [x] 3.2 Construir el panel contextual de calificación y retroalimentación privada con input de nota (validación 1.0–7.0 con `lib/grades.ts`) y persistencia reactiva con debounce invocando `saveStudentScores` y `saveGradeFeedback`.
- [x] 3.3 Integrar el controlador de atajos de teclado para navegación secuencial entre alumnos (anterior / siguiente), garantizando supresión incondicional de teclas cuando el foco esté en inputs o textareas.
- [x] 3.4 Habilitar la consulta en contexto de la pauta de evaluación o rúbrica de referencia sin reiniciar ni desmontar los campos de la entrega en curso.
- [x] 3.5 Conectar la bandeja de corrección en `ClassroomView.tsx` accesible para roles con facultad docente (`canTeach`), asegurando transición fluida y liberación de memoria al desmontar.

## 4. Pruebas Automatizadas y Verificación de Invariantes

- [x] 4.1 Crear la suite de pruebas unitarias `tests/submission-review.test.ts` verificando filtros de cola, validación de notas, debounce y reglas de navegación por teclado, asegurando su aprobación con `node --experimental-strip-types --test tests/submission-review.test.ts`.
- [x] 4.2 Ejecutar la batería de verificación estricta (`pnpm run verify:fast`, `pnpm run verify:invariants` y `pnpm run lint`), garantizando cero errores, cero advertencias y preservación íntegra de invariantes de seguridad.
