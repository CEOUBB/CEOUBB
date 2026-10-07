import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function worker(response) {
  const handlers = new Map();
  const writes = [];
  const precached = [];
  const pending = [];
  const cache = {
    addAll(requests) {
      precached.push(...requests);
      return Promise.resolve();
    },
    put(request, value) {
      writes.push({ request, value });
      return Promise.resolve();
    },
  };
  const self = {
    location: { origin: "https://ceoubb.test" },
    addEventListener(name, handler) {
      handlers.set(name, handler);
    },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  class WorkerRequest extends Request {
    constructor(url, options) {
      super(new URL(url, self.location.origin), options);
    }
  }
  runInNewContext(source, {
    self,
    Request: WorkerRequest,
    URL,
    fetch: () => Promise.resolve(response),
    caches: {
      open: () => Promise.resolve(cache),
      match: () => Promise.resolve(undefined),
      keys: () => Promise.resolve([]),
    },
  });

  return {
    writes,
    precached,
    async dispatch(name, request) {
      let served;
      handlers.get(name)({
        request,
        waitUntil: (promise) => pending.push(promise),
        respondWith: (promise) => {
          served = promise;
        },
      });
      await served;
      await Promise.all(pending);
    },
  };
}

// Implements: REQ-PERF-LOAD-02
test("offline shell is anonymous and private HTML and RSC never reach storage", async () => {
  const install = worker(new Response("public"));
  await install.dispatch("install");
  assert.ok(install.precached.some((request) => request.url.endsWith("/")));
  assert.ok(install.precached.every((request) => request.credentials === "omit"));

  for (const headers of [
    { "Cache-Control": "private, no-store", "Content-Type": "text/html" },
    { "Cache-Control": "public, no-store", "Content-Type": "text/html" },
    { "Content-Type": "text/x-component" },
  ]) {
    const runtime = worker(new Response("personalized", { headers }));
    await runtime.dispatch("fetch", new Request("https://ceoubb.test/"));
    assert.equal(runtime.writes.length, 0);
  }

  const runtime = worker(new Response("public", { headers: { "Content-Type": "text/html" } }));
  await runtime.dispatch("fetch", new Request("https://ceoubb.test/faq"));
  assert.equal(runtime.writes.length, 1);
  await runtime.dispatch("fetch", new Request("https://ceoubb.test/campus"));
  await runtime.dispatch("fetch", new Request("https://ceoubb.test/?_rsc=session"));
  assert.equal(runtime.writes.length, 1);
});

// Implements: REQ-PERF-LOAD-01
test("static access imports the public leaf and resolved sessions skip client discovery", async () => {
  const [home, layout, core, access] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/usePortalCore.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/access-screen.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /from "\.\/access-screen"/);
  assert.doesNotMatch(home, /from "\.\/Portal"|next\/headers/);
  assert.doesNotMatch(layout, /import "\.\/campus|import "\.\/mobile-shell/);
  assert.match(core, /if \(initialSession !== undefined\) return;/);
  assert.match(access, /useStatusBar\("hero"\)/);
  assert.match(access, /useExternalLinks\(\)/);
});
