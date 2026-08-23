## Why

Linear **CEO-7** identifica una brecha probatoria del libro de notas: hoy cada escritura reemplaza `courses/{courseId}/grades/{uid}` y no conserva quién modificó una calificación, cuándo lo hizo ni cuál era el valor anterior. Una corrección legítima y una alteración indebida dejan el mismo estado final y no pueden distinguirse después.

La orden del mantenedor del 2026-08-23 autoriza ejecutar el cambio completo sin solicitar aprobaciones intermedias. Este delta formaliza esa autorización y acota la implementación antes de modificar código productivo.

## What Changes

- Mover las escrituras de notas oficiales y configuración del libro a HTTPS Callable Functions autenticadas en `southamerica-west1`.
- Autorizar en el servidor únicamente a `owner` o a docentes con matrícula activa en la sección.
- Escribir el estado nuevo y su bitácora en la misma transacción de Firestore.
- Crear una entrada por cada calificación agregada, corregida o retirada, con autor confiable, instante de servidor, valor anterior y valor nuevo.
- Registrar también los cambios de evaluaciones, ponderaciones y nota de eximición como parte del contrato P0.9.
- Denegar toda creación, edición o eliminación de bitácora desde clientes y bloquear la escritura directa a los documentos auditados.
- Conservar las lecturas actuales de notas; docentes y propietarios pueden leer la bitácora de la sección y cada estudiante sólo la de sus propias calificaciones.

## Capabilities

### New Capabilities

<!-- None. The audit trail extends the canonical grades capability. -->

### Modified Capabilities

- `grades`: persistencia transaccional, trazabilidad e inmutabilidad del libro de calificaciones.

## Impact

**Código**

- `firebase/functions/grade-audit.js` y `firebase/functions/index.js`: validación, autorización y transacciones auditadas.
- `lib/firebase/sdk.ts` y `lib/firebase/grades.ts`: cliente callable regional sin escrituras directas.
- `firebase/firestore.rules` e índices: bloqueo de mutaciones cliente y lectura aislada de la bitácora.
- `tests/grade-audit.test.ts`: contrato puro, integración de fuente y reglas.

**Datos y escala**

- Nueva colección `courses/{courseId}/gradeAudit/{eventId}`.
- Una escritura de nota genera una escritura adicional por valor efectivamente cambiado; los no-op no generan historial.
- Las cargas masivas se acotan a 100 estudiantes por invocación y diez transacciones concurrentes.

**Non-goals**

- No se agrega todavía una vista visual del historial; las reglas dejan preparada su lectura aislada.
- No se migra retrospectivamente el historial que nunca fue capturado.
- No se implementan borrado, compactación ni retención de entradas de auditoría.
- No se despliegan Functions, reglas ni índices a producción desde este cambio.
