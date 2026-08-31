import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";

export const CAPACITY_K6_REQUIREMENTS = Object.freeze([
  "Implements: REQ-OPS-LOAD-02",
  "Implements: REQ-OPS-LOAD-03",
  "Implements: REQ-OPS-LOAD-04",
  "Implements: REQ-OPS-LOAD-06",
]);

const runtimeEnvironment = globalThis.__ENV;
const profile = runtimeEnvironment.CAPACITY_PROFILE || "smoke";
const shardIndex = Number(runtimeEnvironment.CAPACITY_SHARD_INDEX || 0);
const credentialPath =
  runtimeEnvironment.CAPACITY_CREDENTIAL_PATH ||
  `../.capacity/shard-${shardIndex}-credentials.json`;
const credentials = new SharedArray(`capacity-users-${shardIndex}`, () => {
  const parsed = JSON.parse(open(credentialPath));
  return parsed.users;
});
const credentialBundle = JSON.parse(open(credentialPath));
const targetUrl = (runtimeEnvironment.TARGET_URL || "").replace(/\/$/, "");
const firebaseProjectId = runtimeEnvironment.FIREBASE_PROJECT_ID;
const tursoHttpUrl = (runtimeEnvironment.TURSO_HTTP_URL || "").replace(/\/$/, "");
const bypass = runtimeEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET;
const http5xx = new Rate("http_5xx");
const http5xxTotal = new Counter("http_5xx_total");
const authorizationErrors = new Counter("authorization_errors");
const unexpectedResponses = new Counter("unexpected_responses");
const vercelDuration = new Trend("vercel_duration", true);
const tursoDuration = new Trend("turso_duration", true);
const firestoreDuration = new Trend("firestore_duration", true);
const tursoRequests = new Counter("turso_requests");
const portalOpens = new Counter("student_portal_opens");
const firestoreRunQueryMethod = "documents:runQuery";

export const options = {
  discardResponseBodies: true,
  scenarios:
    profile === "full"
      ? {
          institutional: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
              { duration: runtimeEnvironment.CAPACITY_RAMP_DURATION || "10m", target: 500 },
              { duration: runtimeEnvironment.CAPACITY_STEADY_DURATION || "30m", target: 500 },
              { duration: "30s", target: 0 },
            ],
            gracefulRampDown: "30s",
          },
        }
      : {
          smoke: {
            executor: "constant-vus",
            vus: 1,
            duration: runtimeEnvironment.CAPACITY_SMOKE_DURATION || "30s",
          },
        },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<4000"],
    http_5xx: ["rate<0.001"],
    authorization_errors: ["count==0"],
    unexpected_responses: ["count==0"],
  },
};

let currentUser;
let idToken;
let sessionCookie;

export default function () {
  currentUser ||= credentials[(exec.vu.idInTest - 1) % credentials.length];
  if ((!idToken || !sessionCookie) && !authenticate()) {
    sleep(5);
    return;
  }
  const action = exec.scenario.iterationInTest % 10;
  if (action < 4) navigatePortal();
  else if (action < 6) queryTurso();
  else if (action < 9) readClassroom();
  else saveQuizDraft();
  sleep(5 + ((exec.vu.idInTest + exec.scenario.iterationInTest) % 11));
}

function authenticate() {
  const identity = http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${credentialBundle.firebaseApiKey}`,
    JSON.stringify({
      email: currentUser.email,
      password: currentUser.password,
      returnSecureToken: true,
    }),
    jsonParameters("firebase_auth")
  );
  observe(identity, "firebase_auth");
  check(identity, { "Firebase Auth entrega ID token": (response) => response.status === 200 });
  if (identity.status !== 200) {
    authorizationErrors.add(1);
    return false;
  }
  idToken = identity.json("idToken");
  const application = http.post(
    `${targetUrl}/api/auth/firebase`,
    JSON.stringify({ idToken }),
    jsonParameters("vercel_auth")
  );
  observe(application, "vercel_auth", vercelDuration);
  check(application, { "Vercel crea sesión Turso": (response) => response.status === 200 });
  const cookie = application.cookies.centro_estudio_session?.[0]?.value;
  if (application.status !== 200 || !cookie) {
    authorizationErrors.add(1);
    return false;
  }
  sessionCookie = `centro_estudio_session=${cookie}`;
  return true;
}

function navigatePortal() {
  const web = http.get(`${targetUrl}/`, {
    headers: bypassHeaders(),
    tags: { provider: "vercel", operation: "portal_html" },
  });
  observe(web, "portal_html", vercelDuration);
  const apiResponses = http.batch([
    ["GET", `${targetUrl}/api/auth/me?includeSections=1`, null, sessionParameters("session")],
    ["GET", `${targetUrl}/api/enrollments/me?limit=8`, null, sessionParameters("enrollments")],
    ["GET", `${targetUrl}/api/courses/me?limit=8`, null, sessionParameters("courses")],
  ]);
  for (const response of apiResponses) observe(response, "vercel_turso_api", vercelDuration);
}

function queryTurso() {
  const response = http.post(
    `${tursoHttpUrl}/v2/pipeline`,
    JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql: "SELECT seccion_id FROM matriculas WHERE usuario_id = ? AND estado = 'activa' LIMIT 8",
            args: [{ type: "text", value: `firebase:${currentUser.uid}` }],
          },
        },
        { type: "close" },
      ],
    }),
    {
      headers: {
        Authorization: `Bearer ${runtimeEnvironment.TURSO_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      tags: { provider: "turso", operation: "enrollments_direct" },
    }
  );
  tursoRequests.add(1);
  observe(response, "turso_direct", tursoDuration);
}

function readClassroom() {
  portalOpens.add(1);
  const firestoreBase = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents`;
  const course = encodeURIComponent(currentUser.sectionId);
  const uid = encodeURIComponent(currentUser.uid);
  const query = http.post(
    `${firestoreBase}/courses/${course}${firestoreRunQueryMethod.slice("documents".length)}`,
    JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "posts" }],
        limit: 20,
      },
    }),
    firestoreParameters("posts_query")
  );
  observe(query, "firestore_posts", firestoreDuration);
  const responses = http.batch([
    [
      "GET",
      `${firestoreBase}/courses/${course}/meta/gradebook`,
      null,
      firestoreParameters("gradebook"),
    ],
    [
      "GET",
      `${firestoreBase}/courses/${course}/grades/${uid}`,
      null,
      firestoreParameters("grades"),
    ],
    [
      "GET",
      `${firestoreBase}/courses/${course}/quizzes/load-quiz`,
      null,
      firestoreParameters("quizzes"),
    ],
    [
      "GET",
      `${firestoreBase}/courses/${course}/quizzes/load-quiz/drafts/${uid}`,
      null,
      firestoreParameters("drafts"),
    ],
  ]);
  for (const response of responses) observe(response, "firestore_read", firestoreDuration);
}

function saveQuizDraft() {
  const course = currentUser.sectionId;
  const uid = currentUser.uid;
  const name = `projects/${firebaseProjectId}/databases/(default)/documents/courses/${course}/quizzes/load-quiz/drafts/${uid}`;
  const response = http.post(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents:commit`,
    JSON.stringify({
      writes: [
        {
          update: {
            name,
            fields: {
              answers: {
                mapValue: {
                  fields: {
                    "q-1": { stringValue: `respuesta-${exec.scenario.iterationInTest % 4}` },
                  },
                },
              },
            },
          },
          updateMask: { fieldPaths: ["answers"] },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: { exists: true },
        },
      ],
    }),
    firestoreParameters("quiz_draft_write")
  );
  observe(response, "firestore_write", firestoreDuration);
}

function jsonParameters(operation) {
  return {
    headers: { ...bypassHeaders(), "Content-Type": "application/json" },
    responseType: "text",
    tags: { operation },
  };
}

function sessionParameters(operation) {
  return {
    headers: { ...bypassHeaders(), Cookie: sessionCookie },
    tags: { provider: "vercel", operation },
  };
}

function firestoreParameters(operation) {
  return {
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    tags: { provider: "firestore", operation },
  };
}

function bypassHeaders() {
  return { "x-vercel-protection-bypass": bypass };
}

function observe(response, operation, trend) {
  const serverFailure = response.status >= 500;
  http5xx.add(serverFailure, { operation });
  if (serverFailure) http5xxTotal.add(1, { operation });
  if (response.status === 401 || response.status === 403) authorizationErrors.add(1, { operation });
  if (response.status < 200 || response.status >= 300) {
    unexpectedResponses.add(1, { operation, status: String(response.status) });
  }
  trend?.add(response.timings.duration, { operation });
}

export function handleSummary(data) {
  const peakVus = metric(data, "vus", "max");
  const durationMs = Number(data.state?.testRunDurationMs || 0);
  const thresholdFailed = Object.values(data.metrics).some((item) =>
    Object.values(item.thresholds || {}).some((threshold) => threshold.ok === false)
  );
  const summary = {
    requirements: CAPACITY_K6_REQUIREMENTS,
    shardIndex,
    profile,
    status: thresholdFailed ? "FAIL" : "PASS",
    peakVus,
    steadyStateSeconds: profile === "full" && peakVus >= 500 && durationMs >= 2_400_000 ? 1_800 : 0,
    httpRequests: metric(data, "http_reqs", "count"),
    http5xx: metric(data, "http_5xx_total", "count"),
    authorizationErrors: metric(data, "authorization_errors", "count"),
    unexpectedResponses: metric(data, "unexpected_responses", "count"),
    httpP95Ms: metric(data, "http_req_duration", "p(95)"),
    httpP99Ms: metric(data, "http_req_duration", "p(99)"),
    tursoRequests: metric(data, "turso_requests", "count"),
    portalOpens: metric(data, "student_portal_opens", "count"),
    tursoP95Ms: metric(data, "turso_duration", "p(95)"),
    vercelP95Ms: metric(data, "vercel_duration", "p(95)"),
    firestoreP95Ms: metric(data, "firestore_duration", "p(95)"),
    durationMs,
    startedAt: runtimeEnvironment.CAPACITY_STARTED_AT || null,
    finishedAt: new Date().toISOString(),
  };
  return {
    [runtimeEnvironment.CAPACITY_SUMMARY_PATH || `capacity-summary-${shardIndex}.json`]:
      JSON.stringify(summary, null, 2),
    stdout: `${JSON.stringify(summary)}\n`,
  };
}

function metric(data, name, field) {
  const value = data.metrics[name]?.values?.[field];
  return Number.isFinite(value) ? value : 0;
}
