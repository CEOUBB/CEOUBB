## 1. Implementación de Componentes de Esqueleto Dedicados

- [x] 1.1 Crear `app/views/ViewSkeletons.tsx` con `CalendarSkeleton` (header de navegación, filtros de cursos, cabecera de 7 días y grilla horaria con bloques simulados).
- [x] 1.2 Implementar `ResourcesSkeleton` en `app/views/ViewSkeletons.tsx` (lead page head, ecosistema asimétrico de 2 columnas, rejilla de chips de IA, tiles de beneficios y enlaces a portales UBB).
- [x] 1.3 Implementar `AdminSkeleton` en `app/views/ViewSkeletons.tsx` (lead head con métricas, toolbar con buscador, tabla estructurada de 6 filas con roles y selectores, y paginación).
- [x] 1.4 Implementar `ClassroomSkeleton` en `app/views/ViewSkeletons.tsx` (cabecera con migas de pan y badge de código, 5 pestañas de navegación, feed de posts y riel lateral con información del ramo).

## 2. Integración y Reemplazo en Portal Shell

- [x] 2.1 Actualizar `app/portal-shell.tsx` reemplazando `ViewSkeleton` genérico por los cuatro componentes de esqueleto dedicados en las definiciones de `dynamic()`.
- [x] 2.2 Ajustar estilos en `app/globals.css` si se requieren utilidades de espaciado o refinamientos para el escalonamiento de barrido `--sk-delay`.

## 3. Verificación de Calidad y Pruebas

- [x] 3.1 Ejecutar `pnpm run verify:fast` (Typecheck + Unit Tests + SHA-256 Hashes + OpenSpec Validation).
- [x] 3.2 Ejecutar `pnpm run lint` verificando 0 errores y 0 advertencias.
- [x] 3.3 Ejecutar la suite completa de pruebas con `pnpm test`.
