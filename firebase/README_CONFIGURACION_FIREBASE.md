# Backend de Centro de Estudio UBB

El proyecto usa Firebase Authentication, Cloud Firestore, Cloud Storage y Cloud Messaging.

## Cuentas y roles

- `elpapijuaco325@gmail.com`: desarrollador principal protegido.
- `felipearce.2004@gmail.com`: desarrollador colaborador protegido.
- `@alumnos.ubiobio.cl`: estudiante automático.
- `@ubiobio.cl`: profesor automático.
- Cualquier otro dominio queda rechazado.
- El propietario puede suspender o restablecer cuentas desde la administración.

## Proyecto conectado

- Proyecto Firebase: `centro-de-estudio-ubb`.
- Aplicación Android: `cl.ubb.centroestudio`.
- Firestore: región `southamerica-west1`.
- Curso beta sincronizado: Estática.

## Componentes pendientes de despliegue

1. Actualizar las reglas de Firestore incluidas en `firebase/firestore.rules`.
2. Activar el plan Blaze y crear el bucket de Cloud Storage.
3. Publicar `firebase/storage.rules`.
4. Desplegar la función `notifyStudentsOnCoursePost` desde la raíz de `CentroEstudioAndroid`.
5. Configurar una alerta de presupuesto en Google Cloud Billing.

La función envía una notificación a los estudiantes cuando un profesor o el propietario publica un aviso o archivo nuevo. La app se suscribe al curso después de validar el rol institucional.
