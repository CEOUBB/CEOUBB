## Status

APROBADA. La instrucción directa del mantenedor para ejecutar CEO-26 y publicar el PR autoriza requisitos, diseño y DAG sin una pausa adicional de aprobación.

## Why

Linear **CEO-26** identifica dos vacíos de continuidad académica: en la web no existe un lugar donde revisar qué cambió desde la visita anterior y un estudiante no puede escribir de forma privada al equipo docente de su sección. Las publicaciones y FCM ya resuelven la emisión docente, pero no una bandeja consultable ni la conversación de retorno.

La capacidad debe respetar el aislamiento por matrícula y la escala institucional. No se crearán copias de cada aviso por estudiante ni consultas globales: el centro agregará los avisos acotados que el portal ya escucha por sección y mantendrá un hilo privado determinista por estudiante y sección.

## What Changes

- Añadir una vista `Avisos y mensajes` accesible desde el riel, la cabecera y la barra inferior móvil.
- Presentar las publicaciones recientes de las secciones matriculadas, ordenadas y con estado leído persistente entre dispositivos.
- Mostrar un contador global acotado de avisos y conversaciones no leídas.
- Permitir a cada estudiante abrir un único hilo privado por sección con el equipo docente.
- Permitir a docentes y coordinación revisar y responder hilos de estudiantes sólo en secciones asignadas.
- Persistir mensajes inmutables, resumen de hilo y cursores privados de lectura en Firestore.
- Endurecer las reglas de Firestore con pertenencia, claves exactas, texto acotado y reloj de servidor.

## Capabilities

### New Capabilities

- `communications/center`: centro unificado de avisos, estado leído y mensajería privada por sección.

### Modified Capabilities

<!-- Ninguna. Publicaciones, matrículas, roles, notas y FCM conservan sus contratos vigentes. -->

## Impact

**Código**

- `lib/communications.ts` — contratos puros, normalización, orden y conteo no leído.
- `lib/firebase/communications.ts` y `lib/firebase-classroom-client.ts` — listeners y mutaciones Firestore acotadas.
- `firebase/firestore.rules` — aislamiento y validación de hilos, mensajes y cursores.
- `app/Portal.tsx`, `app/portal-types.ts`, `app/portal-shell.tsx`, `app/views/CommunicationsCenter.tsx`, `app/globals.css` y `app/mobile-shell.css` — navegación y experiencia responsive.
- `tests/communications.test.ts`, `package.json` y `.agents/.test-hashes.json` — aceptación y bloqueo de la suite.

**Datos y escala**

- Un hilo como máximo por estudiante y sección; los mensajes no se duplican por destinatario.
- Un listener de cursores por usuario, un listener de hilo exacto por sección para estudiantes y una consulta limitada de hilos por sección para docentes.
- Máximo 40 secciones observadas, 25 hilos por sección, 100 mensajes por conversación y 200 cursores recientes.

**Non-goals**

- No se añaden adjuntos, edición, eliminación, reacciones, indicadores de escritura ni confirmaciones por mensaje.
- No se implementan mensajes entre estudiantes, búsqueda en directorio, grupos arbitrarios ni conversaciones fuera de una sección.
- No se envían correos ni nuevas notificaciones push; FCM de publicaciones conserva su conducta vigente.
- No se cambia el catálogo estático, la derivación de roles, la matrícula, Turso ni el modelo de notas.
- No se despliegan reglas de Firebase ni el portal desde este cambio.
