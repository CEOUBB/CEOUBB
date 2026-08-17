# Backend de Centro de Estudio UBB

El proyecto usa Firebase Authentication, Cloud Firestore, Cloud Storage y Cloud Messaging.

## Cuentas y roles

- `@alumnos.ubiobio.cl`: estudiante automático.
- `@ubiobio.cl`: profesor automático.
- Cualquier otro dominio queda rechazado.
- El rango `owner` no se deriva del correo (SPEC-010 / REQ-SEC-01): se guarda en Turso (`users.role = 'owner'`), se proyecta a `users/{uid}.role` en Firestore y las reglas lo leen con `role()`. Para promover una cuenta hay que actualizar ambos registros.
- El propietario puede suspender o restablecer cuentas desde la administración, pero no puede degradar a otra cuenta con rango `owner`.

## Aislamiento por matrícula

Las reglas de Firestore y Storage sólo abren `courses/{seccionId}/**` si existe el marcador `enrollments/{uid}/sections/{seccionId}`. Ese marcador lo escribe el servidor con credenciales de cuenta de servicio (`lib/services/enrollment-projection.ts`) y para el cliente es de sólo lectura.

Variables necesarias en el entorno del portal web:

- `FIREBASE_SERVICE_ACCOUNT_EMAIL`
- `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `FIREBASE_PROJECT_ID` (opcional; por defecto `centro-de-estudio-ubb`)

Sin secciones proyectadas, el portal no abre ninguna escucha y el aula queda vacía: la proyección debe ejecutarse antes de habilitar el acceso.

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
