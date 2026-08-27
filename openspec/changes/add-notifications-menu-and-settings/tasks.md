> **Nota de ejecución.** El propietario pidió que los módulos de interfaz de la pantalla de configuración (grupo 5) los construya un subagente Opus 5 con esfuerzo `high` invocando la skill `/impeccable`, con `design.md` y `specs/ui/user-settings/spec.md` como contrato. Los grupos 1 a 4 y 6 a 8 se ejecutan en el hilo principal. Todo código emitido lleva su marcador `// Implements: REQ-XX`.

## 1. Derivación de notificaciones

- [x] 1.1 Definir el tipo `NotificationItem` (identificador estable, origen `announcement` o `thread`, identificador de sección, tono de sección, título, extracto, marca temporal, estado de lectura, destino de navegación) junto a los tipos ya exportados en `lib/communications.ts`, y verificar que `pnpm run typecheck` sale con código 0.
- [x] 1.2 Implementar en `lib/communications.ts` la función pura que fusiona `activity`, `threads` y `cursors` en una lista ordenada de forma descendente y acotada a 20 elementos, reutilizando los ayudantes de cursor existentes, y verificar con pruebas unitarias nuevas en `tests/` que cubran: orden descendente, tope de 20, marcado de leído contra cursor, y exclusión de toda sección sin matrícula. Implements: REQ-NOTIF-02.
- [x] 1.3 Verificar que la función nueva no introduce ninguna llamada a Firestore comprobando que `lib/communications.ts` sigue sin importar el cliente de Firestore, y registrar el hash de las pruebas nuevas con el arnés de test-locking.

## 2. Panel de notificaciones en el header

- [x] 2.1 Convertir el control de campana de `app/portal-shell.tsx` en un `<details>` con el mismo patrón de descarte del menú de cuenta, con `aria-haspopup="menu"`, `aria-expanded` sincronizado con `open` y nombre accesible que incluye el conteo, y verificar con una prueba de interacción que `Escape` cierra el panel y devuelve el foco al disparador. Implements: REQ-NOTIF-01, REQ-NOTIF-08.
- [x] 2.2 Implementar el componente `NotificationList` con la fila especificada en la hoja de decisión de `design.md` (banda de tono de sección de 3px, título en `body-sm`, sección y hora en `caption`, alto útil mínimo de 44px), y verificar en el navegador que ninguna fila baja de 44px a 320 y a 1440 CSS pixels. Implements: REQ-NOTIF-02, REQ-NOTIF-07.
- [x] 2.3 Implementar la navegación al recurso vinculado y la persistencia del cursor al activar una fila, reutilizando el contrato de cursores existente, y verificar con pruebas que una fila de aviso persiste `course:{seccionId}` y una fila de hilo persiste el cursor de hilo, en ambos casos con reloj de servidor. Implements: REQ-NOTIF-03.
- [x] 2.4 Implementar la acción `Marcar todas como leídas`, visible solo si hay elementos sin leer, y verificar con una prueba que persiste un cursor por elemento listado, deja el badge en cero y no cambia la pantalla activa. Implements: REQ-NOTIF-04.
- [x] 2.5 Añadir la fila final `Ver todas las notificaciones` que cierra el panel y activa la pantalla `notifications`, y verificar que sigue presente y accionable con el panel vacío. Implements: REQ-NOTIF-05.
- [x] 2.6 Añadir el esqueleto de filas del panel a `app/views/ViewSkeletons.tsx` con `role="status"`, `aria-busy="true"` y `aria-label`, más el estado vacío `No tienes notificaciones nuevas`, y verificar que la geometría del esqueleto coincide con la fila real comparando alturas renderizadas. Implements: REQ-NOTIF-06.
- [x] 2.7 Implementar la presentación como hoja inferior en ancho móvil con `padding-bottom: var(--safe-bottom)`, reutilizando el indicador de ancho que ya usa `app/Portal.tsx`, y verificar en la WebView de Android que la última fila queda por sobre la barra de gestos. Implements: REQ-NOTIF-07.
- [x] 2.8 Aplicar la entrada del panel y el cambio del badge con resorte `stiffness: 340, damping: 28` sobre `transform` y `opacity` únicamente, envueltos en el hook de movimiento reducido, y verificar con el detector mecánico de Impeccable sobre los archivos cambiados que no aparece ninguna transición de propiedad prohibida. Implements: REQ-NOTIF-09.

## 3. Actualización de la navegación de comunicaciones

- [x] 3.1 Retirar la navegación directa del control de campana dejando intactas las demás rutas hacia `Avisos y mensajes` (navegación de escritorio y barra inferior de Capacitor), y verificar con una prueba que las tres superficies llegan a la misma pantalla y muestran el mismo estado de no leídos. Implements: REQ-COMM-08.
- [x] 3.2 Actualizar el marcador `data-requirement` del control del header para que refleje los requisitos vigentes y verificar que `pnpm run verify:invariants` sale con código 0.

## 4. Base de datos, reglas y rutas API de configuración

- [x] 4.1 Añadir `photo_url` como columna de texto anulable en `users` dentro de `db/schema.ts` y generar su migración Drizzle, y verificar que la migración aplica sobre una copia de la base local sin backfill y que las filas existentes quedan en `NULL`.
- [x] 4.2 Implementar la ruta API de subida de foto con sesión de servidor, esquema Zod de tipo y tamaño, escritura del objeto bajo el prefijo propio del usuario, actualización de `users.photo_url` y proyección a `users/{uid}`, siguiendo el patrón de `app/api/admin/users/route.ts`, y verificar con pruebas de integración que un archivo inválido responde error estructurado sin escribir nada. Implements: REQ-CFG-02.
- [x] 4.3 Implementar la ruta API de restablecimiento que pone `photo_url` en `NULL`, limpia la proyección y borra el objeto almacenado, y verificar con una prueba que tras invocarla el avatar resuelve la foto de Google. Implements: REQ-CFG-03.
- [x] 4.4 Implementar la ruta API de preferencias con esquema Zod cerrado sobre los cuatro canales y sus dos destinos, y verificar con pruebas que un canal desconocido o un valor no booleano responde error de validación y no persiste nada. Implements: REQ-CFG-04.
- [x] 4.5 Implementar las rutas API de listado y revocación de sesiones sobre `sessions`, con filtro por usuario, exclusión de vencidas, `.limit()` explícito y verificación de pertenencia antes de borrar, y verificar con pruebas que una revocación de sesión ajena responde error de autorización sin borrar filas. Implements: REQ-CFG-07, REQ-AUTH-08.
- [x] 4.6 Añadir a `firebase/firestore.rules` y `firebase/storage.rules` las cláusulas que permiten a cada usuario escribir solo su documento de preferencias y su prefijo de avatar, con límite de tipo y tamaño y sin ninguna lectura de grupo de colección, y verificar que `pnpm run verify:invariants` sale con código 0 y que el número de sentencias `allow` sobre rutas de sección no cambió.

## 5. Pantalla de configuración

- [x] 5.1 Añadir `"settings"` al tipo `Screen` en `app/portal-types.ts`, montar la vista con `next/dynamic` en `app/portal-shell.tsx` y añadir su esqueleto fiel al diseño en `app/views/ViewSkeletons.tsx`, y verificar que al navegar el foco se mueve a `#contenido-principal` como en las demás vistas. Implements: REQ-CFG-08.
- [x] 5.2 Añadir la entrada `Configuración` con icono `Gear` en el menú de cuenta, sobre `Cerrar sesión`, y verificar por teclado que muestra indicador de foco visible y que `Escape` cierra el menú devolviendo el foco a su `summary`. Implements: REQ-CFG-01.
- [x] 5.3 Construir el módulo de foto de perfil con subida, recorte cuadrado por arrastre y zoom sobre `canvas`, previsualización y acción de restablecer, conectado a las rutas de 4.2 y 4.3, y verificar que el avatar del header refleja el cambio sin recargar la página. Implements: REQ-CFG-02, REQ-CFG-03.
- [x] 5.4 Construir el módulo de preferencias de notificaciones con los cuatro canales y sus destinos web y push, con valores por defecto activos cuando no existe documento y sin escritura hasta el primer cambio, y verificar con una prueba que la carga inicial de un usuario sin preferencias no dispara escritura. Implements: REQ-CFG-04.
- [x] 5.5 Construir el módulo de accesibilidad con el alternador de reducción de movimiento y el hook único que combina la preferencia del usuario con `useReducedMotion`, reemplazando las llamadas directas en los componentes animados, y verificar que con la preferencia del sistema activa y el alternador apagado la animación sigue suprimida. Implements: REQ-CFG-05.
- [x] 5.6 Construir el módulo de cuenta y seguridad con la ficha institucional de solo lectura leyendo el rol desde `lib/access-policy.ts`, el listado de sesiones activas con marca de la actual y revocación individual, y el cierre de sesión, y verificar que la pantalla no expone ningún control editable de correo o rol. Implements: REQ-CFG-06, REQ-CFG-07.
- [x] 5.7 Conectar la confirmación de cada mutación a toasts de Sonner y asociar cada mensaje de validación a su control, y verificar con lectura de accesibilidad que cada error se anuncia junto al campo que lo origina. Implements: REQ-CFG-08.

## 6. Respeto de preferencias en el envío existente

- [x] 6.1 Reescribir `notifyStudentsOnCoursePost` para que resuelva la matrícula activa de la sección, lea token y preferencia de cada estudiante y envíe sólo a los dispositivos autorizados, en vez del envío a topic que no admitía preferencias, y verificar con pruebas que el emisor ya no usa `topic`, que corta antes de llamar a Messaging cuando no hay destinatarios y que un canal en `false` excluye a ese estudiante. Implements: REQ-CFG-04.
- [x] 6.2 Documentar en `PLAN.md` qué canales quedan persistidos pero inertes por no tener emisor implementado, y verificar que la nota nombra cada canal explícitamente. Tras la reescritura, `sectionPublications` sí tiene emisor; los otros tres siguen sin él.

## 7. Verificación integral

- [x] 7.1 Ejecutar `pnpm run verify:fast` y `pnpm run verify:invariants` y verificar que ambos salen con código 0 sin ninguna aserción de `tests/` modificada ni debilitada.
- [x] 7.2 Ejecutar `pnpm run typecheck` y `pnpm run lint` y verificar cero errores y cero advertencias.
- [x] 7.3 Ejecutar el detector mecánico de Impeccable sobre los archivos de interfaz cambiados y verificar que no queda ningún hallazgo sin resolver o sin justificación escrita.
- [ ] 7.4 Recorrer panel y configuración a 320, 768 y 1440 CSS pixels con teclado únicamente, y verificar que no hay desplazamiento horizontal de página, que todo control es alcanzable con foco visible y que los objetivos táctiles miden al menos 44 CSS pixels.
- [x] 7.5 Ejecutar `pnpm test` completo y verificar que las quince suites de integración pasan.

## 8. Cierre

- [x] 8.1 Actualizar `PLAN.md` con las notas de traspaso del cambio y verificar que incluye estado, riesgos abiertos y decisiones tomadas.
- [x] 8.2 Verificar que cada requisito `REQ-NOTIF-*`, `REQ-CFG-*`, `REQ-AUTH-08` y `REQ-COMM-08` tiene su marcador `// Implements: REQ-XX` en el código, recorriendo la lista completa de requisitos de los archivos de `specs/`.
