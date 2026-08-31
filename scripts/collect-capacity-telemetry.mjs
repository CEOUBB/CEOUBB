import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const CAPACITY_TELEMETRY_REQUIREMENTS = Object.freeze([
  "Implements: REQ-OPS-LOAD-04",
  "Implements: REQ-OPS-LOAD-05",
]);

export async function collectCapacityTelemetry(options) {
  const projectId = options.firebaseProjectId;
  if (projectId !== "centro-de-estudio-ubb-staging") {
    throw new Error("CAPACITY_TARGET_REJECTED: Cloud Monitoring no identifica staging.");
  }
  const startedAt = new Date(options.startedAt);
  const finishedAt = new Date(options.finishedAt);
  if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(finishedAt.getTime())) {
    throw new Error("CAPACITY_TELEMETRY_MISSING: intervalo de medición inválido.");
  }
  const [firestoreReads, firestoreWrites, rulesEvaluations, tursoUsage] = await Promise.all([
    monitoringDelta({
      projectId,
      bearerToken: options.googleAccessToken,
      metric: "firestore.googleapis.com/document/read_count",
      startedAt,
      finishedAt,
      retries: options.retries,
    }),
    monitoringDelta({
      projectId,
      bearerToken: options.googleAccessToken,
      metric: "firestore.googleapis.com/document/write_count",
      startedAt,
      finishedAt,
      retries: options.retries,
    }),
    monitoringDelta({
      projectId,
      bearerToken: options.googleAccessToken,
      metric: "firestore.googleapis.com/rules/evaluation_count",
      startedAt,
      finishedAt,
      retries: options.retries,
    }),
    options.tursoPlatformToken
      ? tursoUsageDelta({
          token: options.tursoPlatformToken,
          organization: options.tursoOrganization,
          database: "ceoubb-staging",
          startedAt,
          finishedAt,
        })
      : Promise.resolve(null),
  ]);
  return {
    requirements: CAPACITY_TELEMETRY_REQUIREMENTS,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    firestoreReads,
    firestoreWrites,
    firestoreRuleEvaluations: rulesEvaluations,
    tursoUsage,
  };
}

export async function monitoringDelta({
  projectId,
  bearerToken,
  metric,
  startedAt,
  finishedAt,
  retries = 10,
}) {
  if (!bearerToken) return null;
  const expandedEnd = new Date(finishedAt.getTime() + 60_000);
  const url = new URL(`https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries`);
  url.searchParams.set("filter", `metric.type="${metric}"`);
  url.searchParams.set("interval.startTime", startedAt.toISOString());
  url.searchParams.set("interval.endTime", expandedEnd.toISOString());
  url.searchParams.set("aggregation.alignmentPeriod", "60s");
  url.searchParams.set("aggregation.perSeriesAligner", "ALIGN_SUM");
  url.searchParams.set("aggregation.crossSeriesReducer", "REDUCE_SUM");
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (response.ok) {
      const body = await response.json();
      const values = (body.timeSeries ?? []).flatMap((series) =>
        (series.points ?? []).map((point) =>
          Number(point.value?.int64Value ?? point.value?.doubleValue ?? 0)
        )
      );
      if (values.length > 0) return values.reduce((total, value) => total + value, 0);
    } else if (![429, 500, 502, 503, 504].includes(response.status)) {
      return null;
    }
    if (attempt + 1 < retries) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 30_000));
    }
  }
  return null;
}

export async function tursoUsageDelta({ token, organization, database, startedAt, finishedAt }) {
  if (!token || !organization) return null;
  const url = new URL(
    `https://api.turso.tech/v1/organizations/${encodeURIComponent(organization)}/databases/${encodeURIComponent(database)}/usage`
  );
  url.searchParams.set("from", startedAt.toISOString());
  url.searchParams.set("to", finishedAt.toISOString());
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const body = await response.json();
  return body.database?.total ?? null;
}

async function main() {
  const interval = await capacityInterval(
    process.env.CAPACITY_RESULTS_DIRECTORY ?? ".capacity/results"
  );
  const telemetry = await collectCapacityTelemetry({
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    googleAccessToken: process.env.FIREBASE_ACCESS_TOKEN,
    tursoPlatformToken: process.env.TURSO_PLATFORM_API_TOKEN,
    tursoOrganization: process.env.TURSO_ORGANIZATION,
    startedAt: process.env.CAPACITY_STARTED_AT ?? interval.startedAt,
    finishedAt: process.env.CAPACITY_FINISHED_AT ?? interval.finishedAt,
  });
  const output = resolve(process.env.CAPACITY_TELEMETRY_PATH ?? ".capacity/telemetry.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(telemetry, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({
      firestoreReads: telemetry.firestoreReads,
      firestoreWrites: telemetry.firestoreWrites,
      firestoreRuleEvaluations: telemetry.firestoreRuleEvaluations,
      tursoUsageAvailable: telemetry.tursoUsage !== null,
    })}\n`
  );
}

async function capacityInterval(directory) {
  const summaries = [];
  for (const path of await walk(resolve(directory))) {
    if (/capacity-summary-\d+\.json$/.test(path)) {
      summaries.push(JSON.parse(await readFile(path, "utf8")));
    }
  }
  const starts = summaries
    .map((summary) => summary.startedAt)
    .filter(Boolean)
    .sort();
  const finishes = summaries
    .map((summary) => summary.finishedAt)
    .filter(Boolean)
    .sort();
  if (starts.length === 0 || finishes.length === 0) {
    throw new Error("CAPACITY_TELEMETRY_MISSING: no existen intervalos de shards.");
  }
  return { startedAt: starts[0], finishedAt: finishes.at(-1) };
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

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "CAPACITY_TELEMETRY_MISSING"}\n`
  );
  process.exitCode = 1;
});
