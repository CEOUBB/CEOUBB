import assert from "node:assert/strict";
import test from "node:test";

function sanitizeFilenameParam(rawId: string, fallback: string): string {
  return rawId.replace(/[^a-zA-Z0-9_-]/g, "") || fallback;
}

test("REQ-SEC-HEADER: sanitización de parámetros de descarga para Content-Disposition", () => {
  assert.equal(sanitizeFilenameParam("quiz-123_abc", "quiz"), "quiz-123_abc");
  assert.equal(sanitizeFilenameParam("../../etc/passwd", "quiz"), "etcpasswd");
  assert.equal(sanitizeFilenameParam("bad\r\nHeader: injected", "quiz"), "badHeaderinjected");
  assert.equal(sanitizeFilenameParam("\r\n\t", "quiz"), "quiz");
  assert.equal(sanitizeFilenameParam("!!!", "recurso"), "recurso");
});
