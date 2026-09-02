import { readFileSync } from "node:fs";

const msgFile = process.argv[2];
if (!msgFile) process.exit(0);

const rawMsg = readFileSync(msgFile, "utf8");
const cleanLines = rawMsg
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("#"));

if (cleanLines.length === 0) process.exit(0);
const firstLine = cleanLines[0];

// Eximir commits automáticos de git
if (firstLine.startsWith("Merge ") || firstLine.startsWith("Revert ")) {
  process.exit(0);
}

const CONVENTIONAL_REGEX = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\([a-z0-9-_./]+\))?!?: .+/;

if (!CONVENTIONAL_REGEX.test(firstLine)) {
  console.error("\n[Commit-Msg] ERROR: El mensaje de commit debe seguir Conventional Commits:");
  console.error("  Ejemplo: feat: implementar arnés de pruebas unitarias");
  console.error(`  Mensaje recibido: "${firstLine}"\n`);
  process.exit(1);
}
