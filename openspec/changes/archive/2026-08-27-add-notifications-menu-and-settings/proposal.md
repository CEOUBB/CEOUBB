## Why

Linear **CEO-66** y **CEO-65** cubren los dos controles del header que hoy quedan incompletos.

El botón de campana (`app/portal-shell.tsx`) navega directo a la pantalla `Avisos y mensajes`. Un usuario que solo quiere saber qué cambió pierde el contexto en el que estaba trabajando: abre el aula, sale del aula, vuelve. Toda aplicación con la que estos usuarios comparan CEOUBB resuelve eso con un panel efímero sobre el header.

El menú de cuenta contiene un único elemento, `Cerrar sesión`. No existe ninguna superficie donde el usuario revise sus datos institucionales, cambie su foto, decida qué notificaciones quiere recibir, active reducción de movimiento o cierre sesiones abiertas en otros dispositivos. `Configuración` es el elemento que falta en ese menú y la pantalla que falta detrás.

## What Changes

### Centro de notificaciones en el header (CEO-66)

- El control de campana deja de navegar y abre un panel anclado al header en escritorio y una hoja inferior en ancho móvil, con el mismo componente de contenido.
- El panel deriva sus elementos del estado que `Portal.tsx` ya mantiene en memoria: `activity` (publicaciones de secciones matriculadas), `communications.threads` (hilos de mensajes) y `communications.cursors` (cursores de lectura en `users/{uid}/notificationReads`). **No se crea la colección `users/{uid}/notifications`**: la escritura en abanico por miembro de sección multiplicaría cada publicación por miles de documentos sin agregar ningún aviso que no se pueda derivar hoy.
- Cada elemento del panel navega al recurso vinculado (aula de la sección, conversación) y marca su cursor como leído; una acción global marca todo como leído usando el mismo contrato REQ-COMM-02 ya especificado.
- Un elemento final, `Ver todas las notificaciones`, lleva a la pantalla `Avisos y mensajes` completa.
- Estados de carga con esqueleto y estado vacío redactado; badge con `tabular-nums`; entrada del panel con resorte críticamente amortiguado y degradación bajo `prefers-reduced-motion`.
- Accesibilidad: `aria-haspopup`, `aria-expanded`, trampa de foco ligera, cierre con `Escape` y retorno de foco al disparador, objetivos táctiles de 44 px.

### Configuración de usuario (CEO-65)

- Nuevo elemento `Configuración` con icono `Gear` en el menú de cuenta del header, sobre `Cerrar sesión`.
- Nueva pantalla `settings` dentro del shell del portal, no una ruta `/configuracion` independiente: el portal es una SPA cliente montada en `app/page.tsx` con estado `Screen`, y una ruta paralela duplicaría el montaje de sesión, el header y el manejo de foco. El enlace del issue se cumple como destino de navegación interna del portal.
- Módulo **Foto de perfil**: subida, recorte y previsualización, persistencia del objeto en Firebase Storage bajo un prefijo propio del usuario, referencia en Turso (`users.photo_url`, columna nueva) y proyección a `users/{uid}` en Firestore. Acción para volver a la foto de Google OAuth, que hoy es la única fuente del componente `Avatar`.
- Módulo **Preferencias de notificaciones**: canales configurables por publicaciones de sección, anuncios docentes, cambios de calificaciones y recordatorios de evaluaciones, con destino web in-app y push de Capacitor.
- Módulo **Accesibilidad**: alternador de reducción de movimiento persistido por usuario, que se suma a la preferencia del sistema en lugar de reemplazarla.
- Módulo **Cuenta y seguridad**: ficha institucional de solo lectura (correo, rol derivado, carrera y facultad), listado de sesiones activas desde la tabla `sessions` con revocación individual, y cierre de sesión.
- Validación con esquemas Zod en las rutas API, respuestas de error estructuradas y confirmaciones con toasts de Sonner.

### Exclusiones (Non-goals)

- No se crea la colección `users/{uid}/notifications` ni ningún proceso de escritura en abanico. La interfaz interna del panel se define de modo que una fuente futura pueda alimentarla sin rehacer la vista.
- No se agrega sincronización de `Screen` con la URL ni historial de navegación por vista: es un refactor de navegación que excede estos dos issues.
- No se cambia el algoritmo de conteo de no leídos ni el contrato de cursores ya especificado en REQ-COMM-02.
- No se implementa envío de push nuevo. Las preferencias se persisten y se respetan en los envíos existentes; ningún canal nuevo se activa en este cambio.
- No se toca la política de derivación de rol por dominio: la ficha institucional es de solo lectura.

## Capabilities

### New Capabilities

- `ui/notification-center`: panel de notificaciones anclado al header, su derivación desde el estado ya cargado, la acción de marcar como leído, la navegación al recurso vinculado, la adaptación a hoja inferior en móvil y sus garantías de accesibilidad y movimiento.
- `ui/user-settings`: pantalla de configuración del portal, sus cuatro módulos (foto de perfil, preferencias de notificaciones, accesibilidad, cuenta y seguridad), la validación Zod de sus mutaciones y la propagación entre Turso, Firestore y Storage.

### Modified Capabilities

- `communications/center`: REQ-COMM-08 describe el control del header como acceso directo a `Avisos y mensajes`. Pasa a describirlo como disparador de un panel, con `Ver todas las notificaciones` como el camino a la pantalla completa, sin alterar el resto de la navegación de escritorio ni la barra inferior de Capacitor.
- `auth`: se agrega el requisito de listar y revocar sesiones activas del propio usuario contra la tabla `sessions`, hoy escrita pero nunca expuesta.

## Impact

**Código afectado**

- `app/portal-shell.tsx`: control de campana, menú de cuenta, elemento `Configuración`.
- `app/portal-types.ts`: valor `settings` en `Screen` y su entrada de navegación.
- `app/Portal.tsx`: estado de apertura del panel, derivación de la lista de notificaciones, montaje diferido de la vista de configuración.
- `app/views/`: nuevo panel de notificaciones y nueva vista de configuración, ambos con esqueleto en `ViewSkeletons.tsx`.
- `lib/communications.ts`: función de derivación de la lista unificada, junto al conteo de no leídos que ya vive allí.
- `lib/portal-utils.ts` o módulo nuevo: tipo `NotificationItem` compartido.

**Datos y superficie de API**

- Turso: columna `users.photo_url` y migración Drizzle asociada; lectura de `sessions` por usuario con `.limit()` explícito.
- Firestore: documento de preferencias por usuario y campo de foto en la proyección `users/{uid}`; las reglas deben permitir que cada usuario escriba solo su propio documento.
- Firebase Storage: prefijo de avatares por usuario con límite de tamaño y tipo en reglas.
- Rutas API nuevas para foto de perfil, preferencias y revocación de sesión, todas con Zod y sesión de servidor.

**Riesgos**

- La sincronización de cuatro espejos de seguridad se toca al abrir escritura de avatar y preferencias. Cada regla nueva debe restringirse al propio `uid` y no puede introducir lecturas de grupo de colección.
- La columna nueva en `users` exige migración coordinada con el despliegue; el código debe tolerar `photo_url` nulo, que es el estado de todas las cuentas existentes.
