import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";

export const CAPACITY_VERCEL_REQUIREMENTS = Object.freeze([
  "Implements: REQ-OPS-LOAD-01",
  "Implements: REQ-OPS-LOAD-06",
]);

export async function updateVercelBypass({ mode, projectId, teamId, token, secret }) {
  if (!projectId || !teamId || !token) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: faltan credenciales Vercel para el bypass.");
  }
  const selectedSecret = mode === "generate" ? randomBytes(16).toString("hex") : secret;
  if (!selectedSecret || !/^[a-zA-Z0-9]{32}$/.test(selectedSecret)) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: el bypass Vercel no es válido.");
  }
  const url = new URL(
    `https://api.vercel.com/v1/projects/${encodeURIComponent(projectId)}/protection-bypass`
  );
  url.searchParams.set("teamId", teamId);
  const body =
    mode === "generate"
      ? { generate: { secret: selectedSecret, note: "CEO-71 carga staging efímera" } }
      : { revoke: { secret: selectedSecret, regenerate: false } };
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`CAPACITY_CONFIG_INCOMPLETE: Vercel rechazó el bypass (${response.status}).`);
  }
  return selectedSecret;
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "generate" && mode !== "revoke") {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: use generate o revoke.");
  }
  const secret = await updateVercelBypass({
    mode,
    projectId: process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_ORG_ID,
    token: process.env.VERCEL_TOKEN,
    secret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  });
  if (mode === "generate") {
    process.stdout.write(`::add-mask::${secret}\n`);
    if (!process.env.GITHUB_OUTPUT) {
      throw new Error("CAPACITY_CONFIG_INCOMPLETE: GITHUB_OUTPUT no está disponible.");
    }
    await appendFile(process.env.GITHUB_OUTPUT, `secret=${secret}\n`, "utf8");
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "CAPACITY_CONFIG_INCOMPLETE"}\n`
  );
  process.exitCode = 1;
});
