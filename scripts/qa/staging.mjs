import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { roleForEmail } from "../../lib/access-policy.ts";

const STAGING_ORIGIN = "https://staging.ceoubb.com";
const STAGING_PROJECT = "centro-de-estudio-ubb-staging";
const synthetic = /^(?:qa-staging-|staging-)[a-z0-9-]+$/;
const external = [
  [
    "google-oauth",
    "Complete Google sign-in with a dedicated institutional test account and retain browser evidence.",
  ],
  [
    "turnstile",
    "Complete a genuine staging challenge and verify acceptance and rejection with the configured provider.",
  ],
  [
    "email-delivery",
    "Request an explicitly authorized test email and retain receipt at the dedicated destination.",
  ],
  ["fcm-delivery", "Use a dedicated test device and retain the actual notification receipt."],
  [
    "external-vendor",
    "Complete the relevant staging LTI or vendor workflow with its dedicated test installation.",
  ],
].map(([id, action]) => ({ id, status: "requires-external-verification", action }));

// Implements: REQ-QA-02, REQ-QA-11
export function stagingConfig(environment = process.env) {
  const url = new URL(environment.QA_STAGING_URL || STAGING_ORIGIN);
  if (
    url.origin !== STAGING_ORIGIN ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("QA_STAGING_TARGET_REFUSED: only https://staging.ceoubb.com is allowed.");
  const email = environment.QA_STAGING_EMAIL?.trim().toLowerCase();
  const password = environment.QA_STAGING_PASSWORD;
  const apiKey = environment.QA_STAGING_API_KEY?.trim();
  if (!email || !password || !apiKey) return { origin: url.origin, missing: true };
  if (
    !z.email().safeParse(email).success ||
    !roleForEmail(email) ||
    !synthetic.test(email.split("@")[0])
  )
    throw new Error(
      "QA_STAGING_IDENTITY_REFUSED: use a dedicated staging- or qa-staging- institutional test account."
    );
  return { origin: url.origin, email, password, apiKey, missing: false };
}

// Implements: REQ-QA-09, REQ-QA-11
export async function runStaging(output, manifest, environment = process.env, request = fetch) {
  const checks = [];
  let status = "requires-external-verification";
  let cookie;
  let config;
  let activeCheck = "staging.configuration";
  const checked = (id) => checks.push({ id, status: "passed", evidence: "live-staging-response" });
  const fetchChecked = async (url, options = {}) => {
    let response;
    try {
      response = await request(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error(
        "QA_STAGING_NETWORK: the expected staging service could not be reached without a redirect."
      );
    }
    if (!response.ok)
      throw new Error(`QA_STAGING_HTTP: ${activeCheck} returned HTTP ${response.status}.`);
    return response;
  };
  const json = async (response, schema) => {
    try {
      return schema.parse(await response.json());
    } catch {
      throw new Error(`QA_STAGING_RESPONSE: ${activeCheck} returned an invalid response.`);
    }
  };
  try {
    config = stagingConfig(environment);
    checked(activeCheck);
    activeCheck = "staging.http";
    await fetchChecked(`${config.origin}/`);
    checked(activeCheck);
    if (config.missing) {
      checks.push({
        id: "staging.session-and-data",
        status,
        action:
          "Configure QA_STAGING_EMAIL, QA_STAGING_PASSWORD and QA_STAGING_API_KEY in the dedicated staging environment.",
      });
    } else {
      activeCheck = "staging.firebase-project";
      const authOrigin = "https://identitytoolkit.googleapis.com/v1";
      // Verify the API key's project before transmitting even synthetic credentials.
      const project = await json(
        await fetchChecked(`${authOrigin}/projects?key=${encodeURIComponent(config.apiKey)}`),
        z.object({ projectId: z.string() })
      );
      if (![STAGING_PROJECT, "500468423377"].includes(project.projectId))
        throw new Error(
          "QA_STAGING_TARGET_REFUSED: the Firebase API key does not belong to staging."
        );
      checked(activeCheck);
      activeCheck = "staging.firebase-password-login";
      const login = await json(
        await fetchChecked(
          `${authOrigin}/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: config.email,
              password: config.password,
              returnSecureToken: true,
            }),
          }
        ),
        z.object({ idToken: z.string(), localId: z.string().regex(synthetic) })
      );
      const claims = z
        .object({
          aud: z.literal(STAGING_PROJECT),
          iss: z.literal(`https://securetoken.google.com/${STAGING_PROJECT}`),
          sub: z.literal(login.localId),
          email: z.literal(config.email),
          email_verified: z.literal(true),
        })
        .safeParse(
          JSON.parse(Buffer.from(login.idToken.split(".")[1] || "", "base64url").toString("utf8"))
        );
      if (!claims.success)
        throw new Error(
          "QA_STAGING_IDENTITY_REFUSED: Firebase did not return the expected verified staging identity."
        );
      checked(activeCheck);
      activeCheck = "staging.session";
      const session = await fetchChecked(`${config.origin}/api/auth/firebase`, {
        method: "POST",
        headers: { Origin: config.origin, "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: login.idToken }),
      });
      cookie = session.headers
        .getSetCookie()
        .find((value) => value.startsWith("centro_estudio_session="))
        ?.split(";")[0];
      if (!cookie)
        throw new Error("QA_STAGING_SESSION: the normal exchange did not create a session.");
      await json(
        session,
        z.object({
          user: z.object({
            id: z.literal(`firebase:${login.localId}`),
            email: z.literal(config.email),
          }),
        })
      );
      checked(activeCheck);
      activeCheck = "staging.relational-data";
      const me = await json(
        await fetchChecked(`${config.origin}/api/auth/me?includeSections=1`, {
          headers: { Cookie: cookie },
        }),
        z.object({
          user: z.object({ id: z.literal(`firebase:${login.localId}`) }),
          sectionIds: z
            .array(z.string().regex(/^(?:qa-|staging-)[a-z0-9-]+$/))
            .min(1)
            .max(100),
        })
      );
      checked(activeCheck);
      activeCheck = "staging.firestore-data";
      await json(
        await fetchChecked(
          `https://firestore.googleapis.com/v1/projects/${STAGING_PROJECT}/databases/(default)/documents/courses/${encodeURIComponent(me.sectionIds[0])}/posts?pageSize=1`,
          { headers: { Authorization: `Bearer ${login.idToken}` } }
        ),
        z.object({
          documents: z
            .array(z.object({ name: z.string() }))
            .min(1)
            .max(1),
        })
      );
      checked(activeCheck);
    }
  } catch (error) {
    status =
      error instanceof Error && error.message.startsWith("QA_STAGING_NETWORK")
        ? "environment-error"
        : "failed";
    checks.push({
      id: activeCheck,
      status,
      error:
        error instanceof Error && error.message.startsWith("QA_STAGING_")
          ? error.message
          : "QA_STAGING_RESPONSE: the expected response could not be validated.",
    });
  } finally {
    if (cookie && config) {
      activeCheck = "staging.logout";
      try {
        await fetchChecked(`${config.origin}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: cookie, Origin: config.origin },
        });
        checked(activeCheck);
      } catch {
        status = "failed";
        checks.push({
          id: activeCheck,
          status,
          error: "The synthetic session could not be closed; retry logout in staging.",
        });
      }
    }
  }
  const summary = {
    runId: manifest.runId,
    startedAt: manifest.startedAt,
    finishedAt: new Date().toISOString(),
    environment: "staging",
    target: STAGING_ORIGIN,
    status,
    scope: "Live synthetic account smoke; external provider delivery requires separate evidence.",
    reproduce: "pnpm qa --staging",
    checks,
    externalVerification: external,
  };
  const serialized = JSON.stringify(summary, null, 2);
  await writeFile(join(output, "summary.json"), serialized);
  await writeFile(
    join(output, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CEOUBB staging QA</title><h1>Staging QA: ${status}</h1><p><a href="summary.json">Machine-readable summary</a></p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${serialized.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre></html>`
  );
  console.log(`[qa] ${status}. Report: ${join(output, "index.html")}`);
  process.exitCode = status === "requires-external-verification" ? 2 : 1;
  return summary;
}
