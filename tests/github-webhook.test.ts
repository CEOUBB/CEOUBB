import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyGitHubSignature } from "../lib/github-signature.ts";

const SECRET = "gh_wh_test_secret";
const BODY = JSON.stringify({ action: "completed", workflow_run: { id: 123, conclusion: "failure" } });
const HASH = createHmac("sha256", SECRET).update(BODY).digest("hex");
const SIGNATURE_HEADER = `sha256=${HASH}`;

test("accepts a valid GitHub webhook signature header", () => {
  assert.equal(verifyGitHubSignature(BODY, SIGNATURE_HEADER, SECRET), true);
});

test("rejects a missing GitHub signature header", () => {
  assert.equal(verifyGitHubSignature(BODY, null, SECRET), false);
  assert.equal(verifyGitHubSignature(BODY, undefined, SECRET), false);
});

test("rejects a signature forged with another secret", () => {
  const forgedHash = createHmac("sha256", "wrong_secret").update(BODY).digest("hex");
  assert.equal(verifyGitHubSignature(BODY, `sha256=${forgedHash}`, SECRET), false);
});

test("rejects a tampered payload", () => {
  const tampered = BODY.replace("failure", "success");
  assert.equal(verifyGitHubSignature(tampered, SIGNATURE_HEADER, SECRET), false);
});

test("rejects a malformed signature header prefix or hex", () => {
  assert.equal(verifyGitHubSignature(BODY, `sha1=${HASH}`, SECRET), false);
  assert.equal(verifyGitHubSignature(BODY, "invalid-header", SECRET), false);
  assert.equal(verifyGitHubSignature(BODY, "sha256=nothex", SECRET), false);
});
