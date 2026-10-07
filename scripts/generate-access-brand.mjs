import { createRequire } from "node:module";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sharp = createRequire(import.meta.resolve("next/package.json"))("sharp");
const output = new URL("../public/brand/access/", import.meta.url);

// Implements: REQ-PERF-LOAD-01
await mkdir(output, { recursive: true });

for (const [name, width] of [
  ["app-store-badge-es", 405],
  ["google-play-badge-es", 405],
  ["google-g", 72],
]) {
  const source = new URL(`../public/brand/${name}.webp`, import.meta.url);
  const destination = new URL(`${name}.webp`, output);
  const result = await sharp(fileURLToPath(source))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(fileURLToPath(destination));
  console.log(
    JSON.stringify({
      name,
      originalBytes: (await stat(source)).size,
      bytes: result.size,
      width: result.width,
      height: result.height,
    })
  );
}
