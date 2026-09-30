import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Implements: REQ-PERF-LOAD-04
const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
assert.equal(manifest.routes["/campus"], undefined, "Private campus must never be prerendered");
assert.equal(
  Object.keys(manifest.dynamicRoutes).length,
  0,
  "ASSETS cache does not support dynamic ISR"
);

for (const [path, route] of Object.entries(manifest.routes)) {
  assert.equal(route.initialRevalidateSeconds, false, `${path} requires a writable ISR cache`);
  assert.ok(!path.startsWith("/api/"), `${path} needs an explicit public cache review`);
}
console.log(
  `Verified ${Object.keys(manifest.routes).length} deployment-only public cache entries.`
);
