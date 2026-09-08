import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LIVE_CLASS_INVALID_MESSAGE, normalizeLiveClassUrl } from "../lib/live-class.ts";

test("normaliza Zoom y conserva la reunión completa", () => {
  assert.deepEqual(normalizeLiveClassUrl("  https://US02WEB.ZOOM.US/j/123456789?pwd=abc#join  "), {
    url: "https://us02web.zoom.us/j/123456789?pwd=abc#join",
    provider: "zoom",
  });
});

test("acepta los dos hosts vigentes de Microsoft Teams", () => {
  assert.deepEqual(
    normalizeLiveClassUrl("https://teams.microsoft.com/l/meetup-join/abc?context=%7B%7D"),
    {
      url: "https://teams.microsoft.com/l/meetup-join/abc?context=%7B%7D",
      provider: "teams",
    }
  );
  assert.deepEqual(normalizeLiveClassUrl("https://teams.cloud.microsoft/meet/abc"), {
    url: "https://teams.cloud.microsoft/meet/abc",
    provider: "teams",
  });
});

test("interpreta un valor vacío como eliminación", () => {
  assert.equal(normalizeLiveClassUrl(" \n\t "), null);
});

test("rechaza protocolos inseguros, credenciales y dominios parecidos", () => {
  const invalid = [
    "http://zoom.us/j/123",
    "ftp://zoom.us/j/123",
    "https://user:secret@zoom.us/j/123",
    "https://zoom.us.example.com/j/123",
    "https://evilzoom.us/j/123",
    "https://meet.google.com/abc-defg-hij",
    "no-es-url",
  ];

  for (const value of invalid) {
    assert.throws(
      () => normalizeLiveClassUrl(value),
      (cause: unknown) => cause instanceof Error && cause.message === LIVE_CLASS_INVALID_MESSAGE,
      value
    );
  }
});

test("rechaza enlaces que superan el límite de 2 KiB", () => {
  const value = `https://zoom.us/j/123?payload=${"a".repeat(2050)}`;
  assert.throws(() => normalizeLiveClassUrl(value), {
    message: LIVE_CLASS_INVALID_MESSAGE,
  });
});

test("mantiene trazabilidad con la especificación P8", () => {
  const spec = readFileSync(
    new URL("../docs/specs/p8-live-class-banner.md", import.meta.url),
    "utf8"
  );
  for (const requirement of ["REQ-LIVE-01", "REQ-LIVE-02", "REQ-LIVE-05"]) {
    assert.match(spec, new RegExp(requirement));
  }
});

test("las reglas aíslan live-class y validan el mismo contrato", () => {
  const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/courses\/\{courseId\}\/meta\/\{documentId\}/);
  assert.match(rules, /documentId != 'live-class'/);
  assert.match(rules, /request\.method == 'delete'/);
  assert.match(rules, /hasOnly\(\['courseId', 'url', 'provider', 'updatedBy', 'updatedAt'\]\)/);
  assert.match(rules, /request\.resource\.data\.updatedBy == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.url\.size\(\) <= 2048/);
  assert.match(rules, /provider == 'zoom'/);
  assert.match(rules, /provider == 'teams'/);
  assert.match(rules, /allow read: if isOwner\(\) \|\| isMember\(\) && isEnrolled\(courseId\)/);
  assert.match(rules, /allow write: if teachesSection\(courseId\) && validCourse\(courseId\)/);
});

test("la portada coloca el banner antes de los avisos y no reserva un vacío al estudiante", () => {
  const view = readFileSync(
    new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url),
    "utf8"
  );
  const section = readFileSync(
    new URL("../app/views/classroom/LiveClassSection.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(view.indexOf("<LiveClassBanner") < view.indexOf("<PostsSection"));
  // Sin enlace no se dibuja nada: el aviso jamás reserva un hueco vacío.
  assert.match(section, /export function LiveClassBanner[\s\S]*?if \(!liveClass\) return null;/);
  assert.match(section, /Entrar a la clase/);
  assert.match(section, /target="_blank"/);
  assert.match(section, /rel="noopener noreferrer"/);
  assert.match(section, /htmlFor="live-class-url"/);
  assert.match(section, /role="status"/);
});

test("configurar el enlace vive en el riel y nunca encabeza la portada", () => {
  const view = readFileSync(
    new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url),
    "utf8"
  );
  const rail = readFileSync(
    new URL("../app/views/classroom/CourseRail.tsx", import.meta.url),
    "utf8"
  );
  // El editor es una tarea puntual del semestre: sólo lo monta el riel lateral.
  assert.ok(!view.includes("<LiveClassEditor"));
  assert.match(rail, /<LiveClassEditor/);
  // Y sigue siendo exclusivo de quien enseña una sección abierta.
  assert.match(rail, /canTeach && !readOnly && \(\s*<LiveClassEditor/);
});
