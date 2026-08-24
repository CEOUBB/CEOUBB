# Runbook — Firebase App Check (CEO-47)

## Estado inicial verificado

Fecha: 2026-08-23, proyecto `centro-de-estudio-ubb` (`411177916202`).

| Recurso                                                     | Configuración                                                                                                     |
| :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| Web app `1:411177916202:web:57986cb2e14d676fe93053`         | reCAPTCHA Enterprise score-based, dominio `ceoubb.com`, TTL 3600 s, score mínimo 0,5                              |
| Android app `1:411177916202:android:67a7ba25fbe65ed9e93053` | Play Integrity, TTL 3600 s, versión off-Play admitida, integridad de dispositivo requerida, licencia no requerida |
| Firestore                                                   | `UNENFORCED`                                                                                                      |
| Cloud Storage                                               | `UNENFORCED`                                                                                                      |
| Firebase Authentication                                     | `UNENFORCED`                                                                                                      |
| Functions callable                                          | `enforceAppCheck: false` en las tres funciones                                                                    |

Las APIs `firebaseappcheck.googleapis.com`, `recaptchaenterprise.googleapis.com` y `playintegrity.googleapis.com` están habilitadas. La clave web es un identificador público limitado por dominio; no existe un secreto reCAPTCHA ni un token de depuración en el repositorio.

## Arquitectura que se debe preservar

El navegador y la WebView remota de Capacitor cargan `https://ceoubb.com` y usan el SDK web para Firestore, Storage y Functions. Ambos reciben el token de la web app. La capa Android instala Play Integrity al arrancar para el Firebase Auth nativo que usa `@capacitor-firebase/authentication`. No se debe crear un cliente Firestore nativo paralelo.

App Check no reemplaza Firebase Auth, Firestore Rules ni Storage Rules. Un token válido sólo certifica el cliente; la identidad, el rol y la matrícula siguen siendo obligatorios.

## Etapa 1 — Desplegar en observación

1. Fusionar y desplegar el cliente web antes de cambiar cualquier producto a `ENFORCED`.
2. Confirmar en `ceoubb.com` que el intercambio `exchangeRecaptchaEnterpriseToken` responde correctamente y que las operaciones normales siguen funcionando.
3. Distribuir un APK/AAB que contenga `CEOUBBApplication` y probarlo en un dispositivo físico con Play Services certificado.
4. Mantener Firestore, Storage y Authentication en `UNENFORCED`; mantener las callable Functions con `enforceAppCheck: false`.
5. Observar 24 horas continuas con tráfico representativo de estudiantes y docentes. No contar una ventana sin uso como evidencia.

Firebase Console → App Check → Métricas debe mostrar por producto solicitudes válidas, inválidas y sin token. En Functions se revisan además `saveAuditedStudentScores`, `saveAuditedGradebook` y `deleteMyAccount`.

## Matriz funcional obligatoria

Ejecutar en web productiva y Android físico:

- iniciar y cerrar sesión con cuenta institucional;
- abrir el portal y un aula matriculada;
- crear/editar una publicación como docente;
- leer material como estudiante;
- subir y descargar un archivo permitido;
- guardar una nota o ponderación mediante la callable correspondiente;
- comprobar que una cuenta o matrícula no autorizada sigue siendo rechazada por Auth/Rules;
- verificar que no aparecen `appCheck/recaptcha-error`, `FirebaseAppCheckException`, `permission-denied`, `storage/unauthorized` ni `functions/unauthenticated` en un flujo legítimo.

## Gate cuantitativo

El rollout sólo puede avanzar tras 24 horas continuas en las que cada producto cumpla simultáneamente:

- al menos 99 % de solicitudes con token App Check válido;
- cero fallas reproducibles en la matriz web/Android;
- ningún aumento de 0,5 puntos porcentuales o más en errores de producción atribuible a App Check;
- evidencia de al menos una sesión web docente, una web estudiante y una Android física.

Si un producto no cumple, permanece `UNENFORCED` aunque los demás estén sanos.

## Etapa 2 — Enforcement gradual

Orden obligatorio: **Firestore → Storage → Functions callable → Authentication**.

1. Cambiar Firestore a `ENFORCED`; esperar al menos 30 minutos y repetir lecturas/escrituras web y Android.
2. Cambiar Storage a `ENFORCED`; esperar al menos 30 minutos y repetir subida/descarga y límites de permisos.
3. Cambiar `APP_CHECK_OBSERVATION_OPTIONS` a `{ enforceAppCheck: true }`, desplegar sólo las callable Functions y esperar al menos 30 minutos repitiendo notas y eliminación de cuenta en un entorno controlado.
4. Cambiar Authentication a `ENFORCED` únicamente cuando la versión Android con Play Integrity esté distribuida a todos los clientes soportados; repetir inicio/cierre de sesión web y Android.

No activar dos productos en la misma ventana. Authentication queda al final porque versiones Android antiguas usan Firebase Auth nativo sin el proveedor de CEO-47.

## Reversa

Ante una falla legítima, devolver sólo el producto afectado a `UNENFORCED`:

- Firestore, Storage o Authentication: Firebase Console → App Check → producto → dejar de aplicar.
- Functions: restaurar `{ enforceAppCheck: false }` y desplegar sólo Functions.

La reversa se ejecuta si el tráfico válido cae bajo 99 %, aparece cualquiera de los errores de la matriz en un cliente legítimo, o los errores de producción suben 0,5 puntos porcentuales o más. Tras la reversa, repetir la matriz y documentar hora, producto, métrica y causa antes de un nuevo intento.

## Desarrollo local

`next dev` en `localhost` solicita un token de depuración generado por el SDK y lo muestra en la consola del navegador. Registrar ese token bajo la web app en Firebase Console → App Check → Administrar tokens de depuración. No agregar `localhost` al dominio de la clave reCAPTCHA, no copiar el token al repositorio y revocarlo si se comparte.

Un build de producción nunca activa automáticamente el proveedor debug.

## Costo y endurecimiento posterior

Con TTL de una hora, el SDK renueva aproximadamente dos veces por hora activa. Revisar evaluaciones y costo de reCAPTCHA Enterprise contra el techo de CEO-9 antes de reducir el TTL.

Mientras el APK se distribuya fuera de Play, Play Integrity admite versiones no reconocidas y no exige `LICENSED`, pero exige integridad de dispositivo. Después de migrar toda la distribución a Google Play, observar la versión publicada y luego evaluar `allowUnrecognizedVersion: false` y `requireLicensed: true` como un cambio separado.
