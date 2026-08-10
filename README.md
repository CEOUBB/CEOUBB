# Centro de Estudio UBB

Plataforma educativa multiplataforma para organizar material de estudio, resolver ejercicios y facilitar la comunicación entre estudiantes y docentes mediante cuentas institucionales.

- Sitio web: [ceoubb.com](https://ceoubb.com)
- Android: aplicación nativa con contenido disponible sin conexión
- Servicios: Firebase Authentication, Firestore, Storage, Cloud Functions y Cloud Messaging

Este es un proyecto académico independiente. No es un servicio oficial de la Universidad del Bío-Bío ni representa institucionalmente a la universidad.

## Estructura

- `app/`, `public/`, `lib/`: aplicación web en React y Next.js
- `android/`: aplicación Android en Java
- `firebase/`: reglas, índices y funciones de Firebase
- `tests/`: verificaciones de la aplicación web

## Desarrollo web

Requisitos: Node.js 22 o superior.

```bash
pnpm install
pnpm run dev
```

Para comprobar una compilación:

```bash
pnpm run build
pnpm test
```

## Desarrollo Android

Requisitos: JDK 17, Android SDK 36 y Gradle 9.4.1 o compatible.

```bash
cd android
gradle assembleDebug
```

Para firmar una versión de publicación, copia `keystore.properties.example` como `keystore.properties`, completa los datos localmente y conserva la llave fuera del repositorio.

## Firebase

Las reglas y funciones están en `firebase/`. Para desplegarlas se necesita Firebase CLI autenticado y acceso al proyecto correspondiente.

```bash
cd firebase/functions
pnpm install
cd ..
pnpm dlx firebase-tools@latest deploy
```

## Seguridad y contenido

El repositorio no incluye llaves de firma, credenciales, archivos de entorno, compilaciones APK/AAB ni material académico original de terceros. La configuración pública del cliente Firebase no reemplaza las reglas de seguridad del servidor.
