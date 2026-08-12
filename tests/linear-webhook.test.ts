import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import test from "node:test";

import { isFreshTimestamp, verifyLinearSignature } from "../lib/linear-signature.ts";

const SECRET = "lin_wh_test_secret";
const BODY = JSON.stringify({ action: "create", type: "Issue", data: { id: "1" } });
const SIGNATURE = createHmac("sha256", SECRET).update(BODY).digest("hex");

test("accepts a payload signed with the shared secret", () => {
  assert.equal(verifyLinearSignature(BODY, SIGNATURE, SECRET), true);
});

test("rejects a missing signature", () => {
  assert.equal(verifyLinearSignature(BODY, null, SECRET), false);
});

test("rejects a signature made with another secret", () => {
  const forged = createHmac("sha256", "otro_secreto").update(BODY).digest("hex");
  assert.equal(verifyLinearSignature(BODY, forged, SECRET), false);
});

test("rejects a tampered body", () => {
  const tampered = BODY.replace("create", "remove");
  assert.equal(verifyLinearSignature(tampered, SIGNATURE, SECRET), false);
});

test("rejects a malformed signature without throwing", () => {
  assert.equal(verifyLinearSignature(BODY, "no-es-hex", SECRET), false);
  assert.equal(verifyLinearSignature(BODY, "", SECRET), false);
  assert.equal(verifyLinearSignature(BODY, SIGNATURE.slice(0, 10), SECRET), false);
});

test("accepts a timestamp inside the replay window", () => {
  const now = 1_770_000_000_000;
  assert.equal(isFreshTimestamp(now - 30_000, now), true);
});

test("rejects a stale or missing timestamp", () => {
  const now = 1_770_000_000_000;
  assert.equal(isFreshTimestamp(now - 120_000, now), false);
  assert.equal(isFreshTimestamp(undefined, now), false);
  assert.equal(isFreshTimestamp("no-es-numero", now), false);
});
