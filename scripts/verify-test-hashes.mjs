import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const TESTS_DIR = join(process.cwd(), "tests");
const SNAPSHOT_FILE = join(process.cwd(), ".agents", ".test-hashes.json");

async function getTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getTestFiles(res)));
    } else if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.mjs")) {
      files.push(res);
    }
  }
  return files.sort();
}

async function calculateHashes() {
  const files = await getTestFiles(TESTS_DIR);
  const hashes = {};
  for (const file of files) {
    const relativePath = relative(process.cwd(), file).replaceAll("\\", "/");
    const content = await readFile(file, "utf8");
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const hash = createHash("sha256").update(normalizedContent).digest("hex");
    hashes[relativePath] = hash;
  }
  return hashes;
}

async function main() {
  const isGenerate = process.argv.includes("--generate");
  const isCheck = process.argv.includes("--check") || !isGenerate;

  const currentHashes = await calculateHashes();

  if (isCheck) {
    if (!existsSync(SNAPSHOT_FILE)) {
      console.error("[Test-Locking] ERROR: El archivo de sellado .agents/.test-hashes.json no existe. Se requiere autorización para regenerarlo.");
      process.exit(1);
    }

    const snapshotContent = await readFile(SNAPSHOT_FILE, "utf8");
    const expectedHashes = JSON.parse(snapshotContent);

    const modified = [];
    const missing = [];
    const untracked = [];

    for (const [file, hash] of Object.entries(expectedHashes)) {
      if (!currentHashes[file]) {
        missing.push(file);
      } else if (currentHashes[file] !== hash) {
        modified.push(file);
      }
    }

    for (const file of Object.keys(currentHashes)) {
      if (!expectedHashes[file]) {
        untracked.push(file);
      }
    }

    if (modified.length > 0 || missing.length > 0 || untracked.length > 0) {
      console.error("\n[Test-Locking] FALLO DE INTEGRIDAD EN TESTS SELLADOS:");
      if (modified.length) console.error(" - Modificados sin sellado:", modified);
      if (missing.length) console.error(" - Eliminados:", missing);
      if (untracked.length) console.error(" - Nuevos no registrados:", untracked);
      console.error("\nViolación de AGENTS.md Regla 2 (NO TEST WEAKENING). Abortando.");
      process.exit(1);
    }

    console.log(`[Test-Locking] Verificacion de integridad superada (${Object.keys(currentHashes).length} archivos validados con hash SHA-256).`);
    return;
  }

  if (isGenerate) {
    await writeFile(SNAPSHOT_FILE, JSON.stringify(currentHashes, null, 2) + "\n", "utf8");
    console.log(`[Test-Locking] Sellado SHA-256 generado para ${Object.keys(currentHashes).length} archivos en .agents/.test-hashes.json`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
