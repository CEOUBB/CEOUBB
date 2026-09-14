## 1. Actualización de Runtime y Dependencias Base

- [x] 1.1 Actualizar versiones de `react`, `react-dom` a `^19.3.0` y `@types/react`, `@types/react-dom` en `package.json`, verificando la instalación limpia mediante `pnpm install`
- [x] 1.2 Ejecutar `pnpm run typecheck` para verificar que las definiciones de tipos de React 19.3 (`<ViewTransition>`, `browser()`, Fragment refs) compilen sin errores

## 2. Aislamiento de Entorno con `use(browser())`

- [x] 2.1 Refactorizar `app/Portal.tsx` para reemplazar el patrón `useState(false)` + `useEffect` por `use(browser())` de `react-dom`, verificando que renderice modales y portales sin parpadeos de hidratación
- [x] 2.2 Adaptar componentes con dependencias estrictas de navegador o plugins móviles de Capacitor para suspender en el servidor de forma declarativa con `use(browser())`

## 3. Transiciones Nativas con `<ViewTransition>`

- [x] 3.1 Integrar `<ViewTransition update="auto" default="none">` en el contenedor de vistas de `app/views/CoursesDashboard.tsx`, verificando el cross-fade acelerado por GPU entre pestañas
- [x] 3.2 Implementar `addTransitionType` en cambios de estado direccionales (ej. tabs previas/siguientes) y verificar la sincronización con pseudo-elementos `::view-transition-new / old`
- [x] 3.3 Configurar regla `@media (prefers-reduced-motion: reduce)` para cancelar la duración de las view transitions nativas ante preferencias de accesibilidad

## 4. Verificación y Suite de Calidad

- [x] 4.1 Ejecutar formateo de código con `pnpm run format` y verificar con `pnpm run format:check`
- [x] 4.2 Ejecutar suite rápida `pnpm run verify:fast` verificando tests unitarios, typecheck y test-locking SHA-256 intacto
- [x] 4.3 Ejecutar `pnpm run verify:invariants` confirmando que las políticas de seguridad institucional (`lib/access-policy.ts`) y la aritmética de notas (`lib/grades.ts`) se preservan
- [x] 4.4 Ejecutar preflight de empaquetado para Cloudflare Workers (`pnpm run cloudflare:build` o `pnpm run build`) validando compatibilidad total con Flight y OpenNext
