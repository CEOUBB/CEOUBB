import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath: string) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("App Check web se inicializa antes de los servicios Firebase", async () => {
  const source = await read("lib/firebase-client.ts");

  assert.match(source, /ReCaptchaEnterpriseProvider/);
  assert.match(source, /6Lc_K5UtAAAAAAke6LXqyn3gVV4L3DxDGXfUoZMb/);
  assert.match(source, /isTokenAutoRefreshEnabled:\s*true/);
  assert.ok(
    source.indexOf("initializeAppCheck(firebaseApp") < source.indexOf("getAuth(firebaseApp)")
  );
});

test("el modo debug web queda limitado a localhost y desarrollo", async () => {
  const source = await read("lib/firebase-client.ts");

  assert.match(source, /process\.env\.NODE_ENV === "development"/);
  assert.match(source, /window\.location\.hostname === "localhost"/);
  assert.match(source, /FIREBASE_APPCHECK_DEBUG_TOKEN = true/);
  assert.doesNotMatch(source, /FIREBASE_APPCHECK_DEBUG_TOKEN\s*=\s*["']/);
});

test("la CSP admite sólo los orígenes oficiales de reCAPTCHA", async () => {
  const source = await read("next.config.ts");

  assert.match(source, /script-src[\s\S]*https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(source, /https:\/\/www\.gstatic\.com\/recaptcha\//);
  assert.match(source, /connect-src[\s\S]*https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(source, /frame-src[\s\S]*https:\/\/recaptcha\.google\.com\/recaptcha\//);
  assert.doesNotMatch(source, /recaptcha[^\n]*\*/);
});

test("Android instala Play Integrity desde Application", async () => {
  const [application, manifest, gradle, variables] = await Promise.all([
    read("android/app/src/main/java/cl/ubb/centroestudio/CEOUBBApplication.java"),
    read("android/app/src/main/AndroidManifest.xml"),
    read("android/app/build.gradle"),
    read("android/variables.gradle"),
  ]);

  assert.match(application, /PlayIntegrityAppCheckProviderFactory\.getInstance\(\)/);
  assert.match(application, /FirebaseAppCheck\.getInstance\(\)/);
  assert.match(manifest, /android:name="\.CEOUBBApplication"/);
  assert.match(gradle, /firebase-appcheck-playintegrity:\$firebaseAppCheckVersion/);
  assert.match(variables, /firebaseAppCheckVersion = '19\.4\.0'/);
});

test("Functions permanece en observación antes del enforcement", async () => {
  const source = await read("firebase/functions/index.js");

  assert.match(source, /APP_CHECK_OBSERVATION_OPTIONS = \{ enforceAppCheck: false \}/);
  assert.equal(source.match(/onCall\(APP_CHECK_OBSERVATION_OPTIONS/g)?.length, 6);
  assert.doesNotMatch(source, /enforceAppCheck:\s*true/);
});

test("el runbook exige observación, orden y reversa", async () => {
  const source = await read("docs/operations/firebase-app-check-rollout.md");

  assert.match(source, /24 horas continuas/);
  assert.match(source, /99 %/);
  assert.match(source, /Firestore → Storage → Functions callable → Authentication/);
  assert.match(source, /UNENFORCED/);
  assert.match(source, /30 minutos/);
});
