# ADR 0002: Adopción del Runtime Capacitor 7 Remote-First para Aplicaciones Móviles

- **Estado:** Aceptado
- **Fecha:** 2026-08-15
- **Decisores:** Mantenedores del Proyecto CEOUBB
- **Consulta / Specs:** `docs/specs/p5-capacitor-mobile-migration.md`, `AGENTS.md`

---

## Contexto y Planteamiento del Problema

La implementación móvil inicial de CEOUBB utilizaba un contenedor Android nativo artesanal basado en `WebView` (`StudyBridge.java`, `ClassroomService.java`, que acumulaban más de 1.200 líneas de código Java imperativo). Esta arquitectura presentaba importantes desafíos de mantenimiento y escalabilidad:

1. **Duplicación de Lógica y Deuda Técnica:** El código Java nativo parseaba manualmente dominios de correo, exponía interfaces JavaScript desprotegidas y duplicaba una copia completa de la biblioteca estática dentro de `android/app/src/main/assets/www/` (3.5 MB de assets duplicados).
2. **Ciclos Lentos de Distribución:** Cualquier corrección de interfaz o mejora en el aula requería compilar un nuevo binario Android APK/AAB y esperar la revisión en Google Play Console.
3. **Inexistencia de Soporte Multiplataforma:** No existía una base limpia para soportar iOS sin reescribir un puente nativo equivalente en Swift/Objective-C.

---

## Decisión de Arquitectura

Se decide **reemplazar la WebView artesanal por el runtime oficial de Capacitor 7.x**, adoptando una estrategia **Remote-First**:

1. **Carga Remota del Portal de Producción:**
   - La aplicación móvil carga directamente `https://ceoubb.com` mediante la directiva `server.url` en `capacitor.config.ts`.
   - Todas las actualizaciones de frontend desplegadas en Vercel están disponibles de forma instantánea para los usuarios móviles instalados.

2. **Puente Nativo Modular y Desacoplado (`lib/mobile-bridge.ts`):**
   - Se implementan wrappers TypeScript para plugins oficiales de Capacitor:
     - `@capacitor/status-bar`: Control de colores de status bar adaptados al diseño institucional.
     - `@capacitor/haptics`: Feedback háptico en toques y acciones críticas.
     - `@capacitor/app`: Manejo unificado del botón físico Atrás (Hardware Back Button).
     - `@capacitor/push-notifications`: Registro de tokens FCM con Firebase Cloud Messaging.
     - `@capacitor-firebase/authentication`: Flujo nativo de Google Sign-In con traspaso de credenciales a Firebase Web Auth.
   - **Gobernanza Web:** Todas las llamadas al puente nativo degradan silenciosamente a un _no-op_ cuando la aplicación se ejecuta en el navegador web de escritorio.

3. **Estrategia Offline Canónica con Service Worker (`public/sw.js`):**
   - Se elimina la carpeta duplicada `android/app/src/main/assets/www/`.
   - La biblioteca académica (`/biblioteca/`) se almacena en caché de forma _cache-first_ mediante el Service Worker unificado del portal web (`public/sw.js`), garantizando disponibilidad sin conexión tanto en la PWA web como en la app instalada.
   - `capacitor/www/` actúa exclusivamente como pantalla de rescate (_fallback_) ante desconexión total previa a la inicialización de red.

---

## Consecuencias

### Positivas:

- **Reducción Masiva de Código Legado:** Eliminación de más de 1.200 líneas de código Java y eliminación total del riesgo de desincronización de reglas en el cliente nativo.
- **Despliegue Continuo Instantáneo:** Mejoras de UI, accesibilidad y corrección de bugs se despliegan en tiempo real sin requerir descarga de nuevas versiones desde las tiendas de aplicaciones.
- **Consistencia Visual Absoluta:** La experiencia de usuario es uniforme y consistente con el Sistema de Diseño (`DESIGN.md`) en todas las plataformas.
- **Preparación Multiplataforma:** El proyecto nativo `ios/` queda estructurado como un scaffold reproducible para compilación futura en macOS/Xcode.

### Negativas / Mitigaciones:

- **Dependencia de Conectividad Inicial:** Si el usuario abre la aplicación por primera vez en un entorno sin conexión antes de que el Service Worker se instale, se presenta la pantalla de fallback local.
  - _Mitigación:_ `capacitor/www/index.html` proporciona un estado visual amigable con botón de reintento automático.
- **Riesgo de Despliegues Rotos en Producción:** Un error fatal en `main` desplegado en Vercel impacta inmediatamente a la base instalada.
  - _Mitigación:_ Compuertas de CI exhaustivas (`pnpm test`, `react-doctor`, `bundle-analysis`) y suites de pruebas unitarias automáticas previas a cada merge.
