import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import ts from "typescript";

const require = createRequire(import.meta.url);
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { adapter } = require("next/dist/server/web/adapter.js");
const { NextRequest } = require("next/server");
const { SESSION_COOKIE } = require("../lib/session-cookie.ts");
const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const proxyModule = { exports: {} };
const load = (specifier) => {
  if (specifier === "./lib/qa-runtime")
    return { resolveQaRuntime: () => ({ projectId: "demo-ceoubb-qa" }) };
  if (specifier === "./lib/session-cookie") return { SESSION_COOKIE };
  return require(specifier);
};
new Function("require", "module", "exports", compiled)(load, proxyModule, proxyModule.exports);
const { proxy } = proxyModule.exports;

// Implements: REQ-PERF-LOAD-02
test("private rewrites retain the loopback application origin through Next's adapter", async () => {
  const previous = process.env.INTEROP_CONTENT_ORIGIN;
  process.env.INTEROP_CONTENT_ORIGIN = "http://localhost:57115";

  try {
    for (const [query, rsc] of [
      ["?view=courses&tab=posts", false],
      ["?view=courses&_rsc=qa-private", true],
    ]) {
      const url = `http://127.0.0.1:57115/${query}`;
      const headers = {
        host: "127.0.0.1:57115",
        cookie: `${SESSION_COOKIE}=opaque-session`,
        ...(rsc ? { RSC: "1" } : {}),
      };
      const result = await adapter({
        page: "/proxy",
        handler: proxy,
        request: {
          url,
          method: "GET",
          headers,
          nextConfig: {},
          signal: new AbortController().signal,
        },
      });
      const rewrite = new URL(result.response.headers.get("x-middleware-rewrite"));
      assert.equal(rewrite.origin, new URL(url).origin);
      assert.equal(rewrite.pathname, "/campus");
      assert.deepEqual([...rewrite.searchParams], [...new URL(url).searchParams]);
      assert.equal(result.response.headers.get("cache-control"), "private, no-store");
      assert.match(result.response.headers.get("vary"), /Cookie/);
      assert.ok(
        result.response.headers
          .get("vary")
          .split(/\s*,\s*/)
          .includes("*")
      );
      assert.equal(proxy(new NextRequest(rewrite, { headers })).status, 200);
    }
    const denied = proxy(
      new NextRequest("http://localhost:57115/campus", { headers: { host: "localhost:57115" } })
    );
    assert.equal(denied.status, 404);
    assert.equal(
      proxy(
        new NextRequest("http://127.0.0.1:57115/", { headers: { host: "127.0.0.1:57115" } })
      ).headers.get("x-middleware-next"),
      "1"
    );
  } finally {
    if (previous === undefined) delete process.env.INTEROP_CONTENT_ORIGIN;
    else process.env.INTEROP_CONTENT_ORIGIN = previous;
  }
});

// Implements: REQ-PERF-LOAD-02, REQ-PERF-LOAD-04
test("OpenNext preserves React negotiation and private cache headers from the proxy", async () => {
  const compiledAdapter = await build({
    entryPoints: [require.resolve("@opennextjs/aws/http/openNextResponse.js")],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
  });
  const adapterModule = { exports: {} };
  new Function("require", "module", "exports", compiledAdapter.outputFiles[0].text)(
    require,
    adapterModule,
    adapterModule.exports
  );
  const { OpenNextNodeResponse } = adapterModule.exports;
  const negotiationHeaders = [
    "rsc",
    "next-router-state-tree",
    "next-router-prefetch",
    "next-router-segment-prefetch",
  ];

  for (const [pathname, hasSession] of [
    ["/", false],
    ["/", true],
    ["/campus", false],
    ["/campus", true],
  ]) {
    const request = new NextRequest(`https://ceoubb.com${pathname}`, {
      headers: hasSession ? { cookie: `${SESSION_COOKIE}=opaque-session` } : {},
    });
    const middlewareHeaders = proxy(request).headers;
    const initialHeaders = { vary: middlewareHeaders.get("vary") };
    const cacheControl = middlewareHeaders.get("cache-control");

    if (cacheControl) initialHeaders["cache-control"] = cacheControl;

    const response = new OpenNextNodeResponse(
      () => {},
      async () => {},
      undefined,
      initialHeaders,
      200
    );
    response.setHeader("vary", negotiationHeaders.join(", "));
    response.setHeader("cache-control", "public, max-age=0, s-maxage=31536000");
    response.flushHeaders();
    const vary = response
      .getHeader("vary")
      .toLowerCase()
      .split(/\s*,\s*/);
    assert.ok(vary.includes("cookie"));

    for (const header of negotiationHeaders) assert.ok(vary.includes(header), header);

    if (hasSession || pathname === "/campus") {
      assert.ok(vary.includes("*"));
      assert.equal(response.getHeader("cache-control"), "private, no-store");
    } else {
      assert.ok(!vary.includes("*"));
      assert.equal(response.getHeader("cache-control"), "public, max-age=0, s-maxage=31536000");
    }
  }
});
