// Implements: REQ-CICD-08, REQ-CICD-09, REQ-CICD-10
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { checkBundleSize, formatKb, getFileSize } from "../scripts/check-bundle-size.mjs";
import "./firebase-rules-config.test.ts";

const REQUIRED_WORKFLOWS = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/android-ci.yml",
  ".github/workflows/semantic-pr.yml",
  ".github/workflows/labeler.yml",
  ".github/workflows/bundle-analysis.yml",
  ".github/workflows/react-doctor.yml",
  ".github/workflows/semgrep.yml",
  ".github/workflows/draft-release.yml",
  ".github/workflows/release-android.yml",
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
    assert.ok(
      !content.includes("\t"),
      `${workflowPath} no debe contener tabulaciones (YAML inválido)`
    );

    // Invariante de versiones oficiales válidas de GitHub Actions
    assert.ok(
      !content.includes("actions/checkout@v7"),
      `${workflowPath} debe usar actions/checkout@v4`
    );
    assert.ok(
      !content.includes("actions/setup-node@v7"),
      `${workflowPath} debe usar actions/setup-node@v4`
    );
    assert.ok(
      !content.includes("actions/github-script@v9"),
      `${workflowPath} debe usar actions/github-script@v7`
    );
    assert.ok(
      !content.includes("pnpm/action-setup@v6"),
      `${workflowPath} debe usar pnpm/action-setup@v4`
    );
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
      `.github/labeler.yml debe definir la etiqueta "${label}"`
    );
  }

  assert.ok(labelerConfig.includes("android/**"), "Mobile label must map android/**");
  assert.ok(
    labelerConfig.includes("capacitor.config.ts"),
    "Mobile label must map capacitor.config.ts"
  );
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

  const types = [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "revert",
  ];
  for (const type of types) {
    assert.ok(semanticPrContent.includes(type), `semantic-pr.yml debe admitir el tipo '${type}'`);
  }

  assert.match(
    semanticPrContent,
    /subjectPattern/,
    "semantic-pr.yml debe validar el patrón de asunto para exigir idioma coherente / español"
  );
});

test("REQ-CICD-01, REQ-CICD-02: Android CI workflow compiles Capacitor target and alerts Discord on failure", async () => {
  const androidCiContent = await readText(".github/workflows/android-ci.yml");

  assert.match(androidCiContent, /actions\/setup-java@v4/);
  assert.match(androidCiContent, /distribution:\s*['"]temurin['"]/);
  assert.match(androidCiContent, /java-version:\s*['"]21['"]/);
  assert.match(androidCiContent, /gradle\/actions\/setup-gradle@v4/);
  assert.match(androidCiContent, /cap sync android/);
  assert.match(androidCiContent, /chmod \+x android\/gradlew/);
  assert.match(androidCiContent, /assembleDebug lintDebug/);

  assert.match(
    androidCiContent,
    /1536936245643579462/,
    "Debe apuntar al canal de Discord #🚨-❙-alertas"
  );
  assert.match(androidCiContent, /if:\s*failure\(\)/);

  // Invariante de portabilidad de entorno Android / Gradle
  const gradleProperties = await readText("android/gradle.properties");
  assert.ok(
    !gradleProperties.includes("org.gradle.java.home"),
    "android/gradle.properties no debe contener org.gradle.java.home con rutas locales absolutas que rompan CI"
  );
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

test("REQ-ENT-04: Repository governance files exist and contain required enterprise content", async () => {
  const governanceFiles = [
    ".editorconfig",
    ".gitattributes",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "LICENSE",
    ".github/CODEOWNERS",
  ];

  for (const file of governanceFiles) {
    const fileExists = await exists(file);
    assert.ok(fileExists, `El archivo de gobernanza requerido no existe: ${file}`);
    const content = await readText(file);
    assert.ok(content.trim().length > 0, `El archivo de gobernanza está vacío: ${file}`);
  }

  // Verificar directivas clave de .editorconfig
  const editorConfig = await readText(".editorconfig");
  assert.match(editorConfig, /root\s*=\s*true/);
  assert.match(editorConfig, /end_of_line\s*=\s*lf/);
  assert.match(editorConfig, /indent_size\s*=\s*2/);
  assert.match(editorConfig, /charset\s*=\s*utf-8/);

  // Verificar normalización y binarios en .gitattributes
  const gitAttributes = await readText(".gitattributes");
  assert.match(gitAttributes, /\*\s+text=auto\s+eol=lf/);
  assert.match(gitAttributes, /\*\.jks\s+binary/);
  assert.match(gitAttributes, /\*\.db\s+binary/);

  // Verificar guías de contribución y seguridad
  const contributing = await readText("CONTRIBUTING.md");
  assert.match(contributing, /Conventional Commits/i);
  assert.match(contributing, /pnpm/);

  const security = await readText("SECURITY.md");
  assert.match(security, /19\.628/);
  assert.match(security, /21\.719/);
  assert.match(security, /felipearce\.2004@gmail\.com/);

  const codeowners = await readText(".github/CODEOWNERS");
  assert.match(codeowners, /\/android\//);
  assert.match(codeowners, /\/firebase\//);
  assert.match(codeowners, /\/lib\/access-policy\.ts/);
});

test("REQ-ENT-05: GitHub Issue Templates and PR Template are properly configured", async () => {
  const issueTemplates = [
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
  ];

  for (const templatePath of issueTemplates) {
    const fileExists = await exists(templatePath);
    assert.ok(fileExists, `La plantilla requerida no existe: ${templatePath}`);
    const content = await readText(templatePath);
    assert.ok(content.trim().length > 0, `La plantilla está vacía: ${templatePath}`);
  }

  // Verificar estructura de bug_report.yml
  const bugReport = await readText(".github/ISSUE_TEMPLATE/bug_report.yml");
  assert.match(bugReport, /name:\s+/);
  assert.match(bugReport, /title:\s*"\[Bug\]:\s*"/);
  assert.match(bugReport, /id:\s*platform/);
  assert.match(bugReport, /id:\s*steps_to_reproduce/);
  assert.match(bugReport, /id:\s*expected_behavior/);
  assert.match(bugReport, /id:\s*actual_behavior/);

  // Verificar estructura de feature_request.yml
  const featureRequest = await readText(".github/ISSUE_TEMPLATE/feature_request.yml");
  assert.match(featureRequest, /name:\s+/);
  assert.match(featureRequest, /title:\s*"\[Feat\]:\s*"/);
  assert.match(featureRequest, /id:\s*category/);
  assert.match(featureRequest, /id:\s*problem_statement/);
  assert.match(featureRequest, /id:\s*proposed_solution/);

  // Verificar config.yml (deshabilitar issues en blanco)
  const configYml = await readText(".github/ISSUE_TEMPLATE/config.yml");
  assert.match(configYml, /blank_issues_enabled:\s*false/);
  assert.match(configYml, /contact_links:/);

  // Verificar PULL_REQUEST_TEMPLATE.md enterprise
  const prTemplate = await readText(".github/PULL_REQUEST_TEMPLATE.md");
  assert.match(prTemplate, /Resumen del Cambio/i);
  assert.match(prTemplate, /Checklist Técnico/i);
  assert.match(prTemplate, /Seguridad, Privacidad y Gobernanza/i);
  assert.match(prTemplate, /Accesibilidad\s*\(WCAG 2\.2 AA\)/i);
  assert.match(prTemplate, /Consideraciones Móviles/i);
});

test("REQ-ENT-06: Dependabot monitors root npm, GitHub Actions, Firebase Functions, and Android Gradle", async () => {
  const dependabotExists = await exists(".github/dependabot.yml");
  assert.ok(dependabotExists, ".github/dependabot.yml debe existir");

  const dependabotContent = await readText(".github/dependabot.yml");
  assert.match(dependabotContent, /version:\s*2/);

  // Verificar los 4 ecosistemas/directorios requeridos
  assert.ok(
    dependabotContent.includes('directory: "/"') &&
      dependabotContent.includes('package-ecosystem: "npm"'),
    "Dependabot debe monitorizar npm en la raíz /"
  );
  assert.ok(
    dependabotContent.includes('package-ecosystem: "github-actions"'),
    "Dependabot debe monitorizar github-actions en /"
  );
  assert.ok(
    dependabotContent.includes('directory: "/firebase/functions"'),
    "Dependabot debe monitorizar /firebase/functions"
  );
  assert.ok(
    dependabotContent.includes('directory: "/android"') &&
      dependabotContent.includes('package-ecosystem: "gradle"'),
    "Dependabot debe monitorizar gradle en /android"
  );
});

test("REQ-ENT-07: Code formatting and TypeScript casing configurations", async () => {
  const prettierrcExists = await exists(".prettierrc.json");
  assert.ok(prettierrcExists, ".prettierrc.json debe existir");

  const prettierrcContent = await readText(".prettierrc.json");
  const prettierConfig = JSON.parse(prettierrcContent);
  assert.equal(prettierConfig.semi, true);
  assert.equal(prettierConfig.singleQuote, false);
  assert.equal(prettierConfig.tabWidth, 2);
  assert.equal(prettierConfig.trailingComma, "es5");
  assert.equal(prettierConfig.printWidth, 100);

  const prettierignoreExists = await exists(".prettierignore");
  assert.ok(prettierignoreExists, ".prettierignore debe existir");
  const prettierignoreContent = await readText(".prettierignore");
  assert.match(prettierignoreContent, /\.next/);
  assert.match(prettierignoreContent, /node_modules/);
  assert.match(prettierignoreContent, /android/);
  assert.match(prettierignoreContent, /pnpm-lock\.yaml/);

  const packageJsonContent = await readText("package.json");
  const packageJson = JSON.parse(packageJsonContent);
  assert.ok(packageJson.scripts["format:check"], "package.json debe definir script 'format:check'");
  assert.ok(packageJson.scripts["format"], "package.json debe definir script 'format'");

  const tsconfigContent = await readText("tsconfig.json");
  assert.match(
    tsconfigContent,
    /"forceConsistentCasingInFileNames":\s*true/,
    "tsconfig.json debe configurar forceConsistentCasingInFileNames en true"
  );
});

test("REQ-ENT-01, REQ-ENT-02, REQ-ENT-03: Documentation consolidation and unified Design System", async () => {
  // REQ-ENT-01: DESIGN.md unificado y design-ceoubb.md eliminado
  const designExists = await exists("DESIGN.md");
  assert.ok(
    designExists,
    "DESIGN.md debe existir como la única fuente canónica del sistema de diseño"
  );
  const oldDesignExists = await exists("design-ceoubb.md");
  assert.equal(oldDesignExists, false, "design-ceoubb.md debe haber sido eliminado");

  const designContent = await readText("DESIGN.md");
  assert.match(designContent, /CEOUBB Design System/i);
  assert.match(designContent, /canvas-soft/);
  assert.match(designContent, /primary/);
  assert.match(designContent, /Merriweather/);

  // REQ-ENT-02: Dossier y Archive organizados bajo docs/
  const comparisonExists = await exists("docs/institutional/moodle-adecca-comparison.md");
  assert.ok(comparisonExists, "docs/institutional/moodle-adecca-comparison.md debe existir");
  const oldComparisonExists = await exists("ceoubb_moodle_adecca_comparison.md");
  assert.equal(
    oldComparisonExists,
    false,
    "ceoubb_moodle_adecca_comparison.md en la raíz debe haberse movido"
  );

  const planArchiveExists = await exists("docs/archive/PLAN_ARCHIVE.md");
  assert.ok(planArchiveExists, "docs/archive/PLAN_ARCHIVE.md debe existir");
  const oldPlanArchiveExists = await exists("PLAN_ARCHIVE.md");
  assert.equal(oldPlanArchiveExists, false, "PLAN_ARCHIVE.md en la raíz debe haberse movido");

  // REQ-ENT-03: PLAN.md referencia las nuevas ubicaciones
  const planContent = await readText("PLAN.md");
  assert.match(planContent, /docs\/institutional\/moodle-adecca-comparison\.md/);
  assert.match(planContent, /docs\/archive\/PLAN_ARCHIVE\.md/);
  assert.match(planContent, /DESIGN\.md/);
});

test("REQ-ENT-08: Architectural Decision Records (ADRs) exist and follow formal structure", async () => {
  const adrFiles = [
    "docs/adr/0001-turso-firestore-split.md",
    "docs/adr/0002-capacitor-mobile-runtime.md",
    "docs/adr/0003-domain-role-derivation.md",
  ];

  for (const adrPath of adrFiles) {
    const fileExists = await exists(adrPath);
    assert.ok(fileExists, `El ADR requerido no existe: ${adrPath}`);
    const content = await readText(adrPath);
    assert.ok(content.trim().length > 0, `El ADR está vacío: ${adrPath}`);
    assert.match(content, /## Contexto/i, `El ADR ${adrPath} debe contener sección Contexto`);
    assert.match(content, /## Decisión/i, `El ADR ${adrPath} debe contener sección Decisión`);
    assert.match(
      content,
      /## Consecuencias/i,
      `El ADR ${adrPath} debe contener sección Consecuencias`
    );
  }

  // Verificaciones de contenido específico por ADR
  const adr1 = await readText("docs/adr/0001-turso-firestore-split.md");
  assert.match(adr1, /Turso/i);
  assert.match(adr1, /Firestore/i);
  assert.match(adr1, /System of Record/i);

  const adr2 = await readText("docs/adr/0002-capacitor-mobile-runtime.md");
  assert.match(adr2, /Capacitor/i);
  assert.match(adr2, /Service Worker/i);
  assert.match(adr2, /Remote-First/i);

  const adr3 = await readText("docs/adr/0003-domain-role-derivation.md");
  assert.match(adr3, /access-policy\.ts/);
  assert.match(adr3, /@ubiobio\.cl/);
  assert.match(adr3, /@alumnos\.ubiobio\.cl/);
});

test("REQ-SEC-01, REQ-SEC-02: Hardening de cadena de suministro y fijación inmutable en workflows de CI/CD", async () => {
  // 1. Inmutabilidad de pr-agent (SHA 40 caracteres y prohibición de @main)
  const prAgentContent = await readText(".github/workflows/pr-agent.yml");
  assert.match(
    prAgentContent,
    /qodo-ai\/pr-agent@[a-f0-9]{40}/,
    "pr-agent.yml debe usar un commit SHA inmutable de 40 caracteres"
  );
  assert.ok(
    !prAgentContent.includes("qodo-ai/pr-agent@main"),
    "pr-agent.yml no debe usar la rama mutable @main"
  );

  // 2. Fijación determinista de firebase-tools (prohibición de @latest)
  const firebaseReleaseContent = await readText(".github/workflows/firebase-release.yml");
  assert.match(
    firebaseReleaseContent,
    /firebase-tools@13\.\d+\.\d+/,
    "firebase-release.yml debe anclar una versión exacta de firebase-tools"
  );
  assert.ok(
    !firebaseReleaseContent.includes("firebase-tools@latest"),
    "firebase-release.yml no debe usar la versión mutable @latest"
  );

  // 3. Protección de variables de entorno en despliegues de Cloudflare Workers
  const deployContent = await readText(".github/workflows/deploy.yml");
  assert.ok(
    deployContent.includes("wrangler deploy --minify --keep-vars"),
    "deploy.yml debe incluir la bandera --keep-vars en wrangler deploy"
  );
});

test("REQ-SEC-06: Aislamiento estricto de workflows de pruebas de carga masiva en CI/CD", async () => {
  const capacityWorkflow = await readText(".github/workflows/capacity-load-test.yml");
  assert.match(
    capacityWorkflow,
    /workflow_dispatch:/,
    "capacity-load-test.yml debe declarar disparador manual workflow_dispatch"
  );
  assert.ok(
    !capacityWorkflow.includes("pull_request:"),
    "capacity-load-test.yml no debe dispararse automáticamente ante pull_request"
  );
  assert.ok(
    !capacityWorkflow.includes("head_ref"),
    "capacity-load-test.yml no debe condicionar ejecuciones destructivas por nombre de rama"
  );
  assert.match(
    capacityWorkflow,
    /confirm_staging:/,
    "capacity-load-test.yml debe exigir parámetro de confirmación explícito"
  );
});

test("REQ-CICD-09: All workflow jobs declare explicit timeout-minutes <= 30", async () => {
  for (const workflowPath of REQUIRED_WORKFLOWS) {
    const content = await readText(workflowPath);
    assert.match(
      content,
      /timeout-minutes:\s*\d+/,
      `${workflowPath} debe declarar 'timeout-minutes' en sus jobs`
    );
  }
});

test("REQ-CICD-10: Workflows with concurrency do not cancel in progress on main branch", async () => {
  const workflowsWithConcurrency = [
    ".github/workflows/ci.yml",
    ".github/workflows/deploy.yml",
    ".github/workflows/android-ci.yml",
    ".github/workflows/bundle-analysis.yml",
    ".github/workflows/semgrep.yml",
    ".github/workflows/react-doctor.yml",
  ];

  for (const workflowPath of workflowsWithConcurrency) {
    const content = await readText(workflowPath);
    assert.ok(
      !content.includes("cancel-in-progress: true\n") &&
        !content.includes("cancel-in-progress: true\r\n"),
      `${workflowPath} no debe declarar cancel-in-progress: true incondicional (cancela runs legítimos en main)`
    );
  }
});
