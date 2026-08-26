# Propuesta: Botones de Acceso Rápido para Testing en Dev y Preview (CEO-62)

## Why

Actualmente, las pruebas de flujo de usuario y validaciones de interfaz en entornos de desarrollo local y previsualizaciones de Vercel requieren autenticarse manualmente mediante Google OAuth con credenciales institucionales. Esto ralentiza el ciclo de desarrollo, la verificación continua y la revisión de pull requests por parte del equipo.

Esta propuesta introduce botones de acceso rápido para testing ("Entrar como estudiante" y "Entrar como docente") en la pantalla de inicio de sesión, estrictamente aislados para entornos de desarrollo y preview de Vercel, garantizando cero exposición o derivación no autorizada en producción institucional.

## What Changes

- **Botones de Acceso Rápido en UI de Login (`app/Portal.tsx`)**:
  - Incorporación de dos botones de acción rápida en la tarjeta de acceso: `"Entrar como estudiante"` y `"Entrar como docente"`.
  - Los botones se renderizan única y exclusivamente cuando la aplicación se ejecuta en entorno de desarrollo (`process.env.NODE_ENV === 'development'`) o en deployments de preview en Vercel (`process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'`).
- **Endpoint Seguro de Testing de Sesión (`app/api/auth/dev-login/route.ts`)**:
  - Creación de un endpoint API dedicado para emitir cookies de sesión válidas asociadas a cuentas de prueba sintéticas institucionales (`estudiante.demo@alumnos.ubiobio.cl` y `docente.demo@ubiobio.cl`).
  - Validación estricta de aislamiento de entorno en el servidor: si `process.env.VERCEL_ENV === 'production'`, el endpoint responde inmediatamente con `404 Not Found` o `403 Forbidden`, impidiendo cualquier invocación no productiva en producción.
- **Cumplimiento Invariable de Dominio Institucional y SSOT**:
  - Las identidades sintéticas emplean exclusivamente dominios institucionales válidos (`@alumnos.ubiobio.cl` para estudiante y `@ubiobio.cl` para docente), preservando la derivación determinista de `lib/access-policy.ts` y la sincronización de los cuatro espejos de seguridad.
- **Non-Goals (Exclusiones Explícitas)**:
  - No se permite el ingreso de correos arbitrarios o dominios no institucionales.
  - No se debilita ni modifica la autenticación productiva de Firebase Google Auth.
  - No se exponen credenciales, tokens ni rutas de desarrollo en el build o runtime de producción institucional (`VERCEL_ENV === 'production'`).

## Capabilities

### Modified Capabilities

- `auth`: Incorporación de requisitos de autenticación rápida para testing en entornos no productivos y aislamiento criptográfico y contextual de entornos de desarrollo y preview.

## Impact

- **Frontend**:
  - `app/Portal.tsx`: Inclusión condicional de los botones de testing en `AccessScreen` con diseño coherente con el sistema de diseño (`DESIGN.md`, tokens OKLCH, Phosphor Icons).
- **Backend / Rutas API**:
  - `app/api/auth/dev-login/route.ts`: Nuevo route handler con validación de entorno, provisión/upsert de usuario sintético en Turso y emisión de cookie de sesión.
  - `lib/environment.ts` (o `lib/auth-dev.ts`): Utilidades compartidas para validación robusta del entorno de ejecución.
- **Seguridad**:
  - Garantía de que en producción institucional (`VERCEL_ENV=production`) no existe superficie de ataque ni bypass de autenticación.
- **Testing**:
  - `tests/dev-auth.test.ts`: Pruebas de integración y unitarias para validar el aislamiento de entorno (rechazo en producción, éxito en desarrollo/preview) y la correcta creación de sesión.
