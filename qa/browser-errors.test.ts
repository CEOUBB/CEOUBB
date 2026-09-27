import assert from "node:assert/strict";
import test from "node:test";
import { isFirestoreNavigationCancellation } from "./browser-errors.ts";

test("only WebKit emulator channel cancellations during document navigation are classified", () => {
  const error = new Error("WebKit cancelled its outgoing document's transport");
  const host = "127.0.0.1:8080";
  for (const channel of ["Listen", "Write"]) {
    error.stack = `Fetch API cannot load http://${host}/google.firestore.v1.Firestore/${channel}/channel?RID=rpc due to access control checks.\n    at transport`;
    assert.equal(isFirestoreNavigationCancellation(error, "webkit", true, host), true);
    assert.equal(isFirestoreNavigationCancellation(error, "webkit", false, host), false);
    assert.equal(isFirestoreNavigationCancellation(error, "chromium", true, host), false);
    assert.equal(isFirestoreNavigationCancellation(error, "webkit", true, "127.0.0.1:9090"), false);
    assert.equal(isFirestoreNavigationCancellation(error, "webkit", true, undefined), false);
  }
  error.stack = `Fetch API cannot load http://${host}/api/courses due to access control checks.`;
  assert.equal(isFirestoreNavigationCancellation(error, "webkit", true, host), false);
  error.stack = "TypeError: Cannot read properties of undefined";
  assert.equal(isFirestoreNavigationCancellation(error, "webkit", true, host), false);
});
