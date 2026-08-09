import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";

const PORT = 3123;
const ORIGIN = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url),
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      await fetch(ORIGIN, { method: "HEAD" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("next start did not become reachable");
});

after(() => server?.kill());

function render(path = "/") {
  return fetch(`${ORIGIN}${path}`, { headers: { accept: "text/html" } });
}

test("renders Centro de Estudio UBB", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Centro de Estudio UBB/i);
  assert.match(html, /Ingeniería Mecánica/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("uses verified institutional Google access", async () => {
  const source = await readFile(new URL("../app/Portal.tsx", import.meta.url), "utf8");
  const firebaseSource = await readFile(new URL("../lib/firebase-client.ts", import.meta.url), "utf8");
  assert.match(source, /Centro de <strong>Estudio UBB<\/strong>/i);
  assert.match(source, /Ingresa con tu correo institucional/i);
  assert.match(source, /ubb-shield\.webp/i);
  assert.match(source, /google-g\.webp/i);
  assert.match(source, /Continuar con Google/i);
  assert.match(source, /app-store-badge-es\.webp/i);
  assert.match(source, /google-play-badge-es\.webp/i);
  assert.match(source, /Aplicaciones móviles próximamente disponibles/i);
  assert.doesNotMatch(source, /store-badge[^>]*href=/i);
  assert.doesNotMatch(source, /<span>Próximamente<\/span>|Eliminar cuenta/i);
  assert.doesNotMatch(source, /Descargar APK para Android|apk-download/i);
  assert.doesNotMatch(source, /Tu semestre completo|Acceso institucional verificado|Tu perfil se crea automáticamente|excepción administrativa|Ingresa con Google UBB|Cuenta personal del portal|Instalar en este dispositivo|InstallHelp|beforeinstallprompt|access-pills|Certámenes largos, soluciones desarrolladas/i);
  assert.doesNotMatch(source, /href="\/eliminar-cuenta"/i);
  assert.doesNotMatch(source, /Mínimo 10 caracteres/i);
  assert.match(firebaseSource, /signInWithPopup/);
  assert.doesNotMatch(firebaseSource, /signInWithRedirect|getRedirectResult/);
});

test("grants the authorized collaborator the developer role", async () => {
  const accessPolicy = await readFile(new URL("../lib/access-policy.ts", import.meta.url), "utf8");
  const authSource = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
  const firestoreRules = await readFile(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  const storageRules = await readFile(new URL("../firebase/storage.rules", import.meta.url), "utf8");
  assert.match(accessPolicy, /felipearce\.2004@gmail\.com/i);
  assert.match(authSource, /isDeveloperEmail\(normalized\).*return "owner"/s);
  assert.match(firestoreRules, /felipearce\.2004@gmail\.com/i);
  assert.match(storageRules, /felipearce\.2004@gmail\.com/i);
});

test("treats a missing session as an anonymous visitor", async () => {
  const source = await readFile(new URL("../app/api/auth/me/route.ts", import.meta.url), "utf8");
  assert.match(source, /Response\.json\(\{ user: null \}\)/);
  assert.doesNotMatch(source, /status:\s*401/);
});

test("serves a sitemap", async () => {
  const response = await render("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<urlset/);
});

test("does not expose the account deletion page", async () => {
  const response = await render("/eliminar-cuenta");
  assert.equal(response.status, 404);
});
