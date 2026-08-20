## Why

Actualmente, el componente `LoadingScreen` de inicio modela con precisión 1:1 la cuadrícula de cursos del dashboard principal, pero las vistas secundarias cargadas dinámicamente (`CalendarView`, `ResourcesView`, `AdminView` y `ClassroomView`) utilizan un único componente genérico `ViewSkeleton` consistente en tres franjas grises no representativas. Esto genera saltos abruptos de maquetación (_Cumulative Layout Shift - CLS_), desorientación visual en transiciones y una discrepancia en la calidad de artesanía (_High-Craft UI_) esperada para el LMS institucional.

## What Changes

- **Esqueleto dedicado para Calendario (`CalendarSkeleton`)**: Estructura geométrica con encabezado de navegación semanal, botones de acción, selector de días, franja de filtros de asignaturas y grilla horaria semanal de 7 columnas con bloques de eventos simulados.
- **Esqueleto dedicado para Recursos (`ResourcesSkeleton`)**: Estructura geométrica con cabecera lead, bloque asimétrico de Ecosistema CEOUBB (Biblioteca y Móvil), rejilla de chips para Asistentes de IA, tarjetas de Beneficios Institucionales y enlaces a Portales UBB.
- **Esqueleto dedicado para Administración (`AdminSkeleton`)**: Estructura geométrica con cabecera de métricas, barra de búsqueda con icono, tabla de usuarios estructurada (6 filas con avatar/nombre/correo, badge de rol y selector de acción) y controles de paginación.
- **Esqueleto dedicado para Aula Virtual (`ClassroomSkeleton`)**: Estructura geométrica con migas de pan, título del ramo, badge de código, barra horizontal de 5 pestañas, feed de novedades (tarjetas de avisos con cabecera de autor y adjuntos) y riel lateral con información del ramo.
- **Reutilización y Consolidación de Tokens OKLCH y Barrido de Luz**: Aprovechamiento del sistema de shimmer diagonal (`.sk`, `sk-sweep`, variables `--sk-delay` escalonadas) y respeto a preferencias de accesibilidad (`prefers-reduced-motion: reduce`, `aria-busy="true"`, `role="status"`).

## Capabilities

### New Capabilities

- `ui/view-skeletons`: Define los requerimientos de fidelidad geométrica 1:1, supresión de CLS, accesibilidad y degradación con movimiento reducido para los estados de carga diferida de las vistas del portal.

### Modified Capabilities

<!-- No se modifican requerimientos funcionales de capacidades existentes en backend o auth -->

## Impact

- **Código afectado**:
  - `app/portal-shell.tsx`: Reemplazo de `ViewSkeleton` genérico por importaciones de esqueletos especializados en las definiciones de `dynamic()`.
  - `app/views/skeletons/`: Nuevos componentes modulares o consolidación de esqueletos de vistas.
  - `app/globals.css`: Ajustes y utilidades de soporte de esqueletos si son requeridas.
- **Dependencias**: Sin nuevas dependencias externas (consumo de `@phosphor-icons/react` y tokens OKLCH ya existentes).
- **Riesgo**: Nulo para lógica de negocio y seguridad relacional/Firestore.
