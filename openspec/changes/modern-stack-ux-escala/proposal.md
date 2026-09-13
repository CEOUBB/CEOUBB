## Why

Centro de Estudio UBB (CEOUBB) avanza hacia su adopción como el LMS oficial de la Universidad del Bío-Bío, proyectado para servir a más de 5.000 estudiantes y cientos de docentes. Actualmente, la retroalimentación al usuario se realiza mediante banners estáticos o funciones de estado local dispersas (`note(text, tone)`), los filtros y paginación en vistas complejas no se sincronizan de forma tipada con los parámetros de búsqueda de la URL, el buscador global opera con una implementación ad-hoc artesanal que carece de primitivas headless estándar, las actas y nóminas de alta concurrencia renderizan todas las filas en el DOM provocando caídas de framerate en dispositivos modestos, y la protección antibot en endpoints y formularios públicos se apoya en inyección manual de scripts en el DOM.

Integrar este conjunto curado de cinco librerías especializadas (`sonner`, `nuqs`, `cmdk`, `@tanstack/react-virtual` y `@marsidev/react-turnstile`) eleva la experiencia de usuario a un estándar de alta productividad y refuerza la resiliencia operativa y el rendimiento a 60 FPS requerido a escala institucional.

## What Changes

- **Sistema Global de Notificaciones Toast (`sonner`)**:
  - Incorporación del proveedor `<Toaster />` configurado con tokens semánticos OKLCH y diseño deliberado institucional.
  - Reemplazo gradual y puente de compatibilidad para el patrón legado `note(text, tone)` en `GradesSection`, `ClassroomView` y `AdminView`.
  - Soporte nativo para notificaciones asíncronas reactivas (`toast.promise`) en guardado de calificaciones, subida de archivos a Storage y mutaciones transaccionales.
  - Adaptación móvil táctil con gestos swipe-to-dismiss y respeto estricto a preferencias de movimiento reducido (`prefers-reduced-motion`).

- **Sincronización de Estado en URL Tipo-Segura (`nuqs`)**:
  - Gestión de filtros de asignaturas, estados de entregas, pestañas de gestión docente y paginación de administración mediante adaptadores de `nuqs` para Next.js 16 App Router.
  - Esquemas de validación Zod para query params, garantizando persistencia ante recarga de página y navegación con historial nativo (adelante/atrás).

- **Buscador Global y Paleta de Comandos Headless (`cmdk`)**:
  - Refactorización de `app/command-palette.tsx` hacia la primitiva accesible `cmdk`, preservando el atajo `Ctrl+K` / `⌘K` y la integración con `@phosphor-icons/react`.
  - Búsqueda difusa optimizada con filtrado instantáneo por ramos, secciones, actas, compañeros y comandos administrativos, con soporte de accesibilidad ARIA completa (listbox, active-descendant, combobox).

- **Virtualización de Listas y Tablas Masivas (`@tanstack/react-virtual`)**:
  - Virtualización de DOM para nóminas de estudiantes, actas de notas en `GradesSection`, cola de entregas en `SubmissionReviewTray` y listado de usuarios en `AdminView`.
  - Scroll fluido a 60 FPS garantizado en dispositivos móviles de gama baja y portátiles institucionales, reduciendo el consumo de memoria en más del 80% en secciones con más de 100 estudiantes.

- **Protección Antibot Declarativa Edge (`@marsidev/react-turnstile`)**:
  - Reemplazo del hook imperativo `app/contacto/useTurnstile.ts` por el componente declarativo `<Turnstile />`.
  - Soporte de temas automático (modo claro / modo oscuro OKLCH), refresco y recuperación ante caducidad de tokens, y validación estricta en el Worker `/api/soporte`.

## Capabilities

### New Capabilities

- `ui/toast-notifications`: Sistema institucional de notificaciones flotantes reactivas, táctiles y accesibles con Sonner, integrado con el sistema de diseño OKLCH y soporte de promesas asíncronas.
- `ui/command-palette`: Paleta de comandos global headless basada en cmdk con atajos de teclado accesibles (`Ctrl+K`), filtrado difuso instantáneo y navegación multimodal.
- `ui/url-state`: Gestión y sincronización de filtros, pestañas y paginación tipadas con Zod en URL search params mediante nuqs para Next.js App Router.
- `ui/virtualization`: Virtualización de renderizado de alto rendimiento a 60 FPS para tablas de calificaciones, listas de entregas y nóminas masivas con @tanstack/react-virtual.
- `integrations/turnstile`: Integración declarativa, tipada y resiliente de Cloudflare Turnstile con @marsidev/react-turnstile para formularios y endpoints públicos.

### Modified Capabilities

<!-- Ninguna capacidad existente cambia sus requerimientos de negocio o invariantes fundamentales; el modelo de acceso (lib/access-policy.ts), la escala chilena de calificaciones (lib/grades.ts) y las reglas de seguridad de Firestore/Storage permanecen inmutables. -->

## Impact

- **Código Afectado**:
  - `app/layout.tsx`: Montaje del `<Toaster />` de Sonner y proveedor de `nuqs` (`NuqsAdapter`).
  - `app/command-palette.tsx`: Migración interna de la lógica de renderizado hacia primitivas de `cmdk`.
  - `app/views/classroom/GradesSection.tsx`: Virtualización de filas de estudiantes y adopción de `toast.promise` para guardado de notas.
  - `app/views/AdminView.tsx`: Virtualización del directorio de cuentas y sincronización de búsqueda/páginas en URL search params.
  - `app/views/classroom/use-classroom-handlers.ts`: Integración de disparadores de Sonner para eventos del aula virtual.
  - `app/contacto/ContactForm.tsx` y `app/contacto/useTurnstile.ts`: Migración a `@marsidev/react-turnstile`.
- **Dependencias (`package.json`)**:
  - Se agregan como dependencias de producción: `sonner`, `nuqs`, `cmdk`, `@tanstack/react-virtual`, `@marsidev/react-turnstile`.
- **Compatibilidad**:
  - Totalmente compatible con Next.js 16 (App Router), React 19, Cloudflare Workers runtime (`@opennextjs/cloudflare`) y Capacitor 7 WebView Android/iOS.
