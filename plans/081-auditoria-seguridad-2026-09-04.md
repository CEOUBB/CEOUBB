# Auditoría de seguridad de CEOUBB — 4 de septiembre de 2026

**Base revisada:** `f9fc4e4`, árbol inicialmente limpio.

**Repositorio local:** `C:\Users\Pipe\.codex\worktrees\1265\CEOUBB`.

**Modalidad:** auditoría defensiva con `improve`; lectura de código, comprobaciones locales acotadas y consultas HTTP de lectura.
**Estado:** diagnóstico original conservado; correcciones implementadas en `codex/correcciones-auditoria-seguridad-081`. Véase [ejecución, pruebas y límites](../docs/security/auditoria-081-ejecucion.md). Las referencias de archivo y línea de este informe corresponden a la base auditada, no al código corregido ni necesariamente al desplegado.

## 1. Resultado

Se identificaron **ocho hallazgos sustentados en código: tres altos y cinco medios**. Destacan la revocación incompleta entre Turso y Firebase, la manipulación de fechas de entrega y la modificación de períodos archivados mediante importaciones Moodle.

También se registran por separado un posible login CSRF y condiciones que requieren comprobar configuración o comportamiento real. No se identificó una vulnerabilidad crítica confirmada. Esto no certifica que la aplicación esté libre de otras vulnerabilidades: no se ejecutó un pentest autenticado ni se inspeccionaron las políticas efectivas de los proveedores.

La confianza alta del informe significa que el flujo está sustentado por el código y, cuando corresponde, por el contrato documentado del SDK. **No significa que se haya explotado en producción.** No se realizaron escrituras remotas, pruebas de carga, eliminación de cuentas reales, descargas de archivos privados, publicación de issues ni cambios de código fuente.

## 2. Matriz priorizada

El orden combina impacto, alcance y confianza. S = horas; M = aproximadamente un día; L = varios días, incluyendo validación. El riesgo de corrección describe lo que puede romper un cambio apresurado.

| ID | Hallazgo | Gravedad | Confianza | Esfuerzo | Riesgo de corrección | Evidencia principal |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-01 | Eliminar cuentas o cerrar sesiones deja acceso Firebase vigente | Alta | Alta, estática | L | Alto | `app/api/auth/me/route.ts:85`, `app/api/profile/sessions/route.ts:101` |
| SEC-02 | La fecha del comprobante de entrega es controlable por el alumno | Alta | Alta, estática | S–M | Medio | `firebase/firestore.rules:330`, `app/views/classroom/submission-review-model.ts:70` |
| SEC-03 | La importación Moodle puede modificar períodos archivados | Alta | Alta, estática | M | Medio | `lib/services/moodle-import.ts:137`, `app/api/courses/[sectionId]/imports/moodle/route.ts:121` |
| SEC-04 | Se puede reservar el identificador de entrega de otro alumno | Media | Alta, estática | S–M | Medio | `firebase/firestore.rules:328`, `lib/firebase/storage.ts:158` |
| SEC-05 | Retirar una matrícula no revoca lectura y borrado de entregas propias | Media | Alta, estática | S | Bajo | `firebase/firestore.rules:303`, `firebase/storage.rules:118` |
| SEC-06 | Los enlaces de descarga emitidos sobreviven a la revocación de matrícula | Media | Alta, código y contrato SDK | M | Medio | `lib/firebase/storage.ts:274` |
| SEC-07 | La comparación QTI produce expansión exponencial en el navegador | Media | Alta, comprobación local acotada | S–M | Bajo | `lib/interop/qti.ts:31`, `lib/interop/qti.ts:308` |
| SEC-08 | El límite de solicitudes de soporte no es atómico | Media | Alta, estática | S–M | Medio | `app/api/soporte/route.ts:103`, `lib/services/support-requests.ts:113` |

## 3. Hallazgos

### SEC-01 — Revocación incompleta entre Turso y Firebase

**Evidencia.** `app/api/auth/me/route.ts:85–103` elimina usuario y sesiones únicamente en Turso. La cascada relacional elimina matrículas (`db/schema.ts:172–174`), pero esta ruta no elimina las proyecciones `enrollments/{uid}/sections/*`, el perfil Firestore ni la identidad Firebase Auth. Por otra parte, `app/api/profile/sessions/route.ts:99–103` revoca una sesión remota borrando solamente su hash Turso. La interfaz anuncia que ese dispositivo quedó desconectado en `app/views/SettingsView.tsx:625`.

Las reglas autorizan mediante identidad Firebase, perfil y proyección, sin consultar las sesiones Turso: `firebase/firestore.rules:23–38,157–169` y `firebase/storage.rules:23–38,58–70`. Además, `app/api/auth/firebase/route.ts:52–66,104` admite un ID token Firebase válido para crear otra cookie web.

**Precondición e impacto.** Una cuenta con acceso previo puede conservar su cliente Firebase después de eliminar su cuenta relacional. Un dispositivo cuya sesión web fue revocada también conserva su autenticación Firebase. En ambos casos el sistema declara terminada una relación de acceso que otra parte del sistema sigue aceptando. Esto compromete la eliminación efectiva de acceso y la contención de un dispositivo perdido o comprometido. La emisión de nuevas cookies depende de que siga siendo válida la identidad Firebase.

**Recomendación.** Definir y aplicar una semántica única de revocación. La eliminación debe bloquear acceso y limpiar proyecciones de forma paginada antes de declarar éxito. El cierre remoto requiere una condición de sesión/revocación que también puedan comprobar reglas y Functions, o una revocación global explícita si no se soporta granularidad por dispositivo. Revocar únicamente refresh tokens tampoco sustituye la comprobación de revocación para ID tokens aún válidos. Mantener recuperación e idempotencia ante fallos entre servicios.

**Aceptación defensiva.** Conservar un segundo cliente autenticado en un entorno sintético; eliminar la cuenta o revocar ese dispositivo desde el primero y comprobar que el cliente conservado pierde las capacidades prometidas en APIs, Firestore, Storage y Callables. Verificar que no puede obtener otra cookie sin la reautenticación exigida. No basta comprobar que desapareció una fila Turso.

**Esfuerzo/riesgo:** L / alto: afecta autenticación, móvil y operaciones distribuidas. No confundir con SEC-05, que subsiste incluso cuando se elimina correctamente la proyección.

### SEC-02 — El alumno puede alterar la fecha oficial de su entrega

**Evidencia.** `firebase/firestore.rules:330` comprueba matrícula y UID, pero no exige un esquema de comprobante ni valida `createdAt` contra `request.time`. El cliente legítimo usa `serverTimestamp()` en `lib/firebase/storage.ts:158–167`; esa elección del cliente no restringe a otro cliente autenticado. El modelo docente clasifica una entrega como atrasada leyendo precisamente `submission.createdAt` en `app/views/classroom/submission-review-model.ts:70–73`; también usa esa fecha para elegir el comprobante más reciente y mostrar la fecha oficial (`:101,116`).

**Precondición e impacto.** Un estudiante matriculado en una sección abierta puede escribir su propio comprobante con una fecha anterior o sustituir su referencia de archivo conservando una fecha antigua. La bandeja puede mostrar como puntual una entrega tardía. No se afirma que esto modifique por sí solo una nota numérica.

**Recomendación.** Validar campos, tipos y coherencia de evaluación, estudiante y archivo en la frontera Firebase. La fecha que representa una nueva entrega debe proceder del servidor y actualizarse de forma coherente cuando se sustituye el archivo. Definir explícitamente el comportamiento de las reentregas; no conservar una fecha antigua para contenido nuevo.

**Aceptación defensiva.** Las reglas deben rechazar fechas elegidas por el cliente, documentos sin metadatos obligatorios y sustituciones que conserven indebidamente la fecha. Una reentrega legítima debe obtener una nueva fecha y el estado de atraso correspondiente.

**Cobertura existente.** `tests/firebase-rules.test.ts:161–164` acepta un comprobante con solo `uid`, por lo que la matriz actual no impone este contrato. Endurecerlo requerirá reconciliar ese fixture con la nueva especificación mediante el procedimiento de gobernanza; no omitir ni debilitar pruebas para lograr un resultado verde.

**Esfuerzo/riesgo:** S–M / medio: datos históricos y reentregas.

### SEC-03 — Importaciones Moodle eluden el modo de solo lectura

**Evidencia.** Todas las acciones POST pasan por `sessionAndSection()` (`app/api/courses/[sectionId]/imports/moodle/route.ts:88–95,121–166`). Su autorizador, `lib/services/moodle-import.ts:137–170`, comprueba existencia de sección y matrícula docente/coordinadora, pero no consulta el estado del período. El archivado conserva esas matrículas y cambia el estado/proyección del período (`lib/services/academic-period-archive.ts:120–133`).

Después de esa autorización, `writeMoodleImportPosts()` realiza escrituras privilegiadas de Firestore (`lib/services/moodle-import.ts:238–264`), mientras `reconcileMoodleRoster()` inserta/reactiva matrículas y proyecta acceso (`:319–369`). Estas escrituras del servidor no quedan detenidas por las reglas de clientes que exigen `sectionIsWritable()`.

**Precondición e impacto.** Un docente/coordinador con matrícula conservada en un período cerrado o archivado puede importar contenido o incorporar estudiantes allí. Esto cambia el expediente que debe ser histórico y puede conceder acceso nuevo a datos de ese período. La garantía de solo lectura está expresada en `openspec/specs/academic/spec.md:109`.

**Recomendación.** Incorporar la comprobación de período abierto en la autorización de mutaciones Moodle y en el punto efectivo de escritura para cubrir cierres concurrentes. Mantener separada la lectura legítima del historial. Aplicar el criterio también al owner salvo que exista una operación administrativa de reapertura explícita y auditada.

**Aceptación defensiva.** Con una matrícula docente aún activa y período archivado, todas las acciones que escriben deben rechazarse sin insertar contenido, matrículas ni proyecciones. Las consultas históricas deben continuar funcionando. Probar también el cierre entre autorización e importación.

**Esfuerzo/riesgo:** M / medio: importaciones en curso y semántica de historial.

### SEC-04 — Reserva anticipada de comprobantes de otros alumnos

**Evidencia.** `firebase/firestore.rules:328–330` no relaciona el identificador del documento con `evalId` y el UID autenticado. Una vez creado, sí protege su propietario. Sin embargo, el cliente escribe siempre en un ID determinista formado por evaluación y UID (`lib/firebase/storage.ts:158`). Los identificadores de compañeros están disponibles legítimamente en el directorio de la sección (`app/api/sections/[sectionId]/participants/route.ts:36–38,51–55`).

**Precondición e impacto.** Un alumno matriculado puede ocupar un identificador todavía libre que el cliente de otro estudiante necesitará después, asignándose a sí mismo como propietario. La posterior escritura legítima se rechaza por el control de propietario existente. La subida del archivo ocurre antes de ese fallo (`lib/firebase/storage.ts:146–158`), por lo que el usuario puede subir su trabajo y aun así quedar sin comprobante.

**Recomendación.** Vincular en las reglas el ID del documento, la evaluación y el UID; validar también la existencia/coherencia de la evaluación. Conservar la defensa contra sobrescritura de documentos ajenos. Considerar la compatibilidad de IDs históricos antes de endurecer el formato.

**Aceptación defensiva.** Dos alumnos sintéticos de una sección: ninguno puede crear el identificador reservado al otro, aunque declare su propio UID. Ambos pueden crear y actualizar sus comprobantes legítimos.

**Esfuerzo/riesgo:** S–M / medio. Es un defecto de creación distinto del IDOR de actualización ya corregido en SPEC-013. Conviene resolverlo junto con SEC-02.

### SEC-05 — Matrícula retirada conserva capacidades sobre entregas y progreso

**Evidencia.** Las ramas de propietario del documento omiten `isEnrolled()` en lectura/borrado de progreso (`firebase/firestore.rules:303,305`) y comprobantes (`:329,331`). Lo mismo ocurre con archivos propios de entrega en `firebase/storage.rules:118,120`. El borrado exige que el período esté abierto, pero no una matrícula vigente.

**Precondición e impacto.** Una identidad Firebase todavía válida cuya proyección haya sido retirada puede seguir leyendo sus documentos de esa sección y, mientras el período siga abierto, borrar comprobantes y archivos del expediente. No necesita que la proyección haya quedado huérfana como en SEC-01. Contradice la revocación inmediata declarada en `lib/services/enrollment-projection.ts:10–12` y la llave de sección documentada en `firebase/firestore.rules:155–158`.

**Recomendación.** Exigir matrícula en estas ramas de permisos de curso. Si se desea acceso posterior para exportación de datos propios, modelarlo como una capacidad explícita de lectura; no conservar por accidente facultades de borrado sobre el expediente.

**Aceptación defensiva.** Crear una entrega válida, retirar solo la proyección y comprobar denegación de lectura/borrado según la política acordada. Mantener el período abierto para que la prueba realmente evalúe la matrícula, no el bloqueo de archivado.

**Esfuerzo/riesgo:** S / bajo. Preservar las excepciones administrativas que estén expresamente autorizadas.

### SEC-06 — URLs persistentes de archivos no acompañan la revocación

**Evidencia.** `classroomFileUrl()` devuelve `getDownloadURL()` en `lib/firebase/storage.ts:274–277`; sus consumidores incluyen `app/views/classroom/use-classroom-handlers.ts:146,159` y `app/views/classroom/SubmissionReviewTray.tsx:106–107`. No se encontró rotación de tokens de descarga en los flujos de revocación revisados.

Firebase describe el resultado de esta API como una URL duradera. Resolverla bajo demanda controla su obtención inicial, pero no transforma el enlace emitido en una autorización vinculada a la matrícula vigente. Véanse la [referencia de getDownloadURL](https://firebase.google.com/docs/reference/js/v8/firebase.storage.Reference#getdownloadurl) y la [documentación de descargas](https://firebase.google.com/docs/storage/web/download-files).

**Precondición e impacto.** Alguien conserva una URL válida emitida anteriormente. Retirar la matrícula no invalida automáticamente ese acceso por token y el enlace puede circular fuera del grupo autorizado. El problema se refiere a nuevas descargas del servidor después de revocar acceso; ningún cambio puede recuperar una copia que alguien ya descargó.

**Reconciliación con la auditoría previa.** `docs/archive/PLAN_ARCHIVE.md:357` identifica el problema de URLs permanentes y da por resuelto el acceso al generarlas bajo demanda. La mitigación reduce exposición inicial, pero deja incompleta la garantía de revocación. No se presenta como un defecto nuevo del SDK de Firebase.

**Recomendación.** Para archivos sujetos a matrícula vigente, utilizar descarga autenticada que aplique reglas o un endpoint que revalide autorización. Revisar la invalidación de enlaces ya emitidos; cambiar solo el cliente deja vivos los anteriores. Verificar compatibilidad con el visor PDF y Capacitor.

**Aceptación defensiva.** En un bucket de pruebas, emitir acceso, retirar matrícula y confirmar que no permite nuevas descargas por la ruta protegida ni por enlaces anteriores que se haya decidido invalidar. No se descargaron archivos privados de producción durante esta auditoría.

**Esfuerzo/riesgo:** M / medio: visor, móvil y enlaces existentes.

### SEC-07 — Amplificación exponencial al comparar árboles QTI

**Evidencia.** `shape()` ejecuta `JSON.stringify()` en cada nodo y agrega el resultado de cada hijo como una cadena (`lib/interop/qti.ts:31–45`). Cada nivel vuelve a escapar la representación ya serializada. La comparación se ejecuta antes de rechazar un procesamiento no compatible (`:307–309`); el parser XML admite hasta 48 niveles (`lib/interop/xml.ts:109`). El archivo de entrada tiene un techo de 2 MiB, que no acota esta expansión interna.

**Comprobación local.** Se ejecutó la función exacta extraída del archivo, retirando únicamente las anotaciones TypeScript mediante la API de Node, sobre árboles sintéticos pequeños. Con un nodo terminal y 4, 8, 12 y 16 envolturas se obtuvieron respectivamente **137, 1.613, 24.689 y 393.365 caracteres**. No se ejecutaron profundidades peligrosas. La forma sintética y el conteo de niveles explican diferencias con otras mediciones de árboles equivalentes.

**Precondición e impacto.** Un docente importa un banco QTI de terceros cuyo procesamiento contiene suficiente anidamiento. El consumo de memoria/CPU puede bloquear la pestaña y hacer perder trabajo no guardado. El importador se ejecuta en el navegador (`app/views/classroom/TeacherQuizzes.tsx:65–69`); la API QTI revisada exporta. **No se atribuye a este hallazgo un DoS del backend.**

**Recomendación.** Comparar estructuras directamente, con salida temprana, o producir una estructura normalizada y serializar una sola vez. Aplicar un presupuesto de complejidad que acote también el trabajo intermedio.

**Aceptación defensiva.** Un árbol sintético anidado debe rechazarse o compararse con costo acotado; los bancos QTI compatibles deben conservar su round-trip. Mantener la prueba pequeña y determinista, sin agotar memoria para demostrar el fallo.

**Esfuerzo/riesgo:** S–M / bajo.

### SEC-08 — Carrera en las cuotas del formulario de soporte

**Evidencia.** `app/api/soporte/route.ts:103–104` consulta y verifica el contador, pero inserta la solicitud más adelante (`:127`). `lib/services/support-requests.ts:70–95,113` mantiene el conteo y la inserción como operaciones separadas, sin transacción que reserve capacidad ni condición atómica en la escritura. Los techos declarados son tres por origen y veinte globales por hora (`:15–18`).

**Precondición e impacto.** Varias solicitudes concurrentes que superen las validaciones anteriores pueden observar el mismo contador y ser admitidas simultáneamente, superando las cuotas. Esto permite sobrepasar el límite anunciado de escrituras y correos. Turnstile sigue siendo una barrera independiente cuando está configurado: este hallazgo no afirma que pueda omitirse un desafío válido.

**Recomendación.** Hacer atómica la reserva de cuota y persistencia en Turso, reutilizando transacciones o una escritura condicional adecuada. Un bloqueo en memoria del Worker no resuelve concurrencia entre instancias. Mantener la regla de persistir antes de enviar correo.

**Aceptación defensiva.** Prueba concurrente acotada sobre base local: partiendo justo por debajo de una cuota, no debe aceptarse más capacidad de la disponible. Comprobar cuota por origen y global, y que los rechazos no envían correo.

**Esfuerzo/riesgo:** S–M / medio: contención y conservación de solicitudes. No se enviaron solicitudes de soporte reales para probarlo.

## 4. Candidatos y condiciones de despliegue, fuera del conteo confirmado

### INV-01 — Posible login CSRF — media, confianza media

`app/api/auth/firebase/route.ts:18–24,35–50` acepta JSON sin comprobar `Origin`, tipo de contenido ni una vinculación CSRF del inicio de sesión; `:104` crea la cookie `SameSite=Lax` definida en `lib/auth.ts:71`. `proxy.ts` no agrega ese control. Una comprobación local confirmó que `Request.json()` acepta JSON transportado como texto plano.

El escenario a validar es una navegación POST de otro sitio que deje al navegador usando una cuenta institucional controlada por un tercero. No se verificó en navegador la fijación de cookie ni qué hace el portal al coexistir esa cookie con otra identidad Firebase. `SameSite` controla el envío de cookies; no sustituye por sí solo una defensa de autenticidad del login. [Referencia de cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

**Siguiente paso:** prueba local entre orígenes y, si confirma impacto, validación de origen y del contrato JSON contemplando Capacitor. Esfuerzo S / riesgo medio. No atribuir una cadena de ataque al reproductor SCORM: su CSP bloquea conexiones externas y formularios.

### INV-02 — Identidad institucional en Callables — posible alta, confianza media

Los autorizadores de `firebase/functions/index.js:60–135` comprueban correo verificado, perfil y matrícula, pero no vuelven a derivar el rol desde el dominio actual del token. Si una identidad puede cambiar a un correo externo manteniendo perfil y matrículas, las funciones podrían seguir admitiéndola aunque las reglas de datos rechacen el dominio.

**Siguiente paso:** verificar en staging las políticas de cambio/vinculación de proveedores y la transición de identidad. No se demostró una ruta desde una cuenta externa nueva. Esfuerzo M / riesgo medio; aplicar la política común al flujo que confirme la prueba.

### INV-03 — Autorización de comandos Discord — posible media, configuración sin verificar

`app/api/discord/interactions/route.ts:37–39,59–86` comprueba la firma de Discord, pero no autoriza el ID/rol del usuario antes de invocar herramientas. `lib/discord/gemini-copilot.ts` consulta Linear y GitHub con las credenciales de servicio; el registro de `scripts/register-discord-commands.js` no define permisos por defecto restrictivos. Esto importa si el bot comparte servidor/canal con usuarios que no deben acceder a ese contexto o consumir esas APIs. Los [permisos de comandos de Discord](https://docs.discord.com/developers/interactions/application-commands#permissions) pueden aportar restricciones externas que no se inspeccionaron.

**Siguiente paso:** inventariar permisos efectivos y público autorizado; si es exclusivo de mantenedores, comprobar esa identidad antes de despachar herramientas. El bridge local sí tiene una allowlist, por lo que no se reporta una omisión general de todos los bots. Esfuerzo S–M / riesgo bajo.

### CFG-01 — Turnstile permite continuar cuando falta el secreto

`lib/services/turnstile.ts:11` devuelve `true` sin secreto incluso en producción. Una comprobación aislada con `NODE_ENV=production`, sin secreto y sin token confirmó ese retorno. `app/api/soporte/route.ts:89` consume la decisión.

Es un comportamiento confirmado **condicionado a configuración**; no se verificó que falte la variable en el Worker real. La degradación local está documentada en el helper, pero no se limita a desarrollo. Comprobar la configuración y diferenciar explícitamente desarrollo de producción; fallo cerrado o señal operativa cuando se espere protección activa. Esfuerzo S / riesgo bajo.

### CFG-02 — Avisos de dependencias; alcanzabilidad sin demostrar

Resultados del registro durante esta auditoría:

| Comando | Resultado |
| --- | --- |
| `pnpm audit --json` | 4 avisos altos de `fast-uri` y 1 moderado de `@xmldom/xmldom` |
| `pnpm audit --prod --json` | Los mismos 4 avisos altos de `fast-uri` |
| `pnpm --dir firebase/functions audit --prod --json` | Los mismos 4 avisos altos de `fast-uri` y 2 moderados de `qs` |

No sumar estos resultados como vulnerabilidades independientes: las cuatro alertas de `fast-uri` se repiten entre grafos. El lockfile contiene `fast-uri@3.1.5`. Las rutas reportadas incluyen `react-doctor → conf → ajv` y, al excluir devDependencies, `@sentry/nextjs → @sentry/webpack-plugin → webpack → schema-utils → ajv`. En Functions aparece también a través de `ajv`; `qs@6.15.3` aparece con Express/body-parser.

La presencia en `--prod` no demuestra un SSRF de una ruta de la aplicación. Los avisos de `fast-uri` requieren normalizar/resolver URLs no confiables en una decisión relevante de acceso o red; no se demostró esa cadena desde una petición CEOUBB. No se inspeccionó el código instalado de dependencias porque no existe `node_modules`.

Revisar y actualizar ambos lockfiles a versiones corregidas; la rama 3 de `fast-uri` está corregida desde 3.1.6 según el [aviso primario del mantenedor](https://github.com/fastify/fast-uri/security/advisories/GHSA-jqff-g426-hqxp). Otros avisos: [canonicalización de host](https://github.com/advisories/GHSA-5jgf-p345-68v8), [IPv6](https://github.com/advisories/GHSA-f65p-4m7j-42xc), [decodificación repetida](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), [xmldom](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6), [qs: límites](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) y [qs: disponibilidad](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g). Esfuerzo S–M / riesgo medio; no se actualizaron paquetes.

### CFG-03 — El despliegue Firebase no depende del gate de emuladores

`.github/workflows/ci.yml` ejecuta una matriz independiente de emuladores. La cadena de despliegue de `.github/workflows/firebase-release.yml:45–49` ejecuta `verify:fast`, `verify:invariants` y comprobaciones de sintaxis, pero no `check:rules`. `verify:invariants` tampoco ejecuta los emuladores, según `package.json`.

Por ello la cadena publicada no garantiza por sí misma esperar el resultado de reglas antes de desplegar. Branch protection y protecciones de ambientes podrían añadir garantías externas: no se inspeccionaron. Integrar el gate real en la promoción del mismo commit. Esfuerzo S / riesgo bajo. Es una brecha de verificación, no prueba de despliegue malicioso ocurrido.

### CFG-04 — CSP permite scripts inline

`next.config.ts:20–22` y la cabecera observada en la portada permiten `script-src 'unsafe-inline'`. Esto reduce la defensa adicional frente a una futura inyección, pero **no prueba XSS**. No se confirmó un flujo de contenido no confiable hasta ejecución de script en el portal. Evaluar nonces/hashes compatibles con Next y Capacitor. Esfuerzo M / riesgo medio.

### CFG-05 — Firma Discord sin control de antigüedad

`lib/discord/signature.ts` verifica la firma del cuerpo y timestamp sin limitar antigüedad. Una firma creada localmente con clave efímera y timestamp antiguo fue aceptada por el helper. Una repetición real requiere conseguir una solicitud válida anterior; no se demostró esa obtención. Añadir frescura y, para operaciones costosas, deduplicación si la integración lo requiere. Esfuerzo S / riesgo bajo. Las firmas inválidas sí se rechazan.

## 5. Cobertura y comprobaciones

### Alcance de código

El inventario de Git contiene **987 archivos**, **37 handlers API**, 86 archivos bajo `lib/`, 7 bajo `firebase/functions/` y 13 workflows. Hubo revisión manual por flujos y búsquedas de superficies peligrosas; el inventario no significa que cada archivo o dependencia se leyera línea por línea.

| Superficie | Revisión realizada |
| --- | --- |
| Autenticación y sesiones | Login Firebase, derivación de roles, cookies, borrado de cuenta, sesiones remotas, dev-login |
| Administración y datos | Usuarios, cursos/docentes, ayudantes, matrícula, participantes, historial de notas, proyecciones y archivado |
| Firebase | Ambos archivos completos de reglas; autorizadores, quizzes, notas, auditoría, notificaciones y borrado de cuenta en Functions; clientes y consumidores relevantes |
| Contenido y archivos | Entregas, Storage, avatar, HTML enriquecido, mappers, biblioteca, importación Moodle, QTI, ZIP/XML y límites |
| Interoperabilidad | Grants, origen separado, CSP/sandbox, LTI, rutas de contenido, SCORM/xAPI y puntos de persistencia |
| Integraciones | Firmas GitHub/Linear/Discord, cron, soporte, llamadas a servicios y bridges locales |
| Operación | Next/Cloudflare, CORS/cabeceras, service worker, Sentry, workflows, lockfiles y detección acotada de credenciales |

### Pruebas locales y límites de ejecución

- Primera ejecución: `node --experimental-strip-types --test tests/access-policy.test.ts tests/github-webhook.test.ts tests/linear-webhook.test.ts tests/dev-auth.test.ts tests/ci-workflows.test.ts tests/firebase-rules-config.test.ts`. Resultado: **44 tests aprobados y un archivo de pruebas sin poder cargar**, `tests/dev-auth.test.ts`, por ausencia de `drizzle-orm`. La ejecución de tests terminó con código 1.
- Segunda ejecución: `node --experimental-strip-types --test tests/interop-formats.test.ts tests/quiz-engine.test.ts tests/grade-audit.test.ts`. Resultado: **14 tests aprobados y un archivo de pruebas sin poder cargar**, `tests/interop-formats.test.ts`, por ausencia de `zod`. Código 1.
- En total: **58 resultados de test aprobados; dos suites bloqueadas por dependencias ausentes**. No se presenta como suite completa aprobada ni se atribuyen esos fallos de carga a errores del producto.
- `node scripts/verify-test-hashes.mjs --check`: código 0, integridad de 64 archivos validada.
- `node --check` sobre `firebase/functions/index.js`, `grade-audit.js` y `quiz-engine.js`: código 0 en los tres.
- Comprobaciones aisladas: crecimiento de `shape()` QTI; retorno de Turnstile sin secreto en producción; firma Discord local con timestamp antiguo; lectura JSON con tipo texto plano. No probaron bases de datos o navegadores reales.
- No se ejecutaron build, lint, typecheck, formateo global, suite completa, emuladores ni Playwright: el checkout carece de dependencias. No se instalaron paquetes ni se modificaron tests.

Las pruebas de presencia de cadenas en archivos de reglas y workflows verifican estructura; no sustituyen la ejecución del motor de reglas ni prueban que una política esté desplegada.

### Consultas HTTP de lectura en producción

Se realizaron GET sin credenciales y se inspeccionaron estado y cabeceras, sin solicitar datos académicos privados:

| URL | Estado observado | Alcance de la conclusión |
| --- | --- | --- |
| `https://ceoubb.com/` | 200 | CSP presente, HSTS, nosniff y X-Frame-Options DENY |
| `https://ceoubb.com/api/auth/me` | 200 | La ruta permite respuesta anónima; el código devuelve `user: null` sin sesión. No implica bypass de autenticación |
| `https://ceoubb.com/api/admin/users` | 403 | Rechaza consulta anónima en esa ruta |
| `https://ceoubb.com/api/sentry-test` | 404 | Endpoint de prueba no disponible en esa consulta |

No se observaron cabeceras CORS permisivas en esas respuestas. La muestra no valida todas las rutas, todos los hosts ni los permisos de roles reales. Tampoco demuestra que producción corresponda exactamente al commit auditado.

### Credenciales

Se examinaron 883 archivos de texto versionados con patrones para claves privadas, tokens GitHub/AWS/Slack, webhooks Discord y JWT literales. No hubo coincidencias. El único nombre de archivo de entorno versionado hallado fue `.env.example`.

Esto es una búsqueda acotada, no una garantía de ausencia de secretos: no incluye el historial completo de Git, variables locales no versionadas, valores de secretos remotos ni todos los formatos posibles. Los identificadores públicos Firebase y su clave de configuración cliente no se clasificaron automáticamente como credenciales administrativas.

## 6. Hipótesis revisadas y descartadas o no elevadas

- **IDOR de actualización de entregas de SPEC-013:** la regla actual sí comprueba el UID del documento existente. SEC-04 se refiere a creación anticipada, no a esa sobrescritura corregida.
- **Owner derivado de correo personal:** el rol owner se lee del estado administrativo. No se volvió a reportar el antiguo problema de una cuenta hardcodeada.
- **Cambio administrativo de rol sin compensación:** la ruta revisada proyecta el cambio y contempla revertir Turso ante fallo; no se demostró una nueva escalada allí.
- **Docente global matriculado como ayudante:** los predicados Firebase son amplios, pero la asignación de ayudantes exige cuenta student. La vía identificada requiere que el owner cambie previamente el rol global; no se confirmó escalada autónoma.
- **Preguntas de quiz visibles antes del temporizador:** el comportamiento existe, pero no se encontró una prohibición pedagógica inequívoca del acceso previo al enunciado. Confirmar requisito antes de etiquetarlo como vulnerabilidad.
- **Pautas y notas modificables directamente:** los bancos privados, resultados, notas y auditoría tienen denegación de escritura cliente en las superficies revisadas. El motor de entregas del quiz usa transacción y límites temporales.
- **RCE de shell en bridge local:** la ejecución usa `shell: false` y los disparadores del bridge tienen allowlist. No se confirmó la regresión anterior.
- **SSRF en registro LTI:** las URLs de herramientas se usan para navegación del navegador; no se halló una consulta arbitraria del servidor por ese registro. Los redirects y destinos se validan.
- **SCORM ejecutando en el origen del portal:** se exige hostname diferente y el contenido recibe sandbox/CSP. La política permite scripts del paquete por diseño; no se confundió esa capacidad con XSS del portal.
- **XSS por `linkUrl`:** los mappers aplican allowlist HTTP(S). Los sinks revisados de biblioteca escapan texto y los JSON-LD de páginas usan datos controlados. No se confirmó XSS explotable; la observación CSP queda separada.
- **App Check no exigido:** el modo de observación está documentado en SPEC-018. No se reporta el rollout como una vulnerabilidad autónoma.
- **Formularios de soporte externos:** aceptar correos no institucionales es una decisión explícita para quienes no pueden acceder. No se confundió con el control de dominio del login.
- **workers.dev de producción habilitado:** `wrangler.jsonc` lo desactiva para producción. Los valores distintos en staging/preview son configuración deliberada; no se inspeccionó el estado remoto.

## 7. Orden recomendado y cierre del alcance

1. Contener SEC-01 y definir qué promete exactamente la revocación de dispositivo; comprobar denegación real en ambos sistemas.
2. Resolver SEC-02 y SEC-04 juntos en el contrato de entregas, preservando protección de propietario y compatibilidad histórica.
3. Cerrar SEC-03 antes de considerar el archivo académico de solo lectura.
4. Corregir los predicados de SEC-05 y decidir la descarga autenticada/invalidez de enlaces de SEC-06.
5. Acotar QTI y hacer atómica la cuota de soporte; validar INV-01 en navegador local.
6. Comprobar configuración de Callables, Discord, Turnstile, dependencias y promoción CI; reclasificar los candidatos solo con evidencia.

Las correcciones deben cumplir los gates del repositorio una vez disponibles las dependencias: `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm run verify:fast`, `pnpm run check:rules` y las suites de integración pertinentes. Para commits posteriores, ejecutar previamente `pnpm run format` y conservar las reglas de test-locking; esta auditoría no realizó commits.

**Pendiente de validación externa:** políticas Firebase Auth y App Check efectivas; reglas desplegadas y CORS del bucket; IAM, cuentas de servicio, WAF y límites Cloudflare; ramas/ambientes protegidos de GitHub; sesiones reales por rol; CSP y cookies en navegador; APK/iOS y calibración nativa; código interno de dependencias y assets vendorizados; historial Git y secretos remotos. No se dispone de evidencia suficiente para declarar seguros esos elementos.

Este archivo es el informe de auditoría y la base para priorizar correcciones. No sustituye planes de implementación individuales ni afirma que los hallazgos estén resueltos.
