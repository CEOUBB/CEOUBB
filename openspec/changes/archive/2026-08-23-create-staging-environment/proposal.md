# CEO-12: ambiente de pruebas separado de producción

**Estado:** APROBADA por instrucción explícita de Joaquín el 2026-08-23; el encargo autoriza ejecutar y abrir la PR sin gates de aprobación intermedios.

## Why

CEOUBB sólo tiene un proyecto Firebase y la configuración web está fijada a sus identificadores productivos. Las reglas, índices y Functions se publican manualmente sin una ejecución equivalente previa, mientras Vercel Preview no tiene un contrato que lo obligue a usar una base Turso separada. Un error de infraestructura puede llegar de inmediato a estudiantes y docentes.

## What Changes

- Provisionar Firebase staging como `centro-de-estudio-ubb-staging` en `southamerica-west1` y Turso staging como `ceoubb-staging`.
- Parametrizar el SDK Firebase web y la verificación server-side mediante variables públicas de entorno, conservando los valores productivos como fallback compatible.
- Añadir aliases explícitos `staging` y `production`; ningún comando de publicación dependerá de un proyecto por defecto.
- Añadir guardas fail-closed y un sembrado idempotente con personas, catálogo, secciones, matrículas y aula enteramente sintéticos.
- Añadir un workflow que verifica, publica y siembra staging antes de permitir la promoción del mismo commit a producción.
- Documentar variables, secretos, operación, rollback y evidencia de provisionamiento sin versionar credenciales.

## Capabilities

### New Capabilities

- `operations/staging`: aislamiento, datos sintéticos, promoción y operación del ambiente previo a producción.

### Modified Capabilities

- `auth`: la configuración Firebase se selecciona por entorno sin alterar la política institucional de roles.
- `operations/capacity-cost`: staging queda disponible como destino, pero CEO-12 no ejecuta ni afirma la carga institucional de CEO-9.

## Impact

- `lib/firebase-client.ts`, `app/api/auth/firebase/route.ts`
- `firebase/.firebaserc`, `firebase/README_CONFIGURACION_FIREBASE.md`
- `scripts/staging-environment.mjs`, `scripts/seed-staging.mjs`
- `.github/workflows/firebase-release.yml`, `.github/workflows/deploy.yml`
- `.env.example`, `package.json`, `tests/staging-environment.test.ts`
- `PLAN.md`, `docs/archive/PLAN_ARCHIVE.md`

## Non-goals

- No desplegar este cambio ni las reglas actuales a producción durante CEO-12.
- No usar datos, correos personales, notas ni archivos de estudiantes reales.
- No crear usuarios de Firebase Authentication ni guardar contraseñas de prueba en el repositorio.
- No ejecutar la carga de 3.000 sesiones, el simulacro de restauración P0.8 ni declarar capacidad demostrada.
- No implementar las pruebas de reglas con Emulator Suite de P0.10.
- No modificar reglas para facilitar el sembrado; staging usa exactamente los mismos archivos que producción.
