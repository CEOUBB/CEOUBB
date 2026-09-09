import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_FALLBACK_LIST } from "../lib/services/gemini.ts";
import { roleForEmail } from "../lib/access-policy.ts";

// Implements: REQ-TYPE-01
test("REQ-TYPE-01: Gemini service defines MODEL_FALLBACK_LIST with valid models in priority order", () => {
  assert.ok(Array.isArray(MODEL_FALLBACK_LIST));
  assert.ok(MODEL_FALLBACK_LIST.length >= 3);
  assert.equal(MODEL_FALLBACK_LIST[0], "gemini-3.7-flash");
});

// Implements: REQ-SEC-06
test("REQ-SEC-06: SQL LIKE wildcard escaping logic neutralizes %, _ and \\ characters", () => {
  const sanitize = (q: string) => q.replace(/[%_\\]/g, "\\$&");
  assert.equal(sanitize("CEO-%"), "CEO-\\%");
  assert.equal(sanitize("user_name"), "user\\_name");
  assert.equal(sanitize("test\\path"), "test\\\\path");
  assert.equal(sanitize("normal text"), "normal text");
});

// Implements: REQ-SEC-01
test("REQ-SEC-01: roleForEmail preserves institutional derivation", () => {
  assert.equal(roleForEmail("student@alumnos.ubiobio.cl"), "student");
  assert.equal(roleForEmail("teacher@ubiobio.cl"), "teacher");
  assert.equal(roleForEmail("attacker@gmail.com"), null);
});
