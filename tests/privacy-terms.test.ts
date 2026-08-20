import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AUDIT_IP_RETENTION_MONTHS,
  AUDIT_IP_PURGE_BATCH,
  auditIpRetentionCutoff,
} from "../lib/services/academic-catalog.ts";

/*
  Los documentos legales publicados prometen cosas que el código tiene que cumplir.
  Estas pruebas amarran las dos mitades: si alguien reescribe la retención sin tocar
  la purga —o al revés— el arnés cae aquí y no en una fiscalización.
*/

const LEGAL_PAGES = ["../app/privacidad/page.tsx", "../app/terminos/page.tsx"];

function readSurface(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

/*
  El texto publicado viaja partido por JSX: `<span className="num">1,0</span> a
  <span className="num">7,0</span>` es una sola frase para quien lee la página.
  Quitar etiquetas y separadores `{" "}` compara lo que ve el lector, no el markup.
*/
async function readProse(path: string): Promise<string> {
  const source = await readSurface(path);
  return source
    .replace(/<[^>]*>/g, "")
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&ldquo;|&rdquo;/g, '"');
}

// Implements: REQ-PRIV-05
test("the published contact address is institutional", async () => {
  const privacy = await readSurface("../app/privacidad/page.tsx");
  assert.match(privacy, /contacto@ceoubb\.com/);
});

// Implements: REQ-PRIV-05
test("no legal page carries an address outside the institutional domains", async () => {
  for (const path of LEGAL_PAGES) {
    const source = await readSurface(path);
    assert.doesNotMatch(
      source,
      /[\w.+-]+@(?!ceoubb\.com|alumnos\.ubiobio\.cl|ubiobio\.cl)[\w.-]+\.[a-z]{2,}/i,
      `${path} still publishes a personal address`
    );
  }
});

// Implements: REQ-PRIV-01
test("the privacy policy inventories the academic personal data", async () => {
  const privacy = await readProse("../app/privacidad/page.tsx");
  for (const claim of [
    /1[.,]0\s*(a|–|-|y)\s*7[.,]0/, // escala chilena de notas
    /evaluacion/i,
    /promedio/i,
    /matr[ií]cul/i,
    /entrega/i, // submissions
    /notificacion/i, // token de push
    /bit[áa]cora|auditor/i,
    /direcci[óo]n IP/i,
  ]) {
    assert.match(privacy, claim, `the inventory does not mention ${claim}`);
  }
});

// Implements: REQ-PRIV-02
test("the privacy policy discloses every reader of a grade", async () => {
  const privacy = await readProse("../app/privacidad/page.tsx");
  for (const reader of [/administrador/i, /docente/i, /estudiante/i]) {
    assert.match(privacy, reader, `the recipients section omits ${reader}`);
  }
  assert.match(
    privacy,
    /administrador[^.]*(cualquier|todas|toda)[^.]*secci/i,
    "the owner audit access over every section is not stated plainly"
  );
});

// Implements: REQ-PRIV-03
test("the privacy policy names its legal framework and disclaims the official record", async () => {
  const privacy = await readProse("../app/privacidad/page.tsx");
  assert.match(privacy, /21\.719/);
  assert.match(privacy, /no\s+(son|constituyen)[^.]*oficial/i);
});

// Implements: REQ-PRIV-04
test("the privacy policy publishes the audit IP retention bound", async () => {
  const privacy = await readProse("../app/privacidad/page.tsx");
  assert.match(
    privacy,
    new RegExp(`${AUDIT_IP_RETENTION_MONTHS}\\s*meses`, "i"),
    "the published retention window does not match AUDIT_IP_RETENTION_MONTHS"
  );
});

// Implements: REQ-PRIV-05
test("the privacy policy lists every right and a response deadline", async () => {
  const privacy = await readProse("../app/privacidad/page.tsx");
  for (const right of [
    /acceso/i,
    /rectificaci[óo]n/i,
    /supresi[óo]n|eliminaci[óo]n/i,
    /oposici[óo]n/i,
    /portabilidad/i,
    /bloqueo/i,
  ]) {
    assert.match(privacy, right, `the rights section omits ${right}`);
  }
  assert.match(privacy, /\d+\s*d[ií]as/i, "no response deadline is published");
});

// Implements: REQ-PRIV-06
test("the terms of use state eligibility and teacher responsibility", async () => {
  const terms = await readProse("../app/terminos/page.tsx");
  assert.match(terms, /@alumnos\.ubiobio\.cl/);
  assert.match(terms, /@ubiobio\.cl/);
  assert.match(terms, /docente[^.]*responsab|responsab[^.]*docente/i);
  assert.match(terms, /independiente/i);
});

// Implements: REQ-PRIV-06
test("both legal documents are linked from the portal and the sitemap", async () => {
  const portal = await readSurface("../app/Portal.tsx");
  const sitemap = await readSurface("../app/sitemap.xml/route.ts");
  for (const route of ["/privacidad", "/terminos"]) {
    assert.match(portal, new RegExp(`href="${route}"`), `the footer does not link ${route}`);
    assert.match(sitemap, new RegExp(`\\$\\{origin\\}${route}`), `the sitemap omits ${route}`);
  }
});

// Implements: REQ-PRIV-07
test("session replay masking is explicit, not inherited from the SDK defaults", async () => {
  const config = await readSurface("../sentry.client.config.ts");
  for (const option of ["maskAllText", "maskAllInputs", "blockAllMedia"]) {
    assert.match(
      config,
      new RegExp(`${option}:\\s*true`),
      `${option} is not pinned in the replay integration`
    );
  }
});

// Implements: REQ-PRIV-08
test("the retention cutoff admits aged entries and spares recent ones", () => {
  const now = new Date("2026-08-20T00:00:00.000Z");
  const cutoff = auditIpRetentionCutoff(now);
  const thirteenMonthsAgo = "2025-07-20T00:00:00.000Z";
  const elevenMonthsAgo = "2025-09-20T00:00:00.000Z";
  assert.ok(thirteenMonthsAgo < cutoff, "a 13-month-old entry must be eligible for erasure");
  assert.ok(elevenMonthsAgo > cutoff, "an 11-month-old entry must be spared");
});

// Implements: REQ-PRIV-08
test("the purge batch is a finite positive bound", () => {
  assert.ok(Number.isInteger(AUDIT_IP_PURGE_BATCH));
  assert.ok(AUDIT_IP_PURGE_BATCH > 0 && AUDIT_IP_PURGE_BATCH <= 1000);
});
