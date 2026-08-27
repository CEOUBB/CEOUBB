## Context

Motivación en `proposal.md - Why`. Requisitos en `specs/ui/notification-center/spec.md`, `specs/ui/user-settings/spec.md`, `specs/communications/center/spec.md` y `specs/auth/spec.md`.

Estado actual relevante para el diseño:

- El portal es un cliente único montado en `app/page.tsx`. `app/Portal.tsx` mantiene `screen`, `course`, `activity`, `gradebooks`, `communications` y `seen` en un reducer y en estado local; `app/portal-shell.tsx` renderiza header y sidebar; las vistas pesadas llegan por `next/dynamic` con esqueleto.
- El header ya tiene el control de campana (`.header-notifications`) con badge `.header-notification-count.num`, y el menú de cuenta implementado como `<details class="account-menu">` con cierre por `pointerdown` y `Escape` y devolución de foco al `summary`. Ese patrón ya resuelve la mitad del trabajo de accesibilidad de un popover.
- El conteo de no leídos ya se calcula con `unreadCommunicationCount(activity, threads, cursors, uid)` en `lib/communications.ts`. Los cursores viven en `users/{uid}/notificationReads` bajo el contrato REQ-COMM-02.
- `Avatar` en `app/portal-ui.tsx` solo conoce la foto de Google (`useGooglePhoto`) con caída a iniciales. La tabla `users` de Turso no tiene columna de foto. La tabla `sessions` existe con `tokenHash`, `userId`, `expiresAt`, `createdAt`, y hoy nunca se lee desde la interfaz.
- `app/globals.css` ya define `--safe-top`, `--safe-bottom`, `.num`, `.icon-button` y los bloques `@media (prefers-reduced-motion: reduce)`.

## Goals / Non-Goals

**Goals**

- Que el panel no cueste ninguna lectura remota adicional ni ninguna suscripción nueva.
- Que panel y hoja inferior compartan un único componente de contenido, para que móvil y escritorio no diverjan al mantenerse.
- Que la pantalla de configuración se monte, se enfoque y se cargue igual que Calendario o Recursos, sin chrome propio.
- Que cada mutación de configuración sea una ruta API con sesión de servidor y Zod, y que su escritura relacional y su proyección viajen juntas.

**Non-Goals de diseño**

- No se define el formato de los mensajes push existentes ni se toca su envío más allá de consultar la preferencia.
- No se rediseña la pantalla `Avisos y mensajes`, que sigue siendo el destino completo.
- No se introduce una biblioteca de recorte de imágenes nueva si el recorte se puede resolver con `canvas` y un contenedor arrastrable propio; la evaluación queda en Decisions.

## Decision sheet

La hoja se llena para fijar cada propiedad visible antes de escribir markup, y se critica contra el sistema ya publicado en `DESIGN.md` en lugar de contra el gusto general.

- **SUBJECT.** Dos superficies de una sola sesión de trabajo académica: una consulta de diez segundos sobre qué cambió en mis ramos, y una visita ocasional para ajustar quién soy y qué me llega. Ambas en modo Operate: la marca vive en la precisión, no en la expresión.
- **GROUND.** El mundo del producto es el acta impresa y el formulario administrativo universitario. El panel es una nota fijada sobre el acta, no una tarjeta flotante genérica: superficie blanca `{colors.surface}` sobre el lienzo papel `{colors.canvas-soft}`, cerrada por el hairline `{colors.hairline}`, con la elevación 2 ya definida en `DESIGN.md` para popovers. La configuración es el formulario: bloques etiquetados, una columna de lectura, sin tarjetas decorativas.
- **PALETTE.** Sin color nuevo. `{colors.primary}` #0055b8 solo para el estado activo y el anillo de foco. `{colors.accent-orange}` #e31b23 exclusivamente en el badge y en el punto de no leído, que es su papel de estado en el sistema. `{colors.ink}` para el título del elemento, `{colors.ink-muted}` para la marca temporal, `{colors.hairline}` para la separación entre filas. El neutro está sesgado a azul (`oklch(... 240-260)`), coherente con el resto del portal.
- **TYPE.** `Manrope` en todo el panel y en toda la configuración: es mobiliario de interfaz, y `DESIGN.md` prohíbe la serif ahí. `{typography.body-sm}` para el título del elemento, `{typography.caption}` para la sección y la hora, `{typography.eyebrow}` para el encabezado del panel y para el nombre de cada módulo de configuración. `Merriweather` aparece una sola vez, en el título de la pantalla de configuración, porque es un encabezado de página y no mobiliario.
- **SPACE.** Dos registros distintos, no uno. Intra componente: 8px entre avatar y texto de la fila, 4px entre título y metadato. Ritmo: 24px entre módulos de configuración, 12px de padding vertical por fila del panel. La fila del panel no puede bajar de 44px de alto útil.
- **SHAPE.** Radio 12px (`{rounded.lg}`) para el contenedor del panel, alineado con las tarjetas del portal; 8px (`{rounded.md}`) para la fila enfocada; 4px (`{rounded.xs}`) para todo control de formulario en configuración. Elevación por sombra en el panel (nivel 2 del sistema) y por hairline en configuración, nunca ambas en la misma superficie.
- **MOTION.** Exactamente dos momentos animados en el panel: su entrada y el cambio del badge cuando llega algo nuevo. Resorte críticamente amortiguado `stiffness: 340, damping: 28` sobre `transform` y `opacity`. Nada más se mueve. Bajo `prefers-reduced-motion` o con la preferencia de usuario activa, ambos momentos se vuelven cambios de estado inmediatos.
- **SIGNATURE.** La fila del panel lleva a la izquierda el color de la sección que ya identifica a ese ramo en el resto del portal, como una banda vertical de 3px. Un estudiante reconoce de qué ramo es el aviso antes de leer una palabra, y ese código de color ya existe en el producto en lugar de inventarse aquí.

**Crítica de la hoja.** Las líneas que sobrevivirían a otro producto son PALETTE y TYPE, y sobreviven porque el sistema visual ya está publicado y este cambio no tiene mandato para reemplazarlo. Las líneas que este brief sí determina son SIGNATURE (el tono de sección solo existe porque el producto se organiza por secciones), MOTION (dos momentos, porque el resto del portal es quieto) y SPACE (el registro de 44px viene del uso táctil real en la WebView de Capacitor). La línea que se corrigió al criticar: la primera versión ponía un ícono por tipo de notificación a la izquierda de cada fila, que es exactamente la decisión que aparecería igual en cualquier panel de cualquier producto. Se reemplazó por la banda de tono de sección.

## Decisions

### D1. El panel deriva de estado en memoria, no de una colección nueva

Se agrega a `lib/communications.ts` una función pura que toma `activity`, `threads`, `cursors` y el `uid`, y devuelve una lista ordenada y acotada de `NotificationItem`, junto al `unreadCommunicationCount` que ya vive ahí y consume las mismas entradas.

Alternativa descartada: `users/{uid}/notifications` con escritura en abanico, como pide el texto de CEO-66. Una publicación en una sección de 60 estudiantes escribe 60 documentos; la meta institucional son miles de secciones. El costo es permanente y no habilita hoy ningún aviso que no se derive de `activity` o de los hilos. La forma `NotificationItem` se define como el contrato del panel, de modo que una fuente futura pueda alimentarlo sin tocar la vista.

Consecuencia: el panel no puede mostrar avisos que no provengan de una sección matriculada o de un hilo. Eso coincide con lo que el producto genera hoy.

### D2. El panel es un `<details>` con el mismo patrón del menú de cuenta

Se reutiliza el patrón ya probado en `app/portal-shell.tsx`: `<details>` con cierre por `pointerdown` fuera y por `Escape`, con devolución de foco al disparador. Da estado abierto sin estado de React, sobrevive sin JavaScript y ya tiene su comportamiento de teclado escrito en el archivo.

Alternativa descartada: un popover controlado por `useState` en `Portal.tsx`. Agregaría estado a un componente que React Doctor ya marca como grande, y duplicaría la lógica de descarte que el menú de cuenta resuelve.

Sobre el patrón existente se agregan `aria-haspopup="menu"`, `aria-expanded` sincronizado con el atributo `open`, y el ciclado de `Tab` dentro del contenido mientras está abierto.

### D3. Un componente de contenido, dos contenedores

`NotificationList` renderiza filas, acción de marcar todo y `Ver todas las notificaciones`. El contenedor decide la presentación: popover anclado al header en escritorio, hoja inferior en ancho móvil. La elección usa el mismo indicador de ancho que `Portal.tsx` ya calcula para decidir entre `enterCourse` y `setPreview`, en vez de introducir un segundo criterio de móvil en el proyecto.

La hoja inferior aplica `padding-bottom: var(--safe-bottom)`, que en `app/globals.css` ya está corregido para la WebView de Android donde `env(safe-area-inset-bottom)` mide 0px.

Alternativa descartada: dos componentes independientes. Divergen en la primera corrección que se aplique a uno solo.

### D4. Configuración es una `Screen` del portal, no una ruta

Se agrega `"settings"` a `Screen` en `app/portal-types.ts` y la vista entra por `next/dynamic` con su esqueleto en `ViewSkeletons.tsx`, igual que Calendario, Recursos y Administración. No se agrega entrada al sidebar: el acceso vive en el menú de cuenta, que es donde el usuario la busca.

Alternativa descartada: `app/configuracion/page.tsx`. El portal monta sesión, cursos, actividad y comunicaciones en el cliente; una ruta paralela repite ese montaje, duplica header y sidebar y rompe el manejo de foco por cambio de vista que `Portal.tsx` implementa sobre `#contenido-principal`. La ruta del issue se cumple como destino de navegación interna.

Consecuencia aceptada: no hay URL enlazable a configuración. Cuando el portal adopte sincronización de `Screen` con la URL, esta pantalla la hereda sin cambios.

### D5. La foto de perfil se resuelve por precedencia, no por reemplazo

`Avatar` pasa a resolver en orden: `photoUrl` propia, foto de Google, iniciales. `useGooglePhoto` se mantiene tal como está y se convierte en el segundo escalón. Restablecer la foto por defecto es poner la columna en `NULL` y borrar el objeto, no escribir la URL de Google en la base: esa URL puede rotar y quedaría congelada.

La subida entra por una ruta API con sesión de servidor que valida tipo y tamaño con Zod, escribe el objeto bajo un prefijo propio del usuario en Storage, actualiza `users.photo_url` en Turso y proyecta a `users/{uid}` en Firestore. La regla de Storage restringe la escritura a `request.auth.uid` sobre su propio prefijo y limita `contentType` y tamaño; ninguna regla nueva introduce lectura de grupo de colección.

El recorte se resuelve en cliente con `canvas` sobre un contenedor arrastrable y se sube el resultado ya recortado, para no almacenar el original ni depender de una biblioteca nueva. Instalar un paquete de recorte requiere autorización explícita según `AGENTS.md`, así que la implementación parte sin él.

### D6. Las preferencias viven en Firestore, la identidad en Turso

Las preferencias de notificación y la reducción de movimiento son estado operacional del usuario, se leen en cada arranque del portal y no participan de ninguna transacción académica: van a un documento propio en Firestore, escribible solo por su dueño. La foto es identidad y se referencia desde Turso, que es el sistema de registro de `users`, con proyección a Firestore para que la interfaz la lea junto al resto del perfil.

Alternativa descartada: guardar preferencias en Turso. Obligaría a una consulta relacional en el arranque para un dato que la interfaz consume junto al perfil que ya lee de Firestore.

### D7. La reducción de movimiento del usuario se suma a la del sistema

Se resuelve como `useReducedMotion() || preferenciaDeUsuario`, expuesto por un hook único que reemplaza las llamadas directas a `useReducedMotion` en los componentes animados. La preferencia del sistema nunca se puede anular desde la aplicación: un usuario que la activó en su dispositivo no debe poder perderla por un ajuste del producto.

### D8. Las sesiones se leen por columna indexada y con límite

El listado consulta `sessions` filtrando por `userId`, excluyendo `expiresAt` vencidos, con `.limit()` explícito, y marca la fila actual comparando el hash de la sesión en curso. La revocación borra por `tokenHash` verificando que la fila pertenezca al usuario autenticado antes de borrar; si no pertenece, responde error de autorización sin revelar si existe.

## Risks / Trade-offs

- **La derivación en cliente puede quedar corta si aparece un aviso que no nace de una sección** (por ejemplo, un mensaje del equipo de soporte). → El contrato `NotificationItem` se define como interfaz del panel, no como forma de `activity`; agregar una fuente es agregar un adaptador, no reescribir la vista.
- **`users.photo_url` nula en todas las cuentas existentes tras la migración.** → El componente resuelve por precedencia y trata `NULL` como el caso normal, no como error; la migración solo agrega una columna anulable, sin backfill.
- **Abrir escritura de avatar y preferencias toca la sincronización de cuatro espejos.** → Cada regla nueva se limita a `request.auth.uid` sobre su propio documento o prefijo, se acompaña de su prueba de reglas y no agrega ninguna sentencia `allow` sobre rutas de sección.
- **El recorte propio con `canvas` es más trabajo que una biblioteca.** → Se acota a recorte cuadrado con zoom y arrastre, que es lo que el caso necesita; si el resultado no alcanza la calidad exigida, la biblioteca se propone como cambio aparte con autorización previa.
- **`Portal.tsx` ya está señalado como componente grande.** → El estado del panel vive en el propio `<details>` y la derivación en `lib/communications.ts`; este cambio no agrega `useState` nuevos al componente.
- **La preferencia de canal solo tiene efecto donde ya existe envío.** → Los canales sin envío implementado se persisten y se documentan como inertes hasta que exista su emisor, en lugar de ocultarse de la interfaz.

## Migration Plan

1. Migración Drizzle que agrega `users.photo_url` como texto anulable. No requiere backfill ni ventana de inactividad.
2. Despliegue de reglas de Firestore y Storage con las cláusulas nuevas restringidas al propio `uid`, verificadas con `pnpm run verify:invariants` antes de publicar.
3. Despliegue de la aplicación. El panel y la pantalla de configuración son aditivos: el control de campana cambia de comportamiento, y el resto de la navegación a `Avisos y mensajes` sigue intacta.
4. Reversión: revertir el despliegue de la aplicación devuelve el control de campana a la navegación directa. La columna y las reglas pueden quedarse: una columna anulable sin lectores y una regla que solo permite al dueño escribir su propio documento no afectan a la versión anterior.
