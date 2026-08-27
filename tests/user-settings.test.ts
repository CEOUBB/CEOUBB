import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { users } from "../db/schema.ts";
import {
  AVATAR_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  avatarPublicUrl,
  avatarStoragePath,
  defaultPreferences,
  firebaseUid,
  preferencesSchema,
} from "../lib/services/user-profile.ts";

function source(relative: string): string {
  return readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("REQ-CFG-02: users guarda photo_url como columna de texto anulable y sin valor por defecto", () => {
  const column = getTableConfig(users).columns.find((item) => item.name === "photo_url");
  assert.ok(column, "falta la columna photo_url en la tabla users");
  assert.equal(column.notNull, false);
  assert.equal(column.hasDefault, false);
  const migration = source("drizzle/0010_users_photo_url.sql");
  assert.match(migration, /ALTER TABLE `users` ADD `photo_url` text;/);
  assert.doesNotMatch(migration, /UPDATE|INSERT/i);
  const journal = JSON.parse(source("drizzle/meta/_journal.json")) as {
    entries: { tag: string }[];
  };
  assert.ok(journal.entries.some((entry) => entry.tag === "0010_users_photo_url"));
});

test("REQ-CFG-02: la ruta de almacenamiento del avatar cuelga del propio usuario", () => {
  assert.equal(avatarStoragePath("abc123", "image/png"), "avatars/abc123/profile.png");
  assert.equal(avatarStoragePath("abc123", "image/jpeg"), "avatars/abc123/profile.jpg");
  assert.equal(avatarStoragePath("abc123", "image/webp"), "avatars/abc123/profile.webp");
  assert.throws(() => avatarStoragePath("abc/../otro", "image/png"));
  assert.throws(() => avatarStoragePath("", "image/png"));
  assert.throws(() => avatarStoragePath("abc123", "image/gif"));
  assert.match(avatarPublicUrl("avatars/abc123/profile.png"), /avatars%2Fabc123%2Fprofile\.png/);
  assert.equal(firebaseUid("firebase:abc123"), "abc123");
});

test("REQ-CFG-02: la ruta de foto valida tipo y tamaño antes de escribir nada", () => {
  const route = source("app/api/profile/photo/route.ts");
  assert.match(route, /z\.enum\(AVATAR_CONTENT_TYPES\)/);
  assert.match(route, /\.max\(AVATAR_MAX_BYTES/);
  assert.equal(AVATAR_MAX_BYTES, 2 * 1024 * 1024);
  assert.deepEqual([...AVATAR_CONTENT_TYPES], ["image/png", "image/jpeg", "image/webp"]);
  // La subida y la escritura sólo ocurren después del `safeParse` correcto.
  const validationIndex = route.indexOf("if (!parsed.success)");
  assert.ok(validationIndex > 0);
  assert.ok(route.indexOf("uploadAvatarObject(") > validationIndex);
  assert.ok(route.indexOf("db.update(users)") > validationIndex);
  assert.match(route, /status: 422/);
  assert.match(route, /getSessionUser\(request\)/);
  assert.match(route, /status: 401/);
});

test("REQ-CFG-03: restablecer limpia la columna, la proyección y el objeto almacenado", () => {
  const route = source("app/api/profile/photo/route.ts");
  const del = route.slice(route.indexOf("export async function DELETE"));
  assert.match(del, /deleteAvatarObject\(/);
  assert.match(del, /set\(\{ photoUrl: null \}\)/);
  assert.match(del, /projectUserPhotoToFirestore\(actor\.id, null\)/);
  // Nunca se copia la URL de Google a la base: puede rotar y quedaría congelada.
  assert.doesNotMatch(del, /googleusercontent/);
  const avatar = source("app/portal-ui.tsx");
  assert.match(avatar, /const photo = photoUrl \|\| googlePhoto;/);
});

test("REQ-CFG-04: el esquema de preferencias es cerrado en canales y en valores", () => {
  const valid = defaultPreferences();
  assert.equal(preferencesSchema.safeParse(valid).success, true);
  for (const channel of Object.keys(valid.channels)) {
    assert.deepEqual(valid.channels[channel as keyof typeof valid.channels], {
      web: true,
      push: true,
    });
  }
  assert.equal(valid.reducedMotion, false);

  const desconocido = {
    ...valid,
    channels: { ...valid.channels, canalInventado: { web: true, push: true } },
  };
  assert.equal(preferencesSchema.safeParse(desconocido).success, false);

  const noBooleano = {
    ...valid,
    channels: { ...valid.channels, gradeChanges: { web: "sí", push: true } },
  };
  assert.equal(preferencesSchema.safeParse(noBooleano).success, false);

  const faltante = { ...valid, channels: { ...valid.channels, gradeChanges: { web: true } } };
  assert.equal(preferencesSchema.safeParse(faltante).success, false);
  assert.equal(preferencesSchema.safeParse({ ...valid, reducedMotion: 1 }).success, false);
});

test("REQ-CFG-04: la ruta de preferencias rechaza con 422 y no persiste", () => {
  const route = source("app/api/profile/preferences/route.ts");
  assert.match(route, /preferencesSchema\.safeParse\(payload\)/);
  const validationIndex = route.indexOf("if (!parsed.success)");
  assert.ok(validationIndex > 0);
  assert.ok(route.indexOf("writePreferencesToFirestore(") > validationIndex);
  assert.match(route, /status: 422/);
  assert.match(route, /getSessionUser\(request\)/);
});

test("REQ-AUTH-08: el listado de sesiones es acotado, indexado y sin vencidas", () => {
  const route = source("app/api/profile/sessions/route.ts");
  assert.match(route, /eq\(sessions\.userId, actor\.id\)/);
  assert.match(route, /gt\(sessions\.expiresAt, now\)/);
  assert.match(route, /\.limit\(MAX_ACTIVE_SESSIONS\)/);
  assert.match(route, /current: row\.tokenHash === currentHash/);
  // El hash del token nunca sale del servidor: la interfaz recibe el derivado.
  assert.doesNotMatch(route, /tokenHash: row\.tokenHash,\s*\n\s*createdAt/);
  assert.match(route, /id: await sessionPublicId\(row\.tokenHash\)/);
});

test("REQ-AUTH-08: revocar una sesión ajena responde 403 y no borra", () => {
  const route = source("app/api/profile/sessions/route.ts");
  const del = route.slice(route.indexOf("export async function DELETE"));
  const guardIndex = del.indexOf(
    'if (!target) return Response.json({ error: "Acceso restringido." }, { status: 403 })'
  );
  assert.ok(guardIndex > 0, "falta la guardia de pertenencia antes del borrado");
  assert.ok(del.indexOf("db.delete(sessions)") > guardIndex);
  assert.match(del, /eq\(sessions\.userId, actor\.id\)/);
});

test("REQ-CFG-04: las reglas dejan las preferencias de sólo lectura para el cliente", () => {
  const rules = source("firebase/firestore.rules");
  const block = rules.slice(rules.indexOf("match /settings/{documentId}"));
  assert.match(block.slice(0, 220), /allow read: if signedIn\(\) && request\.auth\.uid == userId;/);
  assert.match(block.slice(0, 220), /allow write: if false;/);
  assert.doesNotMatch(rules, /match \/\{path=\*\*\}/);
});

test("REQ-CFG-02: las reglas de Storage acotan el avatar al propio prefijo", () => {
  const rules = source("firebase/storage.rules");
  const block = rules.slice(
    rules.indexOf("match /avatars/{userId}/{fileName}"),
    rules.indexOf("// Material del curso publicado")
  );
  assert.match(block, /request\.auth\.uid == userId/);
  assert.match(block, /request\.resource\.size <= 2 \* 1024 \* 1024/);
  assert.match(block, /contentType\.matches\('\^image\/\(png\|jpeg\|webp\)\$'\)/);
  assert.doesNotMatch(block, /allow read, write: if signedIn\(\);/);
});

test("REQ-CFG-01: Configuración vive en el menú de cuenta y abre la pantalla del portal", () => {
  const shell = source("app/portal-shell.tsx");
  const popover = shell.slice(shell.indexOf('className="account-popover"'));
  const settingsIndex = popover.indexOf("Configuración");
  const logoutIndex = popover.indexOf("Cerrar sesión");
  assert.ok(settingsIndex > 0 && logoutIndex > 0);
  assert.ok(settingsIndex < logoutIndex, "Configuración debe ir sobre Cerrar sesión");
  assert.match(popover.slice(0, settingsIndex), /<Gear aria-hidden="true" size=\{16\} \/>/);
  const types = source("app/portal-types.ts");
  assert.match(types, /\| "settings"/);
  const portal = source("app/Portal.tsx");
  assert.match(portal, /onSettings=\{\(\) => setScreen\("settings"\)\}/);
});

test("REQ-CFG-04: el aviso de publicación se envía por token, nunca a un topic", () => {
  const fn = source("firebase/functions/index.js");
  const emitter = fn.slice(
    fn.indexOf("exports.notifyStudentsOnCoursePost"),
    fn.indexOf("exports.deleteMyAccount")
  );
  // El envío a topic no puede consultar la preferencia de cada destinatario.
  assert.doesNotMatch(emitter, /topic:/);
  assert.doesNotMatch(fn, /course_\$\{topicCourse\}_students/);
  assert.match(emitter, /sendEachForMulticast\(\{ \.\.\.message, tokens \}\)/);
  assert.match(emitter, /enrolledStudentIds\(db, courseId\)/);
  assert.match(emitter, /authorizedTokens\(db, uids, "sectionPublications"\)/);
  // Sin matriculados o sin dispositivos autorizados no se llama a Messaging.
  assert.match(emitter, /if \(uids\.length === 0\) return;/);
  assert.match(emitter, /if \(refsByToken\.size === 0\) return;/);
});

test("REQ-CFG-04: la resolución de destinatarios se mantiene acotada por lote", () => {
  const fn = source("firebase/functions/index.js");
  // Una lectura por estudiante, no dos: token y permiso viajan en el mismo documento.
  assert.match(fn, /fieldMask: \["fcmToken", "pushChannels"\]/);
  assert.match(fn, /\.select\(\)\s*\n\s*\.get\(\)/);
  assert.match(fn, /const PROFILE_BATCH = 300;/);
  assert.match(fn, /const MULTICAST_BATCH = 500;/);
  assert.match(fn, /chunk\(uids, PROFILE_BATCH\)/);
  assert.match(fn, /chunk\(\[\.\.\.refsByToken\.keys\(\)\], MULTICAST_BATCH\)/);
  // La ausencia de preferencia significa canal activo.
  assert.match(fn, /if \(channels && channels\[channel\] === false\) continue;/);
  // Los tokens muertos se dan de baja para no volver a pagarlos.
  assert.match(fn, /FieldValue\.delete\(\)/);
  assert.match(fn, /messaging\/registration-token-not-registered/);
});

test("REQ-CFG-04: la consulta de matriculados tiene su índice declarado", () => {
  const indexes = JSON.parse(source("firebase/firestore.indexes.json")) as {
    indexes: { collectionGroup: string; queryScope: string; fields: { fieldPath: string }[] }[];
  };
  const index = indexes.indexes.find(
    (entry) => entry.collectionGroup === "sections" && entry.queryScope === "COLLECTION_GROUP"
  );
  assert.ok(index, "falta el índice de grupo de colección para las matrículas");
  assert.deepEqual(
    index.fields.map((field) => field.fieldPath),
    ["seccionId", "role"]
  );
});

test("REQ-CFG-04: las banderas de push se proyectan junto al documento canónico", () => {
  const service = source("lib/services/user-profile.ts");
  assert.match(service, /pushChannels: \{ mapValue: \{ fields: pushFields \} \}/);
  assert.match(service, /updateMask: \{ fieldPaths: \["pushChannels"\] \}/);
  // Un solo commit: la proyección no puede quedar desfasada del documento real.
  assert.match(service, /commitFirestoreWrites\(\[write, projection\]\)/);
  // El cliente no puede escribir esas banderas: la proyección es del servidor.
  const rules = source("firebase/firestore.rules");
  const update = rules.slice(rules.indexOf("match /users/{userId}"));
  assert.doesNotMatch(update.slice(0, 900), /pushChannels/);
});

test("REQ-AUTH-08: la consulta acotada de sesiones es determinista", () => {
  const route = source("app/api/profile/sessions/route.ts");
  const ordered = route.match(
    /\.orderBy\(desc\(sessions\.createdAt\), desc\(sessions\.tokenHash\)\)/g
  );
  // Sin orden, dos consultas acotadas pueden devolver subconjuntos distintos y
  // la revocación fallaría con 403 sobre una sesión propia.
  assert.equal(ordered && ordered.length, 2);
  const limits = route.match(/\.limit\(MAX_ACTIVE_SESSIONS\)/g);
  assert.equal(limits && limits.length, 2);
});
