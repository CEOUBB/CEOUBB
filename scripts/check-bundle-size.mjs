// Implements: REQ-CICD-03, REQ-CICD-04
import { existsSync, readFileSync, readdirSync, appendFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

export const DEFAULT_BUDGETS = {
  maxSharedGzipKb: Number(process.env.BUNDLE_MAX_SHARED_GZIP_KB) || 350,
  maxSharedRawKb: Number(process.env.BUNDLE_MAX_SHARED_RAW_KB) || 1100,
  maxRouteGzipKb: Number(process.env.BUNDLE_MAX_ROUTE_GZIP_KB) || 450,
  maxRouteRawKb: Number(process.env.BUNDLE_MAX_ROUTE_RAW_KB) || 1400,
};

// Platform packages validation for tooling
export async function checkPlatformDependencies() {
  return Promise.allSettled([
    import("@capacitor/android/package.json", { with: { type: "json" } }),
    import("@capacitor/ios/package.json", { with: { type: "json" } }),
  ]);
}

/**
 * Format bytes to readable kilobytes (kB)
 */
export function formatKb(bytes) {
  return (bytes / 1024).toFixed(1) + " kB";
}

/**
 * Calculates raw and gzipped size of a file in bytes.
 */
export function getFileSize(filePath) {
  try {
    if (!existsSync(filePath)) return { raw: 0, gzip: 0 };
    const content = readFileSync(filePath);
    const gzipped = gzipSync(content);
    return { raw: content.length, gzip: gzipped.length };
  } catch {
    return { raw: 0, gzip: 0 };
  }
}

/**
 * Analyzes .next build artifacts and checks sizes against performance budgets.
 */
export function checkBundleSize(options = {}) {
  const nextDir = resolve(options.nextDir || ".next");
  const budgets = { ...DEFAULT_BUDGETS, ...options.budgets };
  const stepSummaryFile = options.stepSummaryFile || process.env.GITHUB_STEP_SUMMARY;

  const buildManifestPath = join(nextDir, "build-manifest.json");
  if (!existsSync(buildManifestPath)) {
    throw new Error(
      `No se encontró el manifiesto de build en "${buildManifestPath}". Ejecuta 'next build' primero.`
    );
  }

  const buildManifest = JSON.parse(readFileSync(buildManifestPath, "utf8"));
  const polyfillFiles = buildManifest.polyfillFiles || [];
  const rootMainFiles = buildManifest.rootMainFiles || [];
  const sharedFiles = Array.from(new Set([...polyfillFiles, ...rootMainFiles]));

  let sharedRawBytes = 0;
  let sharedGzipBytes = 0;
  const sharedBreakdown = [];

  for (const file of sharedFiles) {
    const filePath = join(nextDir, file);
    const size = getFileSize(filePath);
    sharedRawBytes += size.raw;
    sharedGzipBytes += size.gzip;
    sharedBreakdown.push({ file, ...size });
  }

  const sharedGzipKb = sharedGzipBytes / 1024;
  const sharedRawKb = sharedRawBytes / 1024;

  const isSharedGzipOver = sharedGzipKb > budgets.maxSharedGzipKb;
  const isSharedRawOver = sharedRawKb > budgets.maxSharedRawKb;
  const isSharedGzipWarn = sharedGzipKb > budgets.maxSharedGzipKb * 0.85;

  let sharedStatus = "✅ Óptimo";
  if (isSharedGzipOver || isSharedRawOver) {
    sharedStatus = "❌ Excedido";
  } else if (isSharedGzipWarn) {
    sharedStatus = "⚠️ Alerta (>85%)";
  }

  // Analyze App Router pages and routes
  const appPathRoutesPath = join(nextDir, "app-path-routes-manifest.json");
  const routesManifestPath = join(nextDir, "routes-manifest.json");
  const routes = [];

  let routeEntries = {};
  if (existsSync(appPathRoutesPath)) {
    try {
      routeEntries = JSON.parse(readFileSync(appPathRoutesPath, "utf8"));
    } catch {
      routeEntries = {};
    }
  } else if (existsSync(routesManifestPath)) {
    try {
      const rm = JSON.parse(readFileSync(routesManifestPath, "utf8"));
      if (Array.isArray(rm.staticRoutes)) {
        for (const sr of rm.staticRoutes) {
          routeEntries[sr.page] = sr.page;
        }
      }
    } catch {
      routeEntries = {};
    }
  }

  for (const [appKey, routePath] of Object.entries(routeEntries)) {
    // Check if route has dedicated manifest
    let routeChunkFiles = [];
    const serverAppBuildManifest = join(
      nextDir,
      "server",
      "app",
      appKey.replace(/^\//, ""),
      "build-manifest.json"
    );
    if (existsSync(serverAppBuildManifest)) {
      try {
        const sm = JSON.parse(readFileSync(serverAppBuildManifest, "utf8"));
        routeChunkFiles = sm.rootMainFiles || [];
      } catch {
        routeChunkFiles = [];
      }
    }

    let routeRaw = sharedRawBytes;
    let routeGzip = sharedGzipBytes;

    for (const f of routeChunkFiles) {
      if (!sharedFiles.includes(f)) {
        const sz = getFileSize(join(nextDir, f));
        routeRaw += sz.raw;
        routeGzip += sz.gzip;
      }
    }

    const routeGzipKb = routeGzip / 1024;
    let status = "✅ Óptimo";
    if (routeGzipKb > budgets.maxRouteGzipKb) {
      status = "❌ Excedido";
    } else if (routeGzipKb > budgets.maxRouteGzipKb * 0.85) {
      status = "⚠️ Alerta";
    }

    routes.push({
      route: routePath,
      appKey,
      rawBytes: routeRaw,
      gzipBytes: routeGzip,
      status,
    });
  }

  // Scan all static files in .next/static/chunks
  const staticChunksDir = join(nextDir, "static", "chunks");
  let totalChunksRaw = 0;
  let totalChunksGzip = 0;
  let totalChunksCount = 0;

  function scanChunks(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanChunks(p);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".css"))) {
        const sz = getFileSize(p);
        totalChunksRaw += sz.raw;
        totalChunksGzip += sz.gzip;
        totalChunksCount++;
      }
    }
  }

  scanChunks(staticChunksDir);

  const errors = [];
  const warnings = [];

  if (isSharedGzipOver) {
    errors.push(
      `First Load JS compartido (${formatKb(sharedGzipBytes)}) supera el límite de ${budgets.maxSharedGzipKb} kB gzipped.`
    );
  }
  if (isSharedRawOver) {
    errors.push(
      `First Load JS compartido (${formatKb(sharedRawBytes)}) supera el límite de ${budgets.maxSharedRawKb} kB sin comprimir.`
    );
  }
  if (isSharedGzipWarn && !isSharedGzipOver) {
    warnings.push(
      `First Load JS compartido (${formatKb(sharedGzipBytes)}) está cerca del límite (${budgets.maxSharedGzipKb} kB).`
    );
  }

  const passed = errors.length === 0;

  // Generate Markdown table
  let markdown = `## 📦 Reporte de Tamaño de Bundle (Next.js)\n\n`;
  markdown += `> **Estado General:** ${passed ? "✅ Cumple con el presupuesto de rendimiento" : "❌ Presupuesto de rendimiento excedido"}\n\n`;
  markdown += `| Recurso / Métrica | Tamaño Raw | Tamaño Gzip | Presupuesto Gzip | Estado |\n`;
  markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;
  markdown += `| **First Load JS (Compartido)** | \`${formatKb(sharedRawBytes)}\` | **\`${formatKb(sharedGzipBytes)}\`** | \`${budgets.maxSharedGzipKb} kB\` | ${sharedStatus} |\n`;
  markdown += `| **Total Chunks Estáticos (${totalChunksCount} archivos)** | \`${formatKb(totalChunksRaw)}\` | \`${formatKb(totalChunksGzip)}\` | — | ℹ️ Info |\n\n`;

  if (routes.length > 0) {
    markdown += `### 🗺️ First Load JS por Ruta\n\n`;
    markdown += `| Ruta | Tamaño Raw | Tamaño Gzip | Estado |\n`;
    markdown += `| :--- | :--- | :--- | :--- |\n`;
    for (const r of routes) {
      markdown += `| \`${r.route}\` | \`${formatKb(r.rawBytes)}\` | \`${formatKb(r.gzipBytes)}\` | ${r.status} |\n`;
    }
    markdown += `\n`;
  }

  if (errors.length > 0) {
    markdown += `### ❌ Errores Bloqueantes\n\n`;
    for (const err of errors) {
      markdown += `- ${err}\n`;
    }
    markdown += `\n`;
  }

  if (warnings.length > 0) {
    markdown += `### ⚠️ Advertencias de Rendimiento\n\n`;
    for (const warn of warnings) {
      markdown += `- ${warn}\n`;
    }
    markdown += `\n`;
  }

  if (stepSummaryFile) {
    try {
      appendFileSync(stepSummaryFile, markdown, "utf8");
    } catch (e) {
      console.warn("No se pudo escribir en GITHUB_STEP_SUMMARY:", e.message);
    }
  }

  return {
    passed,
    shared: {
      rawBytes: sharedRawBytes,
      gzipBytes: sharedGzipBytes,
      rawKb: sharedRawKb,
      gzipKb: sharedGzipKb,
      files: sharedBreakdown,
      status: sharedStatus,
    },
    totalChunks: {
      count: totalChunksCount,
      rawBytes: totalChunksRaw,
      gzipBytes: totalChunksGzip,
    },
    routes,
    errors,
    warnings,
    markdown,
  };
}

// CLI Execution entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    console.log("\n🔍 Verificando presupuesto de tamaño de bundle Next.js...\n");
    const result = checkBundleSize();

    console.log(
      `• First Load JS Compartido: ${formatKb(result.shared.rawBytes)} raw / ${formatKb(result.shared.gzipBytes)} gzip (${result.shared.status})`
    );
    console.log(
      `• Chunks Estáticos Totales: ${result.totalChunks.count} archivos, ${formatKb(result.totalChunks.rawBytes)} raw / ${formatKb(result.totalChunks.gzipBytes)} gzip`
    );
    console.log(`• Rutas analizadas: ${result.routes.length}`);

    if (result.warnings.length > 0) {
      console.log("\n⚠️ Advertencias:");
      result.warnings.forEach((w) => console.log(`  - ${w}`));
    }

    if (!result.passed) {
      console.error("\n❌ ERRORES DE PRESUPUESTO DE BUNDLE:");
      result.errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }

    console.log(
      "\n✅ Verificación de tamaño de bundle exitosa. Todos los presupuestos se cumplen.\n"
    );
  } catch (error) {
    console.error("\n❌ Error ejecutando chequeo de bundle:", error.message);
    process.exit(1);
  }
}
