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

test("REQ-A11Y-01: portal exposes a visible bypass target", async () => {
  const [portal, shell, portalCss] = await Promise.all([
    source("app/Portal.tsx"),
    source("app/portal-shell.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(portal, /className="skip-link"[^>]+href="#contenido-principal"/);
  assert.match(shell, /<main[^>]+id="contenido-principal"[^>]+tabIndex=\{-1\}/);
  assert.match(portalCss, /\.skip-link\s*\{/);
});

test("REQ-A11Y-02: dynamic portal state is programmatically exposed", async () => {
  const [shell, notificationPanel, commCenter] = await Promise.all([
    source("app/portal-shell.tsx"),
    source("app/notification-panel.tsx"),
    source("app/views/CommunicationsCenter.tsx"),
  ]);
  assert.match(shell, /aria-live="polite"/);
  assert.match(shell, /aria-labelledby="portal-view-title"/);
  assert.match(
    notificationPanel,
    /<span[^>]+className="notification-dot"[^>]+aria-label="Sin leer"[^>]+role="img"/
  );
  assert.match(
    commCenter,
    /<span[^>]+aria-label="No leído"[^>]+className="conversation-unread"[^>]+role="img"/
  );
});

test("REQ-A11Y-03: portal text and controls meet contrast contracts", async () => {
  const portalCss = await source("app/globals.css");
  const portalControl = portalCss.match(/--border-control:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(portalControl, "--border-control must use an auditable hexadecimal color");
  assert.ok(
    contrast(portalControl, "#ffffff") >= 3,
    `--border-control contrast on white is ${contrast(portalControl, "#ffffff").toFixed(2)}:1`
  );
  assert.match(portalCss, /\.google-button\s*\{[^}]*var\(--border-control\)/);
});

test("REQ-A11Y-04 and REQ-A11Y-07: portal reflows without horizontal scroll constraint", async () => {
  const portalCss = await source("app/globals.css");
  assert.doesNotMatch(portalCss, /body\s*\{[^}]*min-width:\s*320px/);
});

test("REQ-A11Y-05: programmatic transitions honor reduced motion in views", async () => {
  const [resourcesView, portalUtils] = await Promise.all([
    source("app/views/resources/ResourcesView.tsx"),
    source("lib/portal-utils.ts"),
  ]);
  assert.match(resourcesView, /useReducedMotion\(\)/);
  assert.match(portalUtils, /instantTransition/);
});

test("REQ-A11Y-06: search inputs have programmatic accessible labels", async () => {
  const faq = await source("app/faq/FaqBrowser.tsx");
  assert.match(faq, /<label[^>]+htmlFor="faq-filtro"/);
  assert.match(faq, /id="faq-filtro"/);
});

test("REQ-A11Y-08: public statement contains the complete WCAG 2.2 AA claim", async () => {
  const [page, privacy, terms, portal, sitemap] = await Promise.all([
    source("app/accesibilidad/page.tsx"),
    source("app/privacidad/page.tsx"),
    source("app/terminos/page.tsx"),
    source("app/Portal.tsx"),
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
  assert.match(sitemap, /\/accesibilidad/);
});

function oklchToLuminance(l: number, c: number, h: number): number {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lLinear = l_ ** 3;
  const mLinear = m_ ** 3;
  const sLinear = s_ ** 3;

  const rLinear = +4.0767433362 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
  const gLinear = -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
  const bLinear = -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear;

  const toGamma = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.04045 ? clamped / 12.92 : ((clamped + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toGamma(rLinear) + 0.7152 * toGamma(gLinear) + 0.0722 * toGamma(bLinear);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test("REQ-A11Y-04: Tokens OKLCH cumplen ratios WCAG 2.2 AA (>= 4.5:1 texto, >= 3:1 componentes)", () => {
  const surfaceBaseLum = oklchToLuminance(0.975, 0.005, 240);
  const textPrimaryLum = oklchToLuminance(0.2, 0.03, 260);
  const textSecondaryLum = oklchToLuminance(0.36, 0.03, 255);
  const brandBlueLum = oklchToLuminance(0.48, 0.18, 255);

  assert.ok(
    contrastRatio(surfaceBaseLum, textPrimaryLum) >= 4.5,
    "Texto primario debe ser >= 4.5:1"
  );
  assert.ok(
    contrastRatio(surfaceBaseLum, textSecondaryLum) >= 4.5,
    "Texto secundario debe ser >= 4.5:1"
  );
  assert.ok(
    contrastRatio(surfaceBaseLum, brandBlueLum) >= 3.0,
    "Brand blue en superficie debe ser >= 3.0:1"
  );
});
