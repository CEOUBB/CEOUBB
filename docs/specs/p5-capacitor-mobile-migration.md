# P5 — Migración de Arquitectura Móvil a Capacitor (SDD Specification)

**Status:** `VERIFICADA (§7.1)` — §7.2 pendiente (TASK-19, sin dispositivo ni Android SDK en el entorno) · **Target:** `android/` (reescritura legacy) → Capacitor Runtime
**Ejecutada:** 2026-08-15 en `claude/capacitor-migration` · respaldo legacy en el tag `android-legacy-v13` · `lint`, `typecheck`, `test:unit` (57/57) y `test` (80/80) en verde
**Enmiendas E1 y E2 durante la ejecución:** ver §8bis.
**Condiciones de la aprobación:** formalizadas como REQ-CAP-12…19 (§3). Los riesgos aceptados sin mitigar están en §0.3.
**Alcance aprobado:** Android GA · iOS **scaffold diferido** (ver §2.3)
**Reviewer & Execution Agent:** Claude Code · **Design Standard:** `design-ceoubb.md` · **Framework:** Next.js 16 (App Router), React 19, TypeScript, Capacitor 7.x

---

## 0. Auditoría de Viabilidad

`npx cap add android` regenera el proyecto nativo desde plantilla. Cinco activos del árbol legacy no sobreviven a esa regeneración y, sin requisito explícito, se pierden en silencio. Cada uno es ahora un requisito formal.

### 0.1 Bloqueadores encontrados (resueltos)

| # | Activo en riesgo | Evidencia | Requisito que lo cubre |
|---|---|---|---|
| B1 | Autenticación: `signInWithPopup` no funciona en WebView nativo (ni `signInWithRedirect`, por particionado de almacenamiento). La app legacy usa Credential Manager nativo. | `lib/firebase-client.ts:2,22`; `android/app/build.gradle` (`androidx.credentials`, `googleid:1.1.1`) | REQ-CAP-12, 12b |
| B2 | Clave de firma, `versionCode 13`, `versionName 1.0.6`, `minSdk 26` y `namespace` en `app/build.gradle`. Sin ellos, Play Console rechaza el AAB. | `android/app/build.gradle` | REQ-CAP-13 |
| B3 | `intent-filter` de App Links verificados, `StudyFileProvider` y `PushNotificationService` en el manifest legacy — no solo `google-services.json`. | `android/app/src/main/AndroidManifest.xml` | REQ-CAP-02, 16 |
| B4 | Biblioteca offline: `assets/www/` (3,5 MB) es copia de `public/biblioteca/` (3,4 MB). Con `server.url` remoto, Capacitor no sirve assets locales. | `du -sh` de ambos árboles | REQ-CAP-19 |
| B5 | CSP: `default-src 'self'` bloquea los orígenes `capacitor://localhost` / `https://localhost` que inyecta la WebView. Bridge muerto o pantalla en blanco. | `next.config.ts` | REQ-CAP-14 |

### 0.2 Decisiones de dependencias (justificación de lo que NO se instala)

- **`@tanstack/react-virtual`: no.** El feed está acotado por `ACTIVITY_LIMIT = 120` (`lib/firebase-classroom-client.ts`); 120 filas se resuelven con `content-visibility: auto`, cero dependencias. Queda condicionado a medición (REQ-CAP-08), no es tarea.
- **`vaul`: sí.** Física de arrastre, foco, `aria-modal` y scroll-lock; reimplementarlo es más código y peor accesibilidad.
- **`backdrop-filter` aparece 6 veces en `app/`**: REQ-CAP-09 es trabajo real y necesita test de no-regresión.

### 0.3 Riesgos aceptados (documentados, no mitigados en esta fase)

1. **Acoplamiento a producción:** con `server.url` remoto la app instalada renderiza siempre el `main` desplegado; un deploy roto rompe la app sin posibilidad de rollback por tienda. Aceptable en piloto; a escala universitaria exige un endpoint de versión mínima / kill-switch (deuda declarada en `PLAN.md`).
2. **Guideline 4.2 de Apple (minimum functionality):** un contenedor de sitio web es motivo frecuente de rechazo. Los diferenciadores nativos (push, hápticos, descargas, biblioteca offline) son precisamente la defensa; por eso iOS no se publica hasta que estén implementados y medidos.

---

## 1. Visión Ejecutiva

Reemplazar el código nativo legacy de `android/` (WebView artesanal, `StudyBridge`, `ClassroomService.java`) por una arquitectura móvil estandarizada sobre **Capacitor**, con Android como plataforma publicable y iOS preparado para una segunda fase, bajo el identificador canónico `cl.ubb.centroestudio`.

**Modelo de runtime elegido:** *remote-first*. Next.js 16 con App Router, rutas API (`app/api/**`) y Turso no admite `output: 'export'`; por tanto la WebView carga `https://ceoubb.com` y el `webDir` local sirve únicamente una pantalla de fallback offline. Esta decisión es la que hace que B4 y B5 existan: no es negociable sin reescribir el portal como SPA estática.

> [!TIP]
> **Libertad creativa de implementación:** la estructura de carpetas, los hooks, la ergonomía táctil, las micro-interacciones y la elección de librerías auxiliares quedan a criterio del agente ejecutor, siempre que se respeten los invariantes de §2 y los requisitos formales de §3.

---

## 2. Invariantes y Alcance

### 2.1 Invariantes afectados (`AGENTS.md`)

| Invariante | ¿Tocado? | Cómo se preserva | Requisito |
| :--- | :--- | :--- | :--- |
| Identificador canónico `cl.ubb.centroestudio` | sí | `appId` en `capacitor.config.ts`, `applicationId` y `namespace` reaplicados sobre el proyecto regenerado | REQ-CAP-01, 13 |
| Continuidad de publicación (firma, `versionCode`, `google-services.json`) | sí | Respaldo por tag Git + reaplicación verificada por test | REQ-CAP-02, 13 |
| SSOT de roles (`lib/access-policy.ts` + 4 espejos) | sí | La rama nativa entrega el `User` de Firebase a `roleForEmail`; la capa nativa no parsea dominios. Los 4 espejos no cambian | REQ-CAP-12, 12b |
| Seam de notas (`lib/grades.ts`) | no | La capa móvil solo consume; no se duplica aritmética | — |
| Default-deny en Firestore / Storage | sí | Única ampliación: `fcmToken` sobre el documento propio; ninguna otra regla se relaja | REQ-CAP-18 |
| Duplicación de biblioteca (`public/biblioteca/` ↔ `assets/www/`) | sí | Se **elimina** la copia Android; la cobertura offline pasa al service worker existente | REQ-CAP-19 |
| Avisos de plataforma no oficial | sí | Disclaimers preservados en pie de página, ajustes y ficha de tienda | §7.2 |

### 2.2 Alcance incluido (Android GA)

Runtime Capacitor, shell móvil (bottom nav, bottom sheets, safe areas), hápticos, push FCM, apertura de archivos, autenticación nativa, presupuesto de rendimiento y continuidad de publicación.

### 2.3 Alcance diferido (iOS)

`npx cap add ios` **se ejecuta y se versiona**, pero iOS queda explícitamente fuera del *Definition of Done* de esta fase. Bloqueadores externos, no de código:

- El entorno de desarrollo es Windows: `pod install`, compilación y firma requieren macOS + Xcode.
- No existe `GoogleService-Info.plist` en el repositorio (solo `google-services.json`).
- Push en iOS exige Apple Developer Program vigente y clave APNs cargada en Firebase.

REQ-CAP-03 se degrada de "targets sincronizados" a "proyecto iOS generado y consistente, no compilado".

---

## 3. Requerimientos de Ingeniería (EARS & RFC 2119)

> `REQ-CAP-17` no existe: se retiró durante la auditoría v1 → v2 y el identificador no se reutiliza. El salto 16 → 18 es intencional.
> Todo código que implemente un requisito de esta sección lleva el marcador `// Implements: REQ-CAP-XX` (ver §6).

### Infraestructura y runtime

- **REQ-CAP-01 (Ubiquitous):** The system SHALL configure `capacitor.config.ts` with `appId: 'cl.ubb.centroestudio'`, `appName: 'CEOUBB'`, a `webDir` containing an offline fallback document, and `server.url = 'https://ceoubb.com'` with `server.cleartext = false`.
- **REQ-CAP-02 (State-Driven):** WHILE the legacy `android/` tree is being replaced, the system SHALL preserve `android/app/google-services.json` byte-identical, and its `package_name` SHALL remain `cl.ubb.centroestudio`.
- **REQ-CAP-03 (Optional Feature):** WHERE a macOS toolchain and an Apple Developer account are available, the system SHALL maintain an `ios/` target synchronized with Android; otherwise the `ios/` project SHALL exist as a non-built scaffold.
- **REQ-CAP-13 (Ubiquitous — continuidad de publicación):** The system SHALL preserve, in the regenerated Gradle project, the release `signingConfig` sourced from `keystore.properties`, `applicationId 'cl.ubb.centroestudio'`, `minSdk 26`, and a `versionCode` strictly greater than `13`.
- **REQ-CAP-14 (State-Driven — CSP compatible con el bridge):** WHILE serving responses to a Capacitor WebView, the system SHALL include `capacitor://localhost` and `https://localhost` in the `script-src`, `connect-src` and `default-src` directives, and SHALL NOT relax any other directive.
- **REQ-CAP-16 (Ubiquitous — App Links y proveedores):** The system SHALL preserve the verified App Links `intent-filter` for `ceoubb.com` and `www.ceoubb.com`, and SHALL serve `/.well-known/assetlinks.json` with the release signing fingerprint.

### Autenticación

- **REQ-CAP-12 (State-Driven — autenticación nativa):** WHILE running inside the native shell, the system SHALL authenticate through `@capacitor-firebase/authentication` (native Google Sign-In) and `signInWithCredential`, and SHALL NOT invoke `signInWithPopup`.
- **REQ-CAP-12b (Unwanted Behavior):** IF native sign-in returns an email outside `@alumnos.ubiobio.cl`, `@ubiobio.cl` or the two superuser addresses, THEN the system SHALL sign the user out and surface the same rejection message as the web portal, delegating the decision to `roleForEmail`.

### Ergonomía móvil y UX

- **REQ-CAP-04 (State-Driven):** WHILE running on a mobile viewport or the native shell, the system SHALL render a fixed bottom navigation bar in the thumb zone and suppress desktop header chrome.
- **REQ-CAP-05 (Event-Driven):** WHEN a user opens modal detail surfaces (grade breakdown, filters, course options, submission dialogs) on mobile, the system SHALL present a drag-dismissible bottom sheet (`vaul`).
- **REQ-CAP-06 (Event-Driven):** WHEN a user switches tabs, confirms an action, or triggers an error, the system SHALL dispatch `@capacitor/haptics` feedback (`ImpactStyle.Light`, `NotificationType.Success`, `NotificationType.Error`), and SHALL be a no-op on web without throwing.
- **REQ-CAP-07 (Ubiquitous):** The system SHALL respect `env(safe-area-inset-*)` and style the status bar via `@capacitor/status-bar` using `#002b5c` / `#f4f6f9`.
- **REQ-CAP-15 (Event-Driven — navegación nativa):** WHEN the Android hardware back button is pressed, the system SHALL navigate back within the app history and SHALL exit only from a root tab; and WHEN a link points outside `ceoubb.com`, the system SHALL open it in the system browser (`@capacitor/browser`) instead of the app WebView.

### Presupuesto de rendimiento (gama baja)

- **REQ-CAP-08 (State-Driven — reemplaza el objetivo de 25 MB de v1):** WHILE rendering long streams of posts, rosters or library guides on a mobile device, the system SHALL keep the active DOM under 1500 nodes per view, SHALL keep p95 interaction latency under 200 ms, and SHOULD keep long tasks under 50 ms during scroll. Off-screen list rows SHALL use `content-visibility: auto` with a `contain-intrinsic-size` hint; DOM virtualization (`@tanstack/react-virtual`) SHALL be introduced only WHERE a measured view exceeds these thresholds.
- **REQ-CAP-09 (Ubiquitous):** The system SHALL NOT apply `backdrop-filter` in mobile viewports, using flat or `rgba()` surfaces instead.

### Servicios nativos

- **REQ-CAP-10 (Event-Driven):** WHEN a user grants notification permission, the system SHALL register the FCM token via `@capacitor/push-notifications` and persist it under `users/{uid}.fcmToken`.
- **REQ-CAP-10b (Unwanted Behavior):** IF the runtime notification permission (Android 13+ `POST_NOTIFICATIONS`) is denied, THEN the system SHALL continue operating without push and SHALL NOT block navigation or re-prompt on every launch.
- **REQ-CAP-18 (Ubiquitous — reglas de seguridad):** The system SHALL allow an authenticated user to write only `fcmToken` on their own `users/{uid}` document, with no widening of any other Firestore or Storage rule.
- **REQ-CAP-11 (Optional Feature):** WHERE a user opens academic PDFs or study guides, the system SHALL download via `@capacitor/filesystem` and hand off to the native viewer.
- **REQ-CAP-19 (State-Driven — continuidad offline):** WHILE the device is offline, the system SHALL serve `/biblioteca/index.html` and its immutable assets from the existing service worker cache, and the duplicated `android/app/src/main/assets/www/` tree SHALL be removed rather than regenerated.

---

## 4. BDD Acceptance Criteria

Cada escenario declara el requisito que verifica. Un requisito sin escenario y un escenario sin requisito son ambos defectos de esta especificación.

```gherkin
Feature: Continuidad de publicación y configuración canónica

  # REQ-CAP-01, REQ-CAP-02, REQ-CAP-13
  Scenario: El proyecto Android regenerado conserva su identidad publicable
    Given the regenerated Capacitor Android project
    When the build configuration is inspected
    Then applicationId must be "cl.ubb.centroestudio"
    And versionCode must be greater than 13
    And a release signingConfig backed by keystore.properties must exist
    And google-services.json must declare package_name "cl.ubb.centroestudio"

  # REQ-CAP-14
  Scenario: El CSP admite el bridge sin relajar ninguna otra directiva
    Given the deployed portal response headers
    When the Content-Security-Policy is inspected
    Then "capacitor://localhost" and "https://localhost" must appear in default-src, script-src and connect-src
    And no directive outside those three may differ from the pre-migration policy

  # REQ-CAP-16
  Scenario: Los App Links verificados siguen abriendo la app
    Given the published release signing fingerprint
    When /.well-known/assetlinks.json is fetched from ceoubb.com
    Then it must list package_name "cl.ubb.centroestudio" with that SHA-256 fingerprint
    And the Android manifest must retain the verified intent-filter for ceoubb.com and www.ceoubb.com

  # REQ-CAP-03
  Scenario: El proyecto iOS existe como scaffold no compilado
    Given a Windows development environment
    When the repository is inspected after migration
    Then an ios/ Capacitor target must be versioned
    And it must not be part of this phase's Definition of Done

Feature: Autenticación en el shell nativo

  # REQ-CAP-12
  Scenario: Inicio de sesión institucional dentro de la app
    Given a student with email "alumno@alumnos.ubiobio.cl" on the native shell
    When they tap "Ingresar con cuenta UBB"
    Then the native Google Sign-In sheet must appear (not a WebView popup)
    And the resulting credential must be exchanged via signInWithCredential
    And the derived role must come from roleForEmail

  # REQ-CAP-12b
  Scenario: Rechazo de dominio no institucional en la app
    Given a user signing in with "alguien@gmail.com" on the native shell
    When the native credential is returned
    Then the session must be terminated
    And the rejection message must match the web portal's

Feature: Shell móvil y ergonomía

  # REQ-CAP-04, REQ-CAP-07
  Scenario: Arranque de la app nativa
    Given a mobile user launching the native shell
    When the application mounts
    Then the status bar must use the UBB palette
    And the bottom navigation must expose: Inicio, Cursos, Calendario, Biblioteca
    And desktop header chrome must not be rendered
    And content must clear the bottom safe-area inset

  # REQ-CAP-06
  Scenario: Cambio de pestaña con háptica
    Given the user is on "Inicio"
    When they tap "Cursos"
    Then a light haptic impact must fire via Capacitor Haptics
    And the "Cursos" tab must show the active indicator

  # REQ-CAP-05
  Scenario: Detalle de curso como bottom sheet
    Given an enrolled student on the courses list
    When they tap a course card
    Then a bottom sheet must slide up
    And dragging it downward past its dismiss threshold must close it

  # REQ-CAP-15
  Scenario: Botón atrás de Android
    Given the user is two levels deep inside "Cursos"
    When the hardware back button is pressed
    Then the app must navigate one level back
    And pressing it again at the root tab must background the app, not blank the WebView

  # REQ-CAP-15
  Scenario: Enlace externo
    Given a post containing a link to an external domain
    When the user taps it
    Then it must open in the system browser
    And the app WebView must stay on ceoubb.com

Feature: Servicios nativos

  # REQ-CAP-10
  Scenario: Registro de push
    Given an authenticated student on the native app
    When notification permission is requested and granted
    Then a valid FCM token must be obtained
    And it must be written to users/{uid}.fcmToken

  # REQ-CAP-10b
  Scenario: Permiso de notificaciones denegado
    Given a student who denies the POST_NOTIFICATIONS prompt
    When the app continues
    Then navigation must remain fully usable
    And the prompt must not reappear on the next launch

  # REQ-CAP-18
  Scenario: La regla de fcmToken no amplía ninguna otra
    Given the deployed Firestore rules
    When an authenticated user writes users/{uid} with only the fcmToken field
    Then the write must succeed for their own document
    And the same write against another uid must be denied
    And a write to any field other than fcmToken must be denied

  # REQ-CAP-11
  Scenario: Apertura de un PDF académico
    Given a student on the native shell opening a study guide
    When the download completes via Capacitor Filesystem
    Then the file must be handed off to the native viewer
    And the app WebView must not attempt to render the PDF inline

  # REQ-CAP-19
  Scenario: Biblioteca disponible sin conexión
    Given a student who has opened the library at least once
    When the device goes offline and the app is reopened
    Then /biblioteca/index.html must render from the service worker cache

Feature: Rendimiento en gama baja

  # REQ-CAP-08, REQ-CAP-09
  Scenario: Feed extenso en dispositivo económico
    Given a section feed with 120 posts on a low-end Android device
    When the feed is scrolled top to bottom
    Then the active DOM must stay under 1500 nodes
    And no CSS rule applied in the mobile viewport may use backdrop-filter
```

---

## 5. Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                    Capacitor Native Layer                   │
│   @capacitor/core · android (GA) · ios (scaffold)           │
│   PushNotifications · Haptics · StatusBar · Filesystem      │
│   Browser · App (back button) · FirebaseAuthentication      │
└──────────────────────────────┬──────────────────────────────┘
                               │  bridge JS (CSP: capacitor://localhost)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Shell Layer                      │
│   lib/mobile-bridge.ts  — plataforma, hápticos, status bar  │
│                           (no-op seguro en web)             │
│   useIsMobileApp()      — Capacitor.isNativePlatform()      │
│   MobileBottomNav       — thumb zone + safe areas           │
│   MobileSheet (vaul)    — modales móviles                   │
│   content-visibility    — listas largas sin dependencias    │
└──────────────────────────────┬──────────────────────────────┘
                               │  https://ceoubb.com (remote-first)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      CEOUBB Web Core                        │
│   Next.js 16 App Router · React 19 · Tailwind 4             │
│   lib/access-policy.ts · lib/grades.ts · Firebase Client    │
│   public/sw.js — cobertura offline de /biblioteca           │
└─────────────────────────────────────────────────────────────┘
```

**Frontera de autenticación:** `lib/firebase-client.ts` expone un único punto de entrada que ramifica por `Capacitor.isNativePlatform()`: credencial nativa en la app, `signInWithPopup` en navegador. Ambas ramas terminan en el mismo `User` de Firebase y en `roleForEmail`; ningún parsing de dominio se duplica en la capa nativa.

---

## 6. Plan de Ejecución (DAG)

Orden estricto. La carpeta `android/` legacy **no se borra hasta que el proyecto nuevo arranca**; el respaldo es una rama Git, no una copia manual de archivos.

Reglas de ejecución (skill `spec-driven-development` §6):
- Una tarea a la vez. La casilla `[x]` se marca **solo** después de que su comando de verificación pasa.
- Todo archivo creado o reescrito por una tarea lleva `// Implements: REQ-CAP-XX` sobre la unidad exportada, el route handler, el bloque de reglas o el esquema que introduce. No se retrofitea código legacy intacto.
- Si un test falla: corregir código, o corregir el test si no refleja el escenario BDD. Si el test contradice la especificación, **detenerse** y pedir enmienda. Nunca debilitar una aserción.

### Fase 0 — Red de seguridad

- [x] **TASK-01:** Crear la rama `claude/capacitor-migration` y etiquetar el estado legacy (`git tag android-legacy-v13`). El respaldo de `google-services.json`, `AndroidManifest.xml`, `build.gradle` y `assets/www` queda garantizado por el historial, no por copias en `.cache/`. *(REQ-CAP-02, REQ-CAP-13, REQ-CAP-16)*
      Verificación: `git show android-legacy-v13:android/app/google-services.json | head -5`

### Fase 1 — Runtime Capacitor

- [x] **TASK-02:** Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/push-notifications`, `@capacitor/filesystem`, `@capacitor/browser`, `@capacitor/app`, `@capacitor-firebase/authentication`, `vaul`. *(REQ-CAP-01, REQ-CAP-06, REQ-CAP-12, REQ-CAP-15)*
      Verificación: `pnpm exec cap --version`
- [x] **TASK-03:** Crear `capacitor.config.ts` y el documento de fallback offline que sirve de `webDir` (`capacitor/www/index.html`). Sin un `webDir` existente, `cap add` falla. *(REQ-CAP-01)*
      Verificación: `pnpm exec cap doctor`
- [x] **TASK-04:** Extender el CSP de `next.config.ts` con los orígenes del bridge, sin tocar ninguna otra directiva. *(REQ-CAP-14)*
      Verificación: `pnpm run build` y `node --test tests/rendered-html.test.mjs`

### Fase 2 — Proyecto Android publicable

- [x] **TASK-05:** Eliminar `android/` y ejecutar `pnpm exec cap add android`. *(REQ-CAP-02)*
      Verificación: `pnpm exec cap doctor android`
- [x] **TASK-06:** Reaplicar sobre el proyecto generado: `google-services.json`, `signingConfigs.release` desde `keystore.properties`, `versionCode 14`, `versionName '1.1.0'`, `minSdk 26`, el `intent-filter` de App Links verificados y el permiso `POST_NOTIFICATIONS`. *(REQ-CAP-13, REQ-CAP-16)*
      Verificación: `node --test tests/capacitor-config.test.ts`
- [x] **TASK-07:** Publicar `/.well-known/assetlinks.json` con la huella SHA-256 de la clave de release. *(REQ-CAP-16)*
      Verificación: `node --test tests/capacitor-config.test.ts` (caso assetlinks) y `pnpm run build`
- [x] **TASK-08:** Ejecutar `pnpm exec cap add ios` y versionarlo como scaffold no compilado; documentar en `PLAN.md` los tres bloqueadores externos de §2.3. *(REQ-CAP-03)*
      Verificación: `pnpm exec cap doctor ios` (se admite el fallo de toolchain macOS; el proyecto debe existir)

### Fase 3 — Puente y autenticación

- [x] **TASK-09:** Crear `lib/mobile-bridge.ts`: detección de plataforma (`useIsMobileApp`), hápticos y status bar, con degradación silenciosa en web. *(REQ-CAP-04, REQ-CAP-06, REQ-CAP-07)*
      Verificación: `pnpm run typecheck && pnpm run test:unit`
- [x] **TASK-09b:** Añadir al bridge la navegación nativa: botón atrás de Android por historial con salida solo desde pestaña raíz, y apertura de enlaces externos en `@capacitor/browser`. *(REQ-CAP-15)*
      Verificación: `pnpm run typecheck && pnpm run test:unit`
- [x] **TASK-10:** Ramificar el inicio de sesión en `lib/firebase-client.ts` hacia credencial nativa en shell Capacitor, conservando `signInWithPopup` en navegador y delegando siempre el rol en `roleForEmail`. *(REQ-CAP-12, REQ-CAP-12b)*
      Verificación: `node --test tests/access-policy.test.ts`

### Fase 4 — Capa de UI móvil

- [x] **TASK-11:** Implementar `MobileBottomNav` con iconos `@phosphor-icons/react`, safe areas e indicador activo; alinear `theme_color` del manifest a `#0055b8` (hoy `#0057a4`, desalineado del token de `design-ceoubb.md`). *(REQ-CAP-04, REQ-CAP-07)*
      Verificación: `pnpm run lint && pnpm run typecheck && node --test tests/rendered-html.test.mjs`
- [x] **TASK-12:** Integrar bottom sheets `vaul` en detalle de asignatura, desglose de notas y selector de archivos. *(REQ-CAP-05)*
      Verificación: `pnpm run lint && pnpm run typecheck`
- [x] **TASK-13:** Eliminar los 6 usos de `backdrop-filter` en viewport móvil y aplicar `content-visibility: auto` a las filas de feed. *(REQ-CAP-08, REQ-CAP-09)*
      Verificación: `node --test tests/mobile-performance-budget.test.ts`

### Fase 5 — Servicios nativos

- [x] **TASK-14:** Implementar `registerPushNotifications()` con manejo explícito del permiso denegado y persistencia de `users/{uid}.fcmToken`. *(REQ-CAP-10, REQ-CAP-10b)*
      Verificación: `pnpm run typecheck && pnpm run test:unit`
- [x] **TASK-15:** Ajustar `firebase/firestore.rules` para permitir escritura de `fcmToken` únicamente sobre el documento propio, sin ampliar ninguna otra regla. *(REQ-CAP-18)*
      Verificación: revisión del diff de reglas + `pnpm run check:functions`
- [x] **TASK-16:** Descarga y apertura de PDFs con `@capacitor/filesystem` y visor nativo. *(REQ-CAP-11)*
      Verificación: `pnpm run typecheck && pnpm run lint`
- [x] **TASK-17:** Confirmar la cobertura offline de `/biblioteca` por service worker y eliminar definitivamente el árbol duplicado `assets/www` del historial activo. *(REQ-CAP-19)*
      Verificación: `pnpm run build && node --test tests/rendered-html.test.mjs`; el árbol `android/app/src/main/assets/www/` no debe existir

### Fase 6 — Verificación y cierre

- [x] **TASK-18:** Suite completa en verde.
      Verificación: `pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm test`
- [ ] **TASK-19:** Verificación manual en dispositivo Android real (checklist §7.2), con AAB firmado instalado.
      Verificación: checklist §7.2 completo, con evidencia registrada en `PLAN.md`
      **Pendiente — no ejecutable por el agente.** El entorno de desarrollo no tiene Android SDK ni dispositivo: `assembleDebug` y `bundleRelease` nunca se corrieron. Registrado en `PLAN.md` como trabajo activo.
- [x] **TASK-20:** Auditoría de trazabilidad y cierre: cada `REQ-CAP-XX` tiene al menos un marcador `Implements:` en el árbol; actualizar `PLAN.md` con estado y deuda declarada (kill-switch de versión, iOS diferido, virtualización condicionada) y archivar en `PLAN_ARCHIVE.md`.
      Verificación: `git grep -o "REQ-CAP-[0-9]*b\?" -- '*.ts' '*.tsx' '*.rules' | sort -u` cubre todos los REQ de §3

---

## 7. Definition of Done

### 7.1 Automatizable (obligatorio)

1. `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit` y `pnpm test` en verde, sin advertencias nuevas.
2. `tests/capacitor-config.test.ts` (nuevo) verifica: `appId === 'cl.ubb.centroestudio'`, `versionCode > 13`, `package_name` de `google-services.json` coincidente y presencia del `signingConfig` de release.
3. `tests/mobile-performance-budget.test.ts` (nuevo) verifica: cero ocurrencias de `backdrop-filter` bajo media queries móviles y presencia de `content-visibility` en las filas de feed.
4. Los tests existentes de `access-policy` y `grades` pasan **sin modificación alguna** de sus aserciones.
5. Cada escenario BDD de §4 mapea a una aserción automatizada que pasa, o queda explícitamente asignado al checklist manual de §7.2.
6. Cada `REQ-CAP-XX` de §3 tiene al menos un marcador `// Implements:` en el árbol (TASK-20), y ningún módulo nuevo carece de marcador.
7. Esta especificación viaja en el mismo diff que el código que la implementa, y su `Status` avanza a `VERIFICADA` al cerrar.

### 7.2 Verificación manual en dispositivo (obligatorio antes de publicar)

Inicio de sesión institucional nativo · rechazo de dominio ajeno · botón atrás en tres niveles · enlace externo al navegador del sistema · permiso de notificación concedido y denegado · biblioteca en modo avión · scroll del feed sin saltos visibles · apertura de un PDF.

### 7.3 No es DoD de esta fase

Compilación, firma, push y publicación de iOS (§2.3).

---

## 8bis. Enmiendas durante la ejecución

### E1 — El espejo nativo de dominios baja de 5 superficies a 4

**Contradicción encontrada (TASK-05).** `AGENTS.md` declara cinco superficies sincronizadas de la política de roles, dos de ellas en `android/`. `tests/access-policy.test.ts` leía `android/app/src/main/java/cl/ubb/centroestudio/ClassroomService.java` para comprobar que la capa nativa reconocía `@alumnos.ubiobio.cl` y `@ubiobio.cl`. Ese archivo es exactamente el parser de dominios que REQ-CAP-12 elimina —«la capa nativa no parsea dominios»— y no sobrevive a `cap add android`. El §7.1.4 prohíbe tocar las aserciones de ese test.

**Resolución aprobada por el mantenedor.** `DOMAIN_SURFACES` pasa a `firestore.rules` + `storage.rules`. El cuerpo de las aserciones no cambia: sólo se retira la ruta de un archivo que ya no existe. `android/app/src/main/res/values/firebase.xml` sobrevive intacto como espejo de las cuentas owner (`OWNER_SURFACES` no cambia). `AGENTS.md` queda actualizado a cuatro espejos.

**Por qué es mejor postura, no una relajación.** Antes existían dos copias del parser de dominios en Java; ahora sólo `roleForEmail` decide, y las reglas de Firebase lo replican del lado servidor. Una copia menos que pueda desincronizarse en silencio.

### E2 — Cadena de herramientas Gradle

Para cumplir el piso de `targetSdk 36` que Play exige desde agosto de 2026, AGP sube de 8.7.2 (plantilla de Capacitor 7) a 8.10.1 y `compileSdk`/`targetSdk` a 36, sobre el wrapper Gradle 8.11.1 que trae la plantilla. Sin Android SDK en el entorno, esa combinación **no está compilada**; es la primera línea del checklist de TASK-19.

---

## 8. Historial de versiones

| Versión | Cambio |
|---|---|
| v1 | Propuesta inicial (14 tareas). No ejecutable: cinco bloqueadores (§0.1). |
| v2 | Bloqueadores formalizados como REQ-CAP-12…19; REQ-CAP-03 degradado a scaffold iOS; REQ-CAP-08 reescrito como presupuesto medible; REQ-CAP-17 retirado; respaldo por tag Git; `@tanstack/react-virtual` condicionado a medición. |
| v3 | Auditada contra la skill `spec-driven-development` v3.0.0: invariantes de `AGENTS.md` tabulados (§2.1), escenarios BDD trazados a su requisito y añadidos los que faltaban (CSP, App Links, regla `fcmToken`, PDF, scaffold iOS), comando de verificación en las 21 tareas, TASK-09 dividida, marcadores `Implements:` exigidos y auditados en TASK-20. |
