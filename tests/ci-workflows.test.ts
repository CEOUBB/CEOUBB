// Implements: REQ-CICD-08
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { checkBundleSize, formatKb, getFileSize } from "../scripts/check-bundle-size.mjs";

const REQUIRED_WORKFLOWS = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/android-ci.yml",
  ".github/workflows/semantic-pr.yml",
  ".github/workflows/labeler.yml",
  ".github/workflows/bundle-analysis.yml",
  ".github/workflows/react-doctor.yml",
  ".github/workflows/semgrep.yml",
];

async function exists(path: string): Promise<boolean> {
  try {
    await access(resolve(path));
    return true;
  } catch {
    return false;
  }
}

async function readText(path: string): Promise<string> {
  return readFile(resolve(path), "utf8");
}

test("REQ-CICD-08: All required GitHub Actions workflows exist and are non-empty", async () => {
  for (const workflowPath of REQUIRED_WORKFLOWS) {
    const fileExists = await exists(workflowPath);
    assert.ok(fileExists, `El workflow requerido no existe: ${workflowPath}`);

    const content = await readText(workflowPath);
    assert.ok(content.trim().length > 0, `El workflow está vacío: ${workflowPath}`);
    assert.match(content, /^name:\s+/m, `${workflowPath} debe declarar un 'name'`);
    assert.match(content, /^on:\s+/m, `${workflowPath} debe declarar un bloque 'on'`);
    assert.match(content, /^jobs:\s+/m, `${workflowPath} debe declarar un bloque 'jobs'`);
    assert.ok(!content.includes("\t"), `${workflowPath} no debe contener tabulaciones (YAML inválido)`);
  }
});

test("REQ-CICD-07: .github/labeler.yml and .github/workflows/labeler.yml are properly configured", async () => {
  const labelerExists = await exists(".github/labeler.yml");
  assert.ok(labelerExists, ".github/labeler.yml debe existir");

  const labelerConfig = await readText(".github/labeler.yml");
  const requiredLabels = [
    "📱 mobile / android",
    "🔥 firebase / backend",
    "🌐 web / frontend",
    "📝 documentation",
    "⚙️ ci / cd",
  ];

  for (const label of requiredLabels) {
    assert.ok(
      labelerConfig.includes(label),
      `.github/labeler.yml debe definir la etiqueta "${label}"`,
    );
  }

  assert.ok(labelerConfig.includes("android/**"), "Mobile label must map android/**");
  assert.ok(labelerConfig.includes("capacitor.config.ts"), "Mobile label must map capacitor.config.ts");
  assert.ok(labelerConfig.includes("firebase/**"), "Firebase label must map firebase/**");
  assert.ok(labelerConfig.includes("app/**"), "Web label must map app/**");
  assert.ok(labelerConfig.includes("docs/**"), "Docs label must map docs/**");
  assert.ok(labelerConfig.includes("package.json"), "CI/CD label must map package.json");

  const labelerWorkflow = await readText(".github/workflows/labeler.yml");
  assert.match(labelerWorkflow, /pull_request_target/);
  assert.match(labelerWorkflow, /actions\/labeler@v5/);
  assert.match(labelerWorkflow, /pull-requests:\s*write/);
});

test("REQ-CICD-05, REQ-CICD-06: Semantic PR workflow enforces Conventional Commits and permissions", async () => {
  const semanticPrContent = await readText(".github/workflows/semantic-pr.yml");

  assert.match(semanticPrContent, /pull_request_target/);
  assert.match(semanticPrContent, /amannn\/action-semantic-pull-request@v5/);
  assert.match(semanticPrContent, /pull-requests:\s*read/);
  assert.match(semanticPrContent, /statuses:\s*write/);

  const types = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];
  for (const type of types) {
    assert.ok(
      semanticPrContent.includes(type),
      `semantic-pr.yml debe admitir el tipo '${type}'`,
    );
  }

  assert.match(
    semanticPrContent,
    /subjectPattern/,
    "semantic-pr.yml debe validar el patrón de asunto para exigir idioma coherente / español",
  );
});

test("REQ-CICD-01, REQ-CICD-02: Android CI workflow compiles Capacitor target and alerts Discord on failure", async () => {
  const androidCiContent = await readText(".github/workflows/android-ci.yml");

  assert.match(androidCiContent, /actions\/setup-java@v4/);
  assert.match(androidCiContent, /distribution:\s*'temurin'/);
  assert.match(androidCiContent, /java-version:\s*'21'/);
  assert.match(androidCiContent, /gradle\/actions\/setup-gradle@v4/);
  assert.match(androidCiContent, /cap sync android/);
  assert.match(androidCiContent, /assembleDebug lintDebug/);

  assert.match(androidCiContent, /1536936245643579462/, "Debe apuntar al canal de Discord #🚨-❙-alertas");
  assert.match(androidCiContent, /if:\s*failure\(\)/);
});

test("REQ-CICD-03, REQ-CICD-04: Bundle analysis workflow and size budgeting script", async () => {
  const bundleWorkflow = await readText(".github/workflows/bundle-analysis.yml");
  assert.match(bundleWorkflow, /node scripts\/check-bundle-size\.mjs/);

  // Unit test formatKb and getFileSize helpers
  assert.equal(formatKb(1024), "1.0 kB");
  assert.equal(formatKb(2048), "2.0 kB");

  const packageJsonSize = getFileSize(resolve("package.json"));
  assert.ok(packageJsonSize.raw > 0);
  assert.ok(packageJsonSize.gzip > 0);
  assert.ok(packageJsonSize.gzip < packageJsonSize.raw);

  // Check bundle calculation on current .next directory
  if (await exists(".next/build-manifest.json")) {
    const result = checkBundleSize({
      budgets: {
        maxSharedGzipKb: 500,
        maxSharedRawKb: 1500,
      },
    });

    assert.equal(result.passed, true);
    assert.ok(result.shared.rawBytes > 0);
    assert.ok(result.shared.gzipBytes > 0);
    assert.ok(result.routes.length > 0);
    assert.ok(result.markdown.includes("📦 Reporte de Tamaño de Bundle (Next.js)"));
    assert.ok(result.markdown.includes("First Load JS (Compartido)"));

    // Test budget failure handling
    const strictResult = checkBundleSize({
      budgets: {
        maxSharedGzipKb: 1, // Impose unrealistically tight budget
        maxSharedRawKb: 1,
      },
    });

    assert.equal(strictResult.passed, false);
    assert.ok(strictResult.errors.length >= 2);
    assert.ok(strictResult.markdown.includes("❌ Errores Bloqueantes"));
  }
});
