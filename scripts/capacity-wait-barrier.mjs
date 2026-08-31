import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CAPACITY_BARRIER_REQUIREMENTS = Object.freeze([
  "Implements: REQ-OPS-LOAD-02",
  "Implements: REQ-OPS-LOAD-06",
]);

export function capacityBarrierSchedule({
  createdAt,
  delaySeconds = 1_200,
  maximumLatenessSeconds = 15,
  now = Date.now(),
}) {
  const createdTime = new Date(createdAt).getTime();
  const delay = Number(delaySeconds);
  const maximumLateness = Number(maximumLatenessSeconds);
  if (
    !Number.isFinite(createdTime) ||
    !Number.isFinite(delay) ||
    delay < 0 ||
    !Number.isFinite(maximumLateness) ||
    maximumLateness < 0
  ) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: barrera temporal inválida.");
  }
  const startTime = createdTime + delay * 1_000;
  const remainingMs = startTime - Number(now);
  if (remainingMs < maximumLateness * -1_000) {
    throw new Error("CAPACITY_BARRIER_MISSED: el shard llegó tarde a la carga sincronizada.");
  }
  return {
    startAt: new Date(startTime).toISOString(),
    remainingMs: Math.max(0, remainingMs),
    maximumLatenessSeconds: maximumLateness,
  };
}

export async function waitForCapacityBarrier(schedule, wait = setTimeout) {
  const deadline = Date.now() + schedule.remainingMs;
  while (Date.now() < deadline) {
    await new Promise((resolveWait) => wait(resolveWait, Math.min(60_000, deadline - Date.now())));
  }
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const token = process.env.GH_TOKEN;
  if (repository !== "CEOUBB/CEOUBB" || !/^\d+$/.test(runId ?? "") || !token) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: contexto de GitHub Actions incompleto.");
  }
  const apiUrl = new URL(
    `/repos/${repository}/actions/runs/${runId}`,
    process.env.GITHUB_API_URL ?? "https://api.github.com"
  );
  if (apiUrl.origin !== "https://api.github.com") {
    throw new Error("CAPACITY_TARGET_REJECTED: API de coordinación no canónica.");
  }
  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`CAPACITY_CONFIG_INCOMPLETE: no fue posible leer el run (${response.status}).`);
  }
  const run = await response.json();
  const schedule = capacityBarrierSchedule({
    createdAt: run.created_at,
    delaySeconds: process.env.CAPACITY_BARRIER_DELAY_SECONDS ?? 1_200,
    maximumLatenessSeconds: process.env.CAPACITY_BARRIER_MAX_LATENESS_SECONDS ?? 15,
  });
  process.stdout.write(`${JSON.stringify({ startAt: schedule.startAt })}\n`);
  await waitForCapacityBarrier(schedule);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "CAPACITY_CONFIG_INCOMPLETE"}\n`
    );
    process.exitCode = 1;
  });
}
