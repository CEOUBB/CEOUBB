import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/*
  Los plugins de Capacitor no existen fuera del contenedor Android, así que estos
  servicios no se pueden ejercitar en Node. Lo que sí se puede fijar —y es lo que
  la spec exige— son las propiedades de la fuente y de las reglas desplegadas.
*/

const read = (relative: string) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

// REQ-CAP-18 — el propio dueño puede escribir su token FCM.
test("allows fcmToken on the user's own document", async () => {
  const rules = await read("firebase/firestore.rules");
  const update = rules.match(/allow update: if isOwner\(\)[^\n]*userId[^\n]*;/);
  assert.ok(update, "the users/{userId} update rule must exist");
  assert.match(update[0], /hasOnly\(\[[^\]]*'fcmToken'[^\]]*\]\)/, "fcmToken must be inside hasOnly");
});

// REQ-CAP-18 — ninguna otra regla se amplía: el rol sigue congelado y el dueño sigue siendo el uid.
test("keeps every other guard on the users update rule", async () => {
  const rules = await read("firebase/firestore.rules");
  const update = rules.match(/allow update: if isOwner\(\)[^\n]*userId[^\n]*;/)?.[0] ?? "";
  assert.match(update, /request\.auth\.uid == userId/, "only the owner of the document may write it");
  assert.match(update, /request\.resource\.data\.role == resource\.data\.role/, "the role must stay frozen");
  assert.doesNotMatch(rules, /allow read, write: if signedIn\(\);/, "no rule may open on mere authentication");
});

// REQ-CAP-18 — la superficie de reglas no crece: sólo se editó una lista de campos.
test("does not add any allow rule to the ruleset", async () => {
  const rules = await read("firebase/firestore.rules");
  assert.equal((rules.match(/^\s*allow /gm) ?? []).length, 18, "the ruleset must keep exactly 18 allow rules");
  // No hay regla comodín: lo que no está listado queda denegado por defecto.
  assert.doesNotMatch(rules, /allow .*: if true;/, "no rule may grant unconditional access");
  assert.doesNotMatch(rules, /match \/\{document=\*\*\}/, "no catch-all match may be introduced");
});

// REQ-CAP-10b — un permiso denegado no se vuelve a pedir ni bloquea la app.
test("stops on a denied notification permission", async () => {
  const source = await read("lib/push-notifications.ts");
  assert.match(source, /if \(receive !== "granted"\) return;/, "a denied permission must short-circuit");
  assert.match(
    source,
    /if \(receive === "prompt" \|\| receive === "prompt-with-rationale"\) \{\s*receive = \(await PushNotifications\.requestPermissions\(\)\)\.receive;/,
    "requestPermissions must be reachable only from a prompt state",
  );
  assert.equal(
    (source.match(/PushNotifications\.requestPermissions\(/g) ?? []).length,
    1,
    "there must be no second, unconditional permission request",
  );
  assert.match(source, /PushNotifications\.checkPermissions\(\)/, "the stored decision must be read first");
});

// REQ-CAP-10 — el token se persiste en users/{uid}.fcmToken y sin arrastrar el SDK al bundle inicial.
test("persists only fcmToken through a lazily loaded Firestore", async () => {
  const source = await read("lib/push-notifications.ts");
  assert.match(source, /sdk\.setDoc\(sdk\.doc\(db, "users", user\.uid\), \{ fcmToken \}, \{ merge: true \}\)/);
  assert.match(source, /await import\("firebase\/firestore"\)|import\("firebase\/firestore"\)/, "Firestore must be imported dynamically");
  assert.doesNotMatch(source, /^import .*from "firebase\/firestore"/m, "Firestore must never be a static import");
});

// REQ-CAP-11 — descarga nativa con Filesystem y degradación limpia en la web.
test("downloads documents with Filesystem and bails out off-device", async () => {
  const source = await read("lib/native-files.ts");
  assert.match(source, /if \(!isNativeShell\(\)\) return false;/, "the web path must exit early");
  assert.match(source, /Filesystem\.downloadFile\(\{ url, path, directory: Directory\.Cache \}\)/);
  assert.match(source, /Browser\.open\(\{ url: uri \}\)/, "the file must be handed off to the native viewer");
  assert.match(source, /catch \{\s*return false;/, "any failure must degrade instead of throwing");
});
