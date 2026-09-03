# GATES.md — Acceptance Gates & Quality Invariants Protocol (Tree 3 Cybersecurity Audit)

> **AUDIT RUNNER:** Antigravity Principal Application Security Architect & Lead Penetration Tester  
> **DISCIPLINE:** `/improve` (Read-only on source code) & `/unlazy tree 3`  
> **TARGET REPO:** `CEOUBB` (`cl.ubb.centroestudio` / `centro-de-estudio-ubb`)  
> **STATUS:** CYBERSECURITY AUDIT COMPLETE — REMEDIATION PLANS 050–059 COMPILED & VERIFIED

---

## 1. Branch 1: Identity, Authentication & Role Derivation

### 1.1 `leaf-sec-auth-lifecycle`
- **OWNS:** `app/api/auth/dev-login/route.ts`, `app/api/auth/firebase/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`, `lib/auth.ts`, `lib/auth-dev.ts`, `tests/dev-auth.test.ts`
- **CHECK:** Auditar la derivación de sesiones, expiración de tokens, validación de dominios institucionales (`@ubiobio.cl`, `@alumnos.ubiobio.cl`), restricciones de acceso de depuración (`isDevOrPreviewAuthAllowed`) y eliminación de cuentas.
- **EXPECT:** Veto incondicional de dev-login en producción (`ceoubb.com`); bloqueo absoluto de eliminación de cuenta owner; expiración criptográfica y sanitización de cookies con atributos `HttpOnly; Secure; SameSite=Lax`.
- **STATUS:** ⚠️ **GATED & FLAGGED** — Hallazgo crítico detectado: Bypass de autenticación en entorno staging (`isDevOrPreviewAuthAllowed` permite login sin credenciales en `staging.ceoubb.com` y `*.workers.dev`). Identificado riesgo de violación de integridad referencial en `DELETE /api/auth/me`. Ver [Plan 051](plans/051-sec-turso-foreign-keys-cascade.md).

### 1.2 `leaf-sec-role-synchronization`
- **OWNS:** `lib/access-policy.ts`, `app/api/admin/users/route.ts`, `lib/services/enrollment-projection.ts`, `tests/access-policy.test.ts`, `tests/admin-api.test.ts`
- **CHECK:** Auditar la sincronización trans-store entre Turso (`users.role`) y Firestore (`users/{uid}.role`), transacciones de cambio de rol administrativo (`PATCH /api/admin/users`), y consistencia de las cuatro fuentes de verdad (SSOT).
- **EXPECT:** Cero desincronizaciones entre Turso y Firestore; compensación atómica (rollback) en Turso si la proyección a Firestore falla; prohibición estricta de degradación o eliminación de la cuenta `owner`.
- **STATUS:** ⚠️ **GATED & FLAGGED** — Desincronización trans-store identificada en `PATCH /api/admin/users` (líneas 143-151): si `projectUserRoleToFirestore` falla tras mutar Turso, Turso retiene el rol actualizado mientras Firestore conserva el antiguo sin mecanismo de rollback. Ver [Plan 052](plans/052-sec-trans-store-role-sync.md).

---

## 2. Branch 2: Persistence, Relational Integrity & Cloud Data

### 2.1 `leaf-sec-turso-relational-integrity`
- **OWNS:** `db/schema.ts`, `db/index.ts`, `drizzle/`, `tests/helpers/db-harness.ts`, `app/api/auth/me/route.ts`
- **CHECK:** Auditar la integridad referencial en SQLite/Turso, cláusulas `ON DELETE CASCADE` / `ON DELETE SET NULL`, activación forzosa de `PRAGMA foreign_keys = ON`, límites en queries y cursores indexados.
- **EXPECT:** Cero violaciones de claves foráneas en cascada; todas las relaciones con `users.id` deben definir comportamiento determinista ante eliminación; paridad estricta entre pruebas y producción.
- **STATUS:** ✅ **SUPERADA & MITIGADA** — Integridad referencial asegurada con `{ onDelete: 'set null' }` y `{ onDelete: 'cascade' }` en `db/schema.ts` y `db/interop-schema.ts`. `DELETE /api/auth/me` valida titularidad de secciones docentes (409) y desvincula referencias previas a la eliminación. Migración generada en `drizzle/`. Resuelto en Plan 051.

### 2.2 `leaf-sec-firestore-security-rules`
- **OWNS:** `firebase/firestore.rules`, `firebase/firestore.indexes.json`, `tests/firebase-rules.test.ts`, `tests/integration/firebase-rules.test.ts`
- **CHECK:** Auditar cobertura de reglas declarativas de Firestore, aislamiento por sección (`enrollments/{uid}/sections/{seccionId}`), validación de esquemas de datos entrantes (`hasOnly`, tipos, longitud) y ausencia de comodines globales (`match /{path=**}`).
- **EXPECT:** 100% de operaciones de escritura y lectura aisladas; esquema estricto en creación y actualización de perfiles; ausencia total de lectura libre entre secciones.
- **STATUS:** ✅ **SUPERADA & MITIGADA** — Esquema estricto implementado en `firebase/firestore.rules` para `match /users/{userId}` con `keys().hasOnly(...)` validando campos canónicos (`uid`, `teacherRequested`, etc.) y `validCalendarEventShape()` acotando tipos, longitud y valores permitidos en `calendar_events`. Resuelto en Plan 054.

---

## 3. Branch 3: Object Storage & Content Ingestion

### 3.1 `leaf-sec-storage-content-security`
- **OWNS:** `firebase/storage.rules`, `docs/specs/p20-firebase-rules-emulator-suite.md`
- **CHECK:** Auditar reglas de Firebase Storage en rutas de materiales (`/courses/{courseId}/...`), entregas de estudiantes (`/submissions/...`) y avatares (`/avatars/...`), verificando límites de tamaño y tipos MIME permitidos.
- **EXPECT:** Prohibición absoluta de tipos ejecutables o interpretables en el navegador (`text/html`, `image/svg+xml`, `application/xhtml+xml`); techos de tamaño de 2 MB (avatares), 25 MB (entregas) y 50 MB (materiales).
- **STATUS:** ✅ **SUPERADA & MITIGADA** — Whitelist académica estricta `isAllowedAcademicMimeType()` implementada en `firebase/storage.rules`, prohibiendo explícitamente HTML, SVG, scripts y ejecutables en `/courses/...` y `/submissions/...`. Resuelto en Plan 053.

### 3.2 `leaf-sec-file-upload-validation`
- **OWNS:** `app/api/profile/photo/route.ts`, `lib/services/user-profile.ts`, `tests/user-settings.test.ts`
- **CHECK:** Auditar validación en el servidor de archivos subidos por usuarios (avatares), inspección de encabezados HTTP vs contenido binario real (magic bytes / firmas de archivo) y aislamiento de rutas de subida.
- **EXPECT:** Validación basada en firmas binarias (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF...WEBP`); rechazo inmediato de extensiones falsificadas o content-types manipulados por el cliente.
- **STATUS:** ⚠️ **GATED & FLAGGED** — Subida insegura de archivos por spoofing de Content-Type: `POST /api/profile/photo` confía ciegamente en `file.type` enviado por el navegador sin inspeccionar los primeros bytes del buffer. Ver [Plan 057](plans/057-sec-avatar-magic-bytes-validation.md).

---

## 4. Branch 4: Cloud Functions & Serverless Backend

### 4.1 `leaf-sec-cloud-functions-authorization`
- **OWNS:** `firebase/functions/index.js`, `firebase/functions/grade-audit.js`, `firebase/functions/quiz-engine.js`
- **CHECK:** Auditar funciones callable de Firebase Functions (`publishQuiz`, `saveAuditedStudentScores`, `saveAuditedGradebook`, `deleteMyAccount`, `notifyStudentsOnCoursePost`), verificación de autenticación, App Check y autorización de roles.
- **EXPECT:** Ninguna cuenta `owner` puede ser eliminada mediante callable functions; validación estricta de permisos de sección antes de cualquier mutación; manejo de errores mediante `HttpsError`.
- **STATUS:** ✅ **SUPERADA & MITIGADA** — Protección de cuenta `owner` institucional implementada en `deleteMyAccount` (`firebase/functions/index.js`). La función callable consulta `users/{uid}` y rechaza con `failed-precondition` si `role === 'owner'`. Resuelto en Plan 050.

### 4.2 `leaf-sec-cloudflare-edge-waf`
- **OWNS:** `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`, `proxy.ts`
- **CHECK:** Auditar configuración de Cloudflare Workers, encabezados de seguridad (CSP, HSTS, X-Content-Type-Options, Referrer-Policy), bindings, variables públicas vs secretas y exposición de subdominios `workers.dev`.
- **EXPECT:** Desactivación de `workers_dev: true` en producción para obligar a que todo el tráfico pase por el WAF de zona (`ceoubb.com`); aislamiento de entornos preview y staging; cabeceras HTTP de hardening inyectadas.
- **STATUS:** ✅ **SUPERADA & MITIGADA** — `workers_dev: false` y `preview_urls: false` configurados en la raíz de producción de `wrangler.jsonc`, garantizando que el tráfico pase por el WAF institucional (`ceoubb.com`). Ruta `/api/sentry-test` protegida exclusivamente para rol owner en no-producción. Resuelto en Plan 056.

---

## 5. Branch 5: External Bridges, Bots & AI Workflows

### 5.1 `leaf-sec-discord-command-execution`
- **OWNS:** `scripts/discord-antigravity-bridge.js`, `scripts/discord-agent-bridge.js`, `scripts/discord-context-helper.js`, `scripts/register-discord-commands.js`
- **CHECK:** Auditar la ejecución de comandos del sistema operativo (`child_process.exec`, `execFile`, `spawn`) invocados por herramientas de Discord y Gemini, validación de parámetros y sanitización de entrada.
- **EXPECT:** Cero concatenación de cadenas en subshells de sistema; uso exclusivo de APIs parametrizadas con argumentos tipados; validación de identificadores de usuario autorizados.
- **STATUS:** ✅ **SUPERADA & MITIGADA** — Inyección de comandos en `scripts/discord-antigravity-bridge.js` neutralizada mediante migración a `safeGitCommand` (`execFile` con `shell: false`), acotamiento estricto de enteros en `parsedCount` y eliminación de subshells. Resuelto en Plan 055.

### 5.2 `leaf-sec-ai-prompt-injection-defense`
- **OWNS:** `lib/discord/pr-reviewer.ts`, `lib/discord/gemini-copilot.ts`, `app/api/cron/standup/route.ts`, `app/api/discord/interactions/route.ts`
- **CHECK:** Auditar la concatenación de datos no confiables (títulos de PRs, diffs de código, mensajes de commit, comentarios de usuarios) dentro de los prompts del sistema para Gemini, evaluar mitigaciones contra Prompt Injection indirecto.
- **EXPECT:** Enmarcado estricto de contenido no confiable con etiquetas de delimitación XML/Markdown; instrucciones de sistema inmutables; sanitización de caracteres de escape de prompt.
- **STATUS:** ⚠️ **GATED & FLAGGED** — Prompt Injection indirecto en `lib/discord/pr-reviewer.ts` (líneas 48-70) y `app/api/cron/standup/route.ts` (líneas 115-120). Datos externos no confiables (diffs y títulos de PRs) se inyectan sin delimitadores ni neutralización de instrucciones adversariales. Ver [Plan 058](plans/058-sec-discord-pr-prompt-injection.md).

---

## 6. Branch 6: Operational Security, Concurrency & Third-Party Dependencies

### 6.1 `leaf-sec-session-concurrency-hygiene`
- **OWNS:** `lib/auth.ts`, `app/api/cron/audit-retention/route.ts`, `app/api/cron/standup/route.ts`
- **CHECK:** Auditar control de concurrencia de sesiones de usuario, acumulación de sesiones huérfanas en Turso, periodicidad de ejecución de `pruneExpiredSessions()` y autenticación de endpoints cron (`CRON_SECRET`).
- **EXPECT:** Límite máximo de sesiones concurrentes por usuario (evitar saturación de la tabla `sessions`); poda periódica automatizada de sesiones caducadas; comparación en tiempo constante (`timingSafeEqual`) en crons.
- **STATUS:** ⚠️ **GATED & FLAGGED** — Inexistencia de límite de concurrencia de sesiones en `lib/auth.ts:29-42` y código muerto de limpieza (`pruneExpiredSessions()` nunca se ejecuta en runtime, solo en tests). Permite agotamiento de recursos y bloat en Turso. Ver [Plan 059](plans/059-sec-session-concurrency-dependency-audit.md).

### 6.2 `leaf-sec-supply-chain-dependencies`
- **OWNS:** `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `.github/workflows/semgrep.yml`
- **CHECK:** Auditar vulnerabilidades conocidas en dependencias directas y transitivas (`pnpm audit`), pinning de dependencias en lockfile, integridad de scripts post-install y escaneos SAST continuos.
- **EXPECT:** Cero vulnerabilidades críticas o de alto impacto en dependencias de producción; verificación de hashes en lockfile; pipeline SAST activo bloqueando merges inseguros.
- **STATUS:** ⚠️ **GATED & FLAGGED** — Avisos de dependencias obsoletas y advertencias de configuración en pnpm (bloque `pnpm.patchedDependencies` ignorado por versiones modernas). Requiere auditoría de cadena de suministro y actualización controlada en [Plan 059](plans/059-sec-session-concurrency-dependency-audit.md).
