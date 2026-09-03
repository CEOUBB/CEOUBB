# Interoperabilidad académica — CEO-73

Contrato: [P21](../specs/p21-academic-interoperability.md). El despliegue debe activar y comprobar cada perfil en staging antes de habilitarlo institucionalmente. El código no configura DNS, proveedores, claves ni bases remotas por sí solo.

## Configuración y activación

1. Aplicar `drizzle/0011_interoperabilidad_academica.sql` mediante el procedimiento habitual de migraciones del entorno. Es aditiva: crea cinco tablas e índices, sin transformar notas, matrículas ni cursos existentes. Resguardar la base antes de migrar.
2. Configurar `INTEROP_PLATFORM_ORIGIN` con el origen HTTPS exacto del portal del entorno, sin rutas. Las rutas privadas de interoperabilidad rechazan otros orígenes.
3. Asignar un hostname HTTPS exclusivo para contenido al mismo despliegue y establecer `INTEROP_CONTENT_ORIGIN`. Debe tener hostname distinto del portal; se recomienda un dominio registrable separado. No reutilizarlo para autenticación, paneles o aplicaciones con cookies. El proxy sólo admite las rutas de contenido. Las cookies del portal deben mantenerse sin atributo Domain compartido.
4. Configurar ese origen también durante la compilación: `next.config.ts` lo incorpora a `frame-src`. Reconstruir al cambiarlo. Las respuestas de contenido establecen su propia CSP y no reciben el `X-Frame-Options: DENY` general. No colocar delante un proxy que agregue cabeceras CSP/XFO incompatibles o cachee estas rutas.
5. Para SCORM/xAPI, configurar la cuenta de servicio existente (`FIREBASE_SERVICE_ACCOUNT_EMAIL`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`) con acceso al bucket privado del entorno. `FIREBASE_STORAGE_BUCKET` permite indicar el bucket de staging. El valor predeterminado es `centro-de-estudio-ubb.firebasestorage.app`; comprobar expresamente el bucket antes de probar staging. No conceder acceso público a `interop/` ni añadirlo a las reglas cliente.
6. Para LTI, guardar un JWK privado RSA de al menos 2048 bits, con un `kid` único y exponente 65537, como secreto `LTI_PRIVATE_JWK` del servidor. No usar prefijo `NEXT_PUBLIC_`, archivos versionados ni claves efímeras generadas al iniciar. No se necesita clave de herramienta para Resource Link Launch, porque CEOUBB firma y la herramienta verifica.
7. Comprobar `/api/interop/lti/jwks` y `/api/interop/lti/configuration`. El primero sólo debe exponer claves públicas. Sin clave válida, el lanzamiento devuelve 503. El origen separado es obligatorio para reproducir paquetes; su ausencia también devuelve 503.

Generar una clave local fuera del historial de Git, desde un directorio privado (Node 22+):

```js
const { generateKeyPairSync, randomUUID } = require("node:crypto");
const { writeFileSync } = require("node:fs");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
writeFileSync(
  "lti-private.jwk.json",
  JSON.stringify({
    ...privateKey.export({ format: "jwk" }),
    kid: randomUUID(),
    alg: "RS256",
    use: "sig",
  }),
  { mode: 0o600, flag: "wx" }
);
```

Copiar el contenido al gestor de secretos del entorno y custodiar/eliminar la copia local según el procedimiento de credenciales. Para rotación, configurar `LTI_PREVIOUS_PUBLIC_JWKS` como `{"keys":[...]}` con hasta tres claves públicas anteriores, mantener `kid` distintos y conservarlas hasta agotar los tokens emitidos y la caché JWKS del proveedor. Nunca incluir `d`, `p`, `q`, `dp`, `dq` o `qi` en esa variable.

## Uso docente y administrativo

En **Aula → Recursos externos**, administración registra el nombre, URL de inicio OIDC, redirects y destinos HTTPS exactos de la herramienta. La interfaz muestra `client_id` y `deployment_id`; registrar ambos, el issuer, JWKS y endpoint de autorización en el proveedor. El registro es manual. Las URL no se consultan desde el servidor.

Un docente selecciona la herramienta y un destino autorizado. Al abrirla, el navegador inicia OIDC y vuelve a `/api/interop/lti/authorize` mediante GET. Se valida la sesión, matrícula, sección abierta, client, redirect y hint antes de emitir un JWT de 60 segundos con el nonce recibido. El hint dura cinco minutos y admite un único uso. Usar navegación de primer nivel; no se admite lanzamiento LTI dentro de iframe. POST de autorización requiere que el navegador envíe la sesión del portal; GET evita restricciones de cookies SameSite en retornos de terceros.

Los roles se derivan de la matrícula activa: estudiante y ayudante → Learner; docente y coordinador → Instructor; owner → Administrator. El ayudante se mantiene como Learner para no otorgarle privilegios docentes externos. No se envían correo ni nombre; `sub` es estable por usuario y herramienta. Deshabilitar una herramienta impide nuevos lanzamientos; no revoca la sesión que el proveedor ya haya creado.

El docente puede subir un ZIP SCORM/Tin Can y descargar el original. El hash evita repetir el mismo archivo en una sección. Sólo se publica después de validar y almacenar todos los archivos. Estudiantes matriculados pueden abrir recursos; una sección cerrada conserva la descarga docente y rechaza nuevas sesiones y escrituras. El reproductor guarda avance independiente del libro de notas.

En **Cuestionarios → Importar y publicar**, seleccionar XML/ZIP QTI y revisar preguntas y advertencias. **Exportar banco QTI** descarga el banco preparado; cada cuestionario publicado ofrece exportación QTI de su pauta sólo al equipo docente autorizado. La publicación, corrección y registro de notas mantienen el flujo existente.

## Perfiles compatibles y límites

| Superficie   | Perfil y límite                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LTI          | 1.3 Core Resource Link Launch, OIDC, RS256 y JWKS; máximo 100 herramientas, 10 redirects y 20 destinos por herramienta. Sin AGS, NRPS, Deep Linking, registro dinámico o certificación 1EdTech.                                                                                                                                                                                                                                                                                                                 |
| Paquetes     | ZIP store/deflate, rutas UTF-8 concordantes y sin traversal, enlaces, cifrado o ZIP64. Hasta 50 MiB comprimidos y expandidos, 1000 entradas, 10 MiB por archivo y 1 MiB por XML.                                                                                                                                                                                                                                                                                                                                |
| SCORM        | 1.2 / 2004 con una organización y un SCO HTML. Ciclo Initialize/Commit/Terminate, localización, estado, puntuaciones y suspend_data; 4096 caracteres en 1.2 y 64000 en 2004. Sin secuenciación, interacciones/objetivos, acumulación de tiempo, múltiples SCO, plugins, popups, formularios externos ni acceso a recursos remotos.                                                                                                                                                                              |
| xAPI         | 1.0.3, paquete `tincan.xml` con una actividad. Launch incluye endpoint, auth, actor, registration y activity_id. POST/PUT de Statements JSON y GET por statementId; cabeceras `Authorization: Bearer <capacidad>` y `X-Experience-API-Version: 1.0.3`. Máximo 32 KiB, 20 Statements por petición y 1000 escrituras por sesión. UUID idempotente, actor/actividad/registro acotados. Sin LRS completo, State/Profile, adjuntos, voiding o consultas globales.                                                    |
| QTI          | 2.1 XML de ítem o Content Package ZIP de hasta 2 MiB y 500 preguntas importadas; publicación existente hasta 50. Alternativa única, V/F, texto sin distinción de mayúsculas y numérica con tolerancia absoluta. Texto plano, puntaje todo o nada y feedback general. El motor local recorta espacios extremos; revisar esta diferencia al intercambiar respuesta corta con otros motores. Se omiten explícitamente procesamiento, interacciones y marcado no representables. Sin QTI 1.2/3 ni Common Cartridge. |
| Persistencia | Máximo 100 recursos por sección, páginas con cursor de 50, 20 capacidades activas por usuario, capacidades de contenido de dos horas y JSON de progreso de 128 KiB. La sesión del portal y matrícula se vuelven a comprobar en cada acceso. Conflictos de avance reciben 409.                                                                                                                                                                                                                                   |

Los paquetes ejecutan JavaScript propio dentro del origen aislado, con `sandbox` y CSP. No pueden leer el portal, instalar service workers, abrir ventanas ni enviar datos a servidores externos. Pueden modificar su propio avance: éste no constituye una nota confiable de evaluación. Cerrar sesión o retirar la matrícula invalida futuras lecturas/escrituras, aunque el navegador puede conservar en memoria contenido ya cargado.

## Validación operativa pendiente por entorno

Comprobar una herramienta real con cuentas de estudiante/docente, firma JWT, replay y cambio de claves; un SCO 1.2, uno 2004 y una actividad Tin Can de cada proveedor; reanudación, pérdida de conexión y revocación de matrícula; y round-trip QTI hacia el LMS destino. Confirmar límites HTTP, tiempo y memoria del Worker con paquetes de 50 MiB y la concurrencia esperada. Se evitan copias completas innecesarias del ZIP y se procesan archivos secuencialmente, pero no hay medición de carga en Cloudflare de esta funcionalidad. El máximo de archivos puede prolongar una carga; no ampliar cuotas sin esa evidencia.

La base tiene índices y consultas acotadas. Los grants vencidos se podan de 100 en 100 al iniciar actividades; monitorear crecimiento y planificar limpieza periódica según volumen. Statements y avances requieren una política institucional de retención. Las referencias de autoría se conservan; revisar reasignación al eliminar cuentas creadoras. Los borrados de recursos/usuarios propagan las filas operativas correspondientes cuando las claves foráneas permiten la operación.

Los objetos Storage son privados y no se borran automáticamente al eliminar secciones. Una carga interrumpida puede dejar objetos huérfanos: la compensación intenta borrar archivos ya subidos, sin garantizar ejecución tras una caída del proceso. Conciliar prefijos `interop/<sección>/<recurso>/` con `interop_resources.storage_prefix`, usando inventario paginado y un margen para cargas activas antes de cualquier limpieza. No eliminar prefijos sin revisar sus referencias y la política de retención.

Para revertir una activación, deshabilitar herramientas, retirar el hostname de contenido y restaurar el despliegue previo manteniendo las tablas y objetos para no perder avance. No aplicar un DROP automático. Un hostname retirado no debe reasignarse a una aplicación con sesión sensible.
