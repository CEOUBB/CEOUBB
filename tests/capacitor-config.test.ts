import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

/*
  Continuidad de publicación. `cap add android` regenera el proyecto nativo desde
  plantilla: todo lo que Play Console exige (identificador, firma, versión, App Links)
  vuelve a aplicarse a mano, así que se verifica a mano. Sin este archivo la migración
  pierde en silencio la identidad publicable de la app.
*/

const APP_ID = "cl.ubb.centroestudio";

function read(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

async function exists(path: string) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

/*
  Se afirma sobre el objeto resuelto, no sobre el texto del archivo. Desde que
  `server.url` y `server.cleartext` se derivan de `CAPACITOR_SERVER_URL`, una
  comprobación por expresión regular pasaría con la línea correcta comentada y no
  demostraría nada sobre lo que realmente se compila en el AAB.
*/
// REQ-CAP-01
test("the Capacitor config points the WebView at the deployed portal", async () => {
  const config = (await import("../capacitor.config.ts")).default;
  assert.equal(config.appId, APP_ID, "appId must stay canonical");
  assert.equal(config.appName, "CEOUBB");
  assert.equal(config.webDir, "capacitor/www");
  assert.ok(await exists("../capacitor/www/index.html"), "webDir must contain the offline fallback document");

  const url = config.server?.url ?? "";
  // Sólo un override explícito de desarrollo puede apuntar fuera de producción.
  if (!process.env.CAPACITOR_SERVER_URL) {
    assert.equal(url, "https://ceoubb.com", "the shipped default must be the production portal");
  }
  assert.equal(
    config.server?.cleartext ?? false,
    url.startsWith("http://"),
    "cleartext may only be on for an explicit http:// override, never for the shipped config",
  );
});

// REQ-CAP-01 — el override es una comodidad de desarrollo; el valor por defecto es el contrato.
test("falls back to the production portal when no override is set", async () => {
  const source = await read("../capacitor.config.ts");
  assert.match(source, /process\.env\.CAPACITOR_SERVER_URL\s*\|\|\s*"https:\/\/ceoubb\.com"/, "the fallback origin must stay https://ceoubb.com");
});

// REQ-CAP-02
test("google-services.json survives the regeneration untouched", async () => {
  const services = JSON.parse(await read("../android/app/google-services.json"));
  const packageNames = services.client.map((client: { client_info: { android_client_info: { package_name: string } } }) => client.client_info.android_client_info.package_name);
  assert.ok(packageNames.includes(APP_ID), `google-services.json must declare package_name ${APP_ID}`);
  assert.equal(services.project_info.project_id, "centro-de-estudio-ubb");
});

// REQ-CAP-13
test("the regenerated Gradle project stays publishable", async () => {
  const appGradle = await read("../android/app/build.gradle");
  const variables = await read("../android/variables.gradle");

  assert.match(appGradle, new RegExp(`applicationId\\s+"${APP_ID}"`));
  assert.match(appGradle, new RegExp(`namespace\\s+"${APP_ID}"`));

  const versionCode = Number(appGradle.match(/versionCode\s+(\d+)/)?.[1]);
  assert.ok(versionCode > 13, `versionCode must exceed the published 13, got ${versionCode}`);

  assert.match(appGradle, /keystoreProperties\.load/, "the release key must come from keystore.properties");
  assert.match(appGradle, /signingConfigs\s*\{[\s\S]*?release\s*\{/, "a release signingConfig must exist");
  assert.match(appGradle, /signingConfig\s+signingConfigs\.release/, "the release build type must use it");

  const minSdk = Number(variables.match(/minSdkVersion\s*=\s*(\d+)/)?.[1]);
  assert.equal(minSdk, 26, "minSdk 26 is the published floor");
});

// REQ-CAP-16
test("the verified App Links survive in the manifest and on the web", async () => {
  const manifest = await read("../android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:autoVerify="true"/, "App Links must stay verified");
  assert.match(manifest, /android:host="ceoubb\.com"/);
  assert.match(manifest, /android:host="www\.ceoubb\.com"/);

  const statements = JSON.parse(await read("../public/.well-known/assetlinks.json"));
  const android = statements.find((statement: { target: { package_name?: string } }) => statement.target.package_name === APP_ID);
  assert.ok(android, `assetlinks.json must list ${APP_ID}`);
  assert.ok(android.relation.includes("delegate_permission/common.handle_all_urls"));
  assert.equal(android.target.sha256_cert_fingerprints.length, 1);
  assert.match(android.target.sha256_cert_fingerprints[0], /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, "the release fingerprint must be a SHA-256 in Play's format");
});

// REQ-CAP-10
test("the runtime notification permission is declared", async () => {
  const manifest = await read("../android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android\.permission\.POST_NOTIFICATIONS/);
});

// REQ-CAP-03
test("the iOS target exists as a versioned scaffold", async () => {
  assert.ok(await exists("../ios/App/App.xcodeproj/project.pbxproj"), "the iOS project must be versioned");
  assert.ok(await exists("../ios/App/Podfile"), "the Podfile must be versioned even though pods are never installed on Windows");
});
