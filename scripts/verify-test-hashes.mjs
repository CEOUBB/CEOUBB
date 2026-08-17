import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TESTS_DIR = join(process.cwd(), "tests");
const SNAPSHOT_FILE = join(process.cwd(), ".agents", ".test-hashes.json");

async function getTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getTestFiles(fullPath)));
    } else if (/\.(test|spec)\.(ts|js|mjs)$|\.test\.mjs$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function computeHashes() {
  const files = await getTestFiles(TESTS_DIR);
  const hashes = {};
  for (const file of files) {
    const relativePath = file
      .replace(process.cwd() + "\\", "")
      .replace(process.cwd() + "/", "")
      .replace(/\\/g, "/");
    const content = await readFile(file, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    hashes[relativePath] = hash;
  }
  return hashes;
}

async function main() {
  const args = process.argv.slice(2);
  const isGenerate = args.includes("--generate");
  const isCheck = args.includes("--check") || !isGenerate;

  const currentHashes = await computeHashes();

  if (isGenerate || !existsSync(SNAPSHOT_FILE)) {
    await writeFile(SNAPSHOT_FILE, JSON.stringify(currentHashes, null, 2), "utf8");
    console.log(
      `[Test-Locking] Snapshot de hashes generado exitosamente (${Object.keys(currentHashes).length} archivos registrados).`
    );
    return;
  }

  if (isCheck) {
    const rawSnapshot = await readFile(SNAPSHOT_FILE, "utf8");
    const snapshot = JSON.parse(rawSnapshot);

    const mismatches = [];
    const missing = [];
    const untracked = [];

    for (const [file, expectedHash] of Object.entries(snapshot)) {
      if (!(file in currentHashes)) {
        missing.push(file);
      } else if (currentHashes[file] !== expectedHash) {
        mismatches.push(file);
      }
    }

    for (const file of Object.keys(currentHashes)) {
      if (!(file in snapshot)) {
        untracked.push(file);
      }
    }

    if (mismatches.length > 0 || missing.length > 0) {
      console.error("[Test-Locking ERROR] Violacion de inmutabilidad de pruebas detectada:");
      if (mismatches.length > 0) {
        console.error("  Archivos con aserciones modificadas o alteradas:");
        for (const file of mismatches) console.error(`    - ${file}`);
      }
      if (missing.length > 0) {
        console.error("  Archivos de prueba eliminados:");
        for (const file of missing) console.error(`    - ${file}`);
      }
      console.error(
        "  Directiva de Gobernanza: Esta estrictamente prohibido alterar pruebas existentes durante la fase de ejecucion."
      );
      console.error(
        "  Si la especificacion fue formalmente enmendada, ejecute: node scripts/verify-test-hashes.mjs --generate"
      );
      process.exit(1);
    }

    console.log(
      `[Test-Locking] Verificacion de integridad superada (${Object.keys(currentHashes).length} archivos validados con hash SHA-256).`
    );
  }
}

main().catch((err) => {
  console.error("[Test-Locking] Error inesperado:", err);
  process.exit(1);
});
