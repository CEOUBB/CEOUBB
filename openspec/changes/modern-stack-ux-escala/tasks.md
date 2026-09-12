## 1. Dependencias y Configuración de Proveedores Base

- [x] 1.1 Instalar las 5 dependencias en `package.json` mediante `pnpm add sonner nuqs cmdk @tanstack/react-virtual @marsidev/react-turnstile` y verificar que la instalación concluye sin advertencias de pares incompatibles en React 19.
- [x] 1.2 Configurar `<NuqsAdapter>` y `<Toaster />` en `app/layout.tsx`, definiendo posición (`bottom-right` en desktop, `top-center` en móvil), respeto a `prefers-reduced-motion` y tokens OKLCH de CEOUBB.
- [x] 1.3 Crear el helper tipado `lib/toast.ts` con funciones de conveniencia (`toast.success`, `toast.error`, `toast.info`, `toast.promise`) integrando iconos `@phosphor-icons/react` y verificar con `pnpm run typecheck`.
- [x] 1.4 Crear el módulo de esquemas y parsers URL `lib/search-params.ts` utilizando primitivas tipadas de `nuqs` para búsqueda, paginación, filtros y pestañas activas.

## 2. Sistema de Toasts y Micro-Interacciones (Sonner)

- [x] 2.1 Reemplazar el patrón legado `note(text, tone)` en `app/views/classroom/use-classroom-handlers.ts` por llamadas al helper institucional de `lib/toast.ts`, manteniendo retrocompatibilidad visual.
- [x] 2.2 Integrar `toast.promise` en `app/views/classroom/GradesSection.tsx` para el guardado de calificaciones y retroalimentación de notas hacia la Cloud Function auditada.
- [x] 2.3 Conectar notificaciones toast de éxito y error en `app/views/AdminView.tsx` para el archivado de períodos académicos y gestión de usuarios.
- [x] 2.4 Verificar que los toasts admiten gesto táctil swipe-to-dismiss y no bloquean el foco de teclado en modales ni drawers.

## 3. Sincronización de Estado en URL (Nuqs)

- [x] 3.1 Integrar `useQueryState` en `app/views/AdminView.tsx` sincronizando los parámetros de búsqueda `q` y página `page` con la URL, verificando que la navegación por historial (atrás/adelante) restaura los filtros.
- [x] 3.2 Migrar el selector de pestañas (`data`, `evaluations`, `assistants`) en `app/views/TeacherCoursesView.tsx` para sincronizarse con el parámetro `?tab=` en la URL.
- [x] 3.3 Habilitar filtros de ciclo y período académico en `app/views/CoursesDashboard.tsx` sincronizados con `searchParams` y verificar que no provocan desmonte ni parpadeo de layout.

## 4. Paleta de Comandos Global Headless (CMDK)

- [x] 4.1 Refactorizar el cuerpo interno de `app/command-palette.tsx` utilizando las primitivas headless de `cmdk` (`Command.Dialog`, `Command.Input`, `Command.List`, `Command.Group`, `Command.Item`).
- [x] 4.2 Conectar la navegación por teclado (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), la animación con `motion/react` y los atributos ARIA combobox/listbox según WCAG 2.2 AA.
- [x] 4.3 Preservar el atajo global `Ctrl+K` / `⌘K` y el botón de búsqueda en la cabecera móvil, verificando el filtrado difuso instantáneo entre ramos, herramientas y vistas.

## 5. Virtualización de Listas Masivas (TanStack Virtual)

- [x] 5.1 Implementar el hook `useVirtualizer` en `app/views/classroom/GradesSection.tsx` para virtualizar la matriz de estudiantes y notas, asegurando scroll continuo a 60 FPS con más de 100 alumnos.
- [x] 5.2 Virtualizar la tabla de cuentas y usuarios en `app/views/AdminView.tsx`, garantizando que el DOM monta únicamente las filas visibles en pantalla más un buffer de sobre-escaneo acotado.
- [x] 5.3 Asegurar la estabilidad de scroll al editar notas en línea y verificar que los elementos enfocados por teclado (`Tab`) se desplazan automáticamente dentro de la ventana visible.

## 6. Protección Antibot Declarativa Edge (React Turnstile)

- [x] 6.1 Sustituir el hook de inyección manual de scripts en `app/contacto/ContactForm.tsx` por el componente declarativo `<Turnstile />` de `@marsidev/react-turnstile`.
- [x] 6.2 Configurar manejo de eventos `onSuccess`, `onError`, y `onExpire` para auto-recuperación de tokens sin forzar recargas de página.
- [x] 6.3 Marcar como obsoleto o retirar el archivo de inyección manual `app/contacto/useTurnstile.ts` y validar que el endpoint `/api/soporte` continúa verificando tokens con éxito.

## 7. Pruebas Automatizadas, Verificación de Invariantes y Calidad

- [x] 7.1 Crear la suite de pruebas unitarias `tests/modern-stack.test.ts` verificando parsers de URL de `nuqs`, helpers de `toast` y contratos de props de componentes.
- [x] 7.2 Ejecutar `pnpm run typecheck` y verificar cero errores de tipos con TypeScript 5/6 y React 19.
- [x] 7.3 Ejecutar `pnpm run verify:invariants` y comprobar que las reglas de roles, notas y modelos académicos se mantienen intactas.
- [x] 7.4 Ejecutar `pnpm run format` y `pnpm run format:check` confirmando estilo Prettier limpio.
- [x] 7.5 Ejecutar `openspec validate --specs` y verificar que todas las especificaciones y deltas cumplen estrictamente con la sintaxis formal.
