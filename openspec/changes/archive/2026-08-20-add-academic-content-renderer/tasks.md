Trazabilidad de requisitos:

| Marker          | Requirement                                            |
| :-------------- | :----------------------------------------------------- |
| `REQ-RENDER-01` | Deterministic Multimodal Rendering                     |
| `REQ-RENDER-02` | Initial KaTeX Rendering Without FOUC                   |
| `REQ-RENDER-03` | Bounded Scientific Syntax Highlighting                 |
| `REQ-RENDER-04` | Accessible Quick Copy                                  |
| `REQ-RENDER-05` | Institutional Academic Callouts and Responsive Content |

## 1. Especificación y baseline

- [x] 1.1 Registrar el cambio aprobado, requisitos EARS/BDD, decisiones, límites, presupuesto y blast radius en OpenSpec. Verificar: `pnpm exec openspec validate add-academic-content-renderer --strict`.
- [x] 1.2 Registrar CEO-58 como trabajo activo en `PLAN.md` sin alterar filas de otros owners. Verificar: `git diff --check`.
- [x] 1.3 Instalar con `pnpm` las dependencias AST, KaTeX y highlighting aprobadas por el alcance. Verificar: `pnpm install --frozen-lockfile`.

## 2. TDD RED y test-locking

- [x] 2.1 Crear `tests/academic-content-renderer.test.ts` para REQ-RENDER-01..05: Markdown/HTML, XSS, fórmula bloque/inline, cinco lenguajes, unknown fallback, toolbar y callouts. Verificar RED: `node --experimental-strip-types --test tests/academic-content-renderer.test.ts` falló por módulo funcional ausente.
- [x] 2.2 Registrar la prueba en `test`, `test:unit` y `verify:fast`; generar el snapshot SHA-256 antes de GREEN. Verificar: `node scripts/verify-test-hashes.mjs --check`.

## 3. Pipeline de dominio

- [x] 3.1 Implementar `lib/academic-content.ts` con pipeline Remark/Rehype determinista y schema seguro (REQ-RENDER-01). Verificar: prueba focal.
- [x] 3.2 Agregar KaTeX inline/bloque después del sanitizer con error tolerante (REQ-RENDER-02). Verificar: prueba focal.
- [x] 3.3 Registrar Python, MATLAB, C, SQL y R sin detección y agregar toolbar HAST confiable (REQ-RENDER-03, REQ-RENDER-04). Verificar: prueba focal.

## 4. UI y estilos

- [x] 4.1 Crear `AcademicContentRenderer` y su boundary cliente con delegación de portapapeles y `aria-live` (REQ-RENDER-04). Verificar: `pnpm run typecheck`.
- [x] 4.2 Cargar KaTeX CSS y JetBrains Mono en `app/layout.tsx` (REQ-RENDER-02, REQ-RENDER-03). Verificar: `pnpm test` compila el build productivo.
- [x] 4.3 Implementar `.academic-prose`, callouts, tablas, matemática, código, foco y overflow responsivo en `app/globals.css` (REQ-RENDER-03, REQ-RENDER-05). Verificar: viewport 375 px y 1280 px.

## 5. GREEN, refactor y verificación

- [x] 5.1 Ejecutar la prueba focal y documentar GREEN sin modificar sus aserciones. Verificar: 9/9; Prettier aplicó sólo formato mecánico antes de regenerar el hash y la suite volvió a pasar 9/9.
- [x] 5.2 Validar clipboard, fórmula, tabla y callouts en navegador, incluida la confirmación accesible de copia. Verificar: recorrido del harness local a 375 px y 1280 px, sin overflow global ni errores de consola.
- [x] 5.3 Ejecutar `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:check` y `pnpm test`. Verificar tras rebase sobre `origin/main`: 200/200 fast, 31/31 invariantes y 225/225 suite integral.
- [x] 5.4 Actualizar tareas, archivar el cambio a `openspec/specs/content/academic-rendering/spec.md`, registrar handoff y estado verificado. Verificar: `pnpm exec openspec validate --specs`.

## 6. Publicación

- [x] 6.1 Revisar diff/status; agregar sólo archivos CEO-58; commit Conventional Commit en español.
- [ ] 6.2 Push de la rama sugerida, PR no borrador en español contra `main`, enlace a Linear y comentario de resultados en CEO-58.
