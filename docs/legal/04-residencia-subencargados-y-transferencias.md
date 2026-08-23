# Residencia, subencargados y transferencias de datos

**Estado:** borrador y matriz de evidencia · **Versión:** 0.1 · **Fecha:** 23 de agosto de 2026

## 1. Declaración precisa

El núcleo operacional de Firebase está diseñado para residir en la región `southamerica-west1`, que Google identifica como **Santiago, Chile**. Esto está probado en el código para Cloud Functions y documentado para Firestore. La ubicación efectiva del bucket de Cloud Storage todavía debe verificarse en la consola del proyecto.

No es correcto afirmar que **todos** los servidores o tratamientos de CEOUBB permanecen en Chile. El portal usa Vercel en São Paulo y red global; la región de Turso no está acreditada en el repositorio; Firebase Authentication, FCM y Sentry tienen tratamientos que no quedan cubiertos por declarar `southamerica-west1`. Vercel además informa que puede transferir datos a Estados Unidos y a otros lugares donde operan él o sus proveedores en su [documentación de cumplimiento](https://vercel.com/docs/security/compliance).

## 2. Por qué importa mantener el núcleo en Santiago

- reduce transferencias internacionales de calificaciones, entregas y archivos en reposo;
- mantiene cerca de los usuarios el almacenamiento y cómputo más sensible, reduciendo latencia y superficie de tránsito;
- facilita a la UBB identificar jurisdicción, custodio y ubicación al responder auditorías o incidentes;
- permite exigir que una migración de región sea una decisión jurídica y técnica, no un cambio silencioso;
- no reemplaza cifrado, control de acceso, contrato con proveedores ni garantías para los servicios que sí operan fuera de Chile.

Google lista `southamerica-west1` como Santiago para [Cloud Firestore](https://firebase.google.com/docs/firestore/locations?hl=es-419), [Cloud Functions for Firebase](https://firebase.google.com/docs/functions/locations) y [Cloud Storage](https://docs.cloud.google.com/storage/docs/locations?hl=es). En Storage la ubicación elegida al crear un bucket no puede cambiarse; por eso debe guardarse evidencia de la configuración efectiva, no sólo del nombre del bucket.

## 3. Registro de proveedores y evidencia

| Servicio                                  | Datos/finalidad                                                              | Ubicación conocida                                                                                                                | Evidencia disponible                                                                                                          | Decisión antes del piloto                                                      |
| :---------------------------------------- | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| Google Cloud Firestore                    | Perfiles, secciones, publicaciones, notas, progreso, entregas y proyecciones | `southamerica-west1`, Santiago, declarada                                                                                         | `firebase/README_CONFIGURACION_FIREBASE.md`; confirmar consola/API                                                            | Mantener en Santiago; archivar captura y DPA                                   |
| Cloud Functions for Firebase              | Notificaciones y borrado Firebase                                            | `southamerica-west1`, Santiago                                                                                                    | `firebase/functions/index.js` fija la región global                                                                           | Mantener; registrar despliegues y cuentas de servicio                          |
| Cloud Storage for Firebase                | Materiales y entregas                                                        | Bucket `centro-de-estudio-ubb.firebasestorage.app`; región no probada en repo                                                     | Nombre canónico; falta salida de consola/API                                                                                  | Confirmar Santiago o detener datos reales; la región es inmutable              |
| Firebase Authentication / Google Identity | Inicio de sesión e identificadores                                           | Servicio global; no acreditado como residencia Chile                                                                              | Configuración de proyecto, sin garantía local adjunta                                                                         | Revisar DPA, transferencias, soporte y retención                               |
| Firebase Cloud Messaging                  | Tokens y notificaciones                                                      | Servicio global                                                                                                                   | Configuración de proyecto                                                                                                     | Autorizar como subencargo y minimizar payloads; no enviar notas                |
| Turso / ChiselStrike                      | Directorio, sesiones, estructura, matrículas y auditoría                     | No acreditada                                                                                                                     | `TURSO_DATABASE_URL` no se versiona; región no visible; el [DPA se solicita desde la cuenta](https://turso.tech/terms-of-use) | Obtener región, DPA y subprocesadores; evaluar traslado a Chile o garantías    |
| Vercel                                    | Hosting, API, CDN y logs                                                     | Functions en `gru1`, São Paulo, Brasil; CDN global                                                                                | `vercel.json`; Vercel identifica [`gru1` como São Paulo](https://vercel.com/docs/regions)                                     | Autorizar transferencia y DPA; revisar logs, soporte y failover                |
| Sentry                                    | Errores y replay enmascarado                                                 | Región de la organización no acreditada; la [API de Sentry](https://docs.sentry.io/api/) identifica regiones US y DE según cuenta | Config de enmascarado; falta evidencia de región/retención                                                                    | Confirmar región, DPA, retención y borrado; evaluar desactivar replay en notas |

Servicios de desarrollo como GitHub, Linear o Discord no están autorizados para recibir datos académicos reales por esta matriz. Incorporarlos a un flujo de soporte con información personal requiere instrucción, minimización y actualización previa del registro.

## 4. Regla de subencargo

Antes de autorizar un proveedor, la ficha debe contener:

- razón social, país y contacto de privacidad;
- servicio, finalidad, categorías de datos y titulares;
- regiones de almacenamiento, procesamiento, soporte, respaldo y failover;
- subencargados ulteriores y mecanismo de aviso de cambios;
- DPA, medidas de seguridad, eliminación y portabilidad;
- plazos de retención y mecanismo para solicitudes de titulares;
- causal o garantía para cada transferencia internacional;
- fecha, autoridad UBB que aprueba y próxima revisión.

CEOUBB avisará cualquier cambio propuesto con al menos 30 días corridos, salvo reemplazo urgente por seguridad. La UBB podrá objetar y, si no hay alternativa aceptable, suspender el tratamiento afectado.

## 5. Transferencias internacionales

Desde el 1 de diciembre de 2026, los artículos 27 y 28 del texto reformado regulan las transferencias internacionales. Cada flujo fuera de Chile debe asociarse a una hipótesis legal y a garantías verificables. No basta que la empresa tenga una política de privacidad pública.

Cuando se usen cláusulas contractuales, Jurídica debe revisar las [cláusulas modelo para transferencias internacionales aprobadas por el Ministerio de Economía](https://www.economia.gob.cl/2025/12/10/raex202503731-aprueba-las-clausulas-contractuales-modelo-para-transferencias-internacionales-que-indica.htm) y su vigencia al momento de firmar.

El mapa mínimo conocido es:

```text
Usuario en Chile
  -> Vercel CDN global / Function en São Paulo
  -> Turso en región por confirmar
  -> Firestore, Storage y Functions en Santiago (Storage por confirmar)
  -> Firebase Auth/FCM y Sentry con tratamiento internacional por documentar
```

## 6. Evidencia periódica

DTI y CEOUBB conservarán una ficha fechada por recurso con:

- captura o salida de API que muestre proyecto, recurso y región;
- configuración versionada que impide deriva cuando sea posible;
- versión del contrato/DPA y lista de subencargados;
- retención configurada y última prueba de borrado;
- última revisión de accesos de soporte y transferencias;
- incidentes o cambios desde la revisión anterior.

La evidencia se toma antes del piloto, trimestralmente y antes de cualquier cambio de plan, región, proveedor o arquitectura. Una región declarada sin evidencia vigente se registra como “no verificada”, no como Chile.

## 7. Decisiones abiertas para Jurídica y DTI

1. ¿La UBB acepta Vercel en Brasil y una CDN global para solicitudes autenticadas?
2. ¿La región real de Turso es aceptable o debe migrarse el sistema de registro a infraestructura contratada por la UBB?
3. ¿Sentry Replay se mantiene en pantallas académicas aunque esté enmascarado, o se desactiva allí?
4. ¿Qué garantía de transferencia y cláusulas se suscriben con cada proveedor?
5. ¿Qué unidad autoriza futuros subencargados y quién puede suspenderlos ante una objeción?
