## Why

Actualmente los docentes de la Universidad del Bío-Bío deben descargar manualmente las entregas de los estudiantes (archivos PDF de tareas, controles e informes) y corregir fuera de la plataforma, o ingresar calificaciones en una matriz tabular aislada del documento del alumno. En el espacio prototipo (`/preview/docente/`) se validó con éxito una experiencia fluida de "Mesa de corrección" con cola de entregas, panel de rúbrica/nota y visualizador. Este cambio traslada e implementa esa capacidad directamente en el aula viva (`ClassroomView`), integrando el visor `@pdfslick/react` mediante carga diferida para web y Capacitor WebView, habilitando una bandeja de corrección rápida con calificación en contexto, atajos de teclado y guardado reactivo sin fricción.

## What Changes

- **Integración de Visor PDF (@pdfslick/react)**: Se incorpora `@pdfslick/react` cargado dinámicamente (`next/dynamic` con `ssr: false`) para renderizar entregas PDF de estudiantes directamente en el navegador y en el WebView móvil sin forzar descargas locales.
- **Bandeja Rápida de Corrección Docente**: Se habilita una vista o mesa de corrección contextual en `ClassroomView` accesible para usuarios con rol docente (`teacher` / `owner`), mostrando la lista paginada de entregas y el estado de cada estudiante.
- **Calificación y Retroalimentación en Contexto**: Panel lateral acoplado al visor con input de nota (escala chilena 1.0–7.0 con validación inmediata), textarea de retroalimentación privada y guardado reactivo con debounce y estados visuales (borrador, guardando, guardado).
- **Navegación Ágil por Teclado**: Atajos accesibles (ej. navegación entre entregas anterior/siguiente) con guardado automático al avanzar, respetando el foco y WCAG 2.2.
- **Soporte Flexible de Pauta**: Acceso rápido y visualización de la pauta de evaluación asociada (en texto enriquecido o archivo PDF de referencia) sin obligar a matrices rígidas.
- **Suscripción de Entregas para Docentes en Tiempo Real**: Nueva función de consulta/escucha en tiempo real en la capa de clientes Firebase (`watchSectionSubmissions`) aprovechando las reglas ya desplegadas en `firestore.rules` y `storage.rules`.

## Capabilities

### New Capabilities

- `classroom/submission-review`: Bandeja rápida de corrección docente con visor PDF integrado vía PDFSlick, calificación 1.0–7.0 con retroalimentación privada, atajos de teclado y gestión de cola de entregas por evaluación.

### Modified Capabilities

<!-- Ningún requerimiento preexistente se modifica; la escala de calificaciones de lib/grades.ts y la pista de auditoría inmutable de notas (REQ-AUDIT-*) se mantienen intactas y son consumidas directamente. -->

## Impact

- **Código Afectado**:
  - `app/views/classroom/`: Nueva bandeja/vista de corrección docente y conexión desde la cabecera o sección de notas/evaluaciones.
  - `lib/firebase/storage.ts` y `lib/firebase-classroom-client.ts`: Exposición de `watchSectionSubmissions` y resolución de URLs de Cloud Storage para el visor.
- **Dependencias**:
  - `@pdfslick/react`: Se agrega como dependencia en `package.json` vía `pnpm add @pdfslick/react`.
- **Compatibilidad**:
  - Web moderna (Chromium, Firefox, Safari) y Capacitor WebView en Android/iOS (respetando Content Security Policy y CORS de Firebase Storage).
