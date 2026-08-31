import { applicationDefault } from "firebase-admin/app";
import { enableStagingPasswordAuth } from "./prepare-capacity-fixtures.mjs";

async function main() {
  if (process.env.FIREBASE_PROJECT_ID !== "centro-de-estudio-ubb-staging") {
    throw new Error("CAPACITY_TARGET_REJECTED: Firebase Auth no identifica staging.");
  }
  const access = await applicationDefault().getAccessToken();
  const enabled = process.argv[2] === "enable";
  if (!enabled && process.argv[2] !== "disable") {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: use enable o disable.");
  }
  await enableStagingPasswordAuth(process.env.FIREBASE_PROJECT_ID, access.access_token, enabled);
  process.stdout.write(`${JSON.stringify({ passwordProviderEnabled: enabled })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "CAPACITY_AUTH_FAILED"}\n`);
  process.exitCode = 1;
});
