import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const TESTS_DIR = join(process.cwd(), "tests");

async function discoverTestFiles() {
  const entries = await readdir(TESTS_DIR, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() && entry.name.endsWith(".test.ts") && entry.name !== "rendered-html.test.mjs"
    )
    .map((entry) => join("tests", entry.name).replaceAll("\\", "/"))
    .sort();
}

async function run() {
  const files = await discoverTestFiles();
  const args = ["--experimental-strip-types", "--test", "--test-concurrency=4", ...files];

  const child = spawn("node", args, {
    stdio: "inherit",
    shell: false,
  });

  child.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
