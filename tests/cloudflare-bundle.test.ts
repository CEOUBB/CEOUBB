import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const adapterDirectory = dirname(require.resolve("@opennextjs/cloudflare"));
const { patchTurbopackRuntimeCode } = await import(
  pathToFileURL(resolve(adapterDirectory, "../cli/build/patches/plugins/turbopack.js")).href
);

const runtime = `
async function externalImport(id) {
  let raw;
  raw = await import(id);
  return raw;
}
const contextPrototype = {};
contextPrototype.y = externalImport;
`;

function patchRuntime(chunk: string) {
  const fixture = mkdtempSync(join(tmpdir(), "ceoubb-cloudflare-bundle-"));
  try {
    const chunks = join(fixture, ".next/server/chunks");
    mkdirSync(chunks, { recursive: true });
    const chunkPath = join(chunks, "[externals].js");
    writeFileSync(chunkPath, chunk);
    return patchTurbopackRuntimeCode({
      code: runtime,
      filePath: join(chunks, "[turbopack]_runtime.js"),
      tracedFiles: [chunkPath],
    });
  } finally {
    assert.equal(dirname(fixture), resolve(tmpdir()));
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("Cloudflare no incluye el generador de imágenes cuando los chunks no lo importan", () => {
  const output = patchRuntime('context.y("node:crypto");');
  assert.doesNotMatch(output, /@vercel\/og/);
  assert.match(output, /await import\("node:crypto"\)/);
});

test("Cloudflare conserva la variante compatible del generador cuando existe una importación", () => {
  const output = patchRuntime('context.y("next/dist/compiled/@vercel/og/index.node.js");');
  assert.match(output, /case "next\/dist\/compiled\/@vercel\/og\/index\.node\.js"/);
  assert.match(output, /await import\("next\/dist\/compiled\/@vercel\/og\/index\.edge\.js"\)/);
  assert.doesNotMatch(
    output,
    /await import\("next\/dist\/compiled\/@vercel\/og\/index\.node\.js"\)/
  );
});

test("Cloudflare conserva otros imports externos y la carga de chunks", () => {
  const output = patchRuntime('context.y("example-package/subpath");');
  assert.match(output, /await import\("example-package\/subpath"\)/);
  assert.match(output, /function requireChunk\(chunkPath\)/);
  assert.match(output, /case "server\/chunks\/\[externals\]\.js"/);
});
