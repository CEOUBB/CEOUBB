## Why

React 19.3 introduce primitivas nativas de alto impacto (`<ViewTransition>`, `use(browser())`, Fragment Refs y renderizado directo de Context en Server Components) que permiten eliminar código boilerplate, simplificar el aislamiento cliente/servidor y lograr transiciones de interfaz aceleradas por GPU sin sobrecargar el hilo de JavaScript ni inflar el bundle de la aplicación. Adoptar esta versión en Centro de Estudio UBB consolida la experiencia de usuario hacia estándares de fluidez nativa tanto en la web como en el runtime móvil de Capacitor en Android.

## What Changes

- **Actualización de runtime a React 19.3**:
  - Actualización de dependencias `react` y `react-dom` a `19.3.0` (o versión estable correspondiente).
  - Actualización de definiciones de tipos `@types/react` y `@types/react-dom`.
  - Verificación de compatibilidad con Next.js 16 (App Router) y `@opennextjs/cloudflare`.

- **Aislamiento seguro de entorno con `use(browser())`**:
  - Reemplazo del patrón reactivo de montaje (`useState(false)` + `useEffect(() => setMounted(true))`) y guardas frágiles de `typeof window !== 'undefined'` por la llamada nativa `use(browser())` de `react-dom`.
  - Integración fluida con límites de `<Suspense>`, permitiendo que el servidor emita el fallback inmediatamente y la hidratación en cliente resuelva sin parpadeos ni inconsistencias de layout (hydration mismatches).
  - Aplicación directa en componentes con dependencias de APIs de navegador o Capacitor móvil (`app/Portal.tsx`, `app/command-palette.tsx`, plugins de `@capacitor/*`).

- **Transiciones visuales nativas con `<ViewTransition>` y `addTransitionType`**:
  - Integración de `<ViewTransition>` para coordinar animaciones fluidas de navegación y cambio de pestañas en vistas principales (`app/views/CoursesDashboard.tsx`).
  - Animación automática entre estados de carga en límites `<Suspense>` y su contenido resuelto (`update="auto" default="none"`), sincronizado con las especificaciones de `ui/view-skeletons`.
  - Uso de `addTransitionType()` para direccionalidad en transiciones de navegación (adelante / atrás / tabs).

- **Referencias grupales sin wrappers mediante Fragment Refs (`<Fragment ref={...}>`)**:
  - Adopción de `FragmentInstance` para observar intersecciones (`observeUsing`) y gestionar foco de accesibilidad sin inyectar contenedores `<div>` que rompan la disposición flexbox y CSS grid de Tailwind CSS v4.

- **Simplificación de Context en Server Components**:
  - Eliminación de componentes intermediarios (wrappers `'use client'` que solo reenviaban props) al renderizar `<Context value={...}>` directamente desde Server Components.

## Capabilities

### New Capabilities

- `core/react-19-3-runtime`: Actualización de la versión base de React y React DOM a 19.3 con compatibilidad validada en Cloudflare Workers y Capacitor.
- `ui/browser-primitives`: Patrones de aislamiento cliente/servidor declarativos mediante la primitiva `use(browser())` de `react-dom`.
- `ui/view-transitions`: Transiciones visuales declarativas nativas con `<ViewTransition>` y `addTransitionType` coordinadas con transiciones concurrentes de React.

### Modified Capabilities

- `ui/view-skeletons`: Se actualizan los criterios de transición entre esqueletos geométricos y contenido diferido mediante `<ViewTransition update="auto" default="none">`.

## Impact

- **Código Afectado**:
  - `package.json`: Versiones de `react`, `react-dom`, `@types/react`, `@types/react-dom`.
  - `app/Portal.tsx`: Sustitución de guardas de montaje por `use(browser())`.
  - `app/command-palette.tsx`: Adopción de `use(browser())` para inicialización de atajos y montajes cliente.
  - `app/views/CoursesDashboard.tsx`: Envoltorio de pestañas y cards de asignaturas con `<ViewTransition>`.
  - `app/layout.tsx` / layouts de servidor: Renderizado directo de Contextos si aplica.
- **Dependencias**:
  - `react`: `19.2.8` $\rightarrow$ `19.3.0`
  - `react-dom`: `19.2.8` $\rightarrow$ `19.3.0`
  - `@types/react`: `^19.3.0`
  - `@types/react-dom`: `^19.3.0`
- **Invariantes Arquitectónicos**:
  - Inalterados. La regla de derivación determinista de roles (`lib/access-policy.ts`), la aritmética de calificaciones chilena (`lib/grades.ts`) y las reglas de seguridad de Firestore/Storage permanecen intactas.
