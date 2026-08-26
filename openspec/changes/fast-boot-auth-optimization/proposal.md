## Why

Actualmente, el acceso a la raíz de la plataforma (`/`) delega la comprobación de sesión a un componente de cliente (`Portal.tsx`) mediante `useEffect` y una llamada `fetch("/api/auth/me?includeSections=1")`. Esto produce un _client waterfall_ donde todo usuario (autenticado o no) visualiza obligatoriamente una pantalla de carga (_skeleton_) de 300ms a 1s antes de poder ver el botón de inicio de sesión institucional o su panel de cursos.

Optimizar el arranque inicial mediante Server Components (RSC) en `app/page.tsx`, separación de código (_code splitting_) entre Login y Dashboard, precarga de recursos críticos (_preconnect_ / _priority assets_) y unificación de la respuesta de autenticación (`/api/auth/firebase`) elimina la latencia percibida, ofreciendo un primer render inmediato (0ms de skeleton para visitantes anónimos y SSR para usuarios autenticados).

## What Changes

- **Server-Side Session Resolution (RSC):** Modificar `app/page.tsx` para leer la cookie de sesión (`centro_estudio_session`) directamente en el servidor. Si no hay sesión válida, servir el HTML inicial de `AccessScreen` inmediatamente sin estados intermedios de carga.
- **Unified Authentication Payload (Zero Round-Trip):** Modificar `/api/auth/firebase` para devolver directamente el objeto de usuario, membresías de sección e identificadores de cursos activos en el mismo payload de login, eliminando la petición subsiguiente a `/api/auth/me`.
- **Code Splitting & Dynamic Imports:** Separar el bundle del Dashboard institucional (`PortalMainView`, herramientas de notas, chat y visor académico) del bundle de acceso inicial (`AccessScreen`), reduciendo el tamaño del JavaScript crítico inicial para usuarios no autenticados a <25 KB.
- **Resource Preconnect & Asset Prioritization:** Agregar etiquetas `<link rel="preconnect">` para los dominios de autenticación de Google y Firebase, junto con priorización de imágenes de marca (`ubb-shield.webp`, `google-g.webp`).

## Capabilities

### Modified Capabilities

- `auth`: Modifica el flujo de inicio de sesión para incorporar la resolución de sesión en Server Components y el retorno unificado de secciones/membresías en la respuesta de autenticación Firebase.
- `ui/view-skeletons`: Modifica el comportamiento de arranque inicial para que los usuarios no autenticados no requieran ni visualicen el skeleton `LoadingScreen`.

## Impact

- **Archivos Afectados:**
  - `app/page.tsx` (Migración a Server Component con inspección de cookies y pase de props iniciales).
  - `app/Portal.tsx` (Aceptación de `initialUser` e `initialSections`, desacoplamiento del loader inicial).
  - `app/api/auth/firebase/route.ts` (Inclusión de `sections`, `memberships` y `sectionIds` en la respuesta JSON).
  - `app/layout.tsx` (Preconnects DNS/TLS a `accounts.google.com`, `identitytoolkit.googleapis.com` y `firestore.googleapis.com`).
- **APIs & Contratos:** `/api/auth/firebase` extiende su contrato JSON sin romper compatibilidad existente.
- **Dependencias & Seguridad:** No introduce nuevas dependencias externas; respeta estrictamente las invariantes de seguridad de roles (SPEC-010 / REQ-SEC-01, REQ-SEC-02).
