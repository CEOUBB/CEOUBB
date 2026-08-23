import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { enrollmentDocumentPath } from "../lib/services/enrollment-projection.ts";
import { verifyLinearSignature } from "../lib/linear-signature.ts";
import { toPost } from "../lib/firebase/mappers.ts";

// Implements: REQ-SEC-07
test("REQ-SEC-07: enrollmentDocumentPath normalizes prefixed UIDs by stripping 'firebase:'", () => {
  const prefixedPath = enrollmentDocumentPath(
    "firebase:usr_12345",
    "sec_math_01",
    "centro-de-estudio-ubb"
  );
  assert.equal(
    prefixedPath,
    "projects/centro-de-estudio-ubb/databases/(default)/documents/enrollments/usr_12345/sections/sec_math_01",
    "Must strip firebase: prefix from user ID"
  );

  const rawPath = enrollmentDocumentPath("usr_12345", "sec_math_01", "centro-de-estudio-ubb");
  assert.equal(
    rawPath,
    "projects/centro-de-estudio-ubb/databases/(default)/documents/enrollments/usr_12345/sections/sec_math_01",
    "Must preserve raw UID without prefix"
  );
});

// Implements: REQ-SEC-08
test("REQ-SEC-08: firestore.rules prevents cross-student submission update IDOR", () => {
  const rulesPath = path.resolve("firebase/firestore.rules");
  const rulesContent = fs.readFileSync(rulesPath, "utf8");
  assert.ok(
    rulesContent.includes("resource.data.uid == request.auth.uid"),
    "Firestore rules must verify resource.data.uid on submission update"
  );
  assert.ok(
    rulesContent.includes("match /courses/{courseId}/submissions/{submissionId}"),
    "Must maintain match on submissions collection"
  );
});

// Implements: REQ-SEC-09
test("REQ-SEC-09: discord context helper spawns processes with shell: false", () => {
  const helperPath = path.resolve("scripts/discord-context-helper.js");
  const helperContent = fs.readFileSync(helperPath, "utf8");
  assert.match(
    helperContent,
    /shell:\s*false/,
    "spawnSafeCommand must specify shell: false to avoid command injection"
  );
});

// Implements: REQ-SEC-11
test("REQ-SEC-11: sentry server config limits includeLocalVariables to development", () => {
  const sentryServerPath = path.resolve("sentry.server.config.ts");
  const sentryContent = fs.readFileSync(sentryServerPath, "utf8");
  assert.match(
    sentryContent,
    /includeLocalVariables:\s*process\.env\.NODE_ENV\s*===\s*["']development["']/,
    "sentry server config must not include local variables in production"
  );
});

import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

function mockDoc<T extends DocumentData>(id: string, data: T): QueryDocumentSnapshot<DocumentData> {
  return {
    id,
    data: () => data,
  } as unknown as QueryDocumentSnapshot<DocumentData>;
}

// Implements: REQ-SEC-12
test("REQ-SEC-12: toPost sanitizes linkUrl and rejects non-http(s) schemes like javascript:", () => {
  const mockDocument = mockDoc("post-1", {
    authorId: "author-1",
    authorEmail: "profesor@ubiobio.cl",
    title: "Recurso malicioso",
    body: "Haz click",
    kind: "notice",
    linkUrl: "javascript:alert(document.cookie)",
    createdAt: new Date().toISOString(),
  });

  const parsed = toPost(mockDocument);
  assert.equal(parsed.linkUrl, null, "Must neutralize javascript: protocol in post links");

  const validDocument = mockDoc("post-2", {
    authorId: "author-1",
    authorEmail: "profesor@ubiobio.cl",
    title: "Recurso valido",
    body: "Haz click",
    kind: "material",
    linkUrl: "https://ceoubb.com/guia.pdf",
    createdAt: new Date().toISOString(),
  });

  const validParsed = toPost(validDocument);
  assert.equal(validParsed.linkUrl, "https://ceoubb.com/guia.pdf", "Must allow valid https link");
});

// Implements: REQ-SEC-14
test("REQ-SEC-14: verifyLinearSignature returns false if secret or signature is empty", () => {
  assert.equal(
    verifyLinearSignature('{"action":"create"}', "some-sig", ""),
    false,
    "Empty secret must return false"
  );
  assert.equal(
    verifyLinearSignature('{"action":"create"}', "", "some-secret"),
    false,
    "Empty signature must return false"
  );
});

// Implements: REQ-SEC-03
test("REQ-SEC-03: standup cron route handler uses timingSafeEqual for CRON_SECRET verification", () => {
  const routePath = path.resolve("app/api/cron/standup/route.ts");
  const routeContent = fs.readFileSync(routePath, "utf8");
  assert.match(
    routeContent,
    /timingSafeEqual/,
    "Standup cron route handler must use timingSafeEqual for secret verification"
  );
  assert.match(
    routeContent,
    /credentialMatches/,
    "Standup cron route handler must call credentialMatches helper"
  );
});

// Implements: REQ-SEC-15
test("REQ-SEC-15: admin users PATCH endpoint strictly validates input types and malformed JSON payloads", () => {
  const routePath = path.resolve("app/api/admin/users/route.ts");
  const routeContent = fs.readFileSync(routePath, "utf8");
  assert.match(
    routeContent,
    /typeof payload\.userId !== "string"/,
    "Admin users PATCH handler must check typeof payload.userId === 'string'"
  );
  assert.match(
    routeContent,
    /typeof payload\.role !== "string"/,
    "Admin users PATCH handler must check typeof payload.role === 'string'"
  );
  assert.match(
    routeContent,
    /Cuerpo de la petición malformado\./,
    "Admin users PATCH handler must return 400 Bad Request on malformed JSON"
  );
});
