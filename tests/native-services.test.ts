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
  assert.match(
    update[0],
    /hasOnly\(\[[^\]]*'fcmToken'[^\]]*\]\)/,
    "fcmToken must be inside hasOnly"
  );
});

// REQ-CAP-18 — ninguna otra regla se amplía: el rol sigue congelado y el dueño sigue siendo el uid.
test("keeps every other guard on the users update rule", async () => {
  const rules = await read("firebase/firestore.rules");
  const update = rules.match(/allow update: if isOwner\(\)[^\n]*userId[^\n]*;/)?.[0] ?? "";
  assert.match(
    update,
    /request\.auth\.uid == userId/,
    "only the owner of the document may write it"
  );
  assert.match(
    update,
    /request\.resource\.data\.role == resource\.data\.role/,
    "the role must stay frozen"
  );
  assert.doesNotMatch(
    rules,
    /allow read, write: if signedIn\(\);/,
    "no rule may open on mere authentication"
  );
});

/*
  La superficie de reglas está congelada: cualquier `allow` nuevo debe pasar por
  una spec aprobada. SPEC-010 la movió de 18 a 21 y CEO-7 agrega las dos reglas
  explícitas de lectura y denegación de escritura para la bitácora de notas. CEO-26
  incorpora diez permisos acotados para cursores, hilos privados y sus mensajes.
*/
// REQ-CAP-18, REQ-SEC-02
test("keeps the allow surface frozen at the approved count", async () => {
  const rules = await read("firebase/firestore.rules");
  assert.equal(
    (rules.match(/^\s*allow /gm) ?? []).length,
    33,
    "the ruleset must keep exactly 33 allow rules"
  );
  // No hay regla comodín: lo que no está listado queda denegado por defecto.
  assert.doesNotMatch(rules, /allow .*: if true;/, "no rule may grant unconditional access");
  assert.doesNotMatch(rules, /match \/\{document=\*\*\}/, "no catch-all match may be introduced");
  assert.doesNotMatch(
    rules,
    /match \/\{path=\*\*\}\//,
    "a collection-group wildcard would reopen every section of the university"
  );
});

// REQ-CAP-10b — un permiso denegado no se vuelve a pedir ni bloquea la app.
test("stops on a denied notification permission", async () => {
  const source = await read("lib/push-notifications.ts");
  assert.match(
    source,
    /if \(receive !== "granted"\) return;/,
    "a denied permission must short-circuit"
  );
  assert.match(
    source,
    /if \(receive === "prompt" \|\| receive === "prompt-with-rationale"\) \{\s*receive = \(await PushNotifications\.requestPermissions\(\)\)\.receive;/,
    "requestPermissions must be reachable only from a prompt state"
  );
  assert.equal(
    (source.match(/PushNotifications\.requestPermissions\(/g) ?? []).length,
    1,
    "there must be no second, unconditional permission request"
  );
  assert.match(
    source,
    /PushNotifications\.checkPermissions\(\)/,
    "the stored decision must be read first"
  );
});

// REQ-CAP-10 — el token se persiste en users/{uid}.fcmToken y sin arrastrar el SDK al bundle inicial.
test("persists only fcmToken through a lazily loaded Firestore", async () => {
  const source = await read("lib/push-notifications.ts");
  assert.match(
    source,
    /sdk\.setDoc\(sdk\.doc\(db, "users", user\.uid\), \{ fcmToken \}, \{ merge: true \}\)/
  );
  assert.match(
    source,
    /await import\("firebase\/firestore"\)|import\("firebase\/firestore"\)/,
    "Firestore must be imported dynamically"
  );
  assert.doesNotMatch(
    source,
    /^import .*from "firebase\/firestore"/m,
    "Firestore must never be a static import"
  );
});

// REQ-CAP-11 — descarga nativa con Filesystem y degradación limpia en la web.
test("downloads documents with Filesystem and bails out off-device", async () => {
  const source = await read("lib/native-files.ts");
  assert.match(source, /if \(!isNativeShell\(\)\) return false;/, "the web path must exit early");
  assert.match(source, /Filesystem\.downloadFile\(\{ url, path, directory: Directory\.Cache \}\)/);
  assert.match(
    source,
    /Browser\.open\(\{ url: uri \}\)/,
    "the file must be handed off to the native viewer"
  );
  assert.match(source, /catch \{\s*return false;/, "any failure must degrade instead of throwing");
});

/*
  Buzón de entregas del estudiante (REQ-EVAL-01). La subida real vive en el
  navegador, así que aquí se fija lo verificable: la ruta aislada por sección,
  evaluación y UID, el saneo del nombre y el techo de 25 MB en las reglas.
*/

// Implements: REQ-EVAL-01
test("a submission lands under its own section, evaluation and uid", async () => {
  const { submissionStoragePath, safeFileName, MAX_SUBMISSION_BYTES } =
    await import("../lib/firebase/storage.ts");

  assert.equal(MAX_SUBMISSION_BYTES, 25 * 1024 * 1024);
  assert.equal(
    submissionStoragePath(
      "440299-2026-2-1",
      "eval_informe_1",
      "usr_soto",
      "informe.pdf",
      1755400000000
    ),
    "courses/440299-2026-2-1/submissions/eval_informe_1/usr_soto/1755400000000_informe.pdf"
  );

  // Ningún nombre de archivo puede escaparse de su carpeta.
  const traversal = submissionStoragePath("c-1", "e-1", "uid-1", "../../otro/nota.pdf", 1);
  assert.equal(traversal, "courses/c-1/submissions/e-1/uid-1/1_.._.._otro_nota.pdf");
  assert.doesNotMatch(traversal.split("/").pop() ?? "", /[/\\]/);

  assert.equal(safeFileName("informe final (v2).pdf"), "informe_final__v2_.pdf");
  assert.equal(safeFileName("Álgebra 1.tex"), "Álgebra_1.tex");
  assert.equal(safeFileName("///"), "___");
  assert.equal(safeFileName(""), "entrega");
  assert.equal(safeFileName("a".repeat(400)).length, 120);
});

// Implements: REQ-EVAL-01
test("the upload client refuses anything outside 1 byte to 25 MB", async () => {
  const source = await read("lib/firebase/storage.ts");
  assert.match(
    source,
    /if \(file\.size <= 0 \|\| file\.size > MAX_SUBMISSION_BYTES\)/,
    "the guard must reject empty and oversized files before touching the network"
  );
  assert.match(source, /La entrega debe pesar entre 1 byte y 25 MB\./);
});

// Implements: REQ-EVAL-01
test("storage rules isolate every submission behind an active enrollment", async () => {
  const rules = await read("firebase/storage.rules");
  const block = rules.match(
    /match \/courses\/\{courseId\}\/submissions\/\{evalId\}\/\{userId\}\/\{fileName\} \{[\s\S]*?\n {4}\}/
  );
  assert.ok(block, "the submissions path must be declared");
  assert.match(block[0], /allow create, update: if isMember\(\) && isEnrolled\(courseId\)/);
  assert.match(block[0], /request\.auth\.uid == userId/);
  assert.match(block[0], /request\.resource\.size <= 25 \* 1024 \* 1024/);
  assert.match(block[0], /allow read: if isOwner\(\) \|\| teachesSection\(courseId\)/);
  assert.doesNotMatch(
    block[0],
    /50 \* 1024 \* 1024/,
    "a submission never gets the teacher ceiling"
  );
});
