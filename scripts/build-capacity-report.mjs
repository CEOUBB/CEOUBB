import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { aggregateCapacityEvidence, CAPACITY_REQUIREMENTS } from "./capacity-config.mjs";

export const CAPACITY_REPORT_REQUIREMENTS = Object.freeze([
  ...CAPACITY_REQUIREMENTS,
  "Implements: REQ-OPS-CAP-03",
]);

export async function buildCapacityReport({ runId, resultsDirectory, telemetryPath }) {
  const paths = await walk(resolve(resultsDirectory));
  const summaries = [];
  for (const path of paths.filter((item) => /capacity-summary-\d+\.json$/.test(item))) {
    summaries.push(JSON.parse(await readFile(path, "utf8")));
  }
  summaries.sort((left, right) => left.shardIndex - right.shardIndex);
  const telemetry = await optionalJson(resolve(telemetryPath));
  const startedAt = minIso(summaries.map((summary) => summary.startedAt));
  const finishedAt = maxIso(summaries.map((summary) => summary.finishedAt));
  const evidence = aggregateCapacityEvidence({
    runId,
    summaries,
    firestoreReads: telemetry.firestoreReads,
    firestoreWrites: telemetry.firestoreWrites,
    startedAt,
    finishedAt,
  });
  return {
    requirements: CAPACITY_REPORT_REQUIREMENTS,
    evidence,
    telemetry: {
      firestoreRuleEvaluations: telemetry.firestoreRuleEvaluations ?? null,
      tursoUsage: telemetry.tursoUsage ?? null,
    },
    markdown: markdownEvidence(evidence, telemetry),
  };
}

export function markdownEvidence(evidence, telemetry = {}) {
  const status =
    evidence.verdict === "PASS"
      ? "APROBADA"
      : evidence.verdict === "FAIL"
        ? "FALLIDA"
        : "INCOMPLETA";
  const claim =
    evidence.verdict === "PASS"
      ? "La ejecución satisface los gates de capacidad P0.7 medidos en staging."
      : "Esta ejecución no autoriza afirmar que la capacidad institucional está demostrada.";
  return `# Evidencia de capacidad P0.7 — CEO-71

Estado: **${status}**

Run: \`${evidence.runId}\`

Intervalo: ${display(evidence.startedAt)} — ${display(evidence.finishedAt)}

${claim}

## Gates

| Indicador | Resultado | Meta |
| :--- | ---: | ---: |
| Shards ejecutados | ${evidence.executedShards} | 6 |
| VU concurrentes máximos | ${format(evidence.peakVirtualUsers)} | 3.000 |
| Sesiones autenticadas distintas | ${format(evidence.authenticatedSessions)} | 3.000 |
| Reintentos de autenticación fallidos | ${format(evidence.authenticationAttemptFailures)} | observado |
| Meseta | ${format(evidence.steadyStateSeconds)} s | >= 1.800 s |
| Desfase de inicio entre shards | ${decimal(evidence.startSkewSeconds)} s | <= 60 s |
| HTTP p95 conservador | ${milliseconds(evidence.httpP95Ms)} | <= 2.000 ms |
| HTTP p99 conservador | ${milliseconds(evidence.httpP99Ms)} | <= 4.000 ms |
| HTTP 5xx | ${percentage(evidence.http5xxRate)} | < 0,1% |
| Errores de autorización | ${format(evidence.authorizationErrors)} | 0 |
| Respuestas HTTP inesperadas | ${format(evidence.unexpectedResponses)} (${percentage(evidence.unexpectedResponseRate)}) | < 0,1% |
| Lecturas Firestore | ${format(evidence.firestoreReads)} | observado |
| Escrituras Firestore | ${format(evidence.firestoreWrites)} | observado |
| Lecturas por apertura simulada | ${decimal(evidence.firestoreReadsPerPortalOpen)} | <= 200 |
| Turso p95 directo | ${milliseconds(evidence.tursoP95Ms)} | informativo |
| Vercel p95 | ${milliseconds(evidence.vercelP95Ms)} | <= 2.000 ms |
| Firestore p95 cliente | ${milliseconds(evidence.firestoreP95Ms)} | informativo |
| Solicitudes Turso | ${format(evidence.tursoRequests)} | observado |
| Evaluaciones de reglas | ${format(telemetry.firestoreRuleEvaluations)} | observado |

## Proyección anual

| Concepto | Resultado |
| :--- | ---: |
| Ventanas punta por año | ${format(evidence.cost?.academicPeakWindowsPerYear)} |
| Presupuesto anual proyectado | USD ${format(evidence.cost?.annualBudgetUsd)} |
| Costo por estudiante-año | CLP ${format(evidence.cost?.annualClpPerStudent)} |
| Techo de decisión | CLP ${format(evidence.cost?.ceilingClpPerStudent)} |

La proyección usa 12.000 estudiantes activos, 20 ventanas punta equivalentes por año, CLP 1.000/USD, costos recurrentes no medidos de USD 4.017 y 25% de contingencia. Los créditos gratuitos o promocionales no reducen el run rate sostenible. Los precios Firestore de Santiago usados son USD 0,03 por 100.000 lecturas y USD 0,09 por 100.000 escrituras, con fecha 2026-08-30.

## Interpretación

- Los percentiles distribuidos usan el peor shard como gate conservador; los conteos se suman.
- Los reintentos transitorios del establecimiento inicial de sesión se informan aparte; el gate de autorización cuenta sólo denegaciones 401/403 durante la navegación ya autenticada.
- Cloud Monitoring incluye lecturas dependientes de reglas dentro del intervalo medido.
- La latencia Turso directa se separa de las rutas Vercel que también consultan Turso.
- El resultado sigue siendo evidencia de staging, no un SLA contractual ni una garantía de producción.
- RPO y RTO permanecen fuera de esta prueba y requieren el simulacro P0.8.

Fuentes metodológicas: \`docs/operations/capacity-cost-baseline.md\`, [métricas Firestore](https://cloud.google.com/monitoring/api/metrics_gcp_d_h), [precios Firestore](https://cloud.google.com/firestore/pricing), [ejecución distribuida k6](https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/), [usage Turso](https://docs.turso.tech/api-reference/databases/usage) y [bypass de automatización Vercel](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
`;
}

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const paths = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else paths.push(path);
  }
  return paths;
}

async function optionalJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

function minIso(values) {
  const valid = values.filter(Boolean).sort();
  return valid[0] ?? null;
}

function maxIso(values) {
  const valid = values.filter(Boolean).sort();
  return valid.at(-1) ?? null;
}

function format(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("es-CL").format(value) : "N/D";
}

function decimal(value) {
  return Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "N/D";
}

function milliseconds(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : "N/D";
}

function percentage(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(3).replace(".", ",")}%` : "N/D";
}

function display(value) {
  return value ?? "N/D";
}

async function main() {
  const result = await buildCapacityReport({
    runId: process.env.CAPACITY_RUN_ID ?? "unknown",
    resultsDirectory: process.env.CAPACITY_RESULTS_DIRECTORY ?? ".capacity/results",
    telemetryPath: process.env.CAPACITY_TELEMETRY_PATH ?? ".capacity/telemetry.json",
  });
  const jsonPath = resolve(process.env.CAPACITY_EVIDENCE_JSON ?? ".capacity/evidence.json");
  const markdownPath = resolve(
    process.env.CAPACITY_EVIDENCE_MARKDOWN ?? ".capacity/capacity-evidence.md"
  );
  await Promise.all([
    mkdir(dirname(jsonPath), { recursive: true }),
    mkdir(dirname(markdownPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, result.markdown, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify(result.evidence)}\n`);
  const incompleteAllowed =
    process.env.CAPACITY_ALLOW_INCOMPLETE === "1" && result.evidence.verdict === "INCOMPLETE";
  if (result.evidence.verdict !== "PASS" && !incompleteAllowed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "CAPACITY_TELEMETRY_MISSING"}\n`
  );
  process.exitCode = 1;
});
