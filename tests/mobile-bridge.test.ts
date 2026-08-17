import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACCESS_REJECTION_MESSAGE } from "../lib/access-policy.ts";
import { isExternalUrl } from "../lib/mobile-bridge.ts";

// REQ-CAP-15 — sólo lo que no es del portal sale al navegador del sistema.
test("keeps portal links inside the WebView", () => {
  for (const href of [
    "/biblioteca/index.html",
    "https://ceoubb.com/privacidad",
    "https://www.ceoubb.com/",
    "?tab=notas",
    "#seccion",
  ]) {
    assert.equal(isExternalUrl(href), false, `${href} must stay in the app`);
  }
});

test("sends foreign domains to the system browser", () => {
  for (const href of [
    "https://moodle.ubiobio.cl",
    "http://example.com/guia.pdf",
    "https://ceoubb.com.attacker.com/",
  ]) {
    assert.equal(isExternalUrl(href), true, `${href} must open outside the app`);
  }
});

test("ignores schemes the system browser cannot take over", () => {
  for (const href of [
    "mailto:soporte@ubiobio.cl",
    "tel:+56412345678",
    "javascript:void(0)",
    "not a url at all",
  ]) {
    assert.equal(
      isExternalUrl(href),
      false,
      `${href} must not be routed through Capacitor Browser`
    );
  }
});

// REQ-CAP-12, REQ-CAP-12b — la hoja nativa reemplaza al popup sólo dentro del contenedor.
test("signs in through a native credential inside the Capacitor shell", async () => {
  const source = await readFile(new URL("../lib/firebase-client.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /Capacitor\.isNativePlatform\(\)/,
    "the entry point must branch by platform"
  );
  assert.match(
    source,
    /FirebaseAuthentication\.signInWithGoogle\(\)/,
    "the app must use the native Google sheet"
  );
  assert.match(
    source,
    /signInWithCredential\(/,
    "the native credential must be exchanged with the Firebase SDK"
  );
  assert.match(source, /signInWithPopup\(/, "the browser must keep the popup");
  assert.doesNotMatch(source, /signInWithRedirect|getRedirectResult/);
});

test("terminates a non-institutional native session with the portal's own message", async () => {
  const source = await readFile(new URL("../lib/firebase-client.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /roleForEmail\(/,
    "the role decision must be delegated to the access policy"
  );
  assert.doesNotMatch(
    source,
    /endsWith\(\s*["'`]@/,
    "the native branch must not re-derive a role from an email domain"
  );
  assert.match(source, /signOut\(/, "a rejected account must be signed out");
  assert.match(source, /throw new Error\(ACCESS_REJECTION_MESSAGE\)/);

  const route = await readFile(
    new URL("../app/api/auth/firebase/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(
    route,
    /ACCESS_REJECTION_MESSAGE/,
    "the web portal must surface the same rejection text"
  );
  assert.match(ACCESS_REJECTION_MESSAGE, /@alumnos\.ubiobio\.cl.*@ubiobio\.cl/);
});
