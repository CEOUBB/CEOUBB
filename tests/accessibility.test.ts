import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function rgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string) {
  const channels = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("REQ-A11Y-01: portal and library expose a visible bypass target", async () => {
  const [portal, shell, library, portalCss, libraryCss] = await Promise.all([
    source("app/Portal.tsx"),
    source("app/portal-shell.tsx"),
    source("public/biblioteca/index.html"),
    source("app/globals.css"),
    source("public/biblioteca/assets/styles.css"),
  ]);
  assert.match(portal, /className="skip-link"[^>]+href="#contenido-principal"/);
  assert.match(shell, /<main[^>]+id="contenido-principal"[^>]+tabIndex=\{-1\}/);
  assert.match(library, /class="skip-link" href="#contenido-principal"/);
  assert.match(library, /<main[^>]+id="contenido-principal"[^>]+tabindex="-1"/);
  assert.match(portalCss, /\.skip-link\s*\{/);
  assert.match(libraryCss, /\.skip-link\s*\{/);
});

test("REQ-A11Y-02: dynamic portal and library state is programmatically exposed", async () => {
  const [shell, library, libraryApp] = await Promise.all([
    source("app/portal-shell.tsx"),
    source("public/biblioteca/index.html"),
    source("public/biblioteca/assets/app.js"),
  ]);
  assert.match(shell, /aria-live="polite"/);
  assert.match(shell, /aria-labelledby="portal-view-title"/);
  assert.match(library, /role="progressbar"/);
  assert.match(library, /aria-live="polite"/);
  assert.match(libraryApp, /aria-pressed/);
  assert.match(libraryApp, /aria-expanded/);
  assert.match(libraryApp, /aria-controls/);
});

test("REQ-A11Y-03: portal and library text and controls meet contrast contracts", async () => {
  const [portalCss, libraryCss] = await Promise.all([
    source("app/globals.css"),
    source("public/biblioteca/assets/styles.css"),
  ]);
  const token = libraryCss.match(/--ink-4:\s*(#[0-9a-f]{6})/i)?.[1];
  const controlLine = libraryCss.match(/--control-line:\s*(#[0-9a-f]{6})/i)?.[1];
  const portalControl = portalCss.match(/--border-control:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(token, "--ink-4 must use an auditable hexadecimal color");
  assert.ok(controlLine, "--control-line must use an auditable hexadecimal color");
  assert.ok(portalControl, "--border-control must use an auditable hexadecimal color");
  assert.ok(
    contrast(token, "#ffffff") >= 4.5,
    `--ink-4 contrast on white is ${contrast(token, "#ffffff").toFixed(2)}:1`
  );
  assert.ok(
    contrast(token, "#f4f6f9") >= 4.5,
    `--ink-4 contrast on paper is ${contrast(token, "#f4f6f9").toFixed(2)}:1`
  );
  assert.ok(
    contrast(controlLine, "#ffffff") >= 3,
    `--control-line contrast on white is ${contrast(controlLine, "#ffffff").toFixed(2)}:1`
  );
  assert.ok(
    contrast(portalControl, "#ffffff") >= 3,
    `--border-control contrast on white is ${contrast(portalControl, "#ffffff").toFixed(2)}:1`
  );
  assert.match(libraryCss, /\.complete-check\s*\{[^}]*border:\s*1px solid var\(--control-line\)/);
  assert.match(portalCss, /\.google-button\s*\{[^}]*var\(--border-control\)/);
});

test("REQ-A11Y-04 and REQ-A11Y-07: library reflows and preserves target sizes", async () => {
  const [portalCss, libraryCss, libraryHtml, serviceWorker] = await Promise.all([
    source("app/globals.css"),
    source("public/biblioteca/assets/styles.css"),
    source("public/biblioteca/index.html"),
    source("public/sw.js"),
  ]);
  const assetVersion = libraryHtml.match(/assets\/styles\.css\?v=(\d+)/)?.[1];
  assert.ok(assetVersion, "library accessibility styles must use a versioned URL");
  assert.match(libraryHtml, new RegExp(`assets/app\\.js\\?v=${assetVersion}`));
  assert.match(serviceWorker, new RegExp(`centro-estudio-ubb-v${assetVersion}`));
  assert.doesNotMatch(portalCss, /body\s*\{[^}]*min-width:\s*320px/);
  assert.match(libraryCss, /@media \(max-width: 320px\)/);
  assert.match(libraryCss, /overflow-wrap:\s*anywhere/);
  assert.match(
    libraryCss,
    /@media \(max-width: 720px\)[\s\S]*?\.course-nav\s*\{[^}]*overflow-x:\s*visible/
  );
  assert.match(
    libraryCss,
    /@media \(max-width: 320px\)[\s\S]*?\.course-nav\s*\{[^}]*grid-template-columns:\s*1fr/
  );
  assert.match(libraryCss, /\.complete-check\s*\{[^}]*min-width:\s*24px[^}]*min-height:\s*24px/);
});

test("REQ-A11Y-05: programmatic library scrolling honors reduced motion", async () => {
  const app = await source("public/biblioteca/assets/app.js");
  assert.match(app, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(app, /scrollIntoView\(\{\s*behavior:\s*'smooth'/);
});

test("REQ-A11Y-06: library search and notes have programmatic labels", async () => {
  const [html, app] = await Promise.all([
    source("public/biblioteca/index.html"),
    source("public/biblioteca/assets/app.js"),
  ]);
  assert.match(html, /<label[^>]+for="searchInput"/);
  assert.match(app, /<label[^>]+for="note-/);
  assert.match(app, /aria-describedby="note-help-/);
});

test("REQ-A11Y-08: public statement contains the complete WCAG 2.2 AA claim", async () => {
  const [page, privacy, terms, portal, library, sitemap] = await Promise.all([
    source("app/accesibilidad/page.tsx"),
    source("app/privacidad/page.tsx"),
    source("app/terminos/page.tsx"),
    source("app/Portal.tsx"),
    source("public/biblioteca/index.html"),
    source("app/sitemap.xml/route.ts"),
  ]);
  assert.match(page, /Web Content Accessibility Guidelines 2\.2/);
  assert.match(page, /https:\/\/www\.w3\.org\/TR\/WCAG22\//);
  assert.match(page, /Nivel AA/);
  assert.match(page, /2026-08-23/);
  assert.match(page, /autoevaluación/i);
  assert.match(page, /HTML[\s\S]*CSS[\s\S]*JavaScript[\s\S]*WAI-ARIA[\s\S]*SVG/);
  assert.match(page, /independiente/i);
  assert.match(page, /no es un servicio oficial/i);
  for (const legalPage of [page, privacy, terms]) {
    assert.match(legalPage, /className="skip-link"[^>]+href="#contenido-principal"/);
    assert.match(legalPage, /id="contenido-principal"[^>]+tabIndex=\{-1\}/);
  }
  for (const relatedPage of [privacy, terms]) {
    assert.match(relatedPage, /aria-label="Documentos relacionados"/);
    assert.match(relatedPage, /href="\/accesibilidad"/);
  }
  assert.match(portal, /href="\/accesibilidad"/);
  assert.match(library, /href="\/accesibilidad"/);
  assert.match(sitemap, /\/accesibilidad/);
});
