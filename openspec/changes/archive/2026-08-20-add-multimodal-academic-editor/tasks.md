# Tareas: editor académico multimodal

## Estado

VERIFICADA

- [x] 1.1 Definir requisitos EARS/BDD y validar el delta OpenSpec. Requisitos: REQ-EDITOR-01 a REQ-EDITOR-05. Verificación: `pnpm exec openspec validate add-multimodal-academic-editor --strict`.
- [x] 1.2 Crear pruebas RED de conversión, integración, atajos y accesibilidad; registrar su hash. Requisitos: REQ-EDITOR-01 a REQ-EDITOR-05. Verificación: `pnpm exec node --experimental-strip-types --test tests/multimodal-editor.test.ts`.
- [x] 2.1 Implementar el conversor Markdown/HTML acotado con passthrough de HTML libre. Requisitos: REQ-EDITOR-01, REQ-EDITOR-03. Verificación: suite dedicada.
- [x] 2.2 Implementar pestañas, lienzo Visual, fuentes Markdown/HTML y sincronización controlada. Requisitos: REQ-EDITOR-01, REQ-EDITOR-02, REQ-EDITOR-03. Verificación: `pnpm run typecheck`.
- [x] 2.3 Implementar toolbar, inserciones académicas, atajos y navegación WCAG. Requisitos: REQ-EDITOR-02, REQ-EDITOR-04. Verificación: suite dedicada y `pnpm run lint`.
- [x] 2.4 Integrar el componente con publicaciones y edición existentes sin cambiar `body: string`. Requisitos: REQ-EDITOR-05. Verificación: `pnpm run verify:fast`.
- [x] 3.1 Completar QA visual responsive y navegación por teclado. Requisitos: REQ-EDITOR-02, REQ-EDITOR-04. Verificación: navegador a 1440×1000 y 375×812.
- [x] 3.2 Ejecutar las puertas completas, archivar el cambio y actualizar el handoff. Requisitos: todos. Verificación: `pnpm run lint`, `pnpm run typecheck`, `pnpm run verify:invariants`, `pnpm test`.
