## 1. Utilidades y Guardias de Entorno

- [x] 1.1 Implementar el módulo `lib/auth-dev.ts` con la función de guardia `isDevOrPreviewAuthAllowed()` y las definiciones deterministas de cuentas sintéticas (`estudiante.demo@alumnos.ubiobio.cl` y `docente.demo@ubiobio.cl`), verificando con `pnpm run typecheck`.
- [x] 1.2 Añadir validación de esquema Zod `DevLoginSchema` para los roles `student` y `teacher` en `lib/auth-dev.ts`, verificando tipado estricto con `pnpm run typecheck`.

## 2. Handler de Autenticación de Desarrollo (API Route)

- [x] 2.1 Crear el endpoint `app/api/auth/dev-login/route.ts` con validación Zod, verificación de guardia de entorno (retornando 404 en producción) y aprovisionamiento determinista de usuario en Turso, verificando con `pnpm run typecheck`.
- [x] 2.2 Integrar la creación y emisión de cookies de sesión mediante `createSession()` y retorno del estado completo de la sesión (`SessionState`) en `app/api/auth/dev-login/route.ts`, verificando con `pnpm run typecheck`.

## 3. Integración en Interfaz de Usuario (UI)

- [x] 3.1 Integrar los botones de acceso rápido ("Entrar como estudiante" y "Entrar como docente") en `app/Portal.tsx` (`AccessScreen`) condicionados a `process.env.NODE_ENV === 'development'` o `process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'`, usando Phosphor Icons y tokens de diseño OKLCH, verificando con `pnpm run lint`.
- [x] 3.2 Conectar las acciones de clic en los botones para invocar `/api/auth/dev-login`, manejar estados de carga/error accesibles y ejecutar la transición de sesión mediante `onSignedInWithSession`, verificando con `pnpm run typecheck`.

## 4. Pruebas Automatizadas y Verificación de Invariantes

- [x] 4.1 Crear la suite de pruebas `tests/dev-auth.test.ts` que valide: (a) rechazo estricto en producción (`VERCEL_ENV=production` -> 404), (b) login exitoso de estudiante en dev/preview, (c) login exitoso de docente en dev/preview, y (d) cumplimiento de dominios institucionales válidos, verificando con `pnpm test tests/dev-auth.test.ts`.
- [x] 4.2 Ejecutar el pipeline de verificación completo (`pnpm run verify:fast` y `pnpm run verify:invariants`) asegurando 0 errores de tipado, 0 errores de linter y paso del 100% de las suites.
