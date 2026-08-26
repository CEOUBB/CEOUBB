## 1. Base de Datos y Persistencia Relacional

- [x] 1.1 Eliminar funciones escalares `upper()` y `lower()` en cláusulas de búsqueda en `lib/services/teacher-course-management.ts` y verificar con `pnpm run test:unit`.
- [x] 1.2 Agregar índice compuesto `(usuario_id, estado)` a `matriculas` en `db/schema.ts` y verificar consistencia de esquema con `pnpm run typecheck`.
- [x] 1.3 Implementar multi-row batch inserts para participantes coincidentes y pendientes en `lib/services/moodle-import.ts` y verificar con `pnpm test`.
- [x] 1.4 Deduplicar consultas relacionales en `app/api/enrollments/me/route.ts` derivando `memberships` de `sections` cuando no hay cursor y verificar con `pnpm test`.

## 2. Frontend y React 19 UI Engine

- [x] 2.1 Sustituir hashing recursivo FNV-1a y `JSON.stringify` en `app/views/classroom/RichText.tsx` por claves compuestas estables y verificar con `pnpm run test:unit`.
- [x] 2.2 Aislar el estado de edición de publicaciones en `app/views/classroom/PostsSection.tsx` para evitar re-renderizados innecesarios del feed y verificar con `pnpm run typecheck`.

## 3. Next.js, API & Mobile Bundle

- [x] 3.1 Habilitar `experimental.optimizePackageImports` para `@phosphor-icons/react` en `next.config.ts` y verificar compilación con `pnpm run build`.
- [x] 3.2 Podar variantes innecesarias de `Merriweather` en `app/layout.tsx` y retirar importación global de `katex.min.css` verificando con `pnpm test`.
- [x] 3.3 Paralelizar peticiones a la API de GitHub en `lib/discord/pr-reviewer.ts` con `Promise.all` y verificar con `pnpm run typecheck`.
- [x] 3.4 Condicionar la inclusión del catálogo institucional en `app/api/teacher/courses/route.ts` cuando haya cursor y verificar con `pnpm test`.

## 4. Verificación y Control de Calidad

- [x] 4.1 Ejecutar `pnpm run verify:fast` y `pnpm run verify:invariants` asegurando 100% de pruebas pasando.
- [x] 4.2 Ejecutar `pnpm run lint`, `pnpm run format:check` y `pnpm run doctor` verificando cero errores y diagnósticos limpios.
- [x] 4.3 Sincronizar hashes de pruebas con `scripts/verify-test-hashes.mjs` y validar especificaciones con `openspec validate --specs`.
